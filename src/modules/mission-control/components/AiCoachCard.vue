<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'

import { useTradeReviewStore } from '@/stores/useTradeReviewStore'
import { useTradeStore } from '@/stores/useTradeStore'

import type {
  TradeMistakeTag,
} from '@/types/trade'

interface MistakeDefinition {
  tag: TradeMistakeTag
  label: string
  solution: string
}

const tradeStore = useTradeStore()
const tradeReviewStore = useTradeReviewStore()

const {
  sortedTrades,
  statistics,
  pendingReviewTrades,
} = storeToRefs(tradeStore)

const {
  sortedReviews,
  averageScore,
  completedReviewCount,
} = storeToRefs(tradeReviewStore)

const mistakeDefinitions: MistakeDefinition[] = [
  {
    tag: 'fomo',
    label: 'FOMO 追價',
    solution:
      '價格離開原定進場區後直接放棄，不追已經啟動的行情。',
  },
  {
    tag: 'overtrade',
    label: '過度交易',
    solution:
      '設定每日交易次數上限，達到上限後停止交易。',
  },
  {
    tag: 'early-entry',
    label: '過早進場',
    solution:
      '等待指定週期收線與結構確認後才允許進場。',
  },
  {
    tag: 'late-entry',
    label: '太晚進場',
    solution:
      '錯過理想位置後放棄交易，不用較差的風險報酬追價。',
  },
  {
    tag: 'early-exit',
    label: '過早離場',
    solution:
      '只依照停損、停利或結構失效條件離場。',
  },
  {
    tag: 'late-exit',
    label: '太晚離場',
    solution:
      '原定離場條件成立後立即執行，不臨時改變計畫。',
  },
  {
    tag: 'moved-stop',
    label: '移動停損',
    solution:
      '停損只能縮小風險，禁止往增加風險的方向移動。',
  },
  {
    tag: 'oversized-risk',
    label: '風險過大',
    solution:
      '下單前先確認固定風險金額，再計算正確部位大小。',
  },
  {
    tag: 'ignored-trend',
    label: '忽略趨勢',
    solution:
      '先確認 4H 與 1H 結構方向，再尋找低週期訊號。',
  },
  {
    tag: 'ignored-news',
    label: '忽略新聞',
    solution:
      '重大數據公布前後依照系統限制停止建立新倉。',
  },
  {
    tag: 'revenge-trade',
    label: '報復交易',
    solution:
      '虧損後強制暫停，至少等待一個完整交易週期。',
  },
  {
    tag: 'no-confirmation',
    label: '沒有確認',
    solution:
      '所有進場確認條件完成後，才允許建立交易。',
  },
]

const reviewCompletionRate = computed(() => {
  if (statistics.value.totalTrades === 0) {
    return 0
  }

  return Math.min(
    100,
    Math.round(
      (
        completedReviewCount.value /
        statistics.value.totalTrades
      ) * 100,
    ),
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
    (
      total /
      sortedReviews.value.length
    ).toFixed(1),
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
    (
      total /
      sortedReviews.value.length
    ).toFixed(1),
  )
})

const disciplineItems = computed(() => {
  const definitions = [
    {
      key: 'followedPlan',
      label: '符合盤前規劃',
    },
    {
      key: 'followedPlaybook',
      label: '符合交易策略',
    },
    {
      key: 'respectedRisk',
      label: '遵守風險限制',
    },
    {
      key: 'waitedForConfirmation',
      label: '等待確認訊號',
    },
    {
      key: 'avoidedNewsRisk',
      label: '避開新聞風險',
    },
  ] as const

  return definitions.map(definition => {
    const values = sortedReviews.value
      .map(review => review[definition.key])
      .filter(value => value !== null)

    const passed = values.filter(
      value => value === true,
    ).length

    return {
      key: definition.key,
      label: definition.label,
      total: values.length,
      rate:
        values.length > 0
          ? Math.round(
              (
                passed /
                values.length
              ) * 100,
            )
          : 0,
    }
  })
})

const weakestDiscipline = computed(() => {
  const available =
    disciplineItems.value.filter(
      item => item.total > 0,
    )

  if (available.length === 0) {
    return null
  }

  return [...available].sort(
    (a, b) => a.rate - b.rate,
  )[0]
})

const mistakeStatistics = computed(() => {
  return mistakeDefinitions
    .map(definition => {
      const trades =
        sortedTrades.value.filter(trade =>
          trade.mistakeTags.includes(
            definition.tag,
          ),
        )

      return {
        ...definition,
        count: trades.length,
        totalProfitLoss:
          trades.reduce(
            (total, trade) =>
              total + trade.profitLoss,
            0,
          ),
      }
    })
    .filter(item => item.count > 0)
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count
      }

      return (
        a.totalProfitLoss -
        b.totalProfitLoss
      )
    })
})

const primaryMistake = computed(
  () => mistakeStatistics.value[0] ?? null,
)

const taggedTradeCount = computed(() =>
  sortedTrades.value.filter(
    trade =>
      trade.mistakeTags.length > 0 ||
      trade.customMistakeTags.length > 0,
  ).length,
)

const mistakeTradeRate = computed(() => {
  if (sortedTrades.value.length === 0) {
    return 0
  }

  return Math.round(
    (
      taggedTradeCount.value /
      sortedTrades.value.length
    ) * 100,
  )
})

const coachStatus = computed(() => {
  if (statistics.value.totalTrades === 0) {
    return {
      label: '尚無資料',
      classes:
        'border-zinc-700 bg-zinc-800/70 text-zinc-300',
    }
  }

  if (reviewCompletionRate.value < 50) {
    return {
      label: '復盤不足',
      classes:
        'border-rose-500/25 bg-rose-500/10 text-rose-300',
    }
  }

  if (
    primaryMistake.value &&
    primaryMistake.value.count >= 3
  ) {
    return {
      label: '重複錯誤',
      classes:
        'border-rose-500/25 bg-rose-500/10 text-rose-300',
    }
  }

  if (
    averageScore.value >= 85 &&
    statistics.value.averageR > 0
  ) {
    return {
      label: '狀態良好',
      classes:
        'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    }
  }

  return {
    label: '持續改善',
    classes:
      'border-amber-500/25 bg-amber-500/10 text-amber-300',
  }
})

const primaryAdvice = computed(() => {
  if (statistics.value.totalTrades === 0) {
    return '先新增交易紀錄並完成復盤，系統才能分析你的交易習慣。'
  }

  if (pendingReviewTrades.value.length > 0) {
    return `目前有 ${pendingReviewTrades.value.length} 筆交易尚未完成復盤，先完成復盤再調整交易規則。`
  }

  if (
    primaryMistake.value &&
    primaryMistake.value.count >= 2
  ) {
    return `目前最常出現的問題是「${primaryMistake.value.label}」，已發生 ${primaryMistake.value.count} 次。${primaryMistake.value.solution}`
  }

  if (
    weakestDiscipline.value &&
    weakestDiscipline.value.rate < 80
  ) {
    return `下一筆交易優先專注「${weakestDiscipline.value.label}」，目前達成率為 ${weakestDiscipline.value.rate}%。`
  }

  if (averageEmotionScore.value < 7) {
    return '近期情緒控制偏低，建議降低交易頻率，避免連續進場。'
  }

  if (averageExecutionScore.value < 7) {
    return '近期執行品質仍可改善，進場前先確認停損、停利與離場條件。'
  }

  return '近期紀律狀況穩定，維持固定風險，只交易完整符合策略的機會。'
})

const scoreClasses = (
  score: number,
): string => {
  if (score >= 85) {
    return 'text-emerald-300'
  }

  if (score >= 70) {
    return 'text-sky-300'
  }

  if (score >= 60) {
    return 'text-amber-300'
  }

  return 'text-rose-300'
}
</script>

<template>
  <section
    class="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-xl shadow-black/10"
  >
    <div
      class="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-amber-500/10 blur-3xl"
    />

    <div class="relative">
      <header
        class="flex items-start justify-between gap-4"
      >
        <div>
          <p
            class="text-xs font-medium tracking-[0.2em] text-amber-400"
          >
            智慧交易分析
          </p>

          <h2
            class="mt-2 text-xl font-semibold text-zinc-100"
          >
            AI 教練
          </h2>

          <p
            class="mt-1 text-sm leading-6 text-zinc-500"
          >
            根據交易、復盤與錯誤標籤整理改善方向。
          </p>
        </div>

        <span
          class="rounded-full border px-3 py-1 text-xs font-medium"
          :class="coachStatus.classes"
        >
          {{ coachStatus.label }}
        </span>
      </header>

      <div
        class="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5"
      >
        <p class="text-xs text-amber-300/70">
          今日教練提醒
        </p>

        <p
          class="mt-3 text-lg font-semibold leading-8 text-amber-200"
        >
          {{ primaryAdvice }}
        </p>
      </div>

      <div
        class="mt-5 grid grid-cols-2 gap-3"
      >
        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
        >
          <p class="text-xs text-zinc-500">
            復盤完成率
          </p>

          <p
            class="mt-2 text-2xl font-semibold"
            :class="
              scoreClasses(
                reviewCompletionRate,
              )
            "
          >
            {{ reviewCompletionRate }}%
          </p>
        </div>

        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
        >
          <p class="text-xs text-zinc-500">
            平均復盤分數
          </p>

          <p
            class="mt-2 text-2xl font-semibold"
            :class="
              scoreClasses(
                averageScore,
              )
            "
          >
            {{ averageScore }}
          </p>
        </div>

        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
        >
          <p class="text-xs text-zinc-500">
            情緒控制
          </p>

          <p
            class="mt-2 text-2xl font-semibold"
            :class="
              scoreClasses(
                averageEmotionScore * 10,
              )
            "
          >
            {{ averageEmotionScore }}
            <span class="text-sm text-zinc-600">
              ／10
            </span>
          </p>
        </div>

        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
        >
          <p class="text-xs text-zinc-500">
            執行品質
          </p>

          <p
            class="mt-2 text-2xl font-semibold"
            :class="
              scoreClasses(
                averageExecutionScore * 10,
              )
            "
          >
            {{ averageExecutionScore }}
            <span class="text-sm text-zinc-600">
              ／10
            </span>
          </p>
        </div>
      </div>

      <div
        v-if="primaryMistake"
        class="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4"
      >
        <div
          class="flex items-start justify-between gap-4"
        >
          <div>
            <p class="text-xs text-rose-300/70">
              最常出現的錯誤
            </p>

            <p
              class="mt-2 font-semibold text-rose-300"
            >
              {{ primaryMistake.label }}
            </p>
          </div>

          <div class="text-right">
            <p
              class="text-xl font-semibold text-rose-300"
            >
              {{ primaryMistake.count }}
            </p>

            <p class="text-xs text-zinc-600">
              次
            </p>
          </div>
        </div>

        <p
          class="mt-3 text-sm leading-6 text-zinc-400"
        >
          {{ primaryMistake.solution }}
        </p>
      </div>

      <div
        v-else
        class="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"
      >
        <p class="text-xs text-zinc-500">
          優先改善項目
        </p>

        <p
          v-if="weakestDiscipline"
          class="mt-2 font-medium text-rose-300"
        >
          {{ weakestDiscipline.label }}
          ·
          {{ weakestDiscipline.rate }}%
        </p>

        <p
          v-else
          class="mt-2 text-sm text-zinc-600"
        >
          尚無足夠復盤資料。
        </p>
      </div>

      <div
        class="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"
      >
        <div
          class="flex items-center justify-between gap-4"
        >
          <div>
            <p class="text-xs text-zinc-500">
              有錯誤標籤的交易
            </p>

            <p
              class="mt-1 text-sm text-zinc-400"
            >
              {{ taggedTradeCount }}／
              {{ statistics.totalTrades }} 筆
            </p>
          </div>

          <p
            class="text-lg font-semibold"
            :class="
              mistakeTradeRate >= 50
                ? 'text-rose-300'
                : mistakeTradeRate >= 25
                  ? 'text-amber-300'
                  : 'text-emerald-300'
            "
          >
            {{ mistakeTradeRate }}%
          </p>
        </div>

        <div
          class="mt-3 h-2.5 overflow-hidden rounded-full bg-zinc-800"
        >
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="
              mistakeTradeRate >= 50
                ? 'bg-rose-400'
                : mistakeTradeRate >= 25
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
            "
            :style="{
              width: `${mistakeTradeRate}%`,
            }"
          />
        </div>
      </div>

      <RouterLink
        to="/ai-coach"
        class="mt-5 flex w-full items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-950/60 px-4 py-3 text-sm font-medium text-zinc-400 transition hover:border-amber-500/30 hover:text-amber-300"
      >
        查看完整 AI 教練分析
      </RouterLink>
    </div>
  </section>
</template>