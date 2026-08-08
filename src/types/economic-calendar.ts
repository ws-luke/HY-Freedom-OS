export type EconomicImpact = 1 | 3 | 5

export type EconomicDataStatus =
  | 'live'
  | 'cached'
  | 'unavailable'

export interface EconomicEvent {
  id: string
  scheduledAt: string
  localDate: string
  time: string
  country: string
  currency: string
  title: string
  originalTitle: string
  indicator: string
  category: string
  impact: EconomicImpact
  previous: string
  forecast: string
  actual: string
  unit: string
  source: string
  sourceUrl: string
  description: string
  ticker: string
  isGoldRelevant: boolean
}

export interface TradingRestriction {
  eventId: string | null
  eventTitle: string
  startAt: string | null
  endAt: string | null
  start: string
  end: string
  isActive: boolean
  impact: EconomicImpact | null
}

export interface EconomicCalendarData {
  provider: 'TradingView'
  timezone: 'Asia/Taipei'
  fetchedAt: string
  events: EconomicEvent[]
}

export interface StoredEconomicCalendarState {
  version: 1
  data: EconomicCalendarData
}
