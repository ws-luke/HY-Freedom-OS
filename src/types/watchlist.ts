export type MarketBias = 'bullish' | 'bearish' | 'neutral'
export type WatchStatus = 'waiting' | 'ready' | 'avoid'

export interface WatchlistItem {
  id: string
  symbol: string
  name: string
  category: string
  timeframe: string
  bias: MarketBias
  status: WatchStatus
  currentPrice: string
  focus: string
}
