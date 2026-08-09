import { calculateTradeMetrics } from './trade-calculation.service'
import { inferTradeExitReason } from './trade-lifecycle.service'
import { useAccountStore } from '@/stores/useAccountStore'
import { useTradeStore } from '@/stores/useTradeStore'
import { BROKER_SYNC_SCHEMA_VERSION } from '@/types/broker-sync'

import type {
  BrokerSyncImportResult,
  BrokerSyncPayload,
  BrokerSyncedTrade,
} from '@/types/broker-sync'
import type { TradeRecord, TradeResult } from '@/types/trade'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const finiteNumber = (value: unknown): boolean =>
  typeof value === 'number' && Number.isFinite(value)

const validTrade = (value: unknown): value is BrokerSyncedTrade => {
  if (!isRecord(value)) return false

  return (
    typeof value.externalId === 'string' && Boolean(value.externalId.trim()) &&
    typeof value.openedAt === 'string' &&
    typeof value.symbol === 'string' && Boolean(value.symbol.trim()) &&
    (value.direction === 'buy' || value.direction === 'sell') &&
    (value.positionStatus === 'open' || value.positionStatus === 'closed') &&
    finiteNumber(value.entryPrice) &&
    finiteNumber(value.lotSize) &&
    finiteNumber(value.grossProfit) &&
    finiteNumber(value.commission) &&
    finiteNumber(value.swap) &&
    finiteNumber(value.fee)
  )
}

const validCashflow = (value: unknown): boolean => {
  if (!isRecord(value)) return false

  return (
    typeof value.externalId === 'string' && Boolean(value.externalId.trim()) &&
    typeof value.occurredAt === 'string' &&
    ['deposit', 'withdrawal', 'payout', 'adjustment'].includes(String(value.type)) &&
    finiteNumber(value.amount) &&
    (value.balanceAfter === null || finiteNumber(value.balanceAfter)) &&
    typeof value.reference === 'string'
  )
}

export const parseBrokerSyncPayload = (raw: string): BrokerSyncPayload => {
  const parsed = JSON.parse(raw) as unknown

  if (
    !isRecord(parsed) ||
    parsed.schemaVersion !== BROKER_SYNC_SCHEMA_VERSION ||
    parsed.provider !== 'mt5' ||
    typeof parsed.accountId !== 'string' ||
    typeof parsed.brokerLogin !== 'string' ||
    typeof parsed.brokerServer !== 'string' ||
    typeof parsed.syncedAt !== 'string' ||
    !isRecord(parsed.account) ||
    !(
      parsed.account.startingBalance === undefined ||
      parsed.account.startingBalance === null ||
      finiteNumber(parsed.account.startingBalance)
    ) ||
    !finiteNumber(parsed.account.balance) ||
    !finiteNumber(parsed.account.equity) ||
    typeof parsed.account.currency !== 'string' ||
    !Array.isArray(parsed.trades) ||
    !parsed.trades.every(validTrade) ||
    !Array.isArray(parsed.cashflows) ||
    !parsed.cashflows.every(validCashflow)
  ) {
    throw new Error('MT5 同步資料格式不完整或版本不相容。')
  }

  return {
    ...(parsed as unknown as BrokerSyncPayload),
    account: {
      startingBalance:
        parsed.account.startingBalance === undefined
          ? null
          : parsed.account.startingBalance as number | null,
      balance: parsed.account.balance as number,
      equity: parsed.account.equity as number,
      currency: parsed.account.currency as string,
    },
  }
}

const splitTimestamp = (timestamp: string): { date: string; time: string } => {
  const value = new Date(timestamp)
  if (Number.isNaN(value.getTime())) return { date: timestamp.slice(0, 10), time: '00:00' }

  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  const hour = String(value.getHours()).padStart(2, '0')
  const minute = String(value.getMinutes()).padStart(2, '0')
  return { date: `${year}-${month}-${day}`, time: `${hour}:${minute}` }
}

const resultFromProfit = (profit: number): TradeResult =>
  profit > 0 ? 'win' : profit < 0 ? 'loss' : 'breakeven'

const mapSyncedTrade = (
  accountId: string,
  accountName: string,
  syncedAt: string,
  trade: BrokerSyncedTrade,
): TradeRecord => {
  const opened = splitTimestamp(trade.openedAt)
  // Match the per-trade Profit column shown by MT5 History. Commission, swap
  // and fee remain available as separate broker fields instead of being hidden
  // inside the displayed trade P/L.
  const displayedProfit = trade.grossProfit
  const exitPrice = trade.exitPrice ?? 0
  const stopLoss = trade.stopLoss ?? 0
  const takeProfit = trade.takeProfit ?? 0
  const metrics = calculateTradeMetrics({
    symbol: trade.symbol,
    direction: trade.direction,
    entryPrice: trade.entryPrice,
    exitPrice: trade.positionStatus === 'closed' ? exitPrice : null,
    stopLoss: stopLoss > 0 ? stopLoss : null,
    takeProfit: takeProfit > 0 ? takeProfit : null,
    lotSize: trade.lotSize,
  })

  return {
    id: crypto.randomUUID(),
    date: opened.date,
    time: opened.time,
    symbol: trade.symbol.trim().toUpperCase(),
    direction: trade.direction,
    result: resultFromProfit(displayedProfit),
    status: 'waiting-review',
    positionStatus: trade.positionStatus,
    exitReason: trade.positionStatus === 'closed'
      ? inferTradeExitReason(exitPrice, stopLoss, takeProfit)
      : null,
    closedAt: trade.positionStatus === 'closed' ? trade.closedAt ?? syncedAt : null,
    signalId: null,
    signal: '',
    accountId,
    account: accountName,
    dataSource: 'mt5',
    externalId: trade.externalId,
    brokerDealId: trade.dealId,
    brokerPositionId: trade.positionId,
    brokerOrderId: trade.orderId,
    commission: trade.commission,
    swap: trade.swap,
    fee: trade.fee,
    syncedAt,
    entryPrice: trade.entryPrice,
    exitPrice,
    stopLoss,
    takeProfit,
    lotSize: trade.lotSize,
    riskAmount: metrics.supported ? metrics.riskAmount ?? 0 : 0,
    profitLoss: displayedProfit,
    rMultiple:
      metrics.supported && metrics.riskAmount && metrics.riskAmount > 0
        ? Number((displayedProfit / metrics.riskAmount).toFixed(2))
        : 0,
    playbook: '',
    reason: '',
    beforeScreenshot: null,
    afterScreenshot: null,
    mistakeTags: [],
    customMistakeTags: [],
    isFavorite: false,
    createdAt: syncedAt,
    updatedAt: syncedAt,
  }
}

export const applyBrokerSyncPayload = (payload: BrokerSyncPayload): BrokerSyncImportResult => {
  const accountStore = useAccountStore()
  const tradeStore = useTradeStore()
  const account = accountStore.getAccountById(payload.accountId)

  if (!account || account.dataSource !== 'mt5') {
    throw new Error('找不到對應的 MT5 帳戶，或此帳戶尚未設定為 MT5 Sync。')
  }

  if (
    (account.brokerLogin && account.brokerLogin !== payload.brokerLogin) ||
    (account.brokerServer && account.brokerServer !== payload.brokerServer)
  ) {
    throw new Error('MT5 Login / Server 與 Freedom OS 帳戶設定不一致。')
  }

  let addedTrades = 0
  let updatedTrades = 0
  let openedTradesDetected = 0
  let tradesReadyForReview = 0
  let addedCashflows = 0
  let updatedCashflows = 0

  payload.trades.forEach(item => {
    const previous = tradeStore.trades.find(trade =>
      trade.dataSource === 'mt5' &&
      trade.accountId === account.id &&
      trade.externalId === item.externalId,
    )
    const result = tradeStore.upsertSyncedTrade(
      mapSyncedTrade(account.id, account.name, payload.syncedAt, item),
    )
    if (result.created) {
      addedTrades += 1
      if (result.trade.positionStatus === 'open') openedTradesDetected += 1
      else tradesReadyForReview += 1
    }
    else {
      updatedTrades += 1
      if (previous?.positionStatus === 'open' && result.trade.positionStatus === 'closed') {
        tradesReadyForReview += 1
      }
    }
  })

  payload.cashflows.forEach(item => {
    const result = accountStore.upsertSyncedTransaction({
      accountId: account.id,
      type: item.type,
      direction:
        item.type === 'deposit'
          ? 'in'
          : item.type === 'adjustment' && item.amount >= 0
            ? 'in'
            : 'out',
      date: item.occurredAt.slice(0, 10),
      amount: Math.abs(item.amount),
      balanceAfter: item.balanceAfter,
      method: 'MT5 Sync',
      reference: item.reference,
      notes: '',
      externalId: item.externalId,
      syncedAt: payload.syncedAt,
    })
    if (result.created) addedCashflows += 1
    else updatedCashflows += 1
  })

  accountStore.updateSyncState(account.id, {
    status: 'connected',
    syncedAt: payload.syncedAt,
    cursor: payload.cursor,
    error: null,
    startingBalance: payload.account.startingBalance,
    balance: payload.account.balance,
    equity: payload.account.equity,
    currency: payload.account.currency,
  })

  return {
    addedTrades,
    updatedTrades,
    openedTradesDetected,
    tradesReadyForReview,
    addedCashflows,
    updatedCashflows,
  }
}
