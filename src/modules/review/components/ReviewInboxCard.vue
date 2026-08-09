<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { formatTradePrice } from '@/services'
import AppPagination from '@/components/AppPagination.vue'
import type { TradeRecord } from '@/types/trade'

const props = defineProps<{
  trades: TradeRecord[]
}>()

const emit = defineEmits<{
  manage: [trade: TradeRecord]
  review: [trade: TradeRecord]
}>()

interface ReadinessItem {
  label: string
  complete: boolean
}

const readinessItems = (trade: TradeRecord): ReadinessItem[] => [
  {
    label: '進場訊號',
    complete: Boolean(trade.signalId || trade.signal.trim()),
  },
  {
    label: '交易策略',
    complete: Boolean(trade.playbook.trim()),
  },
  {
    label: '進場理由',
    complete: Boolean(trade.reason.trim()),
  },
  {
    label: '進場截圖',
    complete: Boolean(trade.beforeScreenshot),
  },
  {
    label: '離場截圖',
    complete: Boolean(trade.afterScreenshot),
  },
]

const readiness = (trade: TradeRecord): number => {
  const items = readinessItems(trade)
  const completed = items.filter(item => item.complete).length
  return Math.round((completed / items.length) * 100)
}

const missingCount = (trade: TradeRecord): number =>
  readinessItems(trade).filter(item => !item.complete).length

const readyCount = computed(() =>
  props.trades.filter(trade => readiness(trade) === 100).length,
)

const mt5Count = computed(() =>
  props.trades.filter(trade => trade.dataSource === 'mt5').length,
)

type InboxViewMode = 'cards' | 'list'
const VIEW_MODE_STORAGE_KEY = 'hy-freedom-os:review-inbox-view-mode'
const viewMode = ref<InboxViewMode>(
  typeof window !== 'undefined' && window.localStorage.getItem(VIEW_MODE_STORAGE_KEY) === 'list'
    ? 'list'
    : 'cards',
)
const page = ref(1)
const pageSize = ref(6)
const pageCount = computed(() => Math.max(1, Math.ceil(props.trades.length / pageSize.value)))
const paginatedTrades = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return props.trades.slice(start, start + pageSize.value)
})

watch(viewMode, value => {
  if (typeof window !== 'undefined') window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, value)
})
watch([() => props.trades.length, pageSize], () => {
  if (page.value > pageCount.value) page.value = pageCount.value
})

const formatMoney = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)

const profitLossClasses = (value: number): string => {
  if (value > 0) return 'text-emerald-300'
  if (value < 0) return 'text-rose-300'
  return 'text-zinc-300'
}
</script>

<template>
  <section
    class="overflow-hidden rounded-3xl border border-amber-500/20 bg-zinc-900/70 shadow-xl shadow-black/10"
  >
    <header class="border-b border-zinc-800 p-6">
      <div class="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
              Review Inbox
            </p>
            <span
              v-if="trades.length"
              class="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-300"
            >
              {{ trades.length }} PENDING
            </span>
          </div>

          <h2 class="mt-2 text-xl font-semibold text-zinc-100">
            待復盤交易
          </h2>

          <p class="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            MT5 平倉後自動進入這裡。資料準備度只是提醒，不會阻擋你直接開始復盤。
          </p>
        </div>

        <div class="grid grid-cols-3 gap-2 sm:min-w-[360px]">
          <div class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3 text-center">
            <p class="text-[10px] text-zinc-600">待處理</p>
            <p class="mt-1 text-xl font-semibold text-amber-300">{{ trades.length }}</p>
          </div>
          <div class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3 text-center">
            <p class="text-[10px] text-zinc-600">資料齊全</p>
            <p class="mt-1 text-xl font-semibold text-emerald-300">{{ readyCount }}</p>
          </div>
          <div class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3 text-center">
            <p class="text-[10px] text-zinc-600">MT5 同步</p>
            <p class="mt-1 text-xl font-semibold text-sky-300">{{ mt5Count }}</p>
          </div>
        </div>
      </div>

      <div v-if="trades.length" class="mt-5 flex justify-end">
        <div class="inline-flex rounded-xl border border-zinc-700 bg-zinc-950/50 p-1">
          <button
            type="button"
            class="rounded-lg px-3 py-2 text-xs font-medium transition"
            :class="viewMode === 'cards' ? 'bg-amber-500/15 text-amber-300' : 'text-zinc-500 hover:text-zinc-200'"
            @click="viewMode = 'cards'"
          >
            ▦ 卡片模式
          </button>
          <button
            type="button"
            class="rounded-lg px-3 py-2 text-xs font-medium transition"
            :class="viewMode === 'list' ? 'bg-sky-500/15 text-sky-300' : 'text-zinc-500 hover:text-zinc-200'"
            @click="viewMode = 'list'"
          >
            ☰ 清單模式
          </button>
        </div>
      </div>
    </header>

    <div v-if="trades.length && viewMode === 'cards'" class="grid gap-4 p-5 xl:grid-cols-2 xl:p-6">
      <article
        v-for="trade in paginatedTrades"
        :key="trade.id"
        class="rounded-2xl border border-zinc-800 bg-zinc-950/55 p-5 transition hover:border-zinc-700"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-lg font-semibold text-zinc-100">{{ trade.symbol }}</h3>
              <span
                class="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                :class="trade.direction === 'buy'
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                  : 'border-rose-500/20 bg-rose-500/10 text-rose-300'"
              >
                {{ trade.direction === 'buy' ? '多單' : '空單' }}
              </span>
              <span
                class="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                :class="trade.dataSource === 'mt5'
                  ? 'border-sky-500/20 bg-sky-500/10 text-sky-300'
                  : 'border-zinc-700 bg-zinc-800/70 text-zinc-400'"
              >
                {{ trade.dataSource === 'mt5' ? 'MT5' : 'MANUAL' }}
              </span>
            </div>

            <p class="mt-2 text-xs text-zinc-600">
              {{ trade.date }} {{ trade.time }} · {{ trade.account }}
            </p>
          </div>

          <div class="shrink-0 text-right">
            <p class="text-lg font-semibold" :class="profitLossClasses(trade.profitLoss)">
              {{ trade.profitLoss > 0 ? '+' : '' }}{{ formatMoney(trade.profitLoss) }}
            </p>
            <p class="mt-1 text-xs text-zinc-600">
              {{ trade.rMultiple > 0 ? '+' : '' }}{{ trade.rMultiple.toFixed(2) }}R
            </p>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div class="rounded-xl border border-zinc-800 bg-black/15 p-3">
            <p class="text-zinc-600">進場</p>
            <p class="mt-1 font-medium text-zinc-300">{{ formatTradePrice(trade.entryPrice) }}</p>
          </div>
          <div class="rounded-xl border border-zinc-800 bg-black/15 p-3">
            <p class="text-zinc-600">離場</p>
            <p class="mt-1 font-medium text-zinc-300">{{ formatTradePrice(trade.exitPrice) }}</p>
          </div>
        </div>

        <div class="mt-4">
          <div class="flex items-center justify-between gap-3 text-xs">
            <span class="font-medium text-zinc-400">復盤資料準備度</span>
            <span :class="readiness(trade) === 100 ? 'text-emerald-300' : 'text-amber-300'">
              {{ readiness(trade) }}%
              <template v-if="missingCount(trade)">· 缺 {{ missingCount(trade) }} 項</template>
            </span>
          </div>

          <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              class="h-full rounded-full transition-all"
              :class="readiness(trade) === 100 ? 'bg-emerald-400' : 'bg-amber-400'"
              :style="{ width: `${readiness(trade)}%` }"
            />
          </div>

          <div class="mt-3 flex flex-wrap gap-1.5">
            <span
              v-for="item in readinessItems(trade)"
              :key="item.label"
              class="rounded-lg border px-2 py-1 text-[10px]"
              :class="item.complete
                ? 'border-emerald-500/15 bg-emerald-500/[0.06] text-emerald-300/75'
                : 'border-zinc-800 bg-zinc-900 text-zinc-600'"
            >
              {{ item.complete ? '✓' : '·' }} {{ item.label }}
            </span>
          </div>
        </div>

        <div class="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            class="flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white"
            @click="emit('manage', trade)"
          >
            補交易資料
          </button>

          <button
            type="button"
            class="flex items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-300 transition hover:border-amber-400/40 hover:bg-amber-500/15"
            @click="emit('review', trade)"
          >
            {{ trade.status === 'reviewing' ? '繼續復盤' : '開始復盤' }}
          </button>
        </div>
      </article>
    </div>

    <div v-if="trades.length && viewMode === 'list'" class="divide-y divide-zinc-800">
      <article
        v-for="trade in paginatedTrades"
        :key="trade.id"
        class="p-4 transition hover:bg-zinc-800/25 sm:p-5"
      >
        <div class="flex flex-col gap-4 xl:flex-row xl:items-center">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-lg font-semibold text-zinc-100">{{ trade.symbol }}</h3>
              <span
                class="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                :class="trade.direction === 'buy'
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                  : 'border-rose-500/20 bg-rose-500/10 text-rose-300'"
              >
                {{ trade.direction === 'buy' ? '多單' : '空單' }}
              </span>
              <span class="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                {{ trade.status === 'reviewing' ? '復盤中' : '待復盤' }}
              </span>
            </div>
            <p class="mt-2 text-xs text-zinc-500">{{ trade.date }} {{ trade.time }} · {{ trade.account }} · {{ trade.dataSource === 'mt5' ? 'MT5' : '手動' }}</p>
          </div>

          <div class="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 xl:w-[560px]">
            <div class="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5">
              <p class="text-[10px] text-zinc-500">進場／離場</p>
              <p class="mt-1 text-xs font-medium text-zinc-200">{{ formatTradePrice(trade.entryPrice) }} → {{ formatTradePrice(trade.exitPrice) }}</p>
            </div>
            <div class="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5">
              <p class="text-[10px] text-zinc-500">盈虧／R</p>
              <p class="mt-1 text-xs font-semibold" :class="profitLossClasses(trade.profitLoss)">
                {{ trade.profitLoss > 0 ? '+' : '' }}{{ formatMoney(trade.profitLoss) }} · {{ trade.rMultiple > 0 ? '+' : '' }}{{ trade.rMultiple.toFixed(2) }}R
              </p>
            </div>
            <div class="col-span-2 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5">
              <div class="flex items-center justify-between gap-3">
                <p class="text-[10px] text-zinc-500">資料準備度</p>
                <p class="text-xs font-semibold" :class="readiness(trade) === 100 ? 'text-emerald-300' : 'text-amber-300'">
                  {{ readiness(trade) }}%<template v-if="missingCount(trade)"> · 缺 {{ missingCount(trade) }} 項</template>
                </p>
              </div>
              <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div
                  class="h-full rounded-full"
                  :class="readiness(trade) === 100 ? 'bg-emerald-400' : 'bg-amber-400'"
                  :style="{ width: `${readiness(trade)}%` }"
                />
              </div>
            </div>
          </div>

          <div class="flex shrink-0 gap-2 xl:w-[230px] xl:justify-end">
            <button
              type="button"
              class="rounded-xl border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-400 transition hover:text-zinc-200"
              @click="emit('manage', trade)"
            >
              補資料
            </button>
            <button
              type="button"
              class="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-300 transition hover:bg-amber-500/15"
              @click="emit('review', trade)"
            >
              {{ trade.status === 'reviewing' ? '繼續復盤' : '開始復盤' }}
            </button>
          </div>
        </div>
      </article>
    </div>

    <AppPagination
      v-if="trades.length"
      v-model:page="page"
      v-model:page-size="pageSize"
      :total="trades.length"
      :page-sizes="[6, 12, 24]"
    />

    <div v-if="!trades.length" class="p-10 text-center">
      <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-xl text-emerald-300">
        ✓
      </div>
      <p class="mt-4 font-medium text-zinc-200">待復盤已清空</p>
      <p class="mt-1 text-sm text-zinc-600">MT5 有新的已平倉交易後，會自動出現在這裡。</p>
    </div>
  </section>
</template>
