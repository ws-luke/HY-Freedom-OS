export type EventImpact = 'high' | 'medium' | 'low'

export interface EconomicEvent {
  id: string
  time: string
  currency: string
  title: string
  impact: EventImpact
  previous?: string
  forecast?: string
}
