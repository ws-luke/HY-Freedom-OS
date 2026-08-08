<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useTradeReviewStore } from '@/stores/useTradeReviewStore'
import { useTradeStore } from '@/stores/useTradeStore'

const tradeStore = useTradeStore()
const tradeReviewStore = useTradeReviewStore()

const { sortedClosedTrades: sortedTrades } = storeToRefs(tradeStore)
const { sortedReviews } = storeToRefs(
  tradeReviewStore,
)

const startDate = computed(() => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - 6)

  return date
})

const parseLocalDate = (
  value: string,
): Date | null => {
  const normalized =
    value.trim().replaceAll('/', '-')

  const parts = normalized
    .split('-')
    .map(Number)

  const year = parts[0]
  const month = parts[1]
  const day = parts[2]

  if (
    year === undefined ||
    month === undefined ||
    day === undefined
  ) {
    return null
  }

  const date = new Date(
    year,
    month - 1,
    day,
  )

  date.setHours(0, 0, 0, 0)

  return Number.isNaN(date.getTime())
    ? null
    : date
}

const weeklyTrades = computed(() =>
  sortedTrades.value.filter(trade => {
    const date = parseLocalDate(trade.date)

    return Boolean(
      date &&
        date.getTime() >=
          startDate.value.getTime(),
    )
  }),
)

const weeklyTradeIds = computed(
  () =>
    new Set(
      weeklyTrades.value.map(
        trade => trade.id,
      ),
    ),
)

const weeklyReviews = computed(() =>
  sortedReviews.value.filter(review =>
    weeklyTradeIds.value.has(
      review.tradeId,
    ),
  ),
)

const totalProfitLoss = computed(() =>
  weeklyTrades.value.reduce(
    (total, trade) =>
      total + trade.profitLoss,
    0,
  ),
)

const totalR = computed(() =>
  weeklyTrades.value.reduce(
    (total, trade) =>
      total + trade.rMultiple,
    0,
  ),
)

const averageR = computed(() => {
  if (weeklyTrades.value.length === 0) {
    return 0
  }

  return Number(
    (
      totalR.value /
      weeklyTrades.value.length
    ).toFixed(2),
  )
})

const winRate = computed(() => {
  if (weeklyTrades.value.length === 0) {
    return 0
  }

  const wins = weeklyTrades.value.filter(
    trade => trade.result === 'win',
  ).length

  return Math.round(
    (
      wins /
      weeklyTrades.value.length
    ) * 100,
  )
})

const reviewRate = computed(() => {
  if (weeklyTrades.value.length === 0) {
    return 0
  }

  return Math.min(
    100,
    Math.round(
      (
        weeklyReviews.value.length /
        weeklyTrades.value.length
      ) * 100,
    ),
  )
})

const averageReviewScore = computed(() => {
  if (weeklyReviews.value.length === 0) {
    return 0
  }

  return Math.round(
    weeklyReviews.value.reduce(
      (total, review) =>
        total + review.totalScore,
      0,
    ) /
      weeklyReviews.value.length,
  )
})

const mistakeCounts = computed(() => {
  const counts = new Map<string, number>()

  weeklyTrades.value.forEach(trade => {
    const tags = [
      ...trade.mistakeTags,
      ...trade.customMistakeTags,
    ]

    tags.forEach(tag => {
      counts.set(
        tag,
        (counts.get(tag) ?? 0) + 1,
      )
    })
  })

  return [...counts.entries()]
    .map(([label, count]) => ({
      label,
      count,
    }))
    .sort(
      (a, b) => b.count - a.count,
    )
})

const mostCommonMistake = computed(
  () => mistakeCounts.value[0] ?? null,
)

const playbookPerformance = computed(() => {
  const map = new Map<
    string,
    {
      trades: number
      wins: number
      totalR: number
    }
  >()

  weeklyTrades.value.forEach(trade => {
    const current =
      map.get(trade.playbook) ?? {
        trades: 0,
        wins: 0,
        totalR: 0,
      }

    current.trades += 1
    current.totalR += trade.rMultiple

    if (trade.result === 'win') {
      current.wins += 1
    }

    map.set(trade.playbook, current)
  })

  return [...map.entries()]
    .map(([name, data]) => ({
      name,
      trades: data.trades,
      winRate: Math.round(
        (
          data.wins /
          data.trades
        ) * 100,
      ),
      averageR: Number(
        (
          data.totalR /
          data.trades
        ).toFixed(2),
      ),
    }))
    .sort((a, b) => {
      if (b.averageR !== a.averageR) {
        return b.averageR - a.averageR
      }

      return b.winRate - a.winRate
    })
})

const bestPlaybook = computed(
  () =>
    playbookPerformance.value[0] ??
    null,
)

const weeklyStatus = computed(() => {
  if (weeklyTrades.value.length === 0) {
    return {
      label: '尚無資料',
      description:
        '建立交易後會產生近 7 天分析。',
      classes:
        'border-zinc-700 bg-zinc-800/70 text-zinc-300',
    }
  }

  if (
    totalProfitLoss.value > 0 &&
    averageR.value >= 0.5 &&
    reviewRate.value >= 80
  ) {
    return {
      label: '表現穩定',
      description:
        '本週績效與紀律維持良好。',
      classes:
        'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    }
  }

  if (
    totalProfitLoss.value < 0 ||
    averageR.value < 0
  ) {
    return {
      label: '需要調整',
      description:
        '本週交易結果需要優先復盤。',
      classes:
        'border-rose-500/25 bg-rose-500/10 text-rose-300',
    }
  }

  return {
    label: '持續觀察',
    description:
      '本週表現普通，先維持固定風險。',
    classes:
      'border-amber-500/25 bg-amber-500/10 text-amber-300',
  }
})

const coachAdvice = computed(() => {
  if (weeklyTrades.value.length === 0) {
    return '本週先建立完整交易紀錄，AI 才能提供有效分析。'
  }

  if (reviewRate.value < 80) {
    return `本週復盤完成率只有 ${reviewRate.value}%，請先完成未復盤交易。`
  }

  if (mostCommonMistake.value) {
    return `本週最常出現「${mostCommonMistake.value.label}」，下週只專注修正這一項。`
  }

  if (
    bestPlaybook.value &&
    bestPlaybook.value.averageR > 0
  ) {
    return `下週優先執行「${bestPlaybook.value.name}」，本週平均 ${bestPlaybook.value.averageR.toFixed(2)}R。`
  }

  if (averageR.value < 0.5) {
    return '下週減少低報酬交易，只等待風險報酬完整的機會。'
  }

  return '維持目前交易頻率與固定風險，不需要提高下單次數。'
})

const formatMoney = (
  value: number,
): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)

const valueClasses = (
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
    class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl shadow-black/10"
  >
    <header
      class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
    >
      <div>
        <p
          class="text-xs font-medium tracking-[0.2em] text-sky-400"
        >
          WEEKLY COACH
        </p>

        <h2
          class="mt-2 text-xl font-semibold text-zinc-100"
        >
          近 7 天 AI 摘要
        </h2>

        <p
          class="mt-1 text-sm leading-6 text-zinc-500"
        >
          分析近期績效、復盤完成度與常見錯誤。
        </p>
      </div>

      <span
        class="rounded-full border px-3 py-1.5 text-xs font-medium"
        :class="weeklyStatus.classes"
      >
        {{ weeklyStatus.label }}
      </span>
    </header>

    <div
      class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
    >
      <div
        class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
      >
        <p class="text-xs text-zinc-500">
          交易筆數
        </p>

        <p class="mt-2 text-2xl font-semibold text-zinc-100">
          {{ weeklyTrades.length }}
        </p>
      </div>

      <div
        class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
      >
        <p class="text-xs text-zinc-500">
          總盈虧
        </p>

        <p
          class="mt-2 text-2xl font-semibold"
          :class="valueClasses(totalProfitLoss)"
        >
          {{ totalProfitLoss > 0 ? '+' : '' }}
          {{ formatMoney(totalProfitLoss) }}
        </p>
      </div>

      <div
        class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
      >
        <p class="text-xs text-zinc-500">
          勝率
        </p>

        <p class="mt-2 text-2xl font-semibold text-sky-300">
          {{ winRate }}%
        </p>
      </div>

      <div
        class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
      >
        <p class="text-xs text-zinc-500">
          平均報酬
        </p>

        <p
          class="mt-2 text-2xl font-semibold"
          :class="valueClasses(averageR)"
        >
          {{ averageR.toFixed(2) }}R
        </p>
      </div>

      <div
        class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
      >
        <p class="text-xs text-zinc-500">
          復盤完成率
        </p>

        <p class="mt-2 text-2xl font-semibold text-amber-300">
          {{ reviewRate }}%
        </p>
      </div>
    </div>

    <div
      class="mt-5 grid gap-4 lg:grid-cols-3"
    >
      <div
        class="rounded-2xl border border-violet-500/15 bg-violet-500/5 p-5"
      >
        <p class="text-xs text-violet-300/70">
          AI 教練建議
        </p>

        <p
          class="mt-3 text-sm leading-7 text-zinc-200"
        >
          {{ coachAdvice }}
        </p>
      </div>

      <div
        class="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-5"
      >
        <p class="text-xs text-emerald-300/70">
          本週最佳策略
        </p>

        <template v-if="bestPlaybook">
          <p
            class="mt-3 font-semibold text-zinc-100"
          >
            {{ bestPlaybook.name }}
          </p>

          <p class="mt-2 text-sm text-zinc-500">
            {{ bestPlaybook.trades }} 筆 ·
            勝率 {{ bestPlaybook.winRate }}% ·
            平均
            {{ bestPlaybook.averageR.toFixed(2) }}R
          </p>
        </template>

        <p
          v-else
          class="mt-3 text-sm text-zinc-500"
        >
          尚無足夠資料。
        </p>
      </div>

      <div
        class="rounded-2xl border border-rose-500/15 bg-rose-500/5 p-5"
      >
        <p class="text-xs text-rose-300/70">
          最常見錯誤
        </p>

        <template v-if="mostCommonMistake">
          <p
            class="mt-3 font-semibold text-zinc-100"
          >
            {{ mostCommonMistake.label }}
          </p>

          <p class="mt-2 text-sm text-zinc-500">
            本週出現
            {{ mostCommonMistake.count }}
            次
          </p>
        </template>

        <p
          v-else
          class="mt-3 text-sm text-zinc-500"
        >
          本週沒有錯誤標籤。
        </p>
      </div>
    </div>

    <div
      class="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4"
    >
      <p class="text-sm text-zinc-400">
        平均復盤評分：
        <span class="font-semibold text-zinc-200">
          {{ averageReviewScore }} 分
        </span>
        ·
        {{ weeklyStatus.description }}
      </p>
    </div>
  </section>
</template>
