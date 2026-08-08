<script setup lang="ts">
import { computed } from 'vue'

import { buildAccountPerformance } from '@/services/account-performance.service'
import AccountIcon from './AccountIcon.vue'
import type { TradingAccount } from '@/types/account'
import type { TradeRecord } from '@/types/trade'

const props = defineProps<{
  account: TradingAccount
  trades: TradeRecord[]
}>()

const snapshot = computed(() =>
  buildAccountPerformance(props.account, props.trades),
)

const chartWidth = 760
const chartHeight = 220
const chartPadding = 20

const chartPoints = computed(() => {
  const points = snapshot.value.curve
  if (points.length < 2) return ''

  const values = points.map(point => point.balance)
  let min = Math.min(...values)
  let max = Math.max(...values)

  if (min === max) {
    const buffer = Math.max(1, Math.abs(min) * 0.01)
    min -= buffer
    max += buffer
  }

  const usableWidth = chartWidth - chartPadding * 2
  const usableHeight = chartHeight - chartPadding * 2

  return points
    .map((point, index) => {
      const x = chartPadding + (index / (points.length - 1)) * usableWidth
      const y = chartPadding + ((max - point.balance) / (max - min)) * usableHeight
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
})

const chartAreaPath = computed(() => {
  if (!chartPoints.value) return ''
  const first = chartPoints.value.split(' ')[0]
  const last = chartPoints.value.split(' ').at(-1)
  const firstX = first?.split(',')[0] ?? String(chartPadding)
  const lastX = last?.split(',')[0] ?? String(chartWidth - chartPadding)
  const bottom = chartHeight - chartPadding
  return `M ${firstX} ${bottom} L ${chartPoints.value.replaceAll(' ', ' L ')} L ${lastX} ${bottom} Z`
})

const formatMoney = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: props.account.currency || 'USD',
    maximumFractionDigits: 2,
  }).format(value)

const profitFactorLabel = computed(() => {
  if (snapshot.value.profitFactor !== null) {
    return snapshot.value.profitFactor.toFixed(2)
  }

  return snapshot.value.grossProfit > 0 ? '∞' : '—'
})

const pnlClasses = (value: number): string => {
  if (value > 0) return 'text-emerald-300'
  if (value < 0) return 'text-rose-300'
  return 'text-zinc-300'
}

const firstDate = computed(() =>
  snapshot.value.curve.find(point => point.index > 0)?.date ?? '—',
)

const lastDate = computed(() =>
  [...snapshot.value.curve].reverse().find(point => point.index > 0)?.date ?? '—',
)
</script>

<template>
  <section class="overflow-hidden rounded-[1.75rem] border border-white/[0.07] bg-[#111113] shadow-xl shadow-black/20">
    <header class="border-b border-white/[0.07] p-5 sm:p-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-400/15 bg-sky-400/[0.06] text-sky-300">
            <AccountIcon name="chart" :size="18" />
          </div>
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300/55">Account performance</p>
            <h2 class="mt-1 text-lg font-semibold text-white">帳戶績效分析</h2>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 text-[10px] text-zinc-600">
          <span class="rounded-full border border-white/[0.07] px-2.5 py-1">只統計已平倉</span>
          <span class="rounded-full border border-white/[0.07] px-2.5 py-1">{{ snapshot.totalTrades }} 筆樣本</span>
          <span v-if="account.dataSource === 'mt5'" class="rounded-full border border-sky-400/15 bg-sky-400/[0.04] px-2.5 py-1 text-sky-300/70">MT5 LIVE DATA</span>
        </div>
      </div>
    </header>

    <div v-if="snapshot.totalTrades" class="p-5 sm:p-6">
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
        <article class="rounded-2xl border border-white/[0.06] bg-black/15 p-4">
          <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">淨損益</p>
          <p class="mt-2 truncate text-xl font-semibold" :class="pnlClasses(snapshot.netProfit)">
            {{ snapshot.netProfit > 0 ? '+' : '' }}{{ formatMoney(snapshot.netProfit) }}
          </p>
          <p class="mt-1 text-[10px] text-zinc-700">Gross +{{ formatMoney(snapshot.grossProfit) }}</p>
        </article>

        <article class="rounded-2xl border border-white/[0.06] bg-black/15 p-4">
          <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">Profit Factor</p>
          <p class="mt-2 text-xl font-semibold text-sky-300">{{ profitFactorLabel }}</p>
          <p class="mt-1 text-[10px] text-zinc-700">總獲利 ÷ 總虧損</p>
        </article>

        <article class="rounded-2xl border border-white/[0.06] bg-black/15 p-4">
          <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">勝率</p>
          <p class="mt-2 text-xl font-semibold text-emerald-300">{{ snapshot.winRate.toFixed(1) }}%</p>
          <p class="mt-1 text-[10px] text-zinc-700">{{ snapshot.wins }}W · {{ snapshot.losses }}L · {{ snapshot.breakeven }}BE</p>
        </article>

        <article class="rounded-2xl border border-white/[0.06] bg-black/15 p-4">
          <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">平均 R</p>
          <p class="mt-2 text-xl font-semibold" :class="pnlClasses(snapshot.averageR)">
            {{ snapshot.averageR > 0 ? '+' : '' }}{{ snapshot.averageR.toFixed(2) }}R
          </p>
          <p class="mt-1 text-[10px] text-zinc-700">每筆交易平均</p>
        </article>

        <article class="rounded-2xl border border-rose-400/10 bg-rose-400/[0.025] p-4">
          <p class="text-[10px] uppercase tracking-[0.12em] text-rose-300/45">Max Drawdown</p>
          <p class="mt-2 truncate text-xl font-semibold text-rose-300">-{{ formatMoney(snapshot.maxDrawdown) }}</p>
          <p class="mt-1 text-[10px] text-zinc-700">{{ snapshot.maxDrawdownPercent.toFixed(2) }}%</p>
        </article>

        <article class="rounded-2xl border border-white/[0.06] bg-black/15 p-4">
          <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">Expectancy</p>
          <p class="mt-2 truncate text-xl font-semibold" :class="pnlClasses(snapshot.expectancy)">
            {{ snapshot.expectancy > 0 ? '+' : '' }}{{ formatMoney(snapshot.expectancy) }}
          </p>
          <p class="mt-1 text-[10px] text-zinc-700">每筆期望值</p>
        </article>
      </div>

      <div class="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.7fr)]">
        <article class="overflow-hidden rounded-2xl border border-white/[0.06] bg-black/15 p-4 sm:p-5">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-sm font-medium text-zinc-300">交易資金曲線</p>
              <p class="mt-1 text-[10px] text-zinc-700">依已平倉交易 P/L 建立，不把入出金當成交易獲利。</p>
            </div>
            <div class="text-right text-[10px] text-zinc-700">
              <p>{{ firstDate }}</p>
              <p class="mt-1">{{ lastDate }}</p>
            </div>
          </div>

          <div class="mt-4 h-[220px] w-full">
            <svg
              :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
              preserveAspectRatio="none"
              class="h-full w-full overflow-visible"
              role="img"
              aria-label="帳戶交易資金曲線"
            >
              <defs>
                <linearGradient id="accountPerformanceArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.22" />
                  <stop offset="100%" stop-color="#38bdf8" stop-opacity="0" />
                </linearGradient>
              </defs>
              <line
                v-for="y in [55, 110, 165]"
                :key="y"
                :x1="chartPadding"
                :x2="chartWidth - chartPadding"
                :y1="y"
                :y2="y"
                stroke="var(--hy-chart-grid)"
                stroke-width="1"
              />
              <path v-if="chartAreaPath" :d="chartAreaPath" fill="url(#accountPerformanceArea)" />
              <polyline
                v-if="chartPoints"
                :points="chartPoints"
                fill="none"
                stroke="#38bdf8"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                vector-effect="non-scaling-stroke"
              />
            </svg>
          </div>
        </article>

        <article class="rounded-2xl border border-white/[0.06] bg-black/15 p-4 sm:p-5">
          <p class="text-sm font-medium text-zinc-300">績效細節</p>
          <div class="mt-4 divide-y divide-white/[0.055]">
            <div class="flex items-center justify-between gap-4 py-3 text-xs">
              <span class="text-zinc-600">平均獲利單</span>
              <span class="font-medium text-emerald-300">+{{ formatMoney(snapshot.averageWin) }}</span>
            </div>
            <div class="flex items-center justify-between gap-4 py-3 text-xs">
              <span class="text-zinc-600">平均虧損單</span>
              <span class="font-medium text-rose-300">-{{ formatMoney(snapshot.averageLoss) }}</span>
            </div>
            <div class="flex items-center justify-between gap-4 py-3 text-xs">
              <span class="text-zinc-600">單筆最佳</span>
              <span class="font-medium" :class="pnlClasses(snapshot.bestTrade)">{{ snapshot.bestTrade > 0 ? '+' : '' }}{{ formatMoney(snapshot.bestTrade) }}</span>
            </div>
            <div class="flex items-center justify-between gap-4 py-3 text-xs">
              <span class="text-zinc-600">單筆最差</span>
              <span class="font-medium" :class="pnlClasses(snapshot.worstTrade)">{{ formatMoney(snapshot.worstTrade) }}</span>
            </div>
            <div class="flex items-center justify-between gap-4 py-3 text-xs">
              <span class="text-zinc-600">最長連敗</span>
              <span class="font-medium text-amber-300">{{ snapshot.maxConsecutiveLosses }} 筆</span>
            </div>
            <div class="flex items-center justify-between gap-4 py-3 text-xs">
              <span class="text-zinc-600">總虧損</span>
              <span class="font-medium text-rose-300">-{{ formatMoney(snapshot.grossLoss) }}</span>
            </div>
          </div>
        </article>
      </div>
    </div>

    <div v-else class="p-9 text-center sm:p-12">
      <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-400/15 bg-sky-400/[0.05] text-sky-300">
        <AccountIcon name="chart" :size="20" />
      </div>
      <p class="mt-4 font-medium text-zinc-300">還沒有可分析的已平倉交易</p>
      <p class="mt-1 text-xs leading-6 text-zinc-700">MT5 同步進第一筆平倉單後，這裡會自動開始建立績效。</p>
    </div>
  </section>
</template>
