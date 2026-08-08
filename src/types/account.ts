export type AccountType = 'prop' | 'demo' | 'live'

export type AccountDataSource = 'manual' | 'mt5'

export type BrokerSyncStatus =
  | 'manual'
  | 'pending'
  | 'connected'
  | 'syncing'
  | 'error'

export type AccountStatus =
  | 'active'
  | 'paused'
  | 'passed'
  | 'failed'
  | 'closed'

export type PropAccountStage =
  | 'challenge'
  | 'verification'
  | 'funded'

export type AccountTransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'payout'
  | 'challenge-fee'
  | 'refund'
  | 'platform-fee'
  | 'adjustment'

export type AccountTransactionDirection =
  | 'in'
  | 'out'

export interface TradingAccount {
  id: string
  name: string
  provider: string
  type: AccountType
  status: AccountStatus
  propStage: PropAccountStage | null
  platform: string
  accountNumber: string
  dataSource: AccountDataSource
  brokerServer: string
  brokerLogin: string
  syncStatus: BrokerSyncStatus
  lastSyncedAt: string | null
  lastSyncCursor: string | null
  syncError: string | null
  currency: string
  startingBalance: number
  balance: number
  equity: number
  profitTargetPercent: number | null
  maxDailyLossPercent: number | null
  maxDrawdownPercent: number | null
  profitSplitPercent: number | null
  notes: string
  createdAt: string
  updatedAt: string
}

export interface AccountTransaction {
  id: string
  accountId: string
  type: AccountTransactionType
  direction: AccountTransactionDirection
  date: string
  amount: number
  balanceAfter: number | null
  method: string
  reference: string
  notes: string
  dataSource: AccountDataSource
  externalId: string | null
  syncedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface NewTradingAccountInput {
  name: string
  provider: string
  type: AccountType
  status: AccountStatus
  propStage: PropAccountStage | null
  platform: string
  accountNumber: string
  dataSource: AccountDataSource
  brokerServer: string
  brokerLogin: string
  currency: string
  startingBalance: number
  balance: number
  equity: number
  profitTargetPercent: number | null
  maxDailyLossPercent: number | null
  maxDrawdownPercent: number | null
  profitSplitPercent: number | null
  notes: string
}

export interface NewAccountTransactionInput {
  accountId: string
  type: AccountTransactionType
  direction: AccountTransactionDirection
  date: string
  amount: number
  balanceAfter: number | null
  method: string
  reference: string
  notes: string
  dataSource?: AccountDataSource
  externalId?: string | null
  syncedAt?: string | null
}

export interface StoredAccountLedgerState {
  version: 2
  accounts: TradingAccount[]
  transactions: AccountTransaction[]
}
