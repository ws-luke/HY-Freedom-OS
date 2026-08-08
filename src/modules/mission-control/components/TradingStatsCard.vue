<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'

import { useTradeStore } from '@/stores/useTradeStore'

import type {
  TradeRecord,
  TradeResult,
} from '@/types/trade'

interface PeriodStatistics {
  totalTrades: number
  wins: number
  losses: number
  breakeven: number
  winRate: number
  averageR: number
  totalProfitLoss: number
}

interface EquityPoint {
  x: number
  y: number
  value: number
}

const tradeStore = useTradeStore()

const {
  sortedTrades,
  statistics,
} = storeToRefs(tradeStore)

const parseTradeDate = (
  trade: TradeRecord,
): Date => {
  const normalizedDate = trade.date.replaceAll('/', '-')
  const date = new Date(
    `${normalizedDate}T${trade.time || '00:00'}:00`,
  )

  if (Number.isNaN(date.getTime())) {
    return new Date(0)
  }

  return date
}

const startOfWeek = (
  date: Date,
): Date => {
  const result = new Date(date)
  const day = result.getDay()
  const difference = day === 0 ? -6 : 1 - day

  result.setDate(result.getDate() + difference)
  result.setHours(0, 0, 0, 0)

  return result
}

const startOfMonth = (
  date: Date,
): Date => {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    1,
  )
}

const calculatePeriodStatistics = (
  trades: TradeRecord[],
): PeriodStatistics => {
  const totalTrades = trades.length

  const wins = trades.filter(
    trade => trade.result === 'win',
  ).length

  const losses = trades.filter(
    trade => trade.result === 'loss',
  ).length

  const breakeven = trades.filter(
    trade => trade.result === 'breakeven',
  ).length

  const totalProfitLoss = trades.reduce(
    (total, trade) =>
      total + trade.profitLoss,
    0,
  )

  const totalR = trades.reduce(
    (total, trade) =>
      total + trade.rMultiple,
    0,
  )

  return {
    totalTrades,
    wins,
    losses,
    breakeven,
    winRate:
      totalTrades > 0
        ? Math.round(
            (wins / totalTrades) * 100,
          )
        : 0,
    averageR:
      totalTrades > 0
        ? Number(
            (
              totalR / totalTrades
            ).toFixed(2),
          )
        : 0,
    totalProfitLoss,
  }
}

const now = computed(() => new Date())

const weeklyTrades = computed(() => {
  const weekStart = startOfWeek(now.value)

  return sortedTrades.value.filter(
    trade =>
      parseTradeDate(trade).getTime() >=
      weekStart.getTime(),
  )
})

const monthlyTrades = computed(() => {
  const monthStart = startOfMonth(now.value)

  return sortedTrades.value.filter(
    trade =>
      parseTradeDate(trade).getTime() >=
      monthStart.getTime(),
  )
})

const weeklyStatistics = computed(() =>
  calculatePeriodStatistics(
    weeklyTrades.value,
  ),
)

const monthlyStatistics = computed(() =>
  calculatePeriodStatistics(
    monthlyTrades.value,
  ),
)

const chronologicalTrades = computed(() =>
  [...sortedTrades.value].sort(
    (a, b) =>
      parseTradeDate(a).getTime() -
      parseTradeDate(b).getTime(),
  ),
)

const recentTrades = computed(() =>
  sortedTrades.value.slice(0, 20),
)

const grossProfit = computed(() =>
  sortedTrades.value
    .filter(
      trade => trade.profitLoss > 0,
    )
    .reduce(
      (total, trade) =>
        total + trade.profitLoss,
      0,
    ),
)

const grossLoss = computed(() =>
  Math.abs(
    sortedTrades.value
      .filter(
        trade => trade.profitLoss < 0,
      )
      .reduce(
        (total, trade) =>
          total + trade.profitLoss,
        0,
      ),
  ),
)

const profitFactor = computed(() => {
  if (grossLoss.value === 0) {
    return grossProfit.value > 0
      ? grossProfit.value
      : 0
  }

  return Number(
    (
      grossProfit.value /
      grossLoss.value
    ).toFixed(2),
  )
})

const expectancy = computed(() => {
  if (statistics.value.totalTrades === 0) {
    return 0
  }

  return Number(
    (
      statistics.value.totalProfitLoss /
      statistics.value.totalTrades
    ).toFixed(2),
  )
})

const maximumWin = computed(() => {
  if (sortedTrades.value.length === 0) {
    return 0
  }

  return Math.max(
    ...sortedTrades.value.map(
      trade => trade.profitLoss,
    ),
    0,
  )
})

const maximumLoss = computed(() => {
  if (sortedTrades.value.length === 0) {
    return 0
  }

  return Math.min(
    ...sortedTrades.value.map(
      trade => trade.profitLoss,
    ),
    0,
  )
})

const calculateMaximumStreak = (
  targetResult: TradeResult,
): number => {
  let maximum = 0
  let current = 0

  chronologicalTrades.value.forEach(
    trade => {
      if (trade.result === targetResult) {
        current += 1
        maximum = Math.max(
          maximum,
          current,
        )
      }
      else {
        current = 0
      }
    },
  )

  return maximum
}

const maximumWinningStreak = computed(() =>
  calculateMaximumStreak('win'),
)

const maximumLosingStreak = computed(() =>
  calculateMaximumStreak('loss'),
)

const currentStreak = computed(() => {
  if (sortedTrades.value.length === 0) {
    return {
      result: null as TradeResult | null,
      count: 0,
    }
  }

  const firstTrade =
    sortedTrades.value[0]

  if (!firstTrade) {
    return {
      result: null as TradeResult | null,
      count: 0,
    }
  }

const firstResult =
  firstTrade.result

  let count = 0

  for (const trade of sortedTrades.value) {
    if (trade.result !== firstResult) {
      break
    }

    count += 1
  }

  return {
    result: firstResult,
    count,
  }
})

const equityValues = computed(() => {
  let total = 0

  return chronologicalTrades.value.map(
    trade => {
      total += trade.profitLoss
      return total
    },
  )
})

const chartWidth = 640
const chartHeight = 180
const chartPadding = 16

const equityPoints = computed<EquityPoint[]>(() => {
  const values = equityValues.value

  if (values.length === 0) {
    return []
  }

  const minimumValue = Math.min(
    0,
    ...values,
  )

  const maximumValue = Math.max(
    0,
    ...values,
  )

  const range =
    maximumValue - minimumValue || 1

  return values.map((value, index) => {
    const usableWidth =
      chartWidth - chartPadding * 2

    const usableHeight =
      chartHeight - chartPadding * 2

    const x =
      values.length === 1
        ? chartWidth / 2
        : chartPadding +
          (
            index /
            (values.length - 1)
          ) *
            usableWidth

    const y =
      chartPadding +
      (
        1 -
        (
          value - minimumValue
        ) /
          range
      ) *
        usableHeight

    return {
      x,
      y,
      value,
    }
  })
})

const equityPolyline = computed(() =>
  equityPoints.value
    .map(
      point =>
        `${point.x},${point.y}`,
    )
    .join(' '),
)

const equityAreaPath = computed(() => {
  const points = equityPoints.value

  if (points.length === 0) {
    return ''
  }

  const first = points[0]
  const last = points.at(-1)

  if (!first || !last) {
    return ''
  }

  const linePoints = points
    .map(
      point =>
        `L ${point.x} ${point.y}`,
    )
    .join(' ')

  return [
    `M ${first.x} ${chartHeight - chartPadding}`,
    `L ${first.x} ${first.y}`,
    linePoints,
    `L ${last.x} ${chartHeight - chartPadding}`,
    'Z',
  ].join(' ')
})

const currentEquity = computed<number>(() => {
  return equityValues.value.at(-1) ?? 0
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

const resultClasses = (
  result: TradeResult,
): string => {
  if (result === 'win') {
    return 'bg-emerald-400'
  }

  if (result === 'loss') {
    return 'bg-rose-400'
  }

  return 'bg-zinc-500'
}

const currentStreakLabel = computed(() => {
  if (
    !currentStreak.value.result ||
    currentStreak.value.count === 0
  ) {
    return '尚無資料'
  }

  if (
    currentStreak.value.result === 'win'
  ) {
    return `連續獲利 ${currentStreak.value.count} 筆`
  }

  if (
    currentStreak.value.result === 'loss'
  ) {
    return `連續虧損 ${currentStreak.value.count} 筆`
  }

  return `連續平手 ${currentStreak.value.count} 筆`
})

const currentStreakClasses = computed(() => {
  if (
    currentStreak.value.result === 'win'
  ) {
    return 'text-emerald-300'
  }

  if (
    currentStreak.value.result === 'loss'
  ) {
    return 'text-rose-300'
  }

  return 'text-zinc-300'
})
</script>

<template>
  <section
    class="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-xl shadow-black/10"
  >
    <div
      class="pointer-events-none absolute -bottom-24 -right-24 h-60 w-60 rounded-full bg-sky-500/10 blur-3xl"
    />

    <div class="relative">
      <header
        class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
      >
        <div>
          <p
            class="text-xs font-medium tracking-[0.2em] text-sky-400"
          >
            深度統計
          </p>

          <h2
            class="mt-2 text-xl font-semibold text-zinc-100"
          >
            交易數據分析
          </h2>

          <p
            class="mt-1 text-sm leading-6 text-zinc-500"
          >
            比較本週、本月與全部交易的表現變化。
          </p>
        </div>

        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3"
        >
          <p class="text-xs text-zinc-500">
            目前連續狀態
          </p>

          <p
            class="mt-1 font-semibold"
            :class="currentStreakClasses"
          >
            {{ currentStreakLabel }}
          </p>
        </div>
      </header>

      <div
        class="mt-6 grid gap-4 xl:grid-cols-3"
      >
        <section
          class="rounded-2xl border border-zinc-800 bg-zinc-950/55 p-5"
        >
          <p
            class="text-xs font-medium tracking-[0.16em] text-amber-400"
          >
            本週
          </p>

          <div
            class="mt-4 grid grid-cols-2 gap-3"
          >
            <div>
              <p class="text-xs text-zinc-500">
                交易筆數
              </p>

              <p
                class="mt-1 text-xl font-semibold text-zinc-100"
              >
                {{ weeklyStatistics.totalTrades }}
              </p>
            </div>

            <div>
              <p class="text-xs text-zinc-500">
                勝率
              </p>

              <p
                class="mt-1 text-xl font-semibold text-sky-300"
              >
                {{ weeklyStatistics.winRate }}%
              </p>
            </div>

            <div>
              <p class="text-xs text-zinc-500">
                平均報酬
              </p>

              <p
                class="mt-1 text-xl font-semibold"
                :class="
                  profitLossClasses(
                    weeklyStatistics.averageR,
                  )
                "
              >
                {{ weeklyStatistics.averageR.toFixed(2) }}R
              </p>
            </div>

            <div>
              <p class="text-xs text-zinc-500">
                盈虧
              </p>

              <p
                class="mt-1 text-xl font-semibold"
                :class="
                  profitLossClasses(
                    weeklyStatistics.totalProfitLoss,
                  )
                "
              >
                {{
                  weeklyStatistics.totalProfitLoss > 0
                    ? '+'
                    : ''
                }}
                {{
                  formatMoney(
                    weeklyStatistics.totalProfitLoss,
                  )
                }}
              </p>
            </div>
          </div>
        </section>

        <section
          class="rounded-2xl border border-zinc-800 bg-zinc-950/55 p-5"
        >
          <p
            class="text-xs font-medium tracking-[0.16em] text-violet-400"
          >
            本月
          </p>

          <div
            class="mt-4 grid grid-cols-2 gap-3"
          >
            <div>
              <p class="text-xs text-zinc-500">
                交易筆數
              </p>

              <p
                class="mt-1 text-xl font-semibold text-zinc-100"
              >
                {{ monthlyStatistics.totalTrades }}
              </p>
            </div>

            <div>
              <p class="text-xs text-zinc-500">
                勝率
              </p>

              <p
                class="mt-1 text-xl font-semibold text-sky-300"
              >
                {{ monthlyStatistics.winRate }}%
              </p>
            </div>

            <div>
              <p class="text-xs text-zinc-500">
                平均報酬
              </p>

              <p
                class="mt-1 text-xl font-semibold"
                :class="
                  profitLossClasses(
                    monthlyStatistics.averageR,
                  )
                "
              >
                {{ monthlyStatistics.averageR.toFixed(2) }}R
              </p>
            </div>

            <div>
              <p class="text-xs text-zinc-500">
                盈虧
              </p>

              <p
                class="mt-1 text-xl font-semibold"
                :class="
                  profitLossClasses(
                    monthlyStatistics.totalProfitLoss,
                  )
                "
              >
                {{
                  monthlyStatistics.totalProfitLoss > 0
                    ? '+'
                    : ''
                }}
                {{
                  formatMoney(
                    monthlyStatistics.totalProfitLoss,
                  )
                }}
              </p>
            </div>
          </div>
        </section>

        <section
          class="rounded-2xl border border-zinc-800 bg-zinc-950/55 p-5"
        >
          <p
            class="text-xs font-medium tracking-[0.16em] text-emerald-400"
          >
            全部
          </p>

          <div
            class="mt-4 grid grid-cols-2 gap-3"
          >
            <div>
              <p class="text-xs text-zinc-500">
                交易筆數
              </p>

              <p
                class="mt-1 text-xl font-semibold text-zinc-100"
              >
                {{ statistics.totalTrades }}
              </p>
            </div>

            <div>
              <p class="text-xs text-zinc-500">
                勝率
              </p>

              <p
                class="mt-1 text-xl font-semibold text-sky-300"
              >
                {{ statistics.winRate }}%
              </p>
            </div>

            <div>
              <p class="text-xs text-zinc-500">
                平均報酬
              </p>

              <p
                class="mt-1 text-xl font-semibold"
                :class="
                  profitLossClasses(
                    statistics.averageR,
                  )
                "
              >
                {{ statistics.averageR.toFixed(2) }}R
              </p>
            </div>

            <div>
              <p class="text-xs text-zinc-500">
                盈虧
              </p>

              <p
                class="mt-1 text-xl font-semibold"
                :class="
                  profitLossClasses(
                    statistics.totalProfitLoss,
                  )
                "
              >
                {{
                  statistics.totalProfitLoss > 0
                    ? '+'
                    : ''
                }}
                {{
                  formatMoney(
                    statistics.totalProfitLoss,
                  )
                }}
              </p>
            </div>
          </div>
        </section>
      </div>

      <div
        class="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]"
      >
        <section
          class="rounded-2xl border border-zinc-800 bg-zinc-950/55 p-5"
        >
          <div
            class="flex items-start justify-between gap-4"
          >
            <div>
              <p class="text-sm font-semibold text-zinc-200">
                累積盈虧曲線
              </p>

              <p class="mt-1 text-xs text-zinc-500">
                依照交易時間順序累積計算。
              </p>
            </div>

            <p
              class="text-xl font-semibold"
              :class="
                profitLossClasses(
                  currentEquity,
                )
              "
            >
              {{ currentEquity > 0 ? '+' : '' }}
              {{ formatMoney(currentEquity) }}
            </p>
          </div>

          <div
            v-if="equityPoints.length"
            class="mt-5 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60"
          >
            <svg
              :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
              class="h-52 w-full"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient
                  id="equityAreaGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stop-color="currentColor"
                    stop-opacity="0.3"
                  />

                  <stop
                    offset="100%"
                    stop-color="currentColor"
                    stop-opacity="0"
                  />
                </linearGradient>
              </defs>

              <line
                :x1="chartPadding"
                :x2="chartWidth - chartPadding"
                :y1="chartHeight - chartPadding"
                :y2="chartHeight - chartPadding"
                stroke="currentColor"
                stroke-opacity="0.12"
              />

              <path
                :d="equityAreaPath"
                fill="url(#equityAreaGradient)"
                class="text-sky-400"
              />

              <polyline
                :points="equityPolyline"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="text-sky-400"
              />

              <circle
                v-for="point in equityPoints"
                :key="`${point.x}-${point.y}`"
                :cx="point.x"
                :cy="point.y"
                r="3.5"
                fill="currentColor"
                class="text-sky-300"
              />
            </svg>
          </div>

          <div
            v-else
            class="mt-5 flex h-52 items-center justify-center rounded-2xl border border-dashed border-zinc-800"
          >
            <p class="text-sm text-zinc-500">
              尚未建立交易資料。
            </p>
          </div>
        </section>

        <section
          class="rounded-2xl border border-zinc-800 bg-zinc-950/55 p-5"
        >
          <p class="text-sm font-semibold text-zinc-200">
            進階統計
          </p>

          <div class="mt-5 space-y-4">
            <div
              class="flex items-center justify-between gap-4"
            >
              <p class="text-sm text-zinc-500">
                獲利因子
              </p>

              <p
                class="font-semibold text-amber-300"
              >
                {{ profitFactor.toFixed(2) }}
              </p>
            </div>

            <div
              class="flex items-center justify-between gap-4"
            >
              <p class="text-sm text-zinc-500">
                單筆期望值
              </p>

              <p
                class="font-semibold"
                :class="
                  profitLossClasses(
                    expectancy,
                  )
                "
              >
                {{ expectancy > 0 ? '+' : '' }}
                {{ formatMoney(expectancy) }}
              </p>
            </div>

            <div
              class="flex items-center justify-between gap-4"
            >
              <p class="text-sm text-zinc-500">
                最大連勝
              </p>

              <p
                class="font-semibold text-emerald-300"
              >
                {{ maximumWinningStreak }} 筆
              </p>
            </div>

            <div
              class="flex items-center justify-between gap-4"
            >
              <p class="text-sm text-zinc-500">
                最大連敗
              </p>

              <p
                class="font-semibold text-rose-300"
              >
                {{ maximumLosingStreak }} 筆
              </p>
            </div>

            <div
              class="flex items-center justify-between gap-4"
            >
              <p class="text-sm text-zinc-500">
                最大單筆獲利
              </p>

              <p
                class="font-semibold text-emerald-300"
              >
                +{{ formatMoney(maximumWin) }}
              </p>
            </div>

            <div
              class="flex items-center justify-between gap-4"
            >
              <p class="text-sm text-zinc-500">
                最大單筆虧損
              </p>

              <p
                class="font-semibold text-rose-300"
              >
                {{ formatMoney(maximumLoss) }}
              </p>
            </div>
          </div>
        </section>
      </div>

      <section
        class="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/55 p-5"
      >
        <div
          class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p class="text-sm font-semibold text-zinc-200">
              最近 20 筆交易
            </p>

            <p class="mt-1 text-xs text-zinc-500">
              綠色為獲利、紅色為虧損、灰色為平手。
            </p>
          </div>

          <RouterLink
            to="/trades"
            class="text-sm font-medium text-sky-300 transition hover:text-sky-200"
          >
            查看交易紀錄
          </RouterLink>
        </div>

        <div
          v-if="recentTrades.length"
          class="mt-5 flex flex-wrap gap-2"
        >
          <div
            v-for="trade in recentTrades"
            :key="trade.id"
            class="group relative"
          >
            <div
              class="h-4 w-4 rounded-full ring-2 ring-zinc-900 transition group-hover:scale-125"
              :class="resultClasses(trade.result)"
            />

            <div
              class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-44 -translate-x-1/2 rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-xs shadow-xl group-hover:block"
            >
              <p class="font-medium text-zinc-200">
                {{ trade.symbol }}
              </p>

              <p class="mt-1 text-zinc-500">
                {{ trade.date }} {{ trade.time }}
              </p>

              <p
                class="mt-2 font-semibold"
                :class="
                  profitLossClasses(
                    trade.profitLoss,
                  )
                "
              >
                {{
                  trade.profitLoss > 0
                    ? '+'
                    : ''
                }}
                {{ formatMoney(trade.profitLoss) }}
                ·
                {{ trade.rMultiple.toFixed(2) }}R
              </p>
            </div>
          </div>
        </div>

        <p
          v-else
          class="mt-5 text-sm text-zinc-500"
        >
          尚未建立交易資料。
        </p>
      </section>
    </div>
  </section>
</template>