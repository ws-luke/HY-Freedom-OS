import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { queueCloudDeletion } from '@/services/cloud/cloud-deletion.service'

import type {
  StoredTradeReview,
  TradeReviewResult,
} from '@/types/trade-review'

const STORAGE_KEY = 'hy-freedom-os:trade-reviews'

const normalizeReview = (
  review: StoredTradeReview,
): StoredTradeReview => ({
  ...review,
  nextTradeRule:
    typeof review.nextTradeRule === 'string' && review.nextTradeRule.trim()
      ? review.nextTradeRule.trim()
      : typeof review.improvement === 'string'
        ? review.improvement.trim()
        : '',
})

const readStoredReviews = (): StoredTradeReview[] => {
  if (typeof window === 'undefined') {
    return []
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY)

  if (!rawValue) {
    return []
  }

  try {
    const parsedValue = JSON.parse(rawValue) as StoredTradeReview[]

    return Array.isArray(parsedValue)
      ? parsedValue.map(normalizeReview)
      : []
  } catch {
    return []
  }
}

export const useTradeReviewStore = defineStore(
  'trade-reviews',
  () => {
    const reviews = ref<StoredTradeReview[]>(
      readStoredReviews(),
    )

    const sortedReviews = computed(() =>
      [...reviews.value].sort((a, b) => {
        return (
          new Date(b.completedAt).getTime() -
          new Date(a.completedAt).getTime()
        )
      }),
    )

    const averageScore = computed(() => {
      if (reviews.value.length === 0) {
        return 0
      }

      const totalScore = reviews.value.reduce(
        (total, review) =>
          total + review.totalScore,
        0,
      )

      return Math.round(
        totalScore / reviews.value.length,
      )
    })

    const completedReviewCount = computed(
      () => reviews.value.length,
    )

    const save = (): void => {
      if (typeof window === 'undefined') {
        return
      }

      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(reviews.value),
      )
    }

    const getReviewByTradeId = (
      tradeId: string,
    ): StoredTradeReview | null => {
      return (
        reviews.value.find(
          review => review.tradeId === tradeId,
        ) ?? null
      )
    }

    const hasReview = (
      tradeId: string,
    ): boolean => {
      return reviews.value.some(
        review => review.tradeId === tradeId,
      )
    }

    const saveReview = (
      input: TradeReviewResult,
    ): StoredTradeReview => {
      const now = new Date().toISOString()

      const existingReview = reviews.value.find(
        review => review.tradeId === input.tradeId,
      )

      if (existingReview) {
        Object.assign(existingReview, {
          ...input,
          updatedAt: now,
        })

        return existingReview
      }

      const review: StoredTradeReview = {
        ...normalizeReview(input as StoredTradeReview),
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      }

      reviews.value.unshift(review)

      return review
    }

    const removeReview = (
      reviewId: string,
    ): void => {
      queueCloudDeletion('trade_reviews', reviewId)
      reviews.value = reviews.value.filter(
        review => review.id !== reviewId,
      )
    }

    const removeReviewByTradeId = (
      tradeId: string,
    ): void => {
      reviews.value
        .filter(review => review.tradeId === tradeId)
        .forEach(review => queueCloudDeletion('trade_reviews', review.id))
      reviews.value = reviews.value.filter(
        review => review.tradeId !== tradeId,
      )
    }

    const reassignReviewTradeId = (
      fromTradeId: string,
      toTradeId: string,
    ): void => {
      if (!fromTradeId || !toTradeId || fromTradeId === toTradeId) return

      const source = reviews.value.find(review => review.tradeId === fromTradeId)
      if (!source) return

      const target = reviews.value.find(review => review.tradeId === toTradeId)
      if (target) {
        queueCloudDeletion('trade_reviews', source.id)
        reviews.value = reviews.value.filter(review => review.id !== source.id)
        return
      }

      source.tradeId = toTradeId
      source.updatedAt = new Date().toISOString()
    }

    const resetReviews = (): void => {
      reviews.value.forEach(review => queueCloudDeletion('trade_reviews', review.id))
      reviews.value = []
    }

    watch(
      reviews,
      save,
      {
        deep: true,
      },
    )

    return {
      reviews,
      sortedReviews,
      averageScore,
      completedReviewCount,
      getReviewByTradeId,
      hasReview,
      saveReview,
      removeReview,
      removeReviewByTradeId,
      reassignReviewTradeId,
      resetReviews,
    }
  },
)
