import { mockWatchlist } from '@/mock'
import type { WatchlistItem } from '@/types'

export const watchlistService = {
  getAll(): WatchlistItem[] {
    return structuredClone(mockWatchlist)
  },
}
