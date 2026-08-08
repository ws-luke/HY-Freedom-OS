export type FreedomPersistenceMode = 'local' | 'cloud-ready'

export type FreedomCloudTable =
  | 'profiles'
  | 'trading_accounts'
  | 'account_transactions'
  | 'signals'
  | 'playbooks'
  | 'trading_plans'
  | 'trades'
  | 'trade_reviews'
  | 'trade_screenshots'
  | 'daily_missions'
  | 'risk_settings'
  | 'app_settings'
  | 'sync_tombstones'

export type FreedomCloudDeletableTable =
  | 'trading_accounts'
  | 'account_transactions'
  | 'signals'
  | 'playbooks'
  | 'trades'
  | 'trade_reviews'
  | 'trade_screenshots'
  | 'daily_missions'

export interface FreedomCloudRuntime {
  configured: boolean
  mode: FreedomPersistenceMode
  projectHost: string | null
  storageBucket: 'trade-screenshots'
}

export interface FreedomCloudIdentity {
  userId: string
  email: string | null
}

export interface FreedomCloudMigrationSummary {
  accounts: number
  transactions: number
  signals: number
  playbooks: number
  trades: number
  reviews: number
  screenshots: number
  plans: number
  missions: number
  settings: number
  totalRows: number
  migratedAt: string
}

export interface FreedomCloudMigrationRecord {
  userId: string
  summary: FreedomCloudMigrationSummary
}

export type FreedomCloudSyncDirection = 'cloud-to-local' | 'two-way'

export interface FreedomCloudSyncSummary {
  userId: string
  direction: FreedomCloudSyncDirection
  pushedRows: number
  pulledRows: number
  cloudHadData: boolean
  syncedAt: string
}

export interface FreedomCloudSyncRecord {
  userId: string
  summary: FreedomCloudSyncSummary
}

export type FreedomCloudSyncState =
  | 'idle'
  | 'syncing'
  | 'synced'
  | 'offline'
  | 'error'

export interface FreedomCloudSyncRuntimeStatus {
  state: FreedomCloudSyncState
  online: boolean
  pending: boolean
  retryAttempt: number
  nextRetryAt: string | null
  lastStartedAt: string | null
  lastCompletedAt: string | null
  lastError: string | null
}
