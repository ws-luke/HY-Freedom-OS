export type MarketBias = 'bullish' | 'bearish' | 'range' | 'wait'

export type LegendSessionKey = 'asia' | 'europe' | 'us'
export type LegendTimeframeKey = 'm5' | 'm15m30' | 'h1' | 'h4' | 'd1'
export type LegendDirection = 'long' | 'short' | 'range' | 'wait'
export type LegendPhase = 'drive' | 'pullback' | 'transition' | 'wait'

export interface LegendTimeframePlan {
  direction: LegendDirection
  phase: LegendPhase
  patternWave: string
}

export interface LegendSessionPlan {
  key: LegendSessionKey
  label: string
  hours: string
  timeframes: Record<LegendTimeframeKey, LegendTimeframePlan>
  preSessionAssessment: string
  asiaDevelopment: string
  europeDevelopment: string
}

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
  news: string
  sessions: Record<LegendSessionKey, LegendSessionPlan>
  mindsetReminder: string
  version: 3
}

export interface TradingPlanHistoryState {
  plans: TradingPlan[]
  updatedAt: string
}
