<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import MissionControlIcon from './MissionControlIcon.vue'

import type { TradeRecord } from '@/types/trade'
import type { WatchlistItem } from '@/types/watchlist'

interface AccountSummary {
  active: number
  currency: string
  representedAccounts: number
  mixedCurrencies: boolean
  equity: number
  dailyProfitLoss: number
  healthy: boolean
}

const props = defineProps<{
  watchlist: WatchlistItem[]
  pendingReviews: TradeRecord[]
  reviewScore: number
  coachInsight: string
  topMistake: {
    label: string
    count: number
  } | null
  accountSummary: AccountSummary
}>()

const primaryMarket = computed(() => props.watchlist[0] ?? null)
const relatedMarkets = computed(() => props.watchlist.slice(1, 3))
const displayedReviews = computed(() =>
  props.pendingReviews.slice(0, 2),
)

const formatMoney = (
  value: number,
  currency = 'USD',
): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)

const biasLabel = (bias: WatchlistItem['bias']): string => ({
  bullish: '偏多',
  bearish: '偏空',
  neutral: '中性',
}[bias])

const biasClasses = (bias: WatchlistItem['bias']): string => ({
  bullish:
    'border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300',
  bearish:
    'border-rose-400/20 bg-rose-400/[0.08] text-rose-300',
  neutral:
    'border-zinc-700 bg-zinc-800/60 text-zinc-400',
}[bias])

const statusLabel = (status: WatchlistItem['status']): string => ({
  waiting: '等待',
  ready: '可觀察',
  avoid: '避開',
}[status])

const statusClasses = (status: WatchlistItem['status']): string => ({
  waiting: 'text-amber-300',
  ready: 'text-emerald-300',
  avoid: 'text-rose-300',
}[status])
</script>

<template>
  <section class="grid gap-4 xl:grid-cols-[1.05fr_1.05fr_0.9fr]">
    <article
      class="relative overflow-hidden rounded-[1.75rem] border border-white/[0.07] bg-[#111113] p-5 shadow-xl shadow-black/20 sm:p-6"
    >
      <div
        class="pointer-events-none absolute -right-20 -top-24 h-52 w-52 rounded-full bg-sky-400/[0.07] blur-[80px]"
      />
      <div class="relative">
        <header class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-400/[0.08] text-sky-300"
            >
              <MissionControlIcon name="target" :size="19" />
            </div>
            <div>
              <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300/60">Market focus</p>
              <h2 class="mt-1 text-base font-semibold text-white">市場焦點</h2>
            </div>
          </div>
          <RouterLink to="/planning" class="text-xs text-zinc-600 transition hover:text-sky-300">
            管理
          </RouterLink>
        </header>

        <div
          v-if="primaryMarket"
          class="mt-5 rounded-2xl border border-white/[0.07] bg-black/15 p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <p class="text-xl font-semibold tracking-tight text-zinc-100">{{ primaryMarket.symbol }}</p>
                <span
                  class="rounded-full border px-2 py-0.5 text-[10px] font-medium"
                  :class="biasClasses(primaryMarket.bias)"
                >
                  {{ biasLabel(primaryMarket.bias) }}
                </span>
              </div>
              <p class="mt-1.5 text-xs text-zinc-600">{{ primaryMarket.timeframe }}</p>
            </div>
            <span
              class="text-xs font-medium"
              :class="statusClasses(primaryMarket.status)"
            >
              {{ statusLabel(primaryMarket.status) }}
            </span>
          </div>
          <p class="mt-4 text-sm leading-6 text-zinc-400">
            {{ primaryMarket.focus }}
          </p>
        </div>

        <div class="mt-3 grid grid-cols-2 gap-2.5">
          <div
            v-for="market in relatedMarkets"
            :key="market.id"
            class="rounded-xl border border-white/[0.055] bg-white/[0.02] p-3"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-semibold text-zinc-300">{{ market.symbol }}</span>
              <span class="text-[10px]" :class="statusClasses(market.status)">
                {{ statusLabel(market.status) }}
              </span>
            </div>
            <p class="mt-1.5 truncate text-[10px] text-zinc-700">{{ market.name }}</p>
          </div>
        </div>
      </div>
    </article>

    <article
      class="relative overflow-hidden rounded-[1.75rem] border border-white/[0.07] bg-[#111113] p-5 shadow-xl shadow-black/20 sm:p-6"
    >
      <div
        class="pointer-events-none absolute -right-20 -top-24 h-52 w-52 rounded-full bg-violet-400/[0.08] blur-[80px]"
      />
      <div class="relative">
        <header class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-400/[0.08] text-violet-300"
            >
              <MissionControlIcon name="coach" :size="19" />
            </div>
            <div>
              <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300/60">Coach signal</p>
              <h2 class="mt-1 text-base font-semibold text-white">今日教練提醒</h2>
            </div>
          </div>
          <RouterLink to="/ai-coach" class="text-xs text-zinc-600 transition hover:text-violet-300">
            深入分析
          </RouterLink>
        </header>

        <div class="mt-5 rounded-2xl border border-violet-400/15 bg-violet-400/[0.045] p-4">
          <p class="text-sm font-medium leading-7 text-violet-100/90">
            {{ coachInsight }}
          </p>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-2.5">
          <div class="rounded-xl border border-white/[0.055] bg-black/15 p-3.5">
            <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">覆盤平均分</p>
            <p class="mt-2 text-lg font-semibold text-sky-300">
              {{ reviewScore || '—' }}<span v-if="reviewScore" class="text-xs text-zinc-700">/100</span>
            </p>
          </div>
          <div class="rounded-xl border border-white/[0.055] bg-black/15 p-3.5">
            <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">最高頻錯誤</p>
            <p class="mt-2 truncate text-sm font-semibold text-amber-300">
              {{ topMistake?.label ?? '尚無資料' }}
            </p>
            <p v-if="topMistake" class="mt-1 text-[10px] text-zinc-700">累計 {{ topMistake.count }} 次</p>
          </div>
        </div>
      </div>
    </article>

    <article
      class="relative overflow-hidden rounded-[1.75rem] border border-white/[0.07] bg-[#111113] p-5 shadow-xl shadow-black/20 sm:p-6"
    >
      <div
        class="pointer-events-none absolute -right-20 -top-24 h-52 w-52 rounded-full bg-amber-400/[0.07] blur-[80px]"
      />
      <div class="relative">
        <header class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/[0.08] text-amber-300"
            >
              <MissionControlIcon name="review" :size="19" />
            </div>
            <div>
              <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300/60">Review queue</p>
              <h2 class="mt-1 text-base font-semibold text-white">待復盤佇列</h2>
            </div>
          </div>
          <span class="rounded-full border border-amber-400/15 bg-amber-400/[0.06] px-2.5 py-1 text-xs font-semibold text-amber-300">
            {{ pendingReviews.length }}
          </span>
        </header>

        <div v-if="displayedReviews.length" class="mt-5 space-y-2.5">
          <article
            v-for="trade in displayedReviews"
            :key="trade.id"
            class="rounded-2xl border border-white/[0.06] bg-black/15 p-3.5"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-zinc-300">{{ trade.symbol }} · {{ trade.playbook }}</p>
                <p class="mt-1 text-[10px] text-zinc-700">{{ trade.date }} · {{ trade.account }}</p>
              </div>
              <p
                class="shrink-0 text-xs font-semibold"
                :class="trade.profitLoss >= 0 ? 'text-emerald-300' : 'text-rose-300'"
              >
                {{ trade.profitLoss > 0 ? '+' : '' }}{{ trade.rMultiple.toFixed(2) }}R
              </p>
            </div>
          </article>
        </div>

        <div
          v-else
          class="mt-5 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.04] p-5 text-center"
        >
          <div class="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300">
            <MissionControlIcon name="check" :size="18" />
          </div>
          <p class="mt-3 text-xs font-medium text-emerald-300">所有交易已完成復盤</p>
        </div>

        <RouterLink
          to="/review"
          class="mt-4 flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-xs font-medium text-zinc-400 transition hover:border-amber-400/20 hover:text-amber-300"
        >
          前往復盤中心
          <MissionControlIcon name="arrow" :size="14" />
        </RouterLink>

        <div class="mt-4 border-t border-white/[0.06] pt-4">
          <div class="flex items-center justify-between text-xs">
            <span class="inline-flex items-center gap-2 text-zinc-600">
              <MissionControlIcon name="wallet" :size="14" />
              {{ accountSummary.active }} 個活動帳戶
            </span>
            <span :class="accountSummary.healthy ? 'text-emerald-300' : 'text-amber-300'">
              {{ accountSummary.healthy ? '狀態正常' : '需要留意' }}
            </span>
          </div>
          <div class="mt-2 flex items-end justify-between gap-3">
            <p class="text-sm font-semibold text-zinc-300">{{ formatMoney(accountSummary.equity, accountSummary.currency) }}</p>
            <p
              class="text-xs font-medium"
              :class="accountSummary.dailyProfitLoss >= 0 ? 'text-emerald-300' : 'text-rose-300'"
            >
              今日 {{ accountSummary.dailyProfitLoss > 0 ? '+' : '' }}{{ formatMoney(accountSummary.dailyProfitLoss, accountSummary.currency) }}
            </p>
          </div>
          <p v-if="accountSummary.mixedCurrencies" class="mt-1.5 text-[10px] text-zinc-700">
            金額僅顯示 {{ accountSummary.currency }} · {{ accountSummary.representedAccounts }} 個帳戶
          </p>
        </div>
      </div>
    </article>
  </section>
</template>
