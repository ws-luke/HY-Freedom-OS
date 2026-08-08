<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'

import TradingRiskSettingsCard from '../components/TradingRiskSettingsCard.vue'
import TradingRiskStatusCard from '../components/TradingRiskStatusCard.vue'

import { useTradeStore } from '@/stores/useTradeStore'
import { useTradingRiskStore } from '@/stores/useTradingRiskStore'

import type {
  TradeDirection,
  TradeRecord,
  TradeResult,
} from '@/types/trade'

const tradeStore = useTradeStore()
const tradingRiskStore = useTradingRiskStore()

const {
  sortedTrades,
} = storeToRefs(tradeStore)

const {
  settings,
  todaySummary,
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
  date: string,
): string =>
  date.trim().replaceAll('/', '-')

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

const todayWinRate = computed(() => {
  if (todaySummary.value.trades === 0) {
    return 0
  }

  return Math.round(
    (
      todaySummary.value.wins /
      todaySummary.value.trades
    ) * 100,
  )
})

const overallStatus = computed(() => {
  if (risk.value.level === 'blocked') {
    return {
      label: '今日停止交易',
      description:
        risk.value.stopReason ||
        '今日已觸發交易風控限制。',
      classes:
        'border-rose-500/30 bg-rose-500/10 text-rose-300',
    }
  }

  if (risk.value.level === 'warning') {
    return {
      label: '接近風控上限',
      description:
        '今日仍可交易，但下一筆必須提高進場標準。',
      classes:
        'border-amber-500/30 bg-amber-500/10 text-amber-300',
    }
  }

  return {
    label: '目前允許交易',
    description:
      '今日尚未觸發任何交易限制。',
    classes:
      'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  }
})

const directionLabel = (
  direction: TradeDirection,
): string =>
  direction === 'buy'
    ? '多單'
    : '空單'

const directionClasses = (
  direction: TradeDirection,
): string =>
  direction === 'buy'
    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
    : 'border-rose-500/25 bg-rose-500/10 text-rose-300'

const resultLabel = (
  result: TradeResult,
): string => {
  const labels: Record<TradeResult, string> = {
    win: '獲利',
    loss: '虧損',
    breakeven: '平手',
  }

  return labels[result]
}

const resultClasses = (
  result: TradeResult,
): string => {
  const classes: Record<
    TradeResult,
    string
  > = {
    win:
      'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    loss:
      'border-rose-500/25 bg-rose-500/10 text-rose-300',
    breakeven:
      'border-zinc-700 bg-zinc-800/70 text-zinc-300',
  }

  return classes[result]
}

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

const getTradeRiskStatus = (
  trade: TradeRecord,
): {
  label: string
  classes: string
} => {
  if (
    trade.riskAmount >
    settings.value.maxRiskPerTrade
  ) {
    return {
      label: '超過單筆風險',
      classes:
        'border-rose-500/25 bg-rose-500/10 text-rose-300',
    }
  }

  if (
    trade.riskAmount >=
    settings.value.maxRiskPerTrade * 0.8
  ) {
    return {
      label: '接近風險上限',
      classes:
        'border-amber-500/25 bg-amber-500/10 text-amber-300',
    }
  }

  return {
    label: '風險正常',
    classes:
      'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  }
}
</script>

<template>
  <div class="space-y-6 pb-10">
    <section
      class="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl shadow-black/10"
    >
      <div
        class="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-rose-500/10 blur-3xl"
      />

      <div
        class="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between"
      >
        <div>
          <p
            class="text-xs font-medium tracking-[0.2em] text-rose-400"
          >
            交易紀律中心
          </p>

          <h1
            class="mt-2 text-3xl font-bold text-zinc-100"
          >
            交易風控
          </h1>

          <p
            class="mt-2 max-w-3xl text-sm leading-7 text-zinc-400"
          >
            管理每日交易次數、每日虧損、連續虧損與單筆風險，避免情緒化交易與超額風險。
          </p>
        </div>

        <div
          class="flex flex-col gap-3 sm:flex-row"
        >
          <RouterLink
            to="/trades"
            class="flex items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-950/60 px-5 py-3 text-sm font-medium text-zinc-400 transition hover:border-sky-500/30 hover:text-sky-300"
          >
            返回交易紀錄
          </RouterLink>

          <RouterLink
            to="/ai-coach"
            class="flex items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/10 px-5 py-3 text-sm font-medium text-amber-300 transition hover:border-amber-400/40 hover:bg-amber-500/15"
          >
            查看 AI 教練
          </RouterLink>
        </div>
      </div>

      <div
        class="relative mt-6 rounded-2xl border p-5"
        :class="overallStatus.classes"
      >
        <p class="text-xs opacity-70">
          今日交易狀態
        </p>

        <p
          class="mt-2 text-2xl font-semibold"
        >
          {{ overallStatus.label }}
        </p>

        <p
          class="mt-2 text-sm leading-6 opacity-75"
        >
          {{ overallStatus.description }}
        </p>
      </div>
    </section>

    <div
      class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
      >
        <p class="text-sm text-zinc-500">
          剩餘交易次數
        </p>

        <p
          class="mt-3 text-3xl font-semibold"
          :class="
            risk.remainingTrades === 0
              ? 'text-rose-300'
              : risk.remainingTrades === 1
                ? 'text-amber-300'
                : 'text-emerald-300'
          "
        >
          {{ risk.remainingTrades }}
        </p>

        <p class="mt-2 text-xs text-zinc-600">
          今日已使用
          {{ todaySummary.trades }}／
          {{ settings.maxTradesPerDay }}
        </p>
      </section>

      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
      >
        <p class="text-sm text-zinc-500">
          剩餘虧損額度
        </p>

        <p
          class="mt-3 text-3xl font-semibold"
          :class="
            risk.remainingLossCapacity === 0
              ? 'text-rose-300'
              : 'text-amber-300'
          "
        >
          {{ formatMoney(risk.remainingLossCapacity) }}
        </p>

        <p class="mt-2 text-xs text-zinc-600">
          今日盈虧
          {{ formatMoney(todaySummary.totalPnL) }}
        </p>
      </section>

      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
      >
        <p class="text-sm text-zinc-500">
          剩餘連敗次數
        </p>

        <p
          class="mt-3 text-3xl font-semibold"
          :class="
            risk.remainingConsecutiveLosses === 0
              ? 'text-rose-300'
              : risk.remainingConsecutiveLosses === 1
                ? 'text-amber-300'
                : 'text-emerald-300'
          "
        >
          {{ risk.remainingConsecutiveLosses }}
        </p>

        <p class="mt-2 text-xs text-zinc-600">
          目前連敗
          {{ todaySummary.consecutiveLosses }}／
          {{ settings.maxConsecutiveLosses }}
        </p>
      </section>

      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
      >
        <p class="text-sm text-zinc-500">
          今日勝率
        </p>

        <p
          class="mt-3 text-3xl font-semibold"
          :class="
            todayWinRate >= 50
              ? 'text-emerald-300'
              : todaySummary.trades > 0
                ? 'text-rose-300'
                : 'text-zinc-300'
          "
        >
          {{ todayWinRate }}%
        </p>

        <p class="mt-2 text-xs text-zinc-600">
          {{ todaySummary.wins }} 勝
          ·
          {{ todaySummary.losses }} 敗
          ·
          {{ todaySummary.breakeven }} 平
        </p>
      </section>
    </div>

    <TradingRiskStatusCard />

    <TradingRiskSettingsCard />

    <section
      class="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/70 shadow-xl shadow-black/10"
    >
      <header
        class="flex flex-col gap-4 border-b border-zinc-800 p-6 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <p
            class="text-xs font-medium tracking-[0.2em] text-sky-400"
          >
            今日紀錄
          </p>

          <h2
            class="mt-2 text-xl font-semibold text-zinc-100"
          >
            今日交易明細
          </h2>

          <p
            class="mt-1 text-sm leading-6 text-zinc-500"
          >
            檢查今日每一筆交易是否符合單筆風險限制。
          </p>
        </div>

        <div
          class="rounded-full border border-zinc-700 bg-zinc-950/60 px-4 py-2 text-sm text-zinc-400"
        >
          {{ todayTrades.length }} 筆交易
        </div>
      </header>

      <div
        v-if="todayTrades.length"
        class="divide-y divide-zinc-800"
      >
        <article
          v-for="trade in todayTrades"
          :key="trade.id"
          class="p-5"
        >
          <div
            class="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between"
          >
            <div class="min-w-0 flex-1">
              <div
                class="flex flex-wrap items-center gap-2"
              >
                <h3
                  class="text-lg font-semibold text-zinc-100"
                >
                  {{ trade.symbol }}
                </h3>

                <span
                  class="rounded-full border px-2.5 py-1 text-xs font-medium"
                  :class="
                    directionClasses(
                      trade.direction,
                    )
                  "
                >
                  {{
                    directionLabel(
                      trade.direction,
                    )
                  }}
                </span>

                <span
                  class="rounded-full border px-2.5 py-1 text-xs font-medium"
                  :class="
                    resultClasses(
                      trade.result,
                    )
                  "
                >
                  {{ resultLabel(trade.result) }}
                </span>

                <span
                  class="rounded-full border px-2.5 py-1 text-xs font-medium"
                  :class="
                    getTradeRiskStatus(
                      trade,
                    ).classes
                  "
                >
                  {{
                    getTradeRiskStatus(
                      trade,
                    ).label
                  }}
                </span>
              </div>

              <p
                class="mt-3 font-medium text-zinc-300"
              >
                {{ trade.playbook }}
              </p>

              <p
                class="mt-2 text-sm text-zinc-600"
              >
                {{ trade.time }}
                ·
                {{ trade.account }}
              </p>
            </div>

            <div
              class="grid gap-3 sm:grid-cols-3 xl:w-[520px]"
            >
              <div
                class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
              >
                <p class="text-xs text-zinc-500">
                  單筆風險
                </p>

                <p
                  class="mt-2 text-lg font-semibold"
                  :class="
                    trade.riskAmount >
                    settings.maxRiskPerTrade
                      ? 'text-rose-300'
                      : 'text-zinc-200'
                  "
                >
                  {{
                    formatMoney(
                      trade.riskAmount,
                    )
                  }}
                </p>
              </div>

              <div
                class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
              >
                <p class="text-xs text-zinc-500">
                  盈虧
                </p>

                <p
                  class="mt-2 text-lg font-semibold"
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
                  {{
                    formatMoney(
                      trade.profitLoss,
                    )
                  }}
                </p>
              </div>

              <div
                class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
              >
                <p class="text-xs text-zinc-500">
                  報酬倍數
                </p>

                <p
                  class="mt-2 text-lg font-semibold"
                  :class="
                    profitLossClasses(
                      trade.rMultiple,
                    )
                  "
                >
                  {{
                    trade.rMultiple > 0
                      ? '+'
                      : ''
                  }}
                  {{ trade.rMultiple.toFixed(2) }}R
                </p>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div
        v-else
        class="p-12 text-center"
      >
        <div
          class="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
        >
          ✓
        </div>

        <p
          class="mt-4 font-medium text-zinc-300"
        >
          今天尚未建立交易
        </p>

        <p
          class="mt-2 text-sm text-zinc-600"
        >
          建立交易後，風險使用狀況會顯示在這裡。
        </p>
      </div>
    </section>
  </div>
</template>