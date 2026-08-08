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

const chartWidth = 700
const chartHeight = 220
const chartPadding = 24

const parseDate = (
  value: string,
): Date | null => {
  const normalized =
    value.trim().replaceAll('/', '-')

  const [year, month, day] =
    normalized.split('-').map(Number)

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

const dateKey = (
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

const formatLabel = (
  date: Date,
): string =>
  new Intl.DateTimeFormat('zh-TW', {
    month: '2-digit',
    day: '2-digit',
  }).format(date)

const startDate = computed(() => {
  const date = new Date()

  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - 29)

  return date
})

const recentTrades = computed(() =>
  sortedTrades.value.filter(trade => {
    const date = parseDate(trade.date)

    return Boolean(
      date &&
        date.getTime() >=
          startDate.value.getTime(),
    )
  }),
)

const reviewMap = computed(() => {
  return new Map(
    sortedReviews.value.map(review => [
      review.tradeId,
      review,
    ]),
  )
})

const trendData = computed(() => {
  const groups = Array.from(
    { length: 5 },
    (_, index) => {
      const start = new Date(
        startDate.value,
      )

      start.setDate(
        start.getDate() + index * 6,
      )

      const end = new Date(start)
      end.setDate(end.getDate() + 5)

      return {
        start,
        end,
        trades: 0,
        totalR: 0,
        wins: 0,
        reviewScores: [] as number[],
      }
    },
  )

  recentTrades.value.forEach(trade => {
    const tradeDate = parseDate(
      trade.date,
    )

    if (!tradeDate) {
      return
    }

    const daysFromStart = Math.floor(
      (
        tradeDate.getTime() -
        startDate.value.getTime()
      ) /
        86400000,
    )

    const groupIndex = Math.min(
      4,
      Math.max(
        0,
        Math.floor(daysFromStart / 6),
      ),
    )

    const group = groups[groupIndex]

    if (!group) {
      return
    }

    group.trades += 1
    group.totalR += trade.rMultiple

    if (trade.result === 'win') {
      group.wins += 1
    }

    const review =
      reviewMap.value.get(trade.id)

    if (review) {
      group.reviewScores.push(
        review.totalScore,
      )
    }
  })

  return groups.map(group => {
    const averageR =
      group.trades > 0
        ? group.totalR / group.trades
        : 0

    const winRate =
      group.trades > 0
        ? (
            group.wins /
            group.trades
          ) * 100
        : 0

    const reviewScore =
      group.reviewScores.length > 0
        ? group.reviewScores.reduce(
            (total, score) =>
              total + score,
            0,
          ) /
          group.reviewScores.length
        : 50

    const performanceScore = Math.max(
      0,
      Math.min(
        100,
        50 +
          averageR * 18 +
          (
            winRate - 50
          ) * 0.25,
      ),
    )

    const score =
      group.trades > 0
        ? Math.round(
            performanceScore * 0.55 +
              reviewScore * 0.45,
          )
        : 0

    return {
      label: `${formatLabel(
        group.start,
      )}–${formatLabel(group.end)}`,
      score,
      trades: group.trades,
      averageR: Number(
        averageR.toFixed(2),
      ),
      reviewScore: Math.round(
        reviewScore,
      ),
    }
  })
})

const availableData = computed(() =>
  trendData.value.filter(
    item => item.trades > 0,
  ),
)

const currentScore = computed(
  () =>
    availableData.value.at(-1)
      ?.score ?? 0,
)

const previousScore = computed(
  () =>
    availableData.value.at(-2)
      ?.score ?? 0,
)

const scoreChange = computed(
  () =>
    currentScore.value -
    previousScore.value,
)

const status = computed(() => {
  if (availableData.value.length === 0) {
    return {
      label: '尚無資料',
      description:
        '建立交易與復盤後會顯示成長曲線。',
      classes:
        'border-zinc-700 bg-zinc-800/70 text-zinc-300',
    }
  }

  if (scoreChange.value >= 8) {
    return {
      label: '明顯進步',
      description:
        '近期交易品質與復盤評分正在提升。',
      classes:
        'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    }
  }

  if (scoreChange.value <= -8) {
    return {
      label: '需要調整',
      description:
        '近期交易品質下降，建議降低交易頻率。',
      classes:
        'border-rose-500/25 bg-rose-500/10 text-rose-300',
    }
  }

  return {
    label: '表現穩定',
    description:
      '近期評分變化不大，繼續保持固定風險。',
    classes:
      'border-amber-500/25 bg-amber-500/10 text-amber-300',
  }
})

const points = computed(() => {
  const count = trendData.value.length

  return trendData.value.map(
    (item, index) => {
      const x =
        chartPadding +
        (
          index /
          Math.max(1, count - 1)
        ) *
          (
            chartWidth -
            chartPadding * 2
          )

      const y =
        chartHeight -
        chartPadding -
        (
          item.score / 100
        ) *
          (
            chartHeight -
            chartPadding * 2
          )

      return {
        ...item,
        x,
        y,
      }
    },
  )
})

const linePath = computed(() => {
  const validPoints =
    points.value.filter(
      point => point.trades > 0,
    )

  if (validPoints.length === 0) {
    return ''
  }

  return validPoints
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`,
    )
    .join(' ')
})

const scoreClasses = computed(() => {
  if (currentScore.value >= 80) {
    return 'text-emerald-300'
  }

  if (currentScore.value >= 65) {
    return 'text-amber-300'
  }

  return 'text-rose-300'
})

const todayKey = computed(() =>
  dateKey(new Date()),
)
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
          class="text-xs font-medium tracking-[0.2em] text-cyan-400"
        >
          GROWTH TREND
        </p>

        <h2
          class="mt-2 text-xl font-semibold text-zinc-100"
        >
          30 天成長趨勢
        </h2>

        <p
          class="mt-1 text-sm leading-6 text-zinc-500"
        >
          綜合近期交易績效與復盤評分。
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
      class="mt-6 grid gap-5 xl:grid-cols-[180px_minmax(0,1fr)]"
    >
      <div
        class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5"
      >
        <p class="text-sm text-zinc-500">
          最新成長評分
        </p>

        <p
          class="mt-3 text-5xl font-bold"
          :class="scoreClasses"
        >
          {{ currentScore }}
        </p>

        <p class="mt-1 text-xs text-zinc-600">
          ／100
        </p>

        <p
          class="mt-4 text-sm font-medium"
          :class="
            scoreChange > 0
              ? 'text-emerald-300'
              : scoreChange < 0
                ? 'text-rose-300'
                : 'text-zinc-400'
          "
        >
          {{
            scoreChange > 0
              ? `較前期 +${scoreChange}`
              : scoreChange < 0
                ? `較前期 ${scoreChange}`
                : '與前期相同'
          }}
        </p>
      </div>

      <div
        class="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4"
      >
        <svg
          :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
          class="h-56 w-full"
          role="img"
          aria-label="30 天交易成長趨勢"
        >
          <line
            v-for="value in [25, 50, 75, 100]"
            :key="value"
            :x1="chartPadding"
            :x2="
              chartWidth -
              chartPadding
            "
            :y1="
              chartHeight -
              chartPadding -
              (
                value / 100
              ) *
                (
                  chartHeight -
                  chartPadding * 2
                )
            "
            :y2="
              chartHeight -
              chartPadding -
              (
                value / 100
              ) *
                (
                  chartHeight -
                  chartPadding * 2
                )
            "
            stroke="currentColor"
            class="text-zinc-800"
            stroke-width="1"
          />

          <path
            v-if="linePath"
            :d="linePath"
            fill="none"
            stroke="currentColor"
            class="text-cyan-400"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <circle
            v-for="point in points"
            v-show="point.trades > 0"
            :key="point.label"
            :cx="point.x"
            :cy="point.y"
            r="6"
            fill="currentColor"
            class="text-cyan-300"
          />

          <text
            v-for="point in points"
            :key="`${point.label}-label`"
            :x="point.x"
            :y="chartHeight - 5"
            text-anchor="middle"
            fill="currentColor"
            class="text-[11px] text-zinc-600"
          >
            {{ point.label }}
          </text>
        </svg>
      </div>
    </div>

    <div
      class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
    >
      <div
        v-for="item in trendData"
        :key="item.label"
        class="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"
      >
        <p class="text-xs text-zinc-500">
          {{ item.label }}
        </p>

        <p class="mt-2 text-xl font-semibold text-zinc-200">
          {{ item.score }} 分
        </p>

        <p class="mt-1 text-xs text-zinc-600">
          {{ item.trades }} 筆 ·
          {{ item.averageR.toFixed(2) }}R
        </p>
      </div>
    </div>

    <p
      class="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 text-sm leading-6 text-zinc-400"
    >
      {{ status.description }}
      <span class="text-zinc-600">
        資料更新日期：
        {{ todayKey }}
      </span>
    </p>
  </section>
</template>
