<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'

import TradeReviewModal from '@/modules/trades/components/TradeReviewModal.vue'
import ReviewTradeContextModal from '../components/ReviewTradeContextModal.vue'
import { useNotificationStore } from '@/stores/useNotificationStore'
import { useTradeStore } from '@/stores/useTradeStore'
import { useTradeReviewStore } from '@/stores/useTradeReviewStore'
import ReviewInboxCard from '../components/ReviewInboxCard.vue'
import ReviewInsightSummaryCard from '../components/ReviewInsightSummaryCard.vue'
import ReviewProcessQualityCard from '../components/ReviewProcessQualityCard.vue'
import ReviewEvidencePipelineCard from '../components/ReviewEvidencePipelineCard.vue'
import type { StoredTradeReview, TradeReviewResult } from '@/types/trade-review'
import type { TradeRecord } from '@/types/trade'

const tradeStore = useTradeStore()
const tradeReviewStore = useTradeReviewStore()
const notificationStore = useNotificationStore()

const selectedTrade = ref<TradeRecord | null>(null)
const editModalOpen = ref(false)
const reviewModalOpen = ref(false)

const selectedExistingReview = computed(() =>
  selectedTrade.value
    ? tradeReviewStore.getReviewByTradeId(selectedTrade.value.id)
    : null,
)

const {
  sortedTrades,
  pendingReviewTrades,
} = storeToRefs(tradeStore)

const {
  sortedReviews,
  averageScore,
  completedReviewCount,
} = storeToRefs(tradeReviewStore)

const selectedScoreRange = ref<
  'all' | 'excellent' | 'good' | 'improve' | 'weak'
>('all')

const searchKeyword = ref('')

const reviewedTrades = computed(() =>
  sortedReviews.value
    .map(review => {
      const trade = sortedTrades.value.find(
        item => item.id === review.tradeId,
      )

      if (!trade) {
        return null
      }

      return {
        review,
        trade,
      }
    })
    .filter(
      (
        item,
      ): item is {
        review: StoredTradeReview
        trade: TradeRecord
      } => item !== null,
    ),
)

const filteredReviewedTrades = computed(() => {
  const keyword = searchKeyword.value
    .trim()
    .toLowerCase()

  return reviewedTrades.value.filter(item => {
    const { review, trade } = item

    const matchesKeyword =
      !keyword ||
      trade.symbol.toLowerCase().includes(keyword) ||
      trade.playbook.toLowerCase().includes(keyword) ||
      review.summary.toLowerCase().includes(keyword) ||
      review.mistakes.toLowerCase().includes(keyword) ||
      review.improvement.toLowerCase().includes(keyword)

    const matchesScore =
      selectedScoreRange.value === 'all' ||
      (selectedScoreRange.value === 'excellent' &&
        review.totalScore >= 90) ||
      (selectedScoreRange.value === 'good' &&
        review.totalScore >= 75 &&
        review.totalScore < 90) ||
      (selectedScoreRange.value === 'improve' &&
        review.totalScore >= 60 &&
        review.totalScore < 75) ||
      (selectedScoreRange.value === 'weak' &&
        review.totalScore < 60)

    return matchesKeyword && matchesScore
  })
})

const disciplineRate = computed(() => {
  if (sortedReviews.value.length === 0) {
    return 0
  }

  const checklistValues = sortedReviews.value.flatMap(
    review => [
      review.followedPlan,
      review.followedPlaybook,
      review.respectedRisk,
      review.waitedForConfirmation,
      review.avoidedNewsRisk,
    ],
  )

  const completedValues = checklistValues.filter(
    value => value !== null,
  )

  if (completedValues.length === 0) {
    return 0
  }

  const passedValues = completedValues.filter(
    value => value === true,
  ).length

  return Math.round(
    (passedValues / completedValues.length) * 100,
  )
})

const averageEmotionScore = computed(() => {
  if (sortedReviews.value.length === 0) {
    return 0
  }

  const total = sortedReviews.value.reduce(
    (sum, review) =>
      sum + review.emotionalControl,
    0,
  )

  return Number(
    (total / sortedReviews.value.length).toFixed(1),
  )
})

const averageExecutionScore = computed(() => {
  if (sortedReviews.value.length === 0) {
    return 0
  }

  const total = sortedReviews.value.reduce(
    (sum, review) =>
      sum + review.executionScore,
    0,
  )

  return Number(
    (total / sortedReviews.value.length).toFixed(1),
  )
})

const scoreLabel = (score: number): string => {
  if (score >= 90) {
    return '紀律表現優秀'
  }

  if (score >= 75) {
    return '整體執行良好'
  }

  if (score >= 60) {
    return '仍有改善空間'
  }

  return '需要重新檢視流程'
}

const scoreClasses = (score: number): string => {
  if (score >= 90) {
    return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
  }

  if (score >= 75) {
    return 'border-sky-500/25 bg-sky-500/10 text-sky-300'
  }

  if (score >= 60) {
    return 'border-amber-500/25 bg-amber-500/10 text-amber-300'
  }

  return 'border-rose-500/25 bg-rose-500/10 text-rose-300'
}

const checklistSummary = (
  review: StoredTradeReview,
): {
  passed: number
  total: number
} => {
  const values = [
    review.followedPlan,
    review.followedPlaybook,
    review.respectedRisk,
    review.waitedForConfirmation,
    review.avoidedNewsRisk,
  ]

  return {
    passed: values.filter(
      value => value === true,
    ).length,
    total: values.length,
  }
}

const clearFilters = (): void => {
  selectedScoreRange.value = 'all'
  searchKeyword.value = ''
}

const openManageTrade = (trade: TradeRecord): void => {
  selectedTrade.value = tradeStore.getTradeById(trade.id)
  editModalOpen.value = true
}

const closeManageTrade = (): void => {
  editModalOpen.value = false
  selectedTrade.value = null
}

const updateTradeContext = (
  tradeId: string,
  updates: Partial<TradeRecord>,
): void => {
  const updated = tradeStore.updateTrade(tradeId, updates)
  if (updated) {
    notificationStore.addNotification({
      type: 'success',
      title: '復盤資料已更新',
      message: `${updated.symbol} 的訊號、策略、理由與截圖已儲存。`,
      route: '/review',
    })
  }
  editModalOpen.value = false
  if (updated && updated.status !== 'completed' && updated.positionStatus === 'closed') {
    if (updated.status === 'waiting-review') tradeStore.markReviewing(updated.id)
    selectedTrade.value = tradeStore.getTradeById(updated.id)
    reviewModalOpen.value = true
  }
  else {
    selectedTrade.value = null
  }
}

const openReview = (trade: TradeRecord): void => {
  const current = tradeStore.getTradeById(trade.id)
  if (!current || current.positionStatus !== 'closed') return

  if (!tradeReviewStore.hasReview(current.id) && current.status === 'waiting-review') {
    tradeStore.markReviewing(current.id)
  }
  selectedTrade.value = tradeStore.getTradeById(current.id)
  reviewModalOpen.value = true
}

const closeReview = (): void => {
  reviewModalOpen.value = false
  selectedTrade.value = null
}

const submitReview = (review: TradeReviewResult): void => {
  const trade = tradeStore.getTradeById(review.tradeId)
  const wasExisting = tradeReviewStore.hasReview(review.tradeId)
  const saved = tradeReviewStore.saveReview(review)
  tradeStore.markReviewCompleted(review.tradeId)

  notificationStore.addNotification({
    type: saved.totalScore >= 80 ? 'success' : saved.totalScore >= 60 ? 'warning' : 'danger',
    title: wasExisting ? '交易復盤已更新' : '交易復盤已完成',
    message: `${trade?.symbol ?? '交易'} · ${saved.totalScore} 分 · 已納入交易系統統計`,
    route: '/review',
  })

  reviewModalOpen.value = false
  selectedTrade.value = null
}

const updateJournalContext = (
  tradeId: string,
  updates: Partial<TradeRecord>,
): void => {
  const updated = tradeStore.updateTrade(tradeId, updates)
  if (updated) selectedTrade.value = updated
}
</script>

<template>
  <div class="space-y-6 pb-10">
    
    <section
      class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl shadow-black/10"
    >
      <div
        class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"
      >
        <div>
          <h1 class="text-3xl font-bold text-zinc-100">
            Review Center v4 · Auto Review Pipeline
          </h1>

          <p class="mt-2 text-sm leading-6 text-zinc-400">
            MT5 平倉自動進 Inbox；補完交易背景後直接復盤，把執行品質、錯誤與下一筆唯一規則累積成交易系統。
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <div class="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-3">
            <p class="text-xs text-amber-300/70">待完成復盤</p>
            <p class="mt-1 text-2xl font-semibold text-amber-300">{{ pendingReviewTrades.length }} 筆</p>
          </div>
          <RouterLink
            to="/trade-analytics"
            class="rounded-2xl border border-violet-500/20 bg-violet-500/[0.07] px-5 py-3 text-sm font-medium text-violet-300 transition hover:border-violet-400/35 hover:bg-violet-500/10"
          >
            查看 Analytics →
          </RouterLink>
        </div>
      </div>
    </section>
    <ReviewInsightSummaryCard />
    <ReviewProcessQualityCard />
    <ReviewEvidencePipelineCard @manage="openManageTrade" />
    <ReviewInboxCard
      :trades="pendingReviewTrades"
      @manage="openManageTrade"
      @review="openReview"
    />
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
      >
        <p class="text-sm text-zinc-500">
          已完成復盤
        </p>

        <p class="mt-3 text-3xl font-semibold text-zinc-100">
          {{ completedReviewCount }}
        </p>
      </section>

      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
      >
        <p class="text-sm text-zinc-500">
          平均復盤分數
        </p>

        <p class="mt-3 text-3xl font-semibold text-amber-300">
          {{ averageScore }}
        </p>
      </section>

      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
      >
        <p class="text-sm text-zinc-500">
          紀律達成率
        </p>

        <p class="mt-3 text-3xl font-semibold text-emerald-300">
          {{ disciplineRate }}%
        </p>
      </section>

      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
      >
        <p class="text-sm text-zinc-500">
          情緒／執行
        </p>

        <p class="mt-3 text-3xl font-semibold text-sky-300">
          {{ averageEmotionScore }}
          ／
          {{ averageExecutionScore }}
        </p>
      </section>
    </div>

    <section
      class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
    >
      <div class="grid gap-3 md:grid-cols-2">
        <input
          v-model="searchKeyword"
          type="search"
          placeholder="搜尋商品、策略、錯誤或改善內容"
          class="rounded-2xl border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-amber-500/40"
        />

        <select
          v-model="selectedScoreRange"
          class="rounded-2xl border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-300 outline-none focus:border-amber-500/40"
        >
          <option value="all">
            全部分數
          </option>

          <option value="excellent">
            90 分以上
          </option>

          <option value="good">
            75－89 分
          </option>

          <option value="improve">
            60－74 分
          </option>

          <option value="weak">
            60 分以下
          </option>
        </select>
      </div>
    </section>

    <section
      class="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/70 shadow-xl shadow-black/10"
    >
      <header class="border-b border-zinc-800 p-6">
        <h2 class="text-xl font-semibold text-zinc-100">
          已完成復盤
        </h2>

        <p class="mt-1 text-sm text-zinc-500">
          目前顯示
          {{ filteredReviewedTrades.length }}
          筆復盤紀錄
        </p>
      </header>

      <div
        v-if="filteredReviewedTrades.length"
        class="divide-y divide-zinc-800"
      >
        <article
          v-for="item in filteredReviewedTrades"
          :key="item.review.id"
          class="p-6 transition hover:bg-zinc-800/25"
        >
          <div
            class="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between"
          >
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-xl font-semibold text-zinc-100">
                  {{ item.trade.symbol }}
                </h3>

                <span
                  class="rounded-full border px-2.5 py-1 text-xs font-medium"
                  :class="scoreClasses(item.review.totalScore)"
                >
                  {{ item.review.totalScore }} 分
                </span>

                <span
                  class="rounded-full border border-zinc-700 bg-zinc-800/70 px-2.5 py-1 text-xs text-zinc-300"
                >
                  {{
                    scoreLabel(
                      item.review.totalScore,
                    )
                  }}
                </span>
              </div>

              <p class="mt-3 font-medium text-amber-300">
                {{ item.trade.playbook }}
              </p>

              <p class="mt-2 text-sm text-zinc-500">
                {{ item.trade.date }}
                {{ item.trade.time }}
                ·
                {{ item.trade.account }}
              </p>

              <div class="mt-5 grid gap-3 sm:grid-cols-3">
                <div
                  class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
                >
                  <p class="text-xs text-zinc-500">
                    紀律檢查
                  </p>

                  <p class="mt-2 text-lg font-semibold text-zinc-100">
                    {{
                      checklistSummary(
                        item.review,
                      ).passed
                    }}
                    ／
                    {{
                      checklistSummary(
                        item.review,
                      ).total
                    }}
                  </p>
                </div>

                <div
                  class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
                >
                  <p class="text-xs text-zinc-500">
                    情緒控制
                  </p>

                  <p class="mt-2 text-lg font-semibold text-sky-300">
                    {{ item.review.emotionalControl }}
                    ／10
                  </p>
                </div>

                <div
                  class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
                >
                  <p class="text-xs text-zinc-500">
                    執行品質
                  </p>

                  <p class="mt-2 text-lg font-semibold text-amber-300">
                    {{ item.review.executionScore }}
                    ／10
                  </p>
                </div>
              </div>
            </div>

            <div class="xl:w-[430px]">
              <div
                class="rounded-2xl border border-rose-500/15 bg-rose-500/5 p-4"
              >
                <p class="text-xs font-medium text-rose-300">
                  本次主要錯誤
                </p>

                <p class="mt-2 text-sm leading-6 text-zinc-300">
                  {{ item.review.mistakes }}
                </p>
              </div>

              <div
                class="mt-3 rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4"
              >
                <p class="text-xs font-medium text-amber-300">
                  下次改善方式
                </p>

                <p class="mt-2 text-sm leading-6 text-zinc-300">
                  {{ item.review.improvement }}
                </p>
              </div>

              <div
                class="mt-3 rounded-2xl border border-sky-500/15 bg-sky-500/5 p-4"
              >
                <p class="text-xs font-medium text-sky-300">
                  下一筆唯一規則
                </p>

                <p class="mt-2 text-sm font-medium leading-6 text-zinc-200">
                  {{ item.review.nextTradeRule }}
                </p>
              </div>
            </div>
          </div>

          <div
            class="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"
          >
            <p class="text-xs text-zinc-500">
              交易總結
            </p>

            <p class="mt-2 text-sm leading-7 text-zinc-300">
              {{ item.review.summary }}
            </p>
          </div>

          <div class="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              class="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
              @click="openManageTrade(item.trade)"
            >
              編輯交易背景
            </button>
            <button
              type="button"
              class="rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-4 py-2 text-xs font-medium text-amber-300 transition hover:border-amber-400/35 hover:bg-amber-500/10"
              @click="openReview(item.trade)"
            >
              查看／修改復盤
            </button>
          </div>
        </article>
      </div>

      <div
        v-else
        class="p-12 text-center"
      >
        <p class="text-zinc-400">
          目前沒有符合篩選條件的復盤紀錄。
        </p>

        <button
          type="button"
          class="mt-4 text-sm font-medium text-amber-300"
          @click="clearFilters"
        >
          清除篩選條件
        </button>
      </div>
    </section>

    <ReviewTradeContextModal
      :open="editModalOpen"
      :trade="selectedTrade"
      @close="closeManageTrade"
      @submit="updateTradeContext"
    />

    <TradeReviewModal
      :open="reviewModalOpen"
      :trade="selectedTrade"
      :existing-review="selectedExistingReview"
      @close="closeReview"
      @update-trade="updateJournalContext"
      @submit="submitReview"
    />
  </div>
</template>
