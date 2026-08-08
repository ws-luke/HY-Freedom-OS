import type { AccountTransactionType } from './account'
import type { TradeDirection, TradePositionStatus } from './trade'

export const BROKER_SYNC_SCHEMA_VERSION = 1 as const

export interface BrokerAccountSnapshot {
  startingBalance: number | null
  balance: number
  equity: number
  currency: string
}

export interface BrokerSyncedTrade {
  externalId: string
  dealId: string | null
  positionId: string | null
  orderId: string | null
  openedAt: string
  closedAt: string | null
  symbol: string
  direction: TradeDirection
  positionStatus: TradePositionStatus
  entryPrice: number
  exitPrice: number | null
  stopLoss: number | null
  takeProfit: number | null
  lotSize: number
  grossProfit: number
  commission: number
  swap: number
  fee: number
}

export interface BrokerSyncedCashflow {
  externalId: string
  occurredAt: string
  type: Extract<AccountTransactionType, 'deposit' | 'withdrawal' | 'payout' | 'adjustment'>
  amount: number
  balanceAfter: number | null
  reference: string
}

export interface BrokerSyncPayload {
  schemaVersion: typeof BROKER_SYNC_SCHEMA_VERSION
  provider: 'mt5'
  accountId: string
  brokerLogin: string
  brokerServer: string
  syncedAt: string
  cursor: string | null
  account: BrokerAccountSnapshot
  trades: BrokerSyncedTrade[]
  cashflows: BrokerSyncedCashflow[]
}

export interface BrokerSyncImportResult {
  addedTrades: number
  updatedTrades: number
  openedTradesDetected: number
  tradesReadyForReview: number
  addedCashflows: number
  updatedCashflows: number
}
