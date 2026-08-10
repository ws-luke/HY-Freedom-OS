import type { TradeDirection, TradeResult, TradeScreenshot } from './trade'

export interface WeeklyReportTrade {
  id: string
  date: string
  time: string
  symbol: string
  account: string
  direction: TradeDirection
  result: TradeResult
  entryPrice: number
  exitPrice: number
  lotSize: number
  profitLoss: number
  commission: number
  swap: number
  fee: number
  signal: string
  playbook: string
  reason: string
  beforeScreenshot: TradeScreenshot | null
  afterScreenshot: TradeScreenshot | null
  review: {
    summary: string
    strengths: string
    mistakes: string
    improvement: string
    nextTradeRule: string
    executionScore: number
    emotionalControl: number
    totalScore: number
  } | null
}

export interface WeeklyReportSnapshot {
  version: 1
  generatedAt: string
  weekStart: string
  weekEnd: string
  account: string
  statistics: {
    totalTrades: number
    wins: number
    losses: number
    breakeven: number
    winRate: number
    grossProfitLoss: number
    commission: number
    swap: number
    fee: number
    netProfitLoss: number
  }
  reflection: {
    summary: string
    strengths: string
    improvements: string
    nextWeekGoal: string
  }
  trades: WeeklyReportTrade[]
}

export interface WeeklyReportRecord {
  id: string
  weekStart: string
  weekEnd: string
  title: string
  shareToken: string
  isPublished: boolean
  expiresAt: string | null
  publishedAt: string
  snapshot: WeeklyReportSnapshot
}

export interface PublicWeeklyReport {
  title: string
  publishedAt: string
  expiresAt: string | null
  snapshot: WeeklyReportSnapshot
}
