export type PlaybookDirection =
  | 'buy'
  | 'sell'
  | 'both'

export type PlaybookStatus =
  | 'active'
  | 'testing'
  | 'paused'

export interface PlaybookRecord {
  id: string
  name: string
  shortName: string
  description: string
  direction: PlaybookDirection
  status: PlaybookStatus
  timeframe: string
  marketCondition: string
  entryConditions: string[]
  avoidConditions: string[]
  totalTrades: number
  wins: number
  averageR: number
  rating: number
  createdAt: string
  updatedAt: string
}

export interface NewPlaybookInput {
  name: string
  shortName: string
  description: string
  direction: PlaybookDirection
  status: PlaybookStatus
  timeframe: string
  marketCondition: string
  entryConditions: string[]
  avoidConditions: string[]
  rating: number
}

export interface PlaybookStatistics {
  totalPlaybooks: number
  activePlaybooks: number
  testingPlaybooks: number
  pausedPlaybooks: number
  totalTrades: number
  totalWins: number
  overallWinRate: number
  averageR: number
}

export interface PlaybookFilters {
  keyword: string
  direction: 'all' | PlaybookDirection
  status: 'all' | PlaybookStatus
}