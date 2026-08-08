<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'

import { useTradeReviewStore } from '@/stores/useTradeReviewStore'
import { useTradeStore } from '@/stores/useTradeStore'

const tradeStore = useTradeStore()
const tradeReviewStore = useTradeReviewStore()

const {
  pendingReviewTrades,
} = storeToRefs(tradeStore)

const {
  sortedReviews,
  averageScore,
} = storeToRefs(tradeReviewStore)

const checklistValues = computed(() =>
  sortedReviews.value.flatMap(
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
  ),
)

const disciplineRate = computed(() => {
  if (checklistValues.value.length === 0) {
    return 0
  }

  const passed =
    checklistValues.value.filter(
      Boolean,
    ).length

  return Math.round(
    (
      passed /
      checklistValues.value.length
    ) * 100,
  )
})

const averageEmotionScore = computed(() => {
  if (sortedReviews.value.length === 0) {
    return 0
  }

  return Number(
    (
      sortedReviews.value.reduce(
        (total, review) =>
          total +
          review.emotionalControl,
        0,
      ) /
      sortedReviews.value.length
    ).toFixed(1),
  )
})

const averageExecutionScore =
  computed(() => {
    if (
      sortedReviews.value.length === 0
    ) {
      return 0
    }

    return Number(
      (
        sortedReviews.value.reduce(
          (total, review) =>
            total +
            review.executionScore,
          0,
        ) /
        sortedReviews.value.length
      ).toFixed(1),
    )
  })

const latestReview = computed(
  () => sortedReviews.value[0] ?? null,
)

const status = computed(() => {
  if (sortedReviews.value.length === 0) {
    return {
      label: '尚無復盤',
      message:
        '完成第一筆交易復盤後，系統會整理你的紀律與執行表現。',
      classes:
        'border-zinc-700 bg-zinc-800/70 text-zinc-300',
    }
  }

  if (averageScore.value >= 85) {
    return {
      label: '表現穩定',
      message:
        '目前整體復盤分數良好，維持相同執行標準。',
      classes:
        'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    }
  }

  if (averageScore.value >= 70) {
    return {
      label: '持續改善',
      message:
        '整體表現可以接受，優先修正最低分項目。',
      classes:
        'border-amber-500/25 bg-amber-500/10 text-amber-300',
    }
  }

  return {
    label: '需要調整',
    message:
      '近期復盤分數偏低，建議降低交易頻率並重新檢查流程。',
    classes:
      'border-rose-500/25 bg-rose-500/10 text-rose-300',
  }
})

const primaryFocus = computed(() => {
  if (pendingReviewTrades.value.length > 0) {
    return `先完成剩餘 ${pendingReviewTrades.value.length} 筆待復盤交易。`
  }

  if (disciplineRate.value < 80) {
    return '下一筆交易必須完整遵守盤前計畫與策略條件。'
  }

  if (averageEmotionScore.value < 7) {
    return '下一筆交易優先控制情緒，不因連勝或連敗改變風險。'
  }

  if (averageExecutionScore.value < 7) {
    return '下一筆只等待完整確認，不提前進場。'
  }

  return '維持目前紀律，繼續累積高品質交易樣本。'
})
</script>

<template>
  <section
    class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl shadow-black/10"
  >
    <header
      class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
    >
      <div>
        <p
          class="text-xs font-medium tracking-[0.2em] text-violet-400"
        >
          REVIEW INSIGHT
        </p>

        <h2
          class="mt-2 text-xl font-semibold text-zinc-100"
        >
          復盤品質摘要
        </h2>

        <p
          class="mt-1 text-sm leading-6 text-zinc-500"
        >
          集中查看紀律、情緒與執行品質。
        </p>
      </div>

      <span
        class="rounded-full border px-3 py-1.5 text-xs font-medium"
        :class="status.classes"
      >
        {{ status.label }}
      </span>
    </header>

    <div
      class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
    >
      <div
        class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
      >
        <p class="text-xs text-zinc-500">
          已完成復盤
        </p>

        <p
          class="mt-2 text-2xl font-semibold text-zinc-100"
        >
          {{ sortedReviews.length }}
        </p>
      </div>

      <div
        class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
      >
        <p class="text-xs text-zinc-500">
          待復盤
        </p>

        <p
          class="mt-2 text-2xl font-semibold text-amber-300"
        >
          {{ pendingReviewTrades.length }}
        </p>
      </div>

      <div
        class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
      >
        <p class="text-xs text-zinc-500">
          平均評分
        </p>

        <p
          class="mt-2 text-2xl font-semibold text-sky-300"
        >
          {{ averageScore }}
        </p>
      </div>

      <div
        class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
      >
        <p class="text-xs text-zinc-500">
          紀律達成率
        </p>

        <p
          class="mt-2 text-2xl font-semibold text-emerald-300"
        >
          {{ disciplineRate }}%
        </p>
      </div>

      <div
        class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
      >
        <p class="text-xs text-zinc-500">
          最新復盤
        </p>

        <p
          class="mt-2 text-2xl font-semibold text-zinc-100"
        >
          {{
            latestReview
              ? `${latestReview.totalScore} 分`
              : '—'
          }}
        </p>
      </div>
    </div>

    <div
      class="mt-5 grid gap-4 lg:grid-cols-3"
    >
      <div
        class="rounded-2xl border border-sky-500/15 bg-sky-500/5 p-5"
      >
        <p class="text-xs text-sky-300/70">
          平均情緒控制
        </p>

        <p
          class="mt-3 text-3xl font-semibold text-sky-300"
        >
          {{ averageEmotionScore }}
          <span class="text-sm text-zinc-600">
            ／10
          </span>
        </p>
      </div>

      <div
        class="rounded-2xl border border-violet-500/15 bg-violet-500/5 p-5"
      >
        <p class="text-xs text-violet-300/70">
          平均執行品質
        </p>

        <p
          class="mt-3 text-3xl font-semibold text-violet-300"
        >
          {{ averageExecutionScore }}
          <span class="text-sm text-zinc-600">
            ／10
          </span>
        </p>
      </div>

      <div
        class="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-5"
      >
        <p class="text-xs text-amber-300/70">
          下一步重點
        </p>

        <p
          class="mt-3 text-sm leading-7 text-zinc-200"
        >
          {{ primaryFocus }}
        </p>
      </div>
    </div>

    <div
      class="mt-5 flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <p class="text-sm leading-6 text-zinc-400">
        {{ status.message }}
      </p>

      <RouterLink
        to="/ai-coach"
        class="shrink-0 rounded-xl border border-violet-500/25 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-300 transition hover:border-violet-400/40 hover:bg-violet-500/15"
      >
        查看 AI 教練
      </RouterLink>
    </div>
  </section>
</template>