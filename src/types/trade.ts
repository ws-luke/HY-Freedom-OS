export type TradeDirection = 'buy' | 'sell'

export type TradeDataSource = 'manual' | 'mt5'

export type TradeResult =
  | 'win'
  | 'loss'
  | 'breakeven'

export type TradeStatus =
  | 'waiting-review'
  | 'reviewing'
  | 'completed'

export type TradePositionStatus =
  | 'open'
  | 'closed'

export type TradeExitReason =
  | 'take-profit'
  | 'stop-loss'
  | 'manual'

export type TradeMistakeTag =
  | 'fomo'
  | 'overtrade'
  | 'early-entry'
  | 'late-entry'
  | 'early-exit'
  | 'late-exit'
  | 'moved-stop'
  | 'oversized-risk'
  | 'ignored-trend'
  | 'ignored-news'
  | 'revenge-trade'
  | 'no-confirmation'

export interface TradeScreenshot {
  name: string
  dataUrl: string
  storagePath?: string | null
}

export interface TradeRecord {
  id: string
  date: string
  time: string
  symbol: string
  direction: TradeDirection
  result: TradeResult
  status: TradeStatus
  positionStatus: TradePositionStatus
  exitReason: TradeExitReason | null
  closedAt: string | null
  signalId: string | null
  signal: string
  accountId: string | null
  account: string
  dataSource: TradeDataSource
  externalId: string | null
  brokerDealId: string | null
  brokerPositionId: string | null
  brokerOrderId: string | null
  commission: number
  swap: number
  fee: number
  syncedAt: string | null
  entryPrice: number
  exitPrice: number
  stopLoss: number
  takeProfit: number
  lotSize: number
  riskAmount: number
  profitLoss: number
  rMultiple: number
  playbook: string
  reason: string
  beforeScreenshot: TradeScreenshot | null
  afterScreenshot: TradeScreenshot | null
  mistakeTags: TradeMistakeTag[]
  customMistakeTags: string[]
  isFavorite: boolean
  createdAt: string
  updatedAt: string
}

export interface NewTradeInput {
  date: string
  time: string
  symbol: string
  direction: TradeDirection
  signalId?: string | null
  signal?: string
  accountId?: string | null
  account: string
  dataSource?: TradeDataSource
  externalId?: string | null
  brokerDealId?: string | null
  brokerPositionId?: string | null
  brokerOrderId?: string | null
  commission?: number
  swap?: number
  fee?: number
  syncedAt?: string | null
  entryPrice: number | null
  exitPrice: number | null
  stopLoss: number | null
  takeProfit: number | null
  lotSize: number | null
  riskAmount: number | null
  profitLoss: number | null
  playbook: string
  reason: string
  result: TradeResult
  rMultiple: number
  beforeScreenshot?: TradeScreenshot | null
  afterScreenshot?: TradeScreenshot | null
  mistakeTags?: TradeMistakeTag[]
  customMistakeTags?: string[]
  isFavorite?: boolean
}

export interface TradeFilters {
  keyword: string
  account: string
  result: 'all' | TradeResult
}

export interface TradeStatistics {
  totalTrades: number
  openTrades: number
  closedTrades: number
  winningTrades: number
  losingTrades: number
  breakevenTrades: number
  winRate: number
  totalProfitLoss: number
  averageR: number
}
