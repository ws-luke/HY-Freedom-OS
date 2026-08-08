<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'
import {
  BaseBadge,
  BaseCard,
} from '@/components/ui'
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
        '今天不可再建立新交易，請停止下單並完成復盤。',
      containerClasses:
        'border-rose-500/25 bg-rose-500/10',
      titleClasses: 'text-rose-300',
    }
  }

  if (risk.value.level === 'warning') {
    return {
      label: '接近限制',
      title: '今日風控接近上限',
      description:
        '仍可交易，但下一筆必須提高進場標準。',
      containerClasses:
        'border-amber-500/25 bg-amber-500/10',
      titleClasses: 'text-amber-300',
    }
  }

  return {
    label: '允許交易',
    title: '目前尚未觸發風控限制',
    description:
      '請繼續遵守固定風險與每日交易限制。',
    containerClasses:
      'border-emerald-500/25 bg-emerald-500/10',
    titleClasses: 'text-emerald-300',
  }
})

const statusBadgeVariant = computed<
  'success' | 'warning' | 'danger'
>(() => {
  if (risk.value.level === 'blocked') {
    return 'danger'
  }

  if (risk.value.level === 'warning') {
    return 'warning'
  }

  return 'success'
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
  progress: number,
): string => {
  if (progress >= 100) {
    return 'bg-rose-400'
  }

  if (progress >= 70) {
    return 'bg-amber-400'
  }

  return 'bg-emerald-400'
}
</script>

<template>
  <BaseCard
    padding="md"
    class="relative overflow-hidden shadow-xl shadow-black/10"
  >
    <div
      class="pointer-events-none absolute -right-24 -top-24 h-60 w-60 rounded-full bg-rose-500/10 blur-3xl"
    />

    <div class="relative">
      <header
        class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <p
            class="text-xs font-medium tracking-[0.2em] text-rose-400"
          >
            今日交易紀律
          </p>

          <h2
            class="mt-2 text-xl font-semibold text-zinc-100"
          >
            交易風控摘要
          </h2>

          <p
            class="mt-1 text-sm leading-6 text-zinc-500"
          >
            查看今日交易次數、虧損額度與連敗使用狀況。
          </p>
        </div>

        <BaseBadge
          :variant="statusBadgeVariant"
          size="md"
          dot
        >
          {{ status.label }}
        </BaseBadge>
      </header>

      <div
        class="mt-6 rounded-2xl border p-5"
        :class="status.containerClasses"
      >
        <p
          class="text-lg font-semibold"
          :class="status.titleClasses"
        >
          {{ status.title }}
        </p>

        <p
          class="mt-2 text-sm leading-6 text-zinc-400"
        >
          {{ status.description }}
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
            class="mt-2 text-2xl font-semibold text-zinc-100"
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
            虧損額度剩餘
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
              todaySummary.consecutiveLosses > 0
                ? 'text-amber-300'
                : 'text-emerald-300'
            "
          >
            {{ todaySummary.consecutiveLosses }}
            <span class="text-sm text-zinc-600">
              ／{{ settings.maxConsecutiveLosses }}
            </span>
          </p>

          <p class="mt-1 text-xs text-zinc-600">
            剩餘
            {{ risk.remainingConsecutiveLosses }}
            次
          </p>
        </div>

        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
        >
          <p class="text-xs text-zinc-500">
            單筆最大風險
          </p>

          <p
            class="mt-2 text-2xl font-semibold text-zinc-100"
          >
            {{
              formatMoney(
                todaySummary.maxRiskUsed,
              )
            }}
          </p>

          <p class="mt-1 text-xs text-zinc-600">
            上限
            {{
              formatMoney(
                settings.maxRiskPerTrade,
              )
            }}
          </p>
        </div>
      </div>

      <div class="mt-5 space-y-4">
        <div>
          <div
            class="flex items-center justify-between gap-4"
          >
            <p class="text-xs text-zinc-500">
              交易次數使用率
            </p>

            <p class="text-xs text-zinc-500">
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
              每日虧損使用率
            </p>

            <p class="text-xs text-zinc-500">
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
              連敗限制使用率
            </p>

            <p class="text-xs text-zinc-500">
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

      <RouterLink
        to="/trading-risk"
        class="mt-5 flex w-full items-center justify-center rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-300 transition hover:border-rose-400/40 hover:bg-rose-500/15"
      >
        查看完整交易風控
      </RouterLink>
    </div>
  </BaseCard>
</template>