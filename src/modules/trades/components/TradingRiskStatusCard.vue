<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useTradingRiskStore } from '@/stores/useTradingRiskStore'

const tradingRiskStore = useTradingRiskStore()

const {
  settings,
  todaySummary,
  risk,
} = storeToRefs(tradingRiskStore)

const status = computed(() => {
  if (risk.value.level === 'blocked') {
    return {
      label: '停止交易',
      title:
        risk.value.stopReason ||
        '今日已觸發風控限制',
      description:
        '今日不可再建立新交易。請停止下單並完成交易復盤。',
      classes:
        'border-rose-500/30 bg-rose-500/10 text-rose-300',
      indicatorClasses: 'bg-rose-400',
    }
  }

  if (risk.value.level === 'warning') {
    return {
      label: '接近限制',
      title: '今日風控接近上限',
      description:
        '下一筆交易需要更嚴格確認，請勿降低進場標準。',
      classes:
        'border-amber-500/30 bg-amber-500/10 text-amber-300',
      indicatorClasses: 'bg-amber-400',
    }
  }

  return {
    label: '允許交易',
    title: '目前尚未觸發風控限制',
    description:
      '仍需遵守固定風險、交易次數與連敗限制。',
    classes:
      'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    indicatorClasses: 'bg-emerald-400',
  }
})


const formatMoney = (
  value: number,
): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)

const profitLossClasses = computed(() => {
  if (todaySummary.value.totalPnL > 0) {
    return 'text-emerald-300'
  }

  if (todaySummary.value.totalPnL < 0) {
    return 'text-rose-300'
  }

  return 'text-zinc-300'
})

const progressBarClasses = (
  reached: boolean,
  progress: number,
): string => {
  if (reached) {
    return 'bg-rose-400'
  }

  if (progress >= 70) {
    return 'bg-amber-400'
  }

  return 'bg-emerald-400'
}
</script>

<template>
  <section
    class="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
  >
    <div
      class="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-rose-500/10 blur-3xl"
    />

    <div class="relative">
      <header
        class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <p
            class="text-xs font-medium tracking-[0.2em] text-rose-400"
          >
            今日交易風控
          </p>

          <h3
            class="mt-2 text-lg font-semibold text-zinc-100"
          >
            {{ status.title }}
          </h3>

          <p
            class="mt-1 text-sm leading-6 text-zinc-500"
          >
            {{ status.description }}
          </p>
        </div>

        <span
          class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium"
          :class="status.classes"
        >
          <span
            class="h-2 w-2 rounded-full"
            :class="status.indicatorClasses"
          />

          {{ status.label }}
        </span>
      </header>

      <div
        v-if="!risk.canTrade"
        class="mt-5 rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4"
      >
        <p class="font-semibold text-rose-300">
          {{ risk.stopReason }}
        </p>

        <p
          class="mt-2 text-sm leading-6 text-rose-200/70"
        >
          系統已鎖定新增交易。請勿以其他方式繞過今日風控限制。
        </p>
      </div>

      <div
        class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
        >
          <p class="text-xs text-zinc-500">
            今日交易
          </p>

          <p
            class="mt-2 text-2xl font-semibold"
            :class="
              risk.tradeLimitReached
                ? 'text-rose-300'
                : 'text-zinc-100'
            "
          >
            {{ todaySummary.trades }}
            <span class="text-sm text-zinc-600">
              ／{{ settings.maxTradesPerDay }}
            </span>
          </p>

          <p class="mt-1 text-xs text-zinc-600">
            剩餘 {{ risk.remainingTrades }} 筆
          </p>
        </div>

        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
        >
          <p class="text-xs text-zinc-500">
            今日盈虧
          </p>

          <p
            class="mt-2 text-2xl font-semibold"
            :class="profitLossClasses"
          >
            {{ todaySummary.totalPnL > 0 ? '+' : '' }}
            {{ formatMoney(todaySummary.totalPnL) }}
          </p>

          <p class="mt-1 text-xs text-zinc-600">
            可承受虧損剩餘
            {{ formatMoney(risk.remainingLossCapacity) }}
          </p>
        </div>

        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
        >
          <p class="text-xs text-zinc-500">
            目前連敗
          </p>

          <p
            class="mt-2 text-2xl font-semibold"
            :class="
              risk.consecutiveLossReached
                ? 'text-rose-300'
                : todaySummary.consecutiveLosses > 0
                  ? 'text-amber-300'
                  : 'text-emerald-300'
            "
          >
            {{ todaySummary.consecutiveLosses }}
            <span class="text-sm text-zinc-600">
              ／{{ settings.maxConsecutiveLosses }}
            </span>
          </p>
        </div>

        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
        >
          <p class="text-xs text-zinc-500">
            今日最大單筆風險
          </p>

          <p
            class="mt-2 text-2xl font-semibold"
            :class="
              risk.riskExceeded
                ? 'text-rose-300'
                : 'text-zinc-100'
            "
          >
            {{ formatMoney(todaySummary.maxRiskUsed) }}
          </p>

          <p class="mt-1 text-xs text-zinc-600">
            上限
            {{ formatMoney(settings.maxRiskPerTrade) }}
          </p>
        </div>
      </div>

      <div class="mt-5 space-y-4">
        <div>
          <div
            class="flex items-center justify-between gap-4"
          >
            <p class="text-xs text-zinc-500">
              每日交易次數
            </p>

            <p
              class="text-xs"
              :class="
                risk.tradeLimitReached
                  ? 'text-rose-300'
                  : 'text-zinc-500'
              "
            >
              {{ risk.tradeUsageRate }}%
            </p>
          </div>

          <div
            class="mt-2 h-2.5 overflow-hidden rounded-full bg-zinc-800"
          >
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="
                progressBarClasses(
                  risk.tradeLimitReached,
                  risk.tradeUsageRate,
                )
              "
              :style="{
                width: `${risk.tradeUsageRate}%`,
              }"
            />
          </div>
        </div>

        <div>
          <div
            class="flex items-center justify-between gap-4"
          >
            <p class="text-xs text-zinc-500">
              每日虧損限制
            </p>

            <p
              class="text-xs"
              :class="
                risk.dailyLossReached
                  ? 'text-rose-300'
                  : 'text-zinc-500'
              "
            >
              {{ risk.lossUsageRate }}%
            </p>
          </div>

          <div
            class="mt-2 h-2.5 overflow-hidden rounded-full bg-zinc-800"
          >
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="
                progressBarClasses(
                  risk.dailyLossReached,
                  risk.lossUsageRate,
                )
              "
              :style="{
                width: `${risk.lossUsageRate}%`,
              }"
            />
          </div>
        </div>

        <div>
          <div
            class="flex items-center justify-between gap-4"
          >
            <p class="text-xs text-zinc-500">
              連續虧損限制
            </p>

            <p
              class="text-xs"
              :class="
                risk.consecutiveLossReached
                  ? 'text-rose-300'
                  : 'text-zinc-500'
              "
            >
              {{ risk.consecutiveLossUsageRate }}%
            </p>
          </div>

          <div
            class="mt-2 h-2.5 overflow-hidden rounded-full bg-zinc-800"
          >
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="
                progressBarClasses(
                  risk.consecutiveLossReached,
                  risk.consecutiveLossUsageRate,
                )
              "
              :style="{
                width: `${risk.consecutiveLossUsageRate}%`,
              }"
            />
          </div>
        </div>
      </div>

      <div
        class="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"
      >
        <p class="text-xs text-zinc-500">
          今日結果
        </p>

        <div
          class="mt-3 flex flex-wrap gap-3 text-sm"
        >
          <span class="text-emerald-300">
            獲利 {{ todaySummary.wins }}
          </span>

          <span class="text-rose-300">
            虧損 {{ todaySummary.losses }}
          </span>

          <span class="text-zinc-400">
            平手 {{ todaySummary.breakeven }}
          </span>
        </div>
      </div>
    </div>
  </section>
</template>