import { reactive } from 'vue'
import { applyBrokerSyncPayload, parseBrokerSyncPayload } from './broker-sync.service'
import { requestCloudAutoSync } from './cloud/cloud-auto-sync.service'
import { isSupabaseConfigured, supabase } from './cloud/supabase.client'
import { useAccountStore } from '@/stores/useAccountStore'
import { useNotificationStore } from '@/stores/useNotificationStore'
import { useTradeStore } from '@/stores/useTradeStore'
import type { BrokerSyncedTrade } from '@/types/broker-sync'
import type { TradeRecord } from '@/types/trade'

const RECONCILIATION_INTERVAL_MS = 5 * 60 * 1000
const PAGE_SIZE = 500

interface SnapshotRow {
  account_id: string
  local_account_id: string
  broker_login: string
  broker_server: string
  payload: unknown
  sync_cursor: string | null
  captured_at: string
}

interface LedgerRow {
  account_id: string
  local_account_id: string
  external_id: string
  payload: unknown
  updated_at: string
}

export interface ReconciliationAccountState {
  accountId: string
  ledgerTrades: number
  localTrades: number
  ledgerCashflows: number
  localCashflows: number
  missingBeforeRepair: number
  staleBeforeRepair: number
  duplicates: number
  repaired: number
}

export const brokerReconciliationRuntime = reactive({
  state: 'idle' as 'idle' | 'checking' | 'healthy' | 'warning' | 'error' | 'unavailable',
  running: false,
  lastCheckedAt: null as string | null,
  lastRepairedAt: null as string | null,
  lastError: null as string | null,
  ledgerTrades: 0,
  localTrades: 0,
  ledgerCashflows: 0,
  localCashflows: 0,
  missingBeforeRepair: 0,
  staleBeforeRepair: 0,
  duplicates: 0,
  repaired: 0,
  accountStates: {} as Record<string, ReconciliationAccountState>,
})

let started = false
let timer: number | null = null
let activeRun: Promise<void> | null = null
let lastDuplicateFingerprint = ''

const nearlyEqual = (a: number, b: number): boolean =>
  Math.abs(a - b) <= Math.max(0.000001, Math.abs(a) * 0.0000001)

const coreTradeMismatch = (local: TradeRecord, broker: BrokerSyncedTrade): boolean => {
  const netProfit = broker.grossProfit + broker.commission + broker.swap + broker.fee
  return (
    local.positionStatus !== broker.positionStatus ||
    local.symbol.trim().toUpperCase() !== broker.symbol.trim().toUpperCase() ||
    local.direction !== broker.direction ||
    !nearlyEqual(local.entryPrice, broker.entryPrice) ||
    !nearlyEqual(local.exitPrice, broker.exitPrice ?? 0) ||
    !nearlyEqual(local.lotSize, broker.lotSize) ||
    !nearlyEqual(local.commission, broker.commission) ||
    !nearlyEqual(local.swap, broker.swap) ||
    !nearlyEqual(local.fee, broker.fee) ||
    !nearlyEqual(local.profitLoss, netProfit)
  )
}

const fetchAll = async (table: 'broker_trade_ledger' | 'broker_cashflow_ledger'): Promise<LedgerRow[]> => {
  if (!supabase) return []
  const rows: LedgerRow[] = []
  let offset = 0

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('account_id,local_account_id,external_id,payload,updated_at')
      .order('updated_at', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)
    if (error) throw error
    const page = (data ?? []) as LedgerRow[]
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  return rows
}

const duplicateCount = (keys: string[]): number => {
  const counts = new Map<string, number>()
  keys.forEach(key => counts.set(key, (counts.get(key) ?? 0) + 1))
  return [...counts.values()].reduce((total, count) => total + Math.max(0, count - 1), 0)
}

const reconcile = async (): Promise<void> => {
  if (!supabase || !isSupabaseConfigured || navigator.onLine === false) return
  if (activeRun) return activeRun

  activeRun = (async () => {
    brokerReconciliationRuntime.running = true
    brokerReconciliationRuntime.state = 'checking'
    brokerReconciliationRuntime.lastError = null

    try {
      const { data, error } = await supabase
        .from('broker_account_snapshots')
        .select('account_id,local_account_id,broker_login,broker_server,payload,sync_cursor,captured_at')
        .order('captured_at', { ascending: false })

      if (error) throw error
      const snapshots = (data ?? []) as SnapshotRow[]
      if (!snapshots.length) {
        brokerReconciliationRuntime.state = 'unavailable'
        brokerReconciliationRuntime.lastCheckedAt = new Date().toISOString()
        return
      }

      const [tradeRows, cashflowRows] = await Promise.all([
        fetchAll('broker_trade_ledger'),
        fetchAll('broker_cashflow_ledger'),
      ])
      const tradeStore = useTradeStore()
      const accountStore = useAccountStore()
      const accountStates: Record<string, ReconciliationAccountState> = {}

      let missingBeforeRepair = 0
      let staleBeforeRepair = 0
      let duplicates = 0
      let repaired = 0

      for (const snapshot of snapshots) {
        const accountId = snapshot.local_account_id
        const brokerTrades = tradeRows.filter(row => row.account_id === snapshot.account_id)
        const brokerCashflows = cashflowRows.filter(row => row.account_id === snapshot.account_id)
        const localTrades = tradeStore.trades.filter(trade => trade.dataSource === 'mt5' && trade.accountId === accountId)
        const localCashflows = accountStore.transactions.filter(transaction => transaction.dataSource === 'mt5' && transaction.accountId === accountId)
        const localTradeByExternal = new Map(localTrades.filter(item => item.externalId).map(item => [item.externalId as string, item]))
        const localCashflowIds = new Set(localCashflows.map(item => item.externalId).filter((value): value is string => Boolean(value)))

        const missingTrades = brokerTrades.filter(row => !localTradeByExternal.has(row.external_id))
        const missingCashflows = brokerCashflows.filter(row => !localCashflowIds.has(row.external_id))
        const staleTrades = brokerTrades.filter(row => {
          const local = localTradeByExternal.get(row.external_id)
          if (!local) return false
          try {
            return coreTradeMismatch(local, row.payload as BrokerSyncedTrade)
          }
          catch {
            return true
          }
        })
        const accountDuplicates =
          duplicateCount(localTrades.flatMap(item => item.externalId ? [item.externalId] : [])) +
          duplicateCount(localCashflows.flatMap(item => item.externalId ? [item.externalId] : []))

        const needsRepair = missingTrades.length + missingCashflows.length + staleTrades.length
        missingBeforeRepair += missingTrades.length + missingCashflows.length
        staleBeforeRepair += staleTrades.length
        duplicates += accountDuplicates

        const payload = parseBrokerSyncPayload(JSON.stringify({
          schemaVersion: 1,
          provider: 'mt5',
          accountId,
          brokerLogin: snapshot.broker_login,
          brokerServer: snapshot.broker_server,
          syncedAt: snapshot.captured_at,
          cursor: snapshot.sync_cursor,
          account: snapshot.payload,
          trades: brokerTrades.map(row => row.payload),
          cashflows: brokerCashflows.map(row => row.payload),
        }))

        applyBrokerSyncPayload(payload)
        repaired += needsRepair

        accountStates[accountId] = {
          accountId,
          ledgerTrades: brokerTrades.length,
          localTrades: localTrades.length + missingTrades.length,
          ledgerCashflows: brokerCashflows.length,
          localCashflows: localCashflows.length + missingCashflows.length,
          missingBeforeRepair: missingTrades.length + missingCashflows.length,
          staleBeforeRepair: staleTrades.length,
          duplicates: accountDuplicates,
          repaired: needsRepair,
        }
      }

      brokerReconciliationRuntime.ledgerTrades = tradeRows.length
      brokerReconciliationRuntime.localTrades = tradeStore.trades.filter(trade => trade.dataSource === 'mt5').length
      brokerReconciliationRuntime.ledgerCashflows = cashflowRows.length
      brokerReconciliationRuntime.localCashflows = accountStore.transactions.filter(transaction => transaction.dataSource === 'mt5').length
      brokerReconciliationRuntime.missingBeforeRepair = missingBeforeRepair
      brokerReconciliationRuntime.staleBeforeRepair = staleBeforeRepair
      brokerReconciliationRuntime.duplicates = duplicates
      brokerReconciliationRuntime.repaired = repaired
      brokerReconciliationRuntime.accountStates = accountStates
      brokerReconciliationRuntime.lastCheckedAt = new Date().toISOString()
      brokerReconciliationRuntime.state = duplicates > 0 ? 'warning' : 'healthy'

      if (repaired > 0) {
        brokerReconciliationRuntime.lastRepairedAt = new Date().toISOString()
        requestCloudAutoSync(350)
        useNotificationStore().addNotification({
          type: 'success',
          title: 'Broker 資料已自動補齊',
          message: `Reconciliation 已安全修復 ${repaired} 個缺漏或過期的 Broker 欄位，Journal 內容保持不變。`,
          route: '/accounts',
        })
      }

      const duplicateFingerprint = Object.values(accountStates)
        .filter(state => state.duplicates > 0)
        .map(state => `${state.accountId}:${state.duplicates}`)
        .sort()
        .join('|')

      if (duplicateFingerprint && duplicateFingerprint !== lastDuplicateFingerprint) {
        useNotificationStore().addNotification({
          type: 'warning',
          title: 'Broker Reconciliation 需要檢查',
          message: `偵測到 ${duplicates} 筆重複 MT5 對應資料。系統沒有自動刪除，以免誤傷既有 Journal。`,
          route: '/accounts',
        })
      }
      lastDuplicateFingerprint = duplicateFingerprint
    }
    catch (error) {
      brokerReconciliationRuntime.state = 'error'
      brokerReconciliationRuntime.lastCheckedAt = new Date().toISOString()
      brokerReconciliationRuntime.lastError = error instanceof Error
        ? error.message
        : 'Broker Reconciliation 核對失敗。'
    }
    finally {
      brokerReconciliationRuntime.running = false
      activeRun = null
    }
  })()

  return activeRun
}

const handleOnline = (): void => { void reconcile() }
const handleVisible = (): void => {
  if (document.visibilityState === 'visible') void reconcile()
}

export const startBrokerReconciliation = (): (() => void) => {
  if (started || typeof window === 'undefined') return stopBrokerReconciliation
  started = true
  timer = window.setInterval(() => { void reconcile() }, RECONCILIATION_INTERVAL_MS)
  window.addEventListener('online', handleOnline)
  document.addEventListener('visibilitychange', handleVisible)
  window.setTimeout(() => { void reconcile() }, 8_000)
  return stopBrokerReconciliation
}

export const stopBrokerReconciliation = (): void => {
  if (!started || typeof window === 'undefined') return
  started = false
  if (timer !== null) window.clearInterval(timer)
  timer = null
  window.removeEventListener('online', handleOnline)
  document.removeEventListener('visibilitychange', handleVisible)
}

export const refreshBrokerReconciliation = reconcile
