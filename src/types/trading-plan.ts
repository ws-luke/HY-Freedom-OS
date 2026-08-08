export type MarketBias = 'bullish' | 'bearish' | 'range' | 'wait'

export interface TradingPlan {
  date: string
  symbol: string
  marketBias: MarketBias
  h4Trend: string
  h1Trend: string
  m15Structure: string
  supportZones: string
  resistanceZones: string
  allowedConditions: string
  prohibitedConditions: string
  waitingSignals: string[]
  focusRule: string
  maxTrades: number
  maxRiskPercent: number
  notes: string
  completed: boolean
  updatedAt: string
}
