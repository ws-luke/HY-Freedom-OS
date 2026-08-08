import { reactive } from 'vue'

import { applyBrokerSyncPayload, parseBrokerSyncPayload } from './broker-sync.service'
import { requestCloudAutoSync } from './cloud/cloud-auto-sync.service'
import { isSupabaseConfigured, supabase } from './cloud/supabase.client'

const POLL_INTERVAL_MS = 20_000
const PAGE_SIZE = 500

interface BrokerSnapshotRow {
  account_id: string
  local_account_id: string
  broker_login: string
  broker_server: string
  payload: unknown
  sync_cursor: string | null
  captured_at: string
  updated_at: string
}

interface BrokerLedgerRow {
  account_id: string
  local_account_id: string
  payload: unknown
  updated_at: string
}

type LedgerTable = 'broker_trade_ledger' | 'broker_cashflow_ledger'

export const brokerEventLedgerRuntime = reactive({
  available: false,
  running: false,
  lastCheckedAt: null as string | null,
  lastImportedAt: null as string | null,
  lastError: null as string | null,
  snapshots: 0,
  tradeRowsImported: 0,
  cashflowRowsImported: 0,
})

let started = false
let timer: number | null = null
let activeRun: Promise<void> | null = null
let lastLedgerUpdatedAt: string | null = null

const isMissingLedger = (error: { code?: string, message?: string }): boolean =>
  error.code === '42P01' ||
  error.code === 'PGRST205' ||
  /broker_(?:account_snapshots|trade_ledger|cashflow_ledger)/i.test(error.message ?? '')

const fetchLedgerRows = async (
  table: LedgerTable,
  after: string | null,
): Promise<BrokerLedgerRow[]> => {
  if (!supabase) return []
  const output: BrokerLedgerRow[] = []
  let offset = 0

  while (true) {
    let query = supabase
      .from(table)
      .select('account_id,local_account_id,payload,updated_at')
      .order('updated_at', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)

    if (after) query = query.gt('updated_at', after)
    const { data, error } = await query
    if (error) throw error

    const page = (data ?? []) as BrokerLedgerRow[]
    output.push(...page)
    if (page.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  return output
}

const newestTimestamp = (rows: BrokerLedgerRow[]): string | null => {
  let newest: string | null = null
  rows.forEach(row => {
    if (!newest || row.updated_at > newest) newest = row.updated_at
  })
  return newest
}

const importLedger = async (): Promise<void> => {
  if (!supabase || !isSupabaseConfigured || navigator.onLine === false) return
  if (activeRun) return activeRun

  activeRun = (async () => {
    brokerEventLedgerRuntime.running = true
    try {
      const { data: snapshotData, error: snapshotError } = await supabase
        .from('broker_account_snapshots')
        .select('account_id,local_account_id,broker_login,broker_server,payload,sync_cursor,captured_at,updated_at')
        .order('updated_at', { ascending: false })

      brokerEventLedgerRuntime.lastCheckedAt = new Date().toISOString()
      if (snapshotError) {
        if (isMissingLedger(snapshotError)) {
          brokerEventLedgerRuntime.available = false
          brokerEventLedgerRuntime.lastError = null
          return
        }
        throw snapshotError
      }

      brokerEventLedgerRuntime.available = true
      brokerEventLedgerRuntime.lastError = null
      const snapshots = (snapshotData ?? []) as BrokerSnapshotRow[]
      brokerEventLedgerRuntime.snapshots = snapshots.length

      const [tradeRows, cashflowRows] = await Promise.all([
        fetchLedgerRows('broker_trade_ledger', lastLedgerUpdatedAt),
        fetchLedgerRows('broker_cashflow_ledger', lastLedgerUpdatedAt),
      ])

      let allApplied = true
      for (const snapshot of snapshots) {
        const trades = tradeRows
          .filter(row => row.account_id === snapshot.account_id)
          .map(row => row.payload)
        const cashflows = cashflowRows
          .filter(row => row.account_id === snapshot.account_id)
          .map(row => row.payload)

        try {
          const payload = parseBrokerSyncPayload(JSON.stringify({
            schemaVersion: 1,
            provider: 'mt5',
            accountId: snapshot.local_account_id,
            brokerLogin: snapshot.broker_login,
            brokerServer: snapshot.broker_server,
            syncedAt: snapshot.captured_at,
            cursor: snapshot.sync_cursor,
            account: snapshot.payload,
            trades,
            cashflows,
          }))
          applyBrokerSyncPayload(payload)
        }
        catch {
          // Cloud account restoration may still be running immediately after login.
          // Keep the ledger cursor unchanged so the complete source is retried.
          allApplied = false
        }
      }

      if (!allApplied && (tradeRows.length > 0 || cashflowRows.length > 0)) return

      const newestTrade = newestTimestamp(tradeRows)
      const newestCashflow = newestTimestamp(cashflowRows)
      const candidates = [newestTrade, newestCashflow].filter((value): value is string => Boolean(value))
      if (candidates.length) lastLedgerUpdatedAt = candidates.sort().at(-1) ?? lastLedgerUpdatedAt

      brokerEventLedgerRuntime.tradeRowsImported += tradeRows.length
      brokerEventLedgerRuntime.cashflowRowsImported += cashflowRows.length
      brokerEventLedgerRuntime.lastImportedAt = new Date().toISOString()
      requestCloudAutoSync(350)
    }
    catch (error) {
      const value = error as { code?: string, message?: string }
      if (isMissingLedger(value)) {
        brokerEventLedgerRuntime.available = false
        brokerEventLedgerRuntime.lastError = null
      }
      else {
        brokerEventLedgerRuntime.lastError = error instanceof Error ? error.message : 'Broker Event Ledger 匯入失敗。'
      }
    }
    finally {
      brokerEventLedgerRuntime.running = false
      activeRun = null
    }
  })()

  return activeRun
}

const handleOnline = (): void => { void importLedger() }
const handleVisible = (): void => {
  if (document.visibilityState === 'visible') void importLedger()
}

export const startBrokerEventLedger = (): (() => void) => {
  if (started || typeof window === 'undefined') return stopBrokerEventLedger
  started = true
  timer = window.setInterval(() => { void importLedger() }, POLL_INTERVAL_MS)
  window.addEventListener('online', handleOnline)
  document.addEventListener('visibilitychange', handleVisible)
  window.setTimeout(() => { void importLedger() }, 2600)
  return stopBrokerEventLedger
}

export const stopBrokerEventLedger = (): void => {
  if (!started || typeof window === 'undefined') return
  started = false
  if (timer !== null) window.clearInterval(timer)
  timer = null
  window.removeEventListener('online', handleOnline)
  document.removeEventListener('visibilitychange', handleVisible)
}

export const refreshBrokerEventLedger = importLedger

