<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useTradeStore } from '@/stores/useTradeStore'

import type {
  TradeMistakeTag,
  TradeRecord,
} from '@/types/trade'

const props = defineProps<{
  trades?: TradeRecord[]
}>()

interface PerformanceGroup {
  key: string
  label: string
  trades: number
  wins: number
  losses: number
  breakeven: number
  winRate: number
  averageR: number
  totalR: number
  totalProfitLoss: number
}

interface DistributionItem {
  label: string
  count: number
  percentage: number
}

interface EquityPoint {
  x: number
  y: number
  value: number
}

const tradeStore = useTradeStore()

const {
  sortedClosedTrades: sortedTrades,
} = storeToRefs(tradeStore)

const analyticsTrades = computed(() => props.trades ?? sortedTrades.value)

const chartWidth = 760
const chartHeight = 220
const chartPadding = 20

const mistakeLabels: Record<
  TradeMistakeTag,
  string
> = {
  fomo: 'FOMO 追價',
  overtrade: '過度交易',
  'early-entry': '過早進場',
  'late-entry': '太晚進場',
  'early-exit': '過早離場',
  'late-exit': '太晚離場',
  'moved-stop': '移動停損',
  'oversized-risk': '風險過大',
  'ignored-trend': '忽略趨勢',
  'ignored-news': '忽略新聞',
  'revenge-trade': '報復交易',
  'no-confirmation': '沒有確認',
}

const parseTradeDate = (
  trade: TradeRecord,
): Date => {
  const normalizedDate =
    trade.date.replaceAll('/', '-')

  const date = new Date(
    `${normalizedDate}T${trade.time || '00:00'}:00`,
  )

  return Number.isNaN(date.getTime())
    ? new Date(0)
    : date
}

const chronologicalTrades = computed(() =>
  [...analyticsTrades.value].sort(
    (a, b) =>
      parseTradeDate(a).getTime() -
      parseTradeDate(b).getTime(),
  ),
)

const calculatePerformance = (
  key: string,
  label: string,
  trades: TradeRecord[],
): PerformanceGroup => {
  const total = trades.length

  const wins = trades.filter(
    trade => trade.result === 'win',
  ).length

  const losses = trades.filter(
    trade => trade.result === 'loss',
  ).length

  const breakeven = trades.filter(
    trade => trade.result === 'breakeven',
  ).length

  const totalR = trades.reduce(
    (sum, trade) =>
      sum + trade.rMultiple,
    0,
  )

  const totalProfitLoss = trades.reduce(
    (sum, trade) =>
      sum + trade.profitLoss,
    0,
  )

  return {
    key,
    label,
    trades: total,
    wins,
    losses,
    breakeven,
    winRate:
      total > 0
        ? Math.round(
            (wins / total) * 100,
          )
        : 0,
    averageR:
      total > 0
        ? Number(
            (totalR / total).toFixed(2),
          )
        : 0,
    totalR: Number(totalR.toFixed(2)),
    totalProfitLoss,
  }
}

const monthlyPerformance = computed(() => {
  const monthMap = new Map<
    string,
    TradeRecord[]
  >()

  chronologicalTrades.value.forEach(trade => {
    const date = parseTradeDate(trade)

    const key = `${date.getFullYear()}-${String(
      date.getMonth() + 1,
    ).padStart(2, '0')}`

    const trades =
      monthMap.get(key) ?? []

    trades.push(trade)
    monthMap.set(key, trades)
  })

  return [...monthMap.entries()]
    .map(([key, trades]) =>
      calculatePerformance(
        key,
        key,
        trades,
      ),
    )
    .sort((a, b) =>
      b.key.localeCompare(a.key),
    )
})

const weekdayPerformance = computed(() => {
  const definitions = [
    {
      key: '1',
      label: '星期一',
    },
    {
      key: '2',
      label: '星期二',
    },
    {
      key: '3',
      label: '星期三',
    },
    {
      key: '4',
      label: '星期四',
    },
    {
      key: '5',
      label: '星期五',
    },
    {
      key: '6',
      label: '星期六',
    },
    {
      key: '0',
      label: '星期日',
    },
  ]

  return definitions.map(definition => {
    const trades =
      analyticsTrades.value.filter(
        trade =>
          String(
            parseTradeDate(
              trade,
            ).getDay(),
          ) === definition.key,
      )

    return calculatePerformance(
      definition.key,
      definition.label,
      trades,
    )
  })
})

const bestWeekday = computed(() => {
  const available =
    weekdayPerformance.value.filter(
      item => item.trades > 0,
    )

  if (available.length === 0) {
    return null
  }

  return [...available].sort(
    (a, b) => {
      if (b.averageR !== a.averageR) {
        return (
          b.averageR -
          a.averageR
        )
      }

      return b.winRate - a.winRate
    },
  )[0]
})

const sessionPerformance = computed(() => {
  const definitions = [
    {
      key: 'asia',
      label: '亞洲盤',
      matches: (hour: number) =>
        hour >= 6 && hour < 14,
    },
    {
      key: 'london',
      label: '倫敦盤',
      matches: (hour: number) =>
        hour >= 14 && hour < 20,
    },
    {
      key: 'new-york',
      label: '美盤',
      matches: (hour: number) =>
        hour >= 20 || hour < 2,
    },
    {
      key: 'overnight',
      label: '凌晨時段',
      matches: (hour: number) =>
        hour >= 2 && hour < 6,
    },
  ]

  return definitions.map(definition => {
    const trades =
      analyticsTrades.value.filter(
        trade =>
          definition.matches(
            parseTradeDate(
              trade,
            ).getHours(),
          ),
      )

    return calculatePerformance(
      definition.key,
      definition.label,
      trades,
    )
  })
})

const playbookPerformance = computed(() => {
  const map = new Map<
    string,
    TradeRecord[]
  >()

  analyticsTrades.value.forEach(trade => {
    const key =
      trade.playbook.trim() ||
      '未分類策略'

    const trades =
      map.get(key) ?? []

    trades.push(trade)
    map.set(key, trades)
  })

  return [...map.entries()]
    .map(([key, trades]) =>
      calculatePerformance(
        key,
        key,
        trades,
      ),
    )
    .sort((a, b) => {
      if (b.averageR !== a.averageR) {
        return (
          b.averageR -
          a.averageR
        )
      }

      return b.winRate - a.winRate
    })
})

const accountPerformance = computed(() => {
  const map = new Map<
    string,
    TradeRecord[]
  >()

  analyticsTrades.value.forEach(trade => {
    const key =
      trade.account.trim() ||
      '未指定帳戶'

    const trades =
      map.get(key) ?? []

    trades.push(trade)
    map.set(key, trades)
  })

  return [...map.entries()]
    .map(([key, trades]) =>
      calculatePerformance(
        key,
        key,
        trades,
      ),
    )
    .sort(
      (a, b) =>
        b.totalProfitLoss -
        a.totalProfitLoss,
    )
})

const mistakePerformance = computed(() => {
  const map = new Map<
    string,
    TradeRecord[]
  >()

  analyticsTrades.value.forEach(trade => {
    trade.mistakeTags.forEach(tag => {
      const label =
        mistakeLabels[tag]

      const trades =
        map.get(label) ?? []

      trades.push(trade)
      map.set(label, trades)
    })

    trade.customMistakeTags.forEach(tag => {
      const label = tag.trim()

      if (!label) {
        return
      }

      const trades =
        map.get(label) ?? []

      trades.push(trade)
      map.set(label, trades)
    })
  })

  return [...map.entries()]
    .map(([key, trades]) =>
      calculatePerformance(
        key,
        key,
        trades,
      ),
    )
    .sort((a, b) => {
      if (b.trades !== a.trades) {
        return b.trades - a.trades
      }

      return (
        a.totalProfitLoss -
        b.totalProfitLoss
      )
    })
})

const rDistribution = computed<
  DistributionItem[]
>(() => {
  const ranges = [
    {
      label: '< -2R',
      matches: (value: number) =>
        value < -2,
    },
    {
      label: '-2R ～ -1R',
      matches: (value: number) =>
        value >= -2 && value < -1,
    },
    {
      label: '-1R ～ 0R',
      matches: (value: number) =>
        value >= -1 && value < 0,
    },
    {
      label: '0R ～ 1R',
      matches: (value: number) =>
        value >= 0 && value < 1,
    },
    {
      label: '1R ～ 2R',
      matches: (value: number) =>
        value >= 1 && value < 2,
    },
    {
      label: '2R 以上',
      matches: (value: number) =>
        value >= 2,
    },
  ]

  const total =
    analyticsTrades.value.length

  return ranges.map(range => {
    const count =
      analyticsTrades.value.filter(
        trade =>
          range.matches(
            trade.rMultiple,
          ),
      ).length

    return {
      label: range.label,
      count,
      percentage:
        total > 0
          ? Math.round(
              (count / total) * 100,
            )
          : 0,
    }
  })
})

const recentThirtyTrades = computed(() =>
  analyticsTrades.value
    .slice(0, 30)
    .reverse(),
)

const recentEquityValues = computed(() => {
  let total = 0

  return recentThirtyTrades.value.map(
    trade => {
      total += trade.profitLoss
      return total
    },
  )
})

const recentRValues = computed(() => {
  let total = 0

  return recentThirtyTrades.value.map(
    trade => {
      total += trade.rMultiple
      return Number(total.toFixed(2))
    },
  )
})

const createChartPoints = (
  values: number[],
): EquityPoint[] => {
  if (values.length === 0) {
    return []
  }

  const minimum = Math.min(
    0,
    ...values,
  )

  const maximum = Math.max(
    0,
    ...values,
  )

  const range =
    maximum - minimum || 1

  const usableWidth =
    chartWidth -
    chartPadding * 2

  const usableHeight =
    chartHeight -
    chartPadding * 2

  return values.map((value, index) => ({
    x:
      values.length === 1
        ? chartWidth / 2
        : chartPadding +
          (
            index /
            (values.length - 1)
          ) *
            usableWidth,
    y:
      chartPadding +
      (
        1 -
        (
          value - minimum
        ) /
          range
      ) *
        usableHeight,
    value,
  }))
}

const equityChartPoints = computed(() =>
  createChartPoints(
    recentEquityValues.value,
  ),
)

const rChartPoints = computed(() =>
  createChartPoints(
    recentRValues.value,
  ),
)

const pointsToPolyline = (
  points: EquityPoint[],
): string =>
  points
    .map(
      point =>
        `${point.x},${point.y}`,
    )
    .join(' ')

const equityPolyline = computed(() =>
  pointsToPolyline(
    equityChartPoints.value,
  ),
)

const rPolyline = computed(() =>
  pointsToPolyline(
    rChartPoints.value,
  ),
)

const bestPlaybook = computed(
  () =>
    playbookPerformance.value[0] ??
    null,
)

const worstMistake = computed(
  () =>
    mistakePerformance.value[0] ??
    null,
)

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

const scoreClasses = (
  value: number,
): string => {
  if (value >= 70) {
    return 'text-emerald-300'
  }

  if (value >= 50) {
    return 'text-amber-300'
  }

  return 'text-rose-300'
}

const barClasses = (
  value: number,
): string => {
  if (value >= 70) {
    return 'bg-emerald-400'
  }

  if (value >= 50) {
    return 'bg-amber-400'
  }

  return 'bg-rose-400'
}
</script>

<template>
  <section
    class="space-y-6"
  >
    <header
      class="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl shadow-black/10"
    >
      <div
        class="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl"
      />

      <div
        class="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"
      >
        <div>
          <p
            class="text-xs font-medium tracking-[0.2em] text-sky-400"
          >
            交易數據中心
          </p>

          <h2
            class="mt-2 text-2xl font-semibold text-zinc-100"
          >
            交易分析儀表板
          </h2>

          <p
            class="mt-2 max-w-3xl text-sm leading-7 text-zinc-500"
          >
            比較月份、星期、交易時段、策略、帳戶、錯誤標籤與報酬倍數分布。
          </p>
        </div>

        <div
          class="rounded-full border border-zinc-700 bg-zinc-950/60 px-4 py-2 text-sm text-zinc-400"
        >
          共 {{ sortedTrades.length }} 筆交易
        </div>
      </div>
    </header>

    <div
      class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <article
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
      >
        <p class="text-sm text-zinc-500">
          最佳交易日
        </p>

        <p
          v-if="bestWeekday"
          class="mt-3 text-2xl font-semibold text-emerald-300"
        >
          {{ bestWeekday.label }}
        </p>

        <p
          v-else
          class="mt-3 text-lg text-zinc-600"
        >
          尚無資料
        </p>

        <p
          v-if="bestWeekday"
          class="mt-2 text-xs text-zinc-600"
        >
          勝率 {{ bestWeekday.winRate }}%
          · {{ bestWeekday.averageR }}R
        </p>
      </article>

      <article
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
      >
        <p class="text-sm text-zinc-500">
          最佳策略
        </p>

        <p
          v-if="bestPlaybook"
          class="mt-3 truncate text-xl font-semibold text-sky-300"
        >
          {{ bestPlaybook.label }}
        </p>

        <p
          v-else
          class="mt-3 text-lg text-zinc-600"
        >
          尚無資料
        </p>

        <p
          v-if="bestPlaybook"
          class="mt-2 text-xs text-zinc-600"
        >
          {{ bestPlaybook.trades }} 筆
          · {{ bestPlaybook.averageR }}R
        </p>
      </article>

      <article
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
      >
        <p class="text-sm text-zinc-500">
          最常犯錯
        </p>

        <p
          v-if="worstMistake"
          class="mt-3 truncate text-xl font-semibold text-rose-300"
        >
          {{ worstMistake.label }}
        </p>

        <p
          v-else
          class="mt-3 text-lg text-zinc-600"
        >
          尚無錯誤標籤
        </p>

        <p
          v-if="worstMistake"
          class="mt-2 text-xs text-zinc-600"
        >
          {{ worstMistake.trades }} 次
          ·
          {{ formatMoney(worstMistake.totalProfitLoss) }}
        </p>
      </article>

      <article
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
      >
        <p class="text-sm text-zinc-500">
          最近 30 筆累積 R
        </p>

        <p
          class="mt-3 text-2xl font-semibold"
          :class="
            profitLossClasses(
              recentRValues[
                recentRValues.length - 1
              ] ?? 0,
            )
          "
        >
          {{
            (
              recentRValues[
                recentRValues.length - 1
              ] ?? 0
            ).toFixed(2)
          }}R
        </p>
      </article>
    </div>

    <section
      class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6"
    >
      <header>
        <p
          class="text-xs font-medium tracking-[0.2em] text-violet-400"
        >
          月度表現
        </p>

        <h3
          class="mt-2 text-xl font-semibold text-zinc-100"
        >
          每月交易統計
        </h3>
      </header>

      <div
        v-if="monthlyPerformance.length"
        class="mt-6 overflow-x-auto"
      >
        <table
          class="min-w-full text-left text-sm"
        >
          <thead>
            <tr
              class="border-b border-zinc-800 text-zinc-500"
            >
              <th class="px-3 py-3 font-medium">
                月份
              </th>
              <th class="px-3 py-3 font-medium">
                交易
              </th>
              <th class="px-3 py-3 font-medium">
                勝率
              </th>
              <th class="px-3 py-3 font-medium">
                平均 R
              </th>
              <th class="px-3 py-3 font-medium">
                總 R
              </th>
              <th class="px-3 py-3 font-medium">
                盈虧
              </th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="item in monthlyPerformance"
              :key="item.key"
              class="border-b border-zinc-800/70"
            >
              <td
                class="px-3 py-4 font-medium text-zinc-200"
              >
                {{ item.label }}
              </td>

              <td class="px-3 py-4 text-zinc-400">
                {{ item.trades }}
              </td>

              <td
                class="px-3 py-4 font-medium"
                :class="scoreClasses(item.winRate)"
              >
                {{ item.winRate }}%
              </td>

              <td
                class="px-3 py-4 font-medium"
                :class="
                  profitLossClasses(
                    item.averageR,
                  )
                "
              >
                {{ item.averageR.toFixed(2) }}R
              </td>

              <td
                class="px-3 py-4 font-medium"
                :class="
                  profitLossClasses(
                    item.totalR,
                  )
                "
              >
                {{ item.totalR.toFixed(2) }}R
              </td>

              <td
                class="px-3 py-4 font-medium"
                :class="
                  profitLossClasses(
                    item.totalProfitLoss,
                  )
                "
              >
                {{
                  item.totalProfitLoss > 0
                    ? '+'
                    : ''
                }}
                {{
                  formatMoney(
                    item.totalProfitLoss,
                  )
                }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p
        v-else
        class="mt-6 text-sm text-zinc-600"
      >
        尚無交易資料。
      </p>
    </section>

    <div class="grid gap-6 xl:grid-cols-2">
      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6"
      >
        <h3 class="text-xl font-semibold text-zinc-100">
          星期績效
        </h3>

        <div class="mt-6 space-y-4">
          <article
            v-for="item in weekdayPerformance"
            :key="item.key"
          >
            <div
              class="flex items-center justify-between gap-4"
            >
              <div>
                <p class="font-medium text-zinc-300">
                  {{ item.label }}
                </p>

                <p class="mt-1 text-xs text-zinc-600">
                  {{ item.trades }} 筆
                  · {{ item.averageR }}R
                </p>
              </div>

              <p
                class="font-semibold"
                :class="scoreClasses(item.winRate)"
              >
                {{ item.winRate }}%
              </p>
            </div>

            <div
              class="mt-2 h-2.5 overflow-hidden rounded-full bg-zinc-800"
            >
              <div
                class="h-full rounded-full"
                :class="barClasses(item.winRate)"
                :style="{
                  width: `${item.winRate}%`,
                }"
              />
            </div>
          </article>
        </div>
      </section>

      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6"
      >
        <h3 class="text-xl font-semibold text-zinc-100">
          交易時段分析
        </h3>

        <div
          class="mt-6 grid gap-4 sm:grid-cols-2"
        >
          <article
            v-for="item in sessionPerformance"
            :key="item.key"
            class="rounded-2xl border border-zinc-800 bg-zinc-950/55 p-4"
          >
            <p class="font-medium text-zinc-200">
              {{ item.label }}
            </p>

            <div
              class="mt-4 grid grid-cols-2 gap-3"
            >
              <div>
                <p class="text-xs text-zinc-600">
                  交易
                </p>

                <p
                  class="mt-1 font-semibold text-zinc-300"
                >
                  {{ item.trades }}
                </p>
              </div>

              <div>
                <p class="text-xs text-zinc-600">
                  勝率
                </p>

                <p
                  class="mt-1 font-semibold"
                  :class="scoreClasses(item.winRate)"
                >
                  {{ item.winRate }}%
                </p>
              </div>

              <div>
                <p class="text-xs text-zinc-600">
                  平均 R
                </p>

                <p
                  class="mt-1 font-semibold"
                  :class="
                    profitLossClasses(
                      item.averageR,
                    )
                  "
                >
                  {{ item.averageR }}R
                </p>
              </div>

              <div>
                <p class="text-xs text-zinc-600">
                  盈虧
                </p>

                <p
                  class="mt-1 font-semibold"
                  :class="
                    profitLossClasses(
                      item.totalProfitLoss,
                    )
                  "
                >
                  {{
                    formatMoney(
                      item.totalProfitLoss,
                    )
                  }}
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>

    <div class="grid gap-6 xl:grid-cols-2">
      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6"
      >
        <h3 class="text-xl font-semibold text-zinc-100">
          策略排行榜
        </h3>

        <div
          v-if="playbookPerformance.length"
          class="mt-5 space-y-3"
        >
          <article
            v-for="(item, index) in playbookPerformance"
            :key="item.key"
            class="rounded-2xl border border-zinc-800 bg-zinc-950/55 p-4"
          >
            <div
              class="flex items-start justify-between gap-4"
            >
              <div>
                <p class="font-medium text-zinc-200">
                  {{ index + 1 }}.
                  {{ item.label }}
                </p>

                <p class="mt-1 text-xs text-zinc-600">
                  {{ item.trades }} 筆
                  · 勝率 {{ item.winRate }}%
                </p>
              </div>

              <div class="text-right">
                <p
                  class="font-semibold"
                  :class="
                    profitLossClasses(
                      item.averageR,
                    )
                  "
                >
                  {{ item.averageR }}R
                </p>

                <p
                  class="mt-1 text-xs"
                  :class="
                    profitLossClasses(
                      item.totalProfitLoss,
                    )
                  "
                >
                  {{
                    formatMoney(
                      item.totalProfitLoss,
                    )
                  }}
                </p>
              </div>
            </div>
          </article>
        </div>

        <p
          v-else
          class="mt-6 text-sm text-zinc-600"
        >
          尚無策略資料。
        </p>
      </section>

      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6"
      >
        <h3 class="text-xl font-semibold text-zinc-100">
          帳戶績效
        </h3>

        <div
          v-if="accountPerformance.length"
          class="mt-5 space-y-3"
        >
          <article
            v-for="item in accountPerformance"
            :key="item.key"
            class="rounded-2xl border border-zinc-800 bg-zinc-950/55 p-4"
          >
            <div
              class="flex items-start justify-between gap-4"
            >
              <div>
                <p class="font-medium text-zinc-200">
                  {{ item.label }}
                </p>

                <p class="mt-1 text-xs text-zinc-600">
                  {{ item.trades }} 筆
                  · 勝率 {{ item.winRate }}%
                  · {{ item.averageR }}R
                </p>
              </div>

              <p
                class="font-semibold"
                :class="
                  profitLossClasses(
                    item.totalProfitLoss,
                  )
                "
              >
                {{
                  item.totalProfitLoss > 0
                    ? '+'
                    : ''
                }}
                {{
                  formatMoney(
                    item.totalProfitLoss,
                  )
                }}
              </p>
            </div>
          </article>
        </div>
      </section>
    </div>

    <div class="grid gap-6 xl:grid-cols-2">
      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6"
      >
        <h3 class="text-xl font-semibold text-zinc-100">
          錯誤排行榜
        </h3>

        <div
          v-if="mistakePerformance.length"
          class="mt-5 space-y-3"
        >
          <article
            v-for="item in mistakePerformance.slice(0, 10)"
            :key="item.key"
            class="rounded-2xl border border-rose-500/15 bg-rose-500/5 p-4"
          >
            <div
              class="flex items-start justify-between gap-4"
            >
              <div>
                <p class="font-medium text-rose-300">
                  {{ item.label }}
                </p>

                <p class="mt-1 text-xs text-zinc-600">
                  出現 {{ item.trades }} 次
                  · 平均 {{ item.averageR }}R
                </p>
              </div>

              <p
                class="font-semibold"
                :class="
                  profitLossClasses(
                    item.totalProfitLoss,
                  )
                "
              >
                {{
                  formatMoney(
                    item.totalProfitLoss,
                  )
                }}
              </p>
            </div>
          </article>
        </div>

        <p
          v-else
          class="mt-6 text-sm text-zinc-600"
        >
          尚無錯誤標籤資料。
        </p>
      </section>

      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6"
      >
        <h3 class="text-xl font-semibold text-zinc-100">
          R 倍數分布
        </h3>

        <div class="mt-6 space-y-4">
          <article
            v-for="item in rDistribution"
            :key="item.label"
          >
            <div
              class="flex items-center justify-between gap-4"
            >
              <div>
                <p class="font-medium text-zinc-300">
                  {{ item.label }}
                </p>

                <p class="mt-1 text-xs text-zinc-600">
                  {{ item.count }} 筆
                </p>
              </div>

              <p class="font-semibold text-sky-300">
                {{ item.percentage }}%
              </p>
            </div>

            <div
              class="mt-2 h-2.5 overflow-hidden rounded-full bg-zinc-800"
            >
              <div
                class="h-full rounded-full bg-sky-400"
                :style="{
                  width: `${item.percentage}%`,
                }"
              />
            </div>
          </article>
        </div>
      </section>
    </div>

    <section
      class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6"
    >
      <header>
        <p
          class="text-xs font-medium tracking-[0.2em] text-emerald-400"
        >
          最近 30 筆
        </p>

        <h3
          class="mt-2 text-xl font-semibold text-zinc-100"
        >
          累積盈虧與累積 R
        </h3>
      </header>

      <div
        class="mt-6 grid gap-6 xl:grid-cols-2"
      >
        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/55 p-5"
        >
          <div
            class="flex items-center justify-between gap-4"
          >
            <p class="font-medium text-zinc-300">
              累積盈虧
            </p>

            <p
              class="font-semibold"
              :class="
                profitLossClasses(
                  recentEquityValues[
                    recentEquityValues.length - 1
                  ] ?? 0,
                )
              "
            >
              {{
                formatMoney(
                  recentEquityValues[
                    recentEquityValues.length - 1
                  ] ?? 0,
                )
              }}
            </p>
          </div>

          <svg
            :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
            class="mt-4 h-56 w-full"
            preserveAspectRatio="none"
          >
            <polyline
              v-if="equityChartPoints.length"
              :points="equityPolyline"
              fill="none"
              stroke="currentColor"
              stroke-width="4"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="text-emerald-400"
            />
          </svg>
        </div>

        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/55 p-5"
        >
          <div
            class="flex items-center justify-between gap-4"
          >
            <p class="font-medium text-zinc-300">
              累積 R
            </p>

            <p
              class="font-semibold"
              :class="
                profitLossClasses(
                  recentRValues[
                    recentRValues.length - 1
                  ] ?? 0,
                )
              "
            >
              {{
                (
                  recentRValues[
                    recentRValues.length - 1
                  ] ?? 0
                ).toFixed(2)
              }}R
            </p>
          </div>

          <svg
            :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
            class="mt-4 h-56 w-full"
            preserveAspectRatio="none"
          >
            <polyline
              v-if="rChartPoints.length"
              :points="rPolyline"
              fill="none"
              stroke="currentColor"
              stroke-width="4"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="text-sky-400"
            />
          </svg>
        </div>
      </div>
    </section>
  </section>
</template>
