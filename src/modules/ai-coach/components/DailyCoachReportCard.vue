<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useTradeReviewStore } from '@/stores/useTradeReviewStore'
import { useTradeStore } from '@/stores/useTradeStore'
import { useTradingRiskStore } from '@/stores/useTradingRiskStore'

import type { TradeRecord } from '@/types/trade'

const tradeStore = useTradeStore()
const tradeReviewStore = useTradeReviewStore()
const tradingRiskStore = useTradingRiskStore()

const {
  sortedClosedTrades: sortedTrades,
} = storeToRefs(tradeStore)

const {
  sortedReviews,
} = storeToRefs(tradeReviewStore)

const {
  risk,
} = storeToRefs(tradingRiskStore)

const getLocalDateKey = (
  date: Date,
): string => {
  const year = date.getFullYear()

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0')

  const day = String(
    date.getDate(),
  ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const normalizeDate = (
  value: string,
): string =>
  value.trim().replaceAll('/', '-')

const todayKey = computed(() =>
  getLocalDateKey(new Date()),
)

const todayTrades = computed(() =>
  sortedTrades.value.filter(
    trade =>
      normalizeDate(trade.date) ===
      todayKey.value,
  ),
)

const todayReviews = computed(() => {
  const todayTradeIds = new Set(
    todayTrades.value.map(
      trade => trade.id,
    ),
  )

  return sortedReviews.value.filter(
    review =>
      todayTradeIds.has(review.tradeId),
  )
})

const totalProfitLoss = computed(() =>
  todayTrades.value.reduce(
    (total, trade) =>
      total + trade.profitLoss,
    0,
  ),
)

const averageR = computed(() => {
  if (todayTrades.value.length === 0) {
    return 0
  }

  const totalR = todayTrades.value.reduce(
    (total, trade) =>
      total + trade.rMultiple,
    0,
  )

  return Number(
    (
      totalR /
      todayTrades.value.length
    ).toFixed(2),
  )
})

const winRate = computed(() => {
  if (todayTrades.value.length === 0) {
    return 0
  }

  const wins = todayTrades.value.filter(
    trade => trade.result === 'win',
  ).length

  return Math.round(
    (
      wins /
      todayTrades.value.length
    ) * 100,
  )
})

const reviewCompletionRate = computed(() => {
  if (todayTrades.value.length === 0) {
    return 0
  }

  return Math.min(
    100,
    Math.round(
      (
        todayReviews.value.length /
        todayTrades.value.length
      ) * 100,
    ),
  )
})

const averageReviewScore = computed(() => {
  if (todayReviews.value.length === 0) {
    return 0
  }

  const total = todayReviews.value.reduce(
    (sum, review) =>
      sum + review.totalScore,
    0,
  )

  return Math.round(
    total /
    todayReviews.value.length,
  )
})

const disciplineRate = computed(() => {
  const values = todayReviews.value.flatMap(
    review => [
      review.followedPlan,
      review.followedPlaybook,
      review.respectedRisk,
      review.waitedForConfirmation,
      review.avoidedNewsRisk,
    ],
  ).filter(
    (
      value,
    ): value is boolean =>
      value !== null,
  )

  if (values.length === 0) {
    return 0
  }

  const passed = values.filter(
    Boolean,
  ).length

  return Math.round(
    (passed / values.length) * 100,
  )
})

const mistakeCount = computed(() =>
  todayTrades.value.reduce(
    (total, trade) =>
      total +
      trade.mistakeTags.length +
      trade.customMistakeTags.length,
    0,
  ),
)

const riskScore = computed(() => {
  if (risk.value.level === 'blocked') {
    return 35
  }

  if (risk.value.level === 'warning') {
    return 70
  }

  const oversizedTrades =
    todayTrades.value.filter(
      trade =>
        trade.riskAmount >
        tradingRiskStore.settings
          .maxRiskPerTrade,
    ).length

  if (oversizedTrades > 0) {
    return 50
  }

  return 100
})

const executionScore = computed(() => {
  if (todayReviews.value.length === 0) {
    return todayTrades.value.length > 0
      ? 50
      : 0
  }

  const total =
    todayReviews.value.reduce(
      (sum, review) =>
        sum +
        review.executionScore * 10,
      0,
    )

  return Math.round(
    total /
    todayReviews.value.length,
  )
})

const finalScore = computed(() => {
  if (todayTrades.value.length === 0) {
    return 0
  }

  const performanceScore = Math.max(
    0,
    Math.min(
      100,
      50 +
        averageR.value * 15 +
        (
          winRate.value - 50
        ) * 0.3,
    ),
  )

  const reviewScore =
    todayReviews.value.length > 0
      ? averageReviewScore.value
      : 40

  const mistakePenalty = Math.min(
    25,
    mistakeCount.value * 5,
  )

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        performanceScore * 0.25 +
        disciplineRate.value * 0.25 +
        riskScore.value * 0.25 +
        executionScore.value * 0.15 +
        reviewScore * 0.1 -
        mistakePenalty,
      ),
    ),
  )
})

const grade = computed(() => {
  if (todayTrades.value.length === 0) {
    return {
      label: '尚無交易',
      description:
        '今天尚未建立交易紀錄。',
      classes:
        'border-zinc-700 bg-zinc-800/70 text-zinc-300',
    }
  }

  if (finalScore.value >= 90) {
    return {
      label: 'A+',
      description:
        '今天的交易紀律與執行品質非常穩定。',
      classes:
        'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    }
  }

  if (finalScore.value >= 80) {
    return {
      label: 'A',
      description:
        '整體表現良好，維持相同進場與風控標準。',
      classes:
        'border-sky-500/30 bg-sky-500/10 text-sky-300',
    }
  }

  if (finalScore.value >= 70) {
    return {
      label: 'B',
      description:
        '今天可以接受，但仍有明確改善空間。',
      classes:
        'border-amber-500/30 bg-amber-500/10 text-amber-300',
    }
  }

  return {
    label: 'C',
    description:
      '今天的紀律或風險狀態需要優先修正。',
    classes:
      'border-rose-500/30 bg-rose-500/10 text-rose-300',
  }
})

const topStrength = computed(() => {
  if (todayTrades.value.length === 0) {
    return '今天尚無交易資料。'
  }

  if (
    disciplineRate.value >= 85 &&
    todayReviews.value.length > 0
  ) {
    return `交易規則達成率 ${disciplineRate.value}%，紀律表現穩定。`
  }

  if (averageR.value >= 1.5) {
    return `平均報酬達到 ${averageR.value.toFixed(2)}R，風險報酬表現良好。`
  }

  if (winRate.value >= 60) {
    return `今日勝率 ${winRate.value}%，進場判斷具有效率。`
  }

  if (riskScore.value === 100) {
    return '今日沒有超額風險紀錄。'
  }

  return '今天有完成交易紀錄，具備後續復盤資料。'
})

const topWeakness = computed(() => {
  if (todayTrades.value.length === 0) {
    return '建立交易後才會產生分析。'
  }

  if (risk.value.level === 'blocked') {
    return (
      risk.value.stopReason ||
      '今日已觸發風控限制。'
    )
  }

  if (reviewCompletionRate.value < 100) {
    return `今天仍有 ${
      todayTrades.value.length -
      todayReviews.value.length
    } 筆交易尚未完成復盤。`
  }

  if (mistakeCount.value > 0) {
    return `今天共記錄 ${mistakeCount.value} 個交易錯誤標籤。`
  }

  if (disciplineRate.value < 80) {
    return `交易規則達成率只有 ${disciplineRate.value}%。`
  }

  if (averageR.value < 0) {
    return `今日平均報酬為 ${averageR.value.toFixed(2)}R。`
  }

  return '目前沒有明顯重大問題。'
})

const tomorrowFocus = computed(() => {
  if (todayTrades.value.length === 0) {
    return '明天只等待完全符合 Playbook 的 A+ 機會。'
  }

  if (risk.value.level === 'blocked') {
    return '先完成今日復盤，明天重新從固定風險開始。'
  }

  if (reviewCompletionRate.value < 100) {
    return '先完成所有未復盤交易，再調整任何交易規則。'
  }

  if (mistakeCount.value > 0) {
    return '明天只專注避免今天出現的第一個錯誤。'
  }

  if (disciplineRate.value < 80) {
    return '下一筆交易必須完整確認趨勢、位置與進場訊號。'
  }

  return '維持固定風險，只交易完整符合策略的機會。'
})

const scoreClasses = computed(() => {
  if (finalScore.value >= 85) {
    return 'text-emerald-300'
  }

  if (finalScore.value >= 70) {
    return 'text-amber-300'
  }

  return 'text-rose-300'
})

const formatMoney = (
  value: number,
): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)

const profitLossClasses = (
  value: number,
): string => {
  if (value > 0) {
    return 'text-emerald-300'
  }

  if (value < 0) {
    return 'text-rose-300'
  }

  return 'text-zinc-300'
}
</script>

<template>
  <section
    class="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl shadow-black/10"
  >
    <div
      class="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl"
    />

    <div class="relative">
      <header
        class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <p
            class="text-xs font-medium tracking-[0.2em] text-violet-400"
          >
            DAILY AI REPORT
          </p>

          <h2
            class="mt-2 text-xl font-semibold text-zinc-100"
          >
            今日 AI 教練報告
          </h2>

          <p
            class="mt-1 text-sm leading-6 text-zinc-500"
          >
            根據今日交易、復盤、風控與錯誤標籤產生。
          </p>
        </div>

        <span
          class="rounded-full border px-4 py-2 text-sm font-semibold"
          :class="grade.classes"
        >
          {{ grade.label }}
        </span>
      </header>

      <div
        class="mt-6 grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]"
      >
        <div
          class="flex flex-col items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-950/60 p-6 text-center"
        >
          <p class="text-sm text-zinc-500">
            今日綜合評分
          </p>

          <p
            class="mt-3 text-6xl font-bold"
            :class="scoreClasses"
          >
            {{ finalScore }}
          </p>

          <p class="mt-2 text-sm text-zinc-600">
            ／100
          </p>

          <p
            class="mt-4 text-sm leading-6 text-zinc-400"
          >
            {{ grade.description }}
          </p>
        </div>

        <div
          class="grid gap-4 sm:grid-cols-2"
        >
          <div
            class="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-5"
          >
            <p class="text-xs text-emerald-300/70">
              今天做得最好
            </p>

            <p
              class="mt-3 text-sm leading-7 text-zinc-200"
            >
              {{ topStrength }}
            </p>
          </div>

          <div
            class="rounded-2xl border border-rose-500/15 bg-rose-500/5 p-5"
          >
            <p class="text-xs text-rose-300/70">
              最大問題
            </p>

            <p
              class="mt-3 text-sm leading-7 text-zinc-200"
            >
              {{ topWeakness }}
            </p>
          </div>

          <div
            class="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-5 sm:col-span-2"
          >
            <p class="text-xs text-amber-300/70">
              明日改善重點
            </p>

            <p
              class="mt-3 text-lg font-semibold leading-8 text-amber-200"
            >
              {{ tomorrowFocus }}
            </p>
          </div>
        </div>
      </div>

      <div
        class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
      >
        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"
        >
          <p class="text-xs text-zinc-500">
            今日交易
          </p>

          <p class="mt-2 text-xl font-semibold text-zinc-100">
            {{ todayTrades.length }}
          </p>
        </div>

        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"
        >
          <p class="text-xs text-zinc-500">
            今日盈虧
          </p>

          <p
            class="mt-2 text-xl font-semibold"
            :class="
              profitLossClasses(
                totalProfitLoss,
              )
            "
          >
            {{ totalProfitLoss > 0 ? '+' : '' }}
            {{ formatMoney(totalProfitLoss) }}
          </p>
        </div>

        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"
        >
          <p class="text-xs text-zinc-500">
            平均報酬
          </p>

          <p
            class="mt-2 text-xl font-semibold"
            :class="
              profitLossClasses(
                averageR,
              )
            "
          >
            {{ averageR.toFixed(2) }}R
          </p>
        </div>

        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"
        >
          <p class="text-xs text-zinc-500">
            紀律達成率
          </p>

          <p class="mt-2 text-xl font-semibold text-sky-300">
            {{ disciplineRate }}%
          </p>
        </div>

        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"
        >
          <p class="text-xs text-zinc-500">
            復盤完成率
          </p>

          <p class="mt-2 text-xl font-semibold text-amber-300">
            {{ reviewCompletionRate }}%
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
