<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useTradeReviewStore } from '@/stores/useTradeReviewStore'
import { useTradeStore } from '@/stores/useTradeStore'

const tradeStore = useTradeStore()
const reviewStore = useTradeReviewStore()

const { sortedClosedTrades } = storeToRefs(tradeStore)
const { sortedReviews } = storeToRefs(reviewStore)

const reviewed = computed(() =>
  sortedReviews.value.flatMap(review => {
    const trade = sortedClosedTrades.value.find(item => item.id === review.tradeId)
    return trade ? [{ review, trade }] : []
  }),
)

const matrix = computed(() => {
  const highQuality = reviewed.value.filter(item => item.review.totalScore >= 75)
  const lowQuality = reviewed.value.filter(item => item.review.totalScore < 75)

  return {
    goodWins: highQuality.filter(item => item.trade.profitLoss > 0).length,
    goodLosses: highQuality.filter(item => item.trade.profitLoss <= 0).length,
    badWins: lowQuality.filter(item => item.trade.profitLoss > 0).length,
    badLosses: lowQuality.filter(item => item.trade.profitLoss <= 0).length,
  }
})

const recentRules = computed(() =>
  sortedReviews.value
    .map(review => review.nextTradeRule?.trim())
    .filter((rule): rule is string => Boolean(rule))
    .filter((rule, index, rules) => rules.indexOf(rule) === index)
    .slice(0, 4),
)

const processMessage = computed(() => {
  if (reviewed.value.length === 0) {
    return '完成復盤後，這裡會把「交易結果」與「執行品質」拆開分析。'
  }

  if (matrix.value.badWins > 0) {
    return `目前有 ${matrix.value.badWins} 筆「壞獲利」：雖然賺錢，但流程低於 75 分。這類交易最容易強化錯誤習慣。`
  }

  if (matrix.value.goodLosses > 0) {
    return `你有 ${matrix.value.goodLosses} 筆「好虧損」。結果雖然虧損，但有守規則，這種交易不需要因結果而否定。`
  }

  return '目前交易結果與執行品質一致。繼續優先複製高分流程，而不是追逐單筆輸贏。'
})
</script>

<template>
  <section class="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/70 shadow-xl shadow-black/10">
    <header class="flex flex-col gap-3 border-b border-zinc-800 p-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-xs font-medium tracking-[0.2em] text-sky-400">PROCESS OVER OUTCOME</p>
        <h2 class="mt-2 text-xl font-semibold text-zinc-100">執行品質 × 交易結果</h2>
        <p class="mt-1 text-sm leading-6 text-zinc-500">把好交易與賺錢交易分開，避免結果偏誤。</p>
      </div>
      <p class="max-w-xl text-sm leading-6 text-zinc-400">{{ processMessage }}</p>
    </header>

    <div class="grid lg:grid-cols-[1.1fr_0.9fr]">
      <div class="grid grid-cols-2 gap-3 p-5 sm:p-6">
        <article class="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4">
          <p class="text-xs font-medium text-emerald-300">好獲利</p>
          <p class="mt-3 text-3xl font-semibold text-emerald-300">{{ matrix.goodWins }}</p>
          <p class="mt-1 text-[11px] text-zinc-600">高品質執行 + 獲利</p>
        </article>
        <article class="rounded-2xl border border-sky-500/15 bg-sky-500/5 p-4">
          <p class="text-xs font-medium text-sky-300">好虧損</p>
          <p class="mt-3 text-3xl font-semibold text-sky-300">{{ matrix.goodLosses }}</p>
          <p class="mt-1 text-[11px] text-zinc-600">高品質執行 + 未獲利</p>
        </article>
        <article class="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4">
          <p class="text-xs font-medium text-amber-300">壞獲利</p>
          <p class="mt-3 text-3xl font-semibold text-amber-300">{{ matrix.badWins }}</p>
          <p class="mt-1 text-[11px] text-zinc-600">低品質執行 + 獲利</p>
        </article>
        <article class="rounded-2xl border border-rose-500/15 bg-rose-500/5 p-4">
          <p class="text-xs font-medium text-rose-300">壞虧損</p>
          <p class="mt-3 text-3xl font-semibold text-rose-300">{{ matrix.badLosses }}</p>
          <p class="mt-1 text-[11px] text-zinc-600">低品質執行 + 未獲利</p>
        </article>
      </div>

      <div class="border-t border-zinc-800 p-5 sm:p-6 lg:border-l lg:border-t-0">
        <p class="text-xs font-medium tracking-[0.16em] text-violet-300">RECENT RULES</p>
        <h3 class="mt-2 font-semibold text-zinc-100">最近累積的交易規則</h3>

        <div v-if="recentRules.length" class="mt-4 space-y-2.5">
          <div
            v-for="(rule, index) in recentRules"
            :key="`${index}-${rule}`"
            class="flex gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-3.5"
          >
            <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-[10px] font-semibold text-violet-300">{{ index + 1 }}</span>
            <p class="text-sm leading-6 text-zinc-300">{{ rule }}</p>
          </div>
        </div>

        <div v-else class="mt-4 rounded-2xl border border-dashed border-zinc-800 p-6 text-center text-xs text-zinc-600">
          下一次完成復盤後，規則會出現在這裡。
        </div>
      </div>
    </div>
  </section>
</template>
