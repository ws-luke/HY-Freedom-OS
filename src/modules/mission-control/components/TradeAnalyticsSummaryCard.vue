<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'
import { BaseCard } from '@/components/ui'
import { useTradeStore } from '@/stores/useTradeStore'

import type {
  TradeMistakeTag,
  TradeRecord,
} from '@/types/trade'

interface PerformanceItem {
  label: string
  trades: number
  wins: number
  winRate: number
  averageR: number
  totalProfitLoss: number
}

const tradeStore = useTradeStore()

const {
  sortedTrades,
  statistics,
} = storeToRefs(tradeStore)

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

const calculatePerformance = (
  label: string,
  trades: TradeRecord[],
): PerformanceItem => {
  const totalTrades = trades.length

  const wins = trades.filter(
    trade => trade.result === 'win',
  ).length

  const totalR = trades.reduce(
    (total, trade) =>
      total + trade.rMultiple,
    0,
  )

  const totalProfitLoss = trades.reduce(
    (total, trade) =>
      total + trade.profitLoss,
    0,
  )

  return {
    label,
    trades: totalTrades,
    wins,
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
              totalR /
              totalTrades
            ).toFixed(2),
          )
        : 0,
    totalProfitLoss,
  }
}

const startOfWeek = (
  date: Date,
): Date => {
  const result = new Date(date)

  const day = result.getDay()

  result.setDate(
    result.getDate() +
      (day === 0 ? -6 : 1 - day),
  )

  result.setHours(0, 0, 0, 0)

  return result
}

const weeklyTrades = computed(() => {
  const weekStart =
    startOfWeek(new Date())

  return sortedTrades.value.filter(
    trade =>
      parseTradeDate(trade).getTime() >=
      weekStart.getTime(),
  )
})

const monthlyTrades = computed(() => {
  const now = new Date()

  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  )

  return sortedTrades.value.filter(
    trade =>
      parseTradeDate(trade).getTime() >=
      monthStart.getTime(),
  )
})

const weeklyPerformance = computed(() =>
  calculatePerformance(
    '本週',
    weeklyTrades.value,
  ),
)

const monthlyPerformance = computed(() =>
  calculatePerformance(
    '本月',
    monthlyTrades.value,
  ),
)

const playbookPerformance = computed(() => {
  const map = new Map<
    string,
    TradeRecord[]
  >()

  sortedTrades.value.forEach(trade => {
    const name =
      trade.playbook.trim() ||
      '未分類策略'

    const trades =
      map.get(name) ?? []

    trades.push(trade)
    map.set(name, trades)
  })

  return [...map.entries()]
    .map(([name, trades]) =>
      calculatePerformance(
        name,
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

      if (b.winRate !== a.winRate) {
        return (
          b.winRate -
          a.winRate
        )
      }

      return (
        b.trades -
        a.trades
      )
    })
})

const bestPlaybook = computed(
  () =>
    playbookPerformance.value[0] ??
    null,
)

const mistakeStatistics = computed(() => {
  const map = new Map<
    string,
    {
      count: number
      totalProfitLoss: number
    }
  >()

  sortedTrades.value.forEach(trade => {
    trade.mistakeTags.forEach(tag => {
      const label =
        mistakeLabels[tag]

      const current =
        map.get(label) ?? {
          count: 0,
          totalProfitLoss: 0,
        }

      current.count += 1
      current.totalProfitLoss +=
        trade.profitLoss

      map.set(label, current)
    })

    trade.customMistakeTags.forEach(tag => {
      const label = tag.trim()

      if (!label) {
        return
      }

      const current =
        map.get(label) ?? {
          count: 0,
          totalProfitLoss: 0,
        }

      current.count += 1
      current.totalProfitLoss +=
        trade.profitLoss

      map.set(label, current)
    })
  })

  return [...map.entries()]
    .map(([label, data]) => ({
      label,
      count: data.count,
      totalProfitLoss:
        data.totalProfitLoss,
    }))
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
  () =>
    mistakeStatistics.value[0] ??
    null,
)

const recentTenTrades = computed(() =>
  sortedTrades.value.slice(0, 10),
)

const recentTenPerformance = computed(() =>
  calculatePerformance(
    '最近 10 筆',
    recentTenTrades.value,
  ),
)

const status = computed(() => {
  if (statistics.value.totalTrades === 0) {
    return {
      label: '尚無資料',
      classes:
        'border-zinc-700 bg-zinc-800/70 text-zinc-300',
    }
  }

  if (
    monthlyPerformance.value.averageR > 0 &&
    monthlyPerformance.value.totalProfitLoss > 0
  ) {
    return {
      label: '本月正向',
      classes:
        'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    }
  }

  if (
    monthlyPerformance.value.averageR < 0 ||
    monthlyPerformance.value.totalProfitLoss < 0
  ) {
    return {
      label: '需要調整',
      classes:
        'border-rose-500/25 bg-rose-500/10 text-rose-300',
    }
  }

  return {
    label: '持續觀察',
    classes:
      'border-amber-500/25 bg-amber-500/10 text-amber-300',
  }
})

const primaryAdvice = computed(() => {
  if (statistics.value.totalTrades === 0) {
    return '新增交易紀錄後，系統會開始整理策略、錯誤與近期績效。'
  }

  if (
    primaryMistake.value &&
    primaryMistake.value.count >= 2
  ) {
    return `目前最常發生的問題是「${primaryMistake.value.label}」，已出現 ${primaryMistake.value.count} 次。下一筆交易請優先避免這個問題。`
  }

  if (
    recentTenPerformance.value.averageR < 0
  ) {
    return '最近 10 筆平均 R 為負，建議降低交易頻率，只保留完整符合策略的機會。'
  }

  if (
    bestPlaybook.value &&
    bestPlaybook.value.trades >= 2
  ) {
    return `目前表現最好的策略是「${bestPlaybook.value.label}」，平均 ${bestPlaybook.value.averageR.toFixed(2)}R。`
  }

  return '目前資料沒有明顯異常，請繼續維持固定風險與完整進場確認。'
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
  <BaseCard
    padding="md"
    class="relative overflow-hidden shadow-xl shadow-black/10"
  >
    <div
      class="pointer-events-none absolute -right-24 -top-24 h-60 w-60 rounded-full bg-sky-500/10 blur-3xl"
    />

    <div class="relative">
      <header
        class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <p
            class="text-xs font-medium tracking-[0.2em] text-sky-400"
          >
            績效摘要
          </p>

          <h2
            class="mt-2 text-xl font-semibold text-zinc-100"
          >
            交易分析摘要
          </h2>

          <p
            class="mt-1 text-sm leading-6 text-zinc-500"
          >
            顯示本週、本月、近期交易、最佳策略與最常犯錯。
          </p>
        </div>

        <span
          class="rounded-full border px-3 py-1 text-xs font-medium"
          :class="status.classes"
        >
          {{ status.label }}
        </span>
      </header>

      <div
        class="mt-6 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5"
      >
        <p class="text-xs text-sky-300/70">
          目前最重要的提醒
        </p>

        <p
          class="mt-3 text-lg font-semibold leading-8 text-sky-200"
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
            本週盈虧
          </p>

          <p
            class="mt-2 text-2xl font-semibold"
            :class="
              profitLossClasses(
                weeklyPerformance.totalProfitLoss,
              )
            "
          >
            {{
              weeklyPerformance.totalProfitLoss > 0
                ? '+'
                : ''
            }}
            {{
              formatMoney(
                weeklyPerformance.totalProfitLoss,
              )
            }}
          </p>

          <p class="mt-1 text-xs text-zinc-600">
            {{ weeklyPerformance.trades }} 筆
            ·
            {{ weeklyPerformance.averageR.toFixed(2) }}R
          </p>
        </div>

        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
        >
          <p class="text-xs text-zinc-500">
            本月盈虧
          </p>

          <p
            class="mt-2 text-2xl font-semibold"
            :class="
              profitLossClasses(
                monthlyPerformance.totalProfitLoss,
              )
            "
          >
            {{
              monthlyPerformance.totalProfitLoss > 0
                ? '+'
                : ''
            }}
            {{
              formatMoney(
                monthlyPerformance.totalProfitLoss,
              )
            }}
          </p>

          <p class="mt-1 text-xs text-zinc-600">
            勝率
            {{ monthlyPerformance.winRate }}%
            ·
            {{ monthlyPerformance.averageR.toFixed(2) }}R
          </p>
        </div>

        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
        >
          <p class="text-xs text-zinc-500">
            最近 10 筆
          </p>

          <p
            class="mt-2 text-2xl font-semibold"
            :class="
              profitLossClasses(
                recentTenPerformance.averageR,
              )
            "
          >
            {{ recentTenPerformance.averageR.toFixed(2) }}R
          </p>

          <p class="mt-1 text-xs text-zinc-600">
            勝率
            {{ recentTenPerformance.winRate }}%
          </p>
        </div>

        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
        >
          <p class="text-xs text-zinc-500">
            累積平均 R
          </p>

          <p
            class="mt-2 text-2xl font-semibold"
            :class="
              profitLossClasses(
                statistics.averageR,
              )
            "
          >
            {{ statistics.averageR.toFixed(2) }}R
          </p>

          <p class="mt-1 text-xs text-zinc-600">
            共 {{ statistics.totalTrades }} 筆
          </p>
        </div>
      </div>

      <div
        class="mt-4 grid gap-3 sm:grid-cols-2"
      >
        <div
          class="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4"
        >
          <p class="text-xs text-emerald-300/70">
            最佳策略
          </p>

          <p
            v-if="bestPlaybook"
            class="mt-2 truncate font-semibold text-emerald-300"
          >
            {{ bestPlaybook.label }}
          </p>

          <p
            v-else
            class="mt-2 text-sm text-zinc-600"
          >
            尚無策略資料
          </p>

          <p
            v-if="bestPlaybook"
            class="mt-1 text-xs text-zinc-600"
          >
            {{ bestPlaybook.trades }} 筆
            ·
            勝率 {{ bestPlaybook.winRate }}%
            ·
            {{ bestPlaybook.averageR.toFixed(2) }}R
          </p>
        </div>

        <div
          class="rounded-2xl border border-rose-500/15 bg-rose-500/5 p-4"
        >
          <p class="text-xs text-rose-300/70">
            最常犯錯
          </p>

          <p
            v-if="primaryMistake"
            class="mt-2 truncate font-semibold text-rose-300"
          >
            {{ primaryMistake.label }}
          </p>

          <p
            v-else
            class="mt-2 text-sm text-zinc-600"
          >
            尚無錯誤標籤
          </p>

          <p
            v-if="primaryMistake"
            class="mt-1 text-xs text-zinc-600"
          >
            出現 {{ primaryMistake.count }} 次
            ·
            {{
              formatMoney(
                primaryMistake.totalProfitLoss,
              )
            }}
          </p>
        </div>
      </div>

      <RouterLink
        to="/trade-analytics"
        class="mt-5 flex w-full items-center justify-center rounded-2xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm font-medium text-sky-300 transition hover:border-sky-400/40 hover:bg-sky-500/15"
      >
        查看完整交易分析
      </RouterLink>
    </div>
  </BaseCard>
</template>