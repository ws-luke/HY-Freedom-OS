<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'

import { useTradeStore } from '@/stores/useTradeStore'
import { useTradeReviewStore } from '@/stores/useTradeReviewStore'
import TradeAnalyticsDashboard from '../components/TradeAnalyticsDashboard.vue'
import TradeEdgeExplorer from '../components/TradeEdgeExplorer.vue'
import TradeIntelligenceCenter from '../components/TradeIntelligenceCenter.vue'

type ScopeFilter = 'all' | 'reviewed'
type SourceFilter = 'all' | 'mt5' | 'manual'
type PeriodFilter = 'all' | '30' | '90'

const tradeStore = useTradeStore()
const reviewStore = useTradeReviewStore()
const { sortedClosedTrades } = storeToRefs(tradeStore)
const { reviews } = storeToRefs(reviewStore)

const accountFilter = ref('all')
const symbolFilter = ref('all')
const sourceFilter = ref<SourceFilter>('all')
const periodFilter = ref<PeriodFilter>('all')
const scopeFilter = ref<ScopeFilter>('all')

const accountOptions = computed(() =>
  [...new Set(sortedClosedTrades.value.map(trade => trade.account.trim()).filter(Boolean))].sort(),
)

const symbolOptions = computed(() =>
  [...new Set(sortedClosedTrades.value.map(trade => trade.symbol.trim()).filter(Boolean))].sort(),
)

const reviewIds = computed(() => new Set(reviews.value.map(review => review.tradeId)))

const getTradeTimestamp = (trade: (typeof sortedClosedTrades.value)[number]): number => {
  const direct = trade.closedAt ? new Date(trade.closedAt).getTime() : Number.NaN
  if (Number.isFinite(direct)) return direct
  const normalized = trade.date.replaceAll('/', '-')
  const fallback = new Date(`${normalized}T${trade.time || '00:00'}:00`).getTime()
  return Number.isFinite(fallback) ? fallback : 0
}

const filteredTrades = computed(() => {
  const now = Date.now()
  const cutoff = periodFilter.value === 'all'
    ? 0
    : now - Number(periodFilter.value) * 24 * 60 * 60 * 1000

  return sortedClosedTrades.value.filter(trade => {
    if (accountFilter.value !== 'all' && trade.account !== accountFilter.value) return false
    if (symbolFilter.value !== 'all' && trade.symbol !== symbolFilter.value) return false
    if (sourceFilter.value !== 'all' && trade.dataSource !== sourceFilter.value) return false
    if (scopeFilter.value === 'reviewed' && !reviewIds.value.has(trade.id)) return false
    if (cutoff && getTradeTimestamp(trade) < cutoff) return false
    return true
  })
})

const filteredReviewIds = computed(() => new Set(filteredTrades.value.map(trade => trade.id)))
const filteredReviews = computed(() => reviews.value.filter(review => filteredReviewIds.value.has(review.tradeId)))

const resetFilters = () => {
  accountFilter.value = 'all'
  symbolFilter.value = 'all'
  sourceFilter.value = 'all'
  periodFilter.value = 'all'
  scopeFilter.value = 'all'
}
</script>

<template>
  <div class="space-y-6 pb-10">
    <section
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
            交易績效中心
          </p>

          <h1
            class="mt-2 text-3xl font-bold text-zinc-100"
          >
            Trade Analytics v2
          </h1>

          <p
            class="mt-2 max-w-3xl text-sm leading-7 text-zinc-400"
          >
            從訊號期望值、月份、時段、策略、帳戶與錯誤標籤拆解表現，找出真正可重複的交易 Edge。
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
    </section>

    <section class="rounded-3xl border border-zinc-800 bg-zinc-900/65 p-5 shadow-xl shadow-black/5 sm:p-6">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p class="text-xs font-medium tracking-[0.18em] text-zinc-500">ANALYSIS SCOPE</p>
          <h2 class="mt-2 text-lg font-semibold text-zinc-100">同一組條件，整頁一起分析</h2>
          <p class="mt-1 text-xs text-zinc-500">目前顯示 {{ filteredTrades.length }} / {{ sortedClosedTrades.length }} 筆已平倉交易。</p>
        </div>

        <button type="button" class="self-start rounded-xl border border-zinc-800 px-3 py-2 text-xs text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-300 xl:self-auto" @click="resetFilters">
          清除篩選
        </button>
      </div>

      <div class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label class="space-y-2">
          <span class="text-[11px] text-zinc-500">帳戶</span>
          <select v-model="accountFilter" class="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2.5 text-sm text-zinc-300 outline-none focus:border-sky-500/40">
            <option value="all">全部帳戶</option>
            <option v-for="account in accountOptions" :key="account" :value="account">{{ account }}</option>
          </select>
        </label>
        <label class="space-y-2">
          <span class="text-[11px] text-zinc-500">商品</span>
          <select v-model="symbolFilter" class="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2.5 text-sm text-zinc-300 outline-none focus:border-sky-500/40">
            <option value="all">全部商品</option>
            <option v-for="symbol in symbolOptions" :key="symbol" :value="symbol">{{ symbol }}</option>
          </select>
        </label>
        <label class="space-y-2">
          <span class="text-[11px] text-zinc-500">資料來源</span>
          <select v-model="sourceFilter" class="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2.5 text-sm text-zinc-300 outline-none focus:border-sky-500/40">
            <option value="all">全部來源</option>
            <option value="mt5">MT5 自動同步</option>
            <option value="manual">手動紀錄</option>
          </select>
        </label>
        <label class="space-y-2">
          <span class="text-[11px] text-zinc-500">期間</span>
          <select v-model="periodFilter" class="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2.5 text-sm text-zinc-300 outline-none focus:border-sky-500/40">
            <option value="all">全部期間</option>
            <option value="30">最近 30 天</option>
            <option value="90">最近 90 天</option>
          </select>
        </label>
        <label class="space-y-2">
          <span class="text-[11px] text-zinc-500">復盤品質</span>
          <select v-model="scopeFilter" class="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2.5 text-sm text-zinc-300 outline-none focus:border-sky-500/40">
            <option value="all">全部已平倉</option>
            <option value="reviewed">只看已完成復盤</option>
          </select>
        </label>
      </div>
    </section>

    <TradeIntelligenceCenter :trades="filteredTrades" :reviews="filteredReviews" />

    <TradeEdgeExplorer :trades="filteredTrades" />

    <TradeAnalyticsDashboard :trades="filteredTrades" />
  </div>
</template>
