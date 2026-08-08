<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import TradeMistakeAnalyticsCard from '../components/TradeMistakeAnalyticsCard.vue'
import DailyCoachReportCard from '../components/DailyCoachReportCard.vue'
import WeeklyCoachSummaryCard from '../components/WeeklyCoachSummaryCard.vue'
import CoachGrowthTrendCard from '../components/CoachGrowthTrendCard.vue'
import CoachRuleIntelligenceCard from '../components/CoachRuleIntelligenceCard.vue'
import CoachPlanBridgeCard from '../components/CoachPlanBridgeCard.vue'
import { useTradeReviewStore } from '@/stores/useTradeReviewStore'
import { useTradeStore } from '@/stores/useTradeStore'

const tradeStore = useTradeStore()
const tradeReviewStore = useTradeReviewStore()

const {
  sortedClosedTrades: sortedTrades,
  statistics,
  pendingReviewTrades,
} = storeToRefs(tradeStore)

const {
  sortedReviews,
  averageScore,
  completedReviewCount,
} = storeToRefs(tradeReviewStore)

const reviewCompletionRate = computed(() => {
  if (statistics.value.closedTrades === 0) {
    return 0
  }

  return Math.round(
    (
      completedReviewCount.value /
      statistics.value.closedTrades
    ) * 100,
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
      passed,
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

const strongestDiscipline = computed(() => {
  const available =
    disciplineItems.value.filter(
      item => item.total > 0,
    )

  if (available.length === 0) {
    return null
  }

  return [...available].sort(
    (a, b) => b.rate - a.rate,
  )[0]
})

const mostUsedPlaybook = computed(() => {
  if (sortedTrades.value.length === 0) {
    return null
  }

  const countMap = new Map<string, number>()

  sortedTrades.value.forEach(trade => {
    countMap.set(
      trade.playbook,
      (countMap.get(trade.playbook) ?? 0) + 1,
    )
  })

  const result = [...countMap.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0]

  if (!result) {
    return null
  }

  return {
    name: result[0],
    count: result[1],
  }
})

const bestPlaybook = computed(() => {
  const map = new Map<
    string,
    {
      trades: number
      wins: number
      totalR: number
      totalProfitLoss: number
    }
  >()

  sortedTrades.value.forEach(trade => {
    const current =
      map.get(trade.playbook) ?? {
        trades: 0,
        wins: 0,
        totalR: 0,
        totalProfitLoss: 0,
      }

    current.trades += 1
    current.totalR += trade.rMultiple
    current.totalProfitLoss +=
      trade.profitLoss

    if (trade.result === 'win') {
      current.wins += 1
    }

    map.set(trade.playbook, current)
  })

  const results = [...map.entries()].map(
    ([name, data]) => ({
      name,
      trades: data.trades,
      wins: data.wins,
      winRate:
        data.trades > 0
          ? Math.round(
              (
                data.wins /
                data.trades
              ) * 100,
            )
          : 0,
      averageR:
        data.trades > 0
          ? Number(
              (
                data.totalR /
                data.trades
              ).toFixed(2),
            )
          : 0,
      totalProfitLoss:
        data.totalProfitLoss,
    }),
  )

  if (results.length === 0) {
    return null
  }

  return results.sort((a, b) => {
    if (b.averageR !== a.averageR) {
      return b.averageR - a.averageR
    }

    return b.winRate - a.winRate
  })[0]
})

const recentMistakes = computed(() =>
  sortedReviews.value
    .filter(review => review.mistakes.trim())
    .slice(0, 4)
    .map(review => {
      const trade = sortedTrades.value.find(
        item => item.id === review.tradeId,
      )

      return {
        id: review.id,
        symbol: trade?.symbol ?? '未知商品',
        date: trade?.date ?? '',
        text: review.mistakes,
      }
    }),
)

const recentImprovements = computed(() =>
  sortedReviews.value
    .filter(
      review => review.improvement.trim(),
    )
    .slice(0, 4)
    .map(review => {
      const trade = sortedTrades.value.find(
        item => item.id === review.tradeId,
      )

      return {
        id: review.id,
        symbol: trade?.symbol ?? '未知商品',
        date: trade?.date ?? '',
        text: review.improvement,
      }
    }),
)

const currentRule = computed(() =>
  sortedReviews.value.find(review => review.nextTradeRule?.trim())?.nextTradeRule.trim() ?? '',
)

const coachStatus = computed(() => {
  if (statistics.value.closedTrades === 0) {
    return {
      label: '尚無交易資料',
      message:
        '新增交易並完成復盤後，AI 教練會開始整理你的交易習慣。',
      classes:
        'border-zinc-700 bg-zinc-800/70 text-zinc-300',
    }
  }

  if (reviewCompletionRate.value < 50) {
    return {
      label: '復盤不足',
      message:
        '目前多數交易尚未完成復盤，先補齊紀錄才能得到更準確的改善方向。',
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
      message:
        '近期紀律與交易表現穩定，請維持相同風險與進場標準。',
      classes:
        'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    }
  }

  return {
    label: '持續改善',
    message:
      '目前已有足夠資料，建議優先改善最弱紀律項目，不要同時修改太多規則。',
    classes:
      'border-amber-500/25 bg-amber-500/10 text-amber-300',
  }
})

const primaryAdvice = computed(() => {
  if (pendingReviewTrades.value.length > 0) {
    return `目前還有 ${pendingReviewTrades.value.length} 筆交易尚未完成復盤。先完成復盤，再決定下一個需要調整的交易規則。`
  }

  if (currentRule.value) {
    return `下一筆唯一規則：「${currentRule.value}」先只做好這一條，不要同時增加新的執行條件。`
  }

  if (
    weakestDiscipline.value &&
    weakestDiscipline.value.rate < 80
  ) {
    return `目前最需要改善的是「${weakestDiscipline.value.label}」，達成率只有 ${weakestDiscipline.value.rate}%。下一筆交易只專注做好這一項。`
  }

  if (averageEmotionScore.value < 7) {
    return '近期情緒控制分數偏低。建議減少交易頻率，並在進場前重新確認風險與失敗條件。'
  }

  if (averageExecutionScore.value < 7) {
    return '近期執行品質仍有改善空間。進場前先確認停損、停利與離場條件。'
  }

  return '目前沒有明顯的紀律問題。維持固定風險，只交易完整符合策略的機會。'
})

const scoreClasses = (
  value: number,
): string => {
  if (value >= 85) {
    return 'text-emerald-300'
  }

  if (value >= 70) {
    return 'text-sky-300'
  }

  if (value >= 60) {
    return 'text-amber-300'
  }

  return 'text-rose-300'
}

const rateBarClasses = (
  rate: number,
): string => {
  if (rate >= 85) {
    return 'bg-emerald-400'
  }

  if (rate >= 70) {
    return 'bg-sky-400'
  }

  if (rate >= 60) {
    return 'bg-amber-400'
  }

  return 'bg-rose-400'
}

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

const formatMoney = (
  value: number,
): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
</script>

<template>
  <div class="space-y-6 pb-10">
    <section
      class="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl shadow-black/10"
    >
      <div
        class="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl"
      />

      <div
        class="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"
      >
        <div>
          <p
            class="text-xs font-medium tracking-[0.2em] text-amber-400"
          >
            智慧交易分析
          </p>

          <h1
            class="mt-2 text-3xl font-bold text-zinc-100"
          >
            AI Coach v2
          </h1>

          <p
            class="mt-2 max-w-3xl text-sm leading-7 text-zinc-400"
          >
            把交易結果、復盤品質與行為規則整合成目前唯一需要修正的交易重點。
          </p>
        </div>

        <div
          class="rounded-full border px-4 py-2 text-sm font-medium"
          :class="coachStatus.classes"
        >
          {{ coachStatus.label }}
        </div>
      </div>

      <div
        class="relative mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5"
      >
        <p class="text-xs text-amber-300/70">
          今日教練提醒
        </p>

        <p
          class="mt-3 text-xl font-semibold leading-8 text-amber-200"
        >
          {{ primaryAdvice }}
        </p>

        <p
          class="mt-3 text-sm leading-6 text-zinc-500"
        >
          {{ coachStatus.message }}
        </p>
      </div>
    </section>

    <CoachRuleIntelligenceCard />

    <CoachPlanBridgeCard />

    <DailyCoachReportCard />

    <WeeklyCoachSummaryCard />

    <CoachGrowthTrendCard />

    <div
      class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
      >
        <p class="text-sm text-zinc-500">
          已平倉交易
        </p>

        <p
          class="mt-3 text-3xl font-semibold text-zinc-100"
        >
          {{ statistics.closedTrades }}
        </p>
      </section>

      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
      >
        <p class="text-sm text-zinc-500">
          復盤完成率
        </p>

        <p
          class="mt-3 text-3xl font-semibold"
          :class="
            scoreClasses(
              reviewCompletionRate,
            )
          "
        >
          {{ reviewCompletionRate }}%
        </p>
      </section>

      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
      >
        <p class="text-sm text-zinc-500">
          平均復盤分數
        </p>

        <p
          class="mt-3 text-3xl font-semibold"
          :class="
            scoreClasses(
              averageScore,
            )
          "
        >
          {{ averageScore }}
        </p>
      </section>

      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
      >
        <p class="text-sm text-zinc-500">
          平均報酬倍數
        </p>

        <p
          class="mt-3 text-3xl font-semibold"
          :class="
            profitLossClasses(
              statistics.averageR,
            )
          "
        >
          {{ statistics.averageR.toFixed(2) }}R
        </p>
      </section>
    </div>

    <TradeMistakeAnalyticsCard />

    <div class="grid gap-6 xl:grid-cols-2">
      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6"
      >
        <header>
          <p
            class="text-xs font-medium tracking-[0.2em] text-sky-400"
          >
            紀律分析
          </p>

          <h2
            class="mt-2 text-xl font-semibold text-zinc-100"
          >
            交易規則達成率
          </h2>
        </header>

        <div class="mt-6 space-y-5">
          <article
            v-for="item in disciplineItems"
            :key="item.key"
          >
            <div
              class="flex items-center justify-between gap-4"
            >
              <p
                class="text-sm font-medium text-zinc-300"
              >
                {{ item.label }}
              </p>

              <p
                class="text-sm font-semibold"
                :class="
                  scoreClasses(item.rate)
                "
              >
                {{ item.rate }}%
              </p>
            </div>

            <div
              class="mt-2 h-2.5 overflow-hidden rounded-full bg-zinc-800"
            >
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="
                  rateBarClasses(item.rate)
                "
                :style="{
                  width: `${item.rate}%`,
                }"
              />
            </div>

            <p
              class="mt-1 text-xs text-zinc-600"
            >
              {{ item.passed }}／{{ item.total }}
            </p>
          </article>
        </div>
      </section>

      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6"
      >
        <header>
          <p
            class="text-xs font-medium tracking-[0.2em] text-amber-400"
          >
            執行品質
          </p>

          <h2
            class="mt-2 text-xl font-semibold text-zinc-100"
          >
            情緒與執行狀態
          </h2>
        </header>

        <div
          class="mt-6 grid gap-4 sm:grid-cols-2"
        >
          <div
            class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5"
          >
            <p class="text-sm text-zinc-500">
              情緒控制
            </p>

            <p
              class="mt-3 text-4xl font-semibold"
              :class="
                scoreClasses(
                  averageEmotionScore * 10,
                )
              "
            >
              {{ averageEmotionScore }}
              <span
                class="text-lg text-zinc-600"
              >
                ／10
              </span>
            </p>
          </div>

          <div
            class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5"
          >
            <p class="text-sm text-zinc-500">
              執行品質
            </p>

            <p
              class="mt-3 text-4xl font-semibold"
              :class="
                scoreClasses(
                  averageExecutionScore * 10,
                )
              "
            >
              {{ averageExecutionScore }}
              <span
                class="text-lg text-zinc-600"
              >
                ／10
              </span>
            </p>
          </div>
        </div>

        <div
          class="mt-5 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-5"
        >
          <p class="text-sm text-zinc-500">
            最強紀律
          </p>

          <p
            v-if="strongestDiscipline"
            class="mt-2 text-lg font-semibold text-emerald-300"
          >
            {{ strongestDiscipline.label }}
            ·
            {{ strongestDiscipline.rate }}%
          </p>

          <p
            v-else
            class="mt-2 text-sm text-zinc-600"
          >
            尚無足夠資料。
          </p>
        </div>

        <div
          class="mt-3 rounded-2xl border border-rose-500/15 bg-rose-500/5 p-5"
        >
          <p class="text-sm text-zinc-500">
            優先改善
          </p>

          <p
            v-if="weakestDiscipline"
            class="mt-2 text-lg font-semibold text-rose-300"
          >
            {{ weakestDiscipline.label }}
            ·
            {{ weakestDiscipline.rate }}%
          </p>

          <p
            v-else
            class="mt-2 text-sm text-zinc-600"
          >
            尚無足夠資料。
          </p>
        </div>
      </section>
    </div>

    <div class="grid gap-6 xl:grid-cols-2">
      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6"
      >
        <header>
          <p
            class="text-xs font-medium tracking-[0.2em] text-emerald-400"
          >
            策略表現
          </p>

          <h2
            class="mt-2 text-xl font-semibold text-zinc-100"
          >
            最適合你的策略
          </h2>
        </header>

        <div
          v-if="bestPlaybook"
          class="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5"
        >
          <p
            class="text-2xl font-semibold text-emerald-300"
          >
            {{ bestPlaybook.name }}
          </p>

          <div
            class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            <div
              class="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3"
            >
              <p class="text-xs text-zinc-500">
                交易
              </p>

              <p class="mt-2 font-semibold text-zinc-100">
                {{ bestPlaybook.trades }}
              </p>
            </div>

            <div
              class="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3"
            >
              <p class="text-xs text-zinc-500">
                勝率
              </p>

              <p
                class="mt-2 font-semibold text-emerald-300"
              >
                {{ bestPlaybook.winRate }}%
              </p>
            </div>

            <div
              class="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3"
            >
              <p class="text-xs text-zinc-500">
                平均報酬
              </p>

              <p
                class="mt-2 font-semibold text-amber-300"
              >
                {{ bestPlaybook.averageR }}R
              </p>
            </div>

            <div
              class="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3"
            >
              <p class="text-xs text-zinc-500">
                總盈虧
              </p>

              <p
                class="mt-2 font-semibold"
                :class="
                  profitLossClasses(
                    bestPlaybook.totalProfitLoss,
                  )
                "
              >
                {{
                  bestPlaybook.totalProfitLoss > 0
                    ? '+'
                    : ''
                }}
                {{
                  formatMoney(
                    bestPlaybook.totalProfitLoss,
                  )
                }}
              </p>
            </div>
          </div>
        </div>

        <div
          v-else
          class="mt-6 rounded-2xl border border-dashed border-zinc-800 p-8 text-center"
        >
          <p class="text-sm text-zinc-500">
            尚無足夠交易資料判斷。
          </p>
        </div>

        <div
          v-if="mostUsedPlaybook"
          class="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"
        >
          <p class="text-xs text-zinc-500">
            最常使用
          </p>

          <p
            class="mt-2 font-medium text-zinc-300"
          >
            {{ mostUsedPlaybook.name }}
            ·
            {{ mostUsedPlaybook.count }} 筆
          </p>
        </div>
      </section>

      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6"
      >
        <header>
          <p
            class="text-xs font-medium tracking-[0.2em] text-rose-400"
          >
            復盤錯誤
          </p>

          <h2
            class="mt-2 text-xl font-semibold text-zinc-100"
          >
            最近記錄的問題
          </h2>
        </header>

        <div
          v-if="recentMistakes.length"
          class="mt-6 space-y-3"
        >
          <article
            v-for="mistake in recentMistakes"
            :key="mistake.id"
            class="rounded-2xl border border-rose-500/15 bg-rose-500/5 p-4"
          >
            <div
              class="flex items-center justify-between gap-4"
            >
              <p
                class="font-medium text-rose-300"
              >
                {{ mistake.symbol }}
              </p>

              <p
                class="text-xs text-zinc-600"
              >
                {{ mistake.date }}
              </p>
            </div>

            <p
              class="mt-2 text-sm leading-6 text-zinc-300"
            >
              {{ mistake.text }}
            </p>
          </article>
        </div>

        <div
          v-else
          class="mt-6 rounded-2xl border border-dashed border-zinc-800 p-8 text-center"
        >
          <p class="text-sm text-zinc-500">
            尚無已記錄的錯誤內容。
          </p>
        </div>
      </section>
    </div>

    <section
      class="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6"
    >
      <header>
        <p
          class="text-xs font-medium tracking-[0.2em] text-amber-400"
        >
          下一步行動
        </p>

        <h2
          class="mt-2 text-xl font-semibold text-zinc-100"
        >
          最近的改善計畫
        </h2>
      </header>

      <div
        v-if="recentImprovements.length"
        class="mt-5 grid gap-4 xl:grid-cols-2"
      >
        <article
          v-for="improvement in recentImprovements"
          :key="improvement.id"
          class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5"
        >
          <div
            class="flex items-center justify-between gap-4"
          >
            <p
              class="font-medium text-amber-300"
            >
              {{ improvement.symbol }}
            </p>

            <p
              class="text-xs text-zinc-600"
            >
              {{ improvement.date }}
            </p>
          </div>

          <p
            class="mt-3 text-sm leading-7 text-zinc-300"
          >
            {{ improvement.text }}
          </p>
        </article>
      </div>

      <div
        v-else
        class="mt-5 rounded-2xl border border-dashed border-zinc-800 p-8 text-center"
      >
        <p class="text-sm text-zinc-500">
          完成交易復盤後，改善計畫會顯示在這裡。
        </p>
      </div>
    </section>
  </div>
</template>
