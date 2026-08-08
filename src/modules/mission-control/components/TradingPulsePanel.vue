<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import MissionControlIcon from './MissionControlIcon.vue'

import type { TradingRiskEvaluation } from '@/services'
import type {
  TodayTradingSummary,
  TradingRiskSettings,
} from '@/stores/useTradingRiskStore'
import type { TradeRecord, TradeStatistics } from '@/types/trade'

interface RecentPerformance {
  trades: number
  winRate: number
  averageR: number
  profitLoss: number
}

const props = defineProps<{
  risk: TradingRiskEvaluation
  settings: TradingRiskSettings
  todaySummary: TodayTradingSummary
  statistics: TradeStatistics
  recentPerformance: RecentPerformance
  recentTrades: TradeRecord[]
  bestPlaybook: {
    name: string
    count: number
    averageR: number
  } | null
}>()

const riskStatus = computed(() => {
  if (props.risk.level === 'blocked') {
    return {
      label: '停止交易',
      description:
        props.risk.stopReason || '風控限制已觸發',
      classes:
        'border-rose-400/20 bg-rose-400/[0.08] text-rose-300',
      dot: 'bg-rose-400',
    }
  }

  if (props.risk.level === 'warning') {
    return {
      label: '接近限制',
      description: '下一筆交易必須提高進場標準',
      classes:
        'border-amber-400/20 bg-amber-400/[0.08] text-amber-300',
      dot: 'bg-amber-400',
    }
  }

  return {
    label: '限制內',
    description: '尚未觸發今日交易限制',
    classes:
      'border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300',
    dot: 'bg-emerald-400',
  }
})

const riskMeters = computed(() => [
  {
    label: '交易次數',
    value: `${props.todaySummary.trades}/${props.settings.maxTradesPerDay}`,
    progress: props.risk.tradeUsageRate,
  },
  {
    label: '每日虧損',
    value: `${props.risk.lossUsageRate}%`,
    progress: props.risk.lossUsageRate,
  },
  {
    label: '單筆風險',
    value: `${props.risk.riskUsageRate}%`,
    progress: props.risk.riskUsageRate,
  },
])

const formatMoney = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)

const meterColor = (progress: number): string => {
  if (progress >= 100) return 'bg-rose-400'
  if (progress >= 70) return 'bg-amber-400'
  return 'bg-emerald-400'
}

const pnlClasses = (value: number): string => {
  if (value > 0) return 'text-emerald-300'
  if (value < 0) return 'text-rose-300'
  return 'text-zinc-300'
}
</script>

<template>
  <section
    class="overflow-hidden rounded-[1.75rem] border border-white/[0.07] bg-[#111113] shadow-xl shadow-black/20"
  >
    <header
      class="flex flex-col gap-4 border-b border-white/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
    >
      <div class="flex items-center gap-4">
        <div
          class="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300"
        >
          <MissionControlIcon name="chart" :size="21" />
        </div>
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300/70">
            Trading pulse
          </p>
          <h2 class="mt-1 text-lg font-semibold text-white">風控與執行品質</h2>
        </div>
      </div>

      <RouterLink
        to="/trade-analytics"
        class="inline-flex items-center gap-2 text-xs font-medium text-zinc-500 transition hover:text-sky-300"
      >
        完整交易分析
        <MissionControlIcon name="arrow" :size="14" />
      </RouterLink>
    </header>

    <div class="grid xl:grid-cols-[0.82fr_1.18fr]">
      <div class="p-5 sm:p-6 xl:border-r xl:border-white/[0.07]">
        <div
          class="rounded-2xl border p-4"
          :class="riskStatus.classes"
        >
          <div class="flex items-center gap-2 text-sm font-semibold">
            <span class="h-2 w-2 rounded-full" :class="riskStatus.dot" />
            {{ riskStatus.label }}
          </div>
          <p class="mt-2 text-xs leading-5 text-zinc-500">
            {{ riskStatus.description }}
          </p>
        </div>

        <div class="mt-5 grid grid-cols-2 gap-2.5">
          <div class="rounded-2xl border border-white/[0.06] bg-black/15 p-3.5">
            <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">今日盈虧</p>
            <p
              class="mt-2 text-xl font-semibold"
              :class="pnlClasses(todaySummary.totalPnL)"
            >
              {{ todaySummary.totalPnL > 0 ? '+' : '' }}{{ formatMoney(todaySummary.totalPnL) }}
            </p>
          </div>
          <div class="rounded-2xl border border-white/[0.06] bg-black/15 p-3.5">
            <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">剩餘交易</p>
            <p class="mt-2 text-xl font-semibold text-zinc-200">
              {{ risk.remainingTrades }}
              <span class="text-xs font-normal text-zinc-700">筆</span>
            </p>
          </div>
        </div>

        <div class="mt-5 space-y-4">
          <div v-for="meter in riskMeters" :key="meter.label">
            <div class="flex items-center justify-between text-xs">
              <span class="text-zinc-600">{{ meter.label }}</span>
              <span class="font-medium text-zinc-400">{{ meter.value }}</span>
            </div>
            <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="meterColor(meter.progress)"
                :style="{ width: `${meter.progress}%` }"
              />
            </div>
          </div>
        </div>

        <RouterLink
          to="/trading-risk"
          class="mt-5 flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-xs font-medium text-zinc-400 transition hover:border-rose-400/20 hover:bg-rose-400/[0.05] hover:text-rose-300"
        >
          <MissionControlIcon name="shield" :size="16" />
          管理交易限制
        </RouterLink>
      </div>

      <div class="border-t border-white/[0.07] p-5 sm:p-6 xl:border-t-0">
        <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <article class="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3.5">
            <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">最近 10 筆</p>
            <p class="mt-2 text-xl font-semibold text-zinc-200">{{ recentPerformance.trades }}</p>
            <p class="mt-1 text-[10px] text-zinc-700">交易樣本</p>
          </article>
          <article class="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3.5">
            <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">勝率</p>
            <p class="mt-2 text-xl font-semibold text-sky-300">{{ recentPerformance.winRate }}%</p>
            <p class="mt-1 text-[10px] text-zinc-700">近期表現</p>
          </article>
          <article class="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3.5">
            <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">平均 R</p>
            <p
              class="mt-2 text-xl font-semibold"
              :class="pnlClasses(recentPerformance.averageR)"
            >
              {{ recentPerformance.averageR > 0 ? '+' : '' }}{{ recentPerformance.averageR.toFixed(2) }}R
            </p>
            <p class="mt-1 text-[10px] text-zinc-700">每筆期望</p>
          </article>
          <article class="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3.5">
            <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">近期盈虧</p>
            <p
              class="mt-2 truncate text-xl font-semibold"
              :class="pnlClasses(recentPerformance.profitLoss)"
            >
              {{ recentPerformance.profitLoss > 0 ? '+' : '' }}{{ formatMoney(recentPerformance.profitLoss) }}
            </p>
            <p class="mt-1 text-[10px] text-zinc-700">最近 10 筆</p>
          </article>
        </div>

        <div
          v-if="bestPlaybook"
          class="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-violet-400/15 bg-violet-400/[0.045] p-4"
        >
          <div class="min-w-0">
            <p class="text-[10px] uppercase tracking-[0.14em] text-violet-300/60">Current edge</p>
            <p class="mt-1.5 truncate text-sm font-medium text-zinc-200">{{ bestPlaybook.name }}</p>
          </div>
          <div class="shrink-0 text-right">
            <p
              class="text-lg font-semibold"
              :class="pnlClasses(bestPlaybook.averageR)"
            >
              {{ bestPlaybook.averageR > 0 ? '+' : '' }}{{ bestPlaybook.averageR.toFixed(2) }}R
            </p>
            <p class="mt-0.5 text-[10px] text-zinc-700">{{ bestPlaybook.count }} 筆樣本</p>
          </div>
        </div>

        <div class="mt-5">
          <div class="flex items-center justify-between">
            <p class="text-xs font-medium text-zinc-400">最近交易</p>
            <p class="text-[10px] text-zinc-700">
              全部 {{ statistics.totalTrades }} 筆 · 勝率 {{ statistics.winRate }}%
            </p>
          </div>

          <div v-if="recentTrades.length" class="mt-3 space-y-2">
            <article
              v-for="trade in recentTrades"
              :key="trade.id"
              class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-white/[0.055] bg-black/10 px-3.5 py-3"
            >
              <span
                class="flex h-8 w-8 items-center justify-center rounded-xl text-[10px] font-bold"
                :class="
                  trade.direction === 'buy'
                    ? 'bg-emerald-400/[0.08] text-emerald-300'
                    : 'bg-rose-400/[0.08] text-rose-300'
                "
              >
                {{ trade.direction === 'buy' ? 'BUY' : 'SELL' }}
              </span>
              <div class="min-w-0">
                <p class="truncate text-xs font-medium text-zinc-300">
                  {{ trade.symbol }} · {{ trade.playbook }}
                </p>
                <p class="mt-1 text-[10px] text-zinc-700">{{ trade.date }} {{ trade.time }}</p>
              </div>
              <div class="text-right">
                <p class="text-xs font-semibold" :class="pnlClasses(trade.profitLoss)">
                  {{ trade.profitLoss > 0 ? '+' : '' }}{{ formatMoney(trade.profitLoss) }}
                </p>
                <p class="mt-1 text-[10px]" :class="pnlClasses(trade.rMultiple)">
                  {{ trade.rMultiple > 0 ? '+' : '' }}{{ trade.rMultiple.toFixed(2) }}R
                </p>
              </div>
            </article>
          </div>

          <div
            v-else
            class="mt-3 rounded-xl border border-dashed border-zinc-800 p-6 text-center text-xs text-zinc-600"
          >
            尚未建立交易紀錄
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
