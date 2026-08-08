import type { WatchlistItem } from '@/types'

export const mockWatchlist: WatchlistItem[] = [
  {
    id: 'xauusd',
    symbol: 'XAUUSD',
    name: '黃金／美元',
    category: '主要交易商品',
    timeframe: 'H4 → H1 → M15',
    bias: 'bullish',
    status: 'waiting',
    currentPrice: '等待即時行情',
    focus: '等待 H1 回踩支撐，低週期出現確認訊號',
  },
  {
    id: 'dxy',
    symbol: 'DXY',
    name: '美元指數',
    category: '關聯市場',
    timeframe: 'H1',
    bias: 'neutral',
    status: 'waiting',
    currentPrice: '等待即時行情',
    focus: '觀察美元方向是否與黃金交易劇本衝突',
  },
  {
    id: 'us10y',
    symbol: 'US10Y',
    name: '美國十年期公債殖利率',
    category: '關聯市場',
    timeframe: 'H1',
    bias: 'bearish',
    status: 'avoid',
    currentPrice: '等待即時行情',
    focus: '重大數據公布前暫停建立新部位',
  },
]
