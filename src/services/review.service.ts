import { mockPendingReviews } from '@/mock'
import type { PendingReview } from '@/types'

export const reviewService = {
  getPending(): PendingReview[] {
    return structuredClone(mockPendingReviews)
  },
}
