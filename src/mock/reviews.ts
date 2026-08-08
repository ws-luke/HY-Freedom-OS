import type { PendingReview } from '@/types'

export const mockPendingReviews: PendingReview[] = [
  {
    id: 'review-1',
    symbol: 'XAUUSD',
    direction: 'buy',
    date: '2026/08/01',
    signal: 'W 型＋支撐反轉',
    account: 'FTMO 100K',
  },
  {
    id: 'review-2',
    symbol: 'XAUUSD',
    direction: 'sell',
    date: '2026/07/31',
    signal: 'M 型＋壓力反轉',
    account: 'Demo Practice',
  },
]
