export type TradeDirection = 'buy' | 'sell'

export interface PendingReview {
  id: string
  symbol: string
  direction: TradeDirection
  date: string
  signal: string
  account: string
}
