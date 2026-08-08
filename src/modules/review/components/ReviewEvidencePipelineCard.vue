<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useTradeReviewStore } from '@/stores/useTradeReviewStore'
import { useTradeStore } from '@/stores/useTradeStore'
import type { TradeRecord } from '@/types/trade'

const emit = defineEmits<{
  manage: [trade: TradeRecord]
}>()

const tradeStore = useTradeStore()
const reviewStore = useTradeReviewStore()
const { sortedClosedTrades } = storeToRefs(tradeStore)
const { reviews } = storeToRefs(reviewStore)

const reviewIds = computed(() => new Set(reviews.value.map(review => review.tradeId)))

const hasContext = (trade: TradeRecord): boolean =>
  Boolean((trade.signalId || trade.signal.trim()) && trade.playbook.trim() && trade.reason.trim())

const hasEvidence = (trade: TradeRecord): boolean =>
  Boolean(trade.beforeScreenshot && trade.afterScreenshot)

const isAnalyticsReady = (trade: TradeRecord): boolean =>
  hasContext(trade) && reviewIds.value.has(trade.id)

const stages = computed(() => {
  const closed = sortedClosedTrades.value
  return [
    { key: 'closed', label: '已平倉', value: closed.length, tone: 'text-zinc-100' },
    { key: 'context', label: '背景完整', value: closed.filter(hasContext).length, tone: 'text-sky-300' },
    { key: 'evidence', label: '前後圖完整', value: closed.filter(hasEvidence).length, tone: 'text-violet-300' },
    { key: 'reviewed', label: '完成復盤', value: closed.filter(trade => reviewIds.value.has(trade.id)).length, tone: 'text-amber-300' },
    { key: 'ready', label: 'Analytics Ready', value: closed.filter(isAnalyticsReady).length, tone: 'text-emerald-300' },
  ]
})

const needsContext = computed(() =>
  sortedClosedTrades.value
    .filter(trade => !hasContext(trade) || !hasEvidence(trade))
    .slice(0, 3),
)

const completeness = (trade: TradeRecord): number => {
  const checks = [
    Boolean(trade.signalId || trade.signal.trim()),
    Boolean(trade.playbook.trim()),
    Boolean(trade.reason.trim()),
    Boolean(trade.beforeScreenshot),
    Boolean(trade.afterScreenshot),
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

const readyRate = computed(() => {
  const total = sortedClosedTrades.value.length
  const ready = stages.value.find(stage => stage.key === 'ready')?.value ?? 0
  return total ? Math.round((ready / total) * 100) : 0
})
</script>

<template>
  <section class="overflow-hidden rounded-3xl border border-violet-500/15 bg-zinc-900/70 shadow-xl shadow-black/10">
    <header class="flex flex-col gap-4 border-b border-zinc-800 p-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-xs font-medium tracking-[0.2em] text-violet-400">EVIDENCE PIPELINE</p>
        <h2 class="mt-2 text-xl font-semibold text-zinc-100">從成交紀錄變成可分析的交易樣本</h2>
        <p class="mt-1 text-sm leading-6 text-zinc-500">MT5 負責事實資料；你只補判讀、圖表證據與復盤。前後截圖不是完成復盤的硬性門檻，但會提高日後回看品質。</p>
      </div>
      <div class="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-3 text-right">
        <p class="text-[10px] uppercase tracking-[0.14em] text-emerald-300/70">Analytics Ready</p>
        <p class="mt-1 text-2xl font-semibold text-emerald-300">{{ readyRate }}%</p>
      </div>
    </header>

    <div class="grid gap-px bg-zinc-800 sm:grid-cols-2 xl:grid-cols-5">
      <div v-for="(stage, index) in stages" :key="stage.key" class="relative bg-zinc-900 p-5">
        <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-600">0{{ index + 1 }}</p>
        <p class="mt-2 text-sm font-medium text-zinc-400">{{ stage.label }}</p>
        <p class="mt-1 text-2xl font-semibold" :class="stage.tone">{{ stage.value }}</p>
      </div>
    </div>

    <div v-if="needsContext.length" class="border-t border-zinc-800 p-5 sm:p-6">
      <div class="flex items-end justify-between gap-4">
        <div>
          <h3 class="font-semibold text-zinc-100">優先補齊的交易</h3>
          <p class="mt-1 text-xs text-zinc-500">只列最近 3 筆尚未補齊背景或前後圖的已平倉交易。</p>
        </div>
      </div>

      <div class="mt-4 grid gap-3 lg:grid-cols-3">
        <button
          v-for="trade in needsContext"
          :key="trade.id"
          type="button"
          class="group rounded-2xl border border-zinc-800 bg-zinc-950/45 p-4 text-left transition hover:border-violet-500/30 hover:bg-violet-500/[0.04]"
          @click="emit('manage', trade)"
        >
          <div class="flex items-center justify-between gap-3">
            <p class="font-semibold text-zinc-200 group-hover:text-violet-200">{{ trade.symbol }}</p>
            <span class="text-xs font-semibold" :class="completeness(trade) >= 80 ? 'text-emerald-300' : 'text-amber-300'">{{ completeness(trade) }}%</span>
          </div>
          <p class="mt-1 text-xs text-zinc-600">{{ trade.date }} · {{ trade.account }}</p>
          <div class="mt-3 h-1 overflow-hidden rounded-full bg-zinc-800">
            <div class="h-full rounded-full bg-violet-400" :style="{ width: `${completeness(trade)}%` }" />
          </div>
          <p class="mt-3 text-xs text-zinc-500">點擊補 Signal / Playbook / 理由 / 前後截圖</p>
        </button>
      </div>
    </div>
  </section>
</template>
