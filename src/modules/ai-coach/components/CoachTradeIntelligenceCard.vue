<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'
import {
  buildTradeIntelligence,
  intelligenceConfidenceLabel,
} from '@/services/trade-intelligence.service'
import { useTradeReviewStore } from '@/stores/useTradeReviewStore'
import { useTradeStore } from '@/stores/useTradeStore'

const tradeStore = useTradeStore()
const reviewStore = useTradeReviewStore()
const { sortedClosedTrades } = storeToRefs(tradeStore)
const { sortedReviews } = storeToRefs(reviewStore)

const snapshot = computed(() =>
  buildTradeIntelligence(sortedClosedTrades.value, sortedReviews.value),
)

const coachAction = computed(() => {
  const mistake = snapshot.value.mostExpensiveMistake
  const discipline = snapshot.value.strongestDisciplineEdge

  if (mistake && mistake.affected.trades >= 2 && mistake.deltaR < 0) {
    return `下一個優先修正：${mistake.label}。目前有此錯誤時平均比無此錯誤少 ${Math.abs(mistake.deltaR).toFixed(2)}R。`
  }
  if (discipline && discipline.deltaR > 0) {
    return `目前最有價值的紀律是「${discipline.label}」：遵守時平均高出 ${discipline.deltaR.toFixed(2)}R。`
  }
  if (snapshot.value.reviewCoverage < 70 && snapshot.value.overall.trades > 0) {
    return `目前復盤涵蓋率 ${snapshot.value.reviewCoverage}%；先把 Journal 補完整，Coach 才不會用不完整樣本下結論。`
  }
  return '資料仍在建立個人樣本；維持固定風險與一致復盤，不用急著從少量交易改策略。'
})
</script>

<template>
  <section class="overflow-hidden rounded-3xl border border-fuchsia-500/15 bg-zinc-900/70 shadow-xl shadow-black/10">
    <header class="flex flex-col gap-4 border-b border-zinc-800 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-400">COACH × TRADE INTELLIGENCE V1</p>
        <h2 class="mt-2 text-xl font-semibold text-zinc-100">教練現在讀的是同一套交易 Intelligence</h2>
        <p class="mt-1 text-sm leading-6 text-zinc-500">Analytics 的 Edge、錯誤成本與紀律差距直接進 Coach，不另外用另一套算法。</p>
      </div>
      <RouterLink to="/trade-analytics" class="shrink-0 rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/[0.06] px-4 py-2 text-xs font-medium text-fuchsia-300 transition hover:bg-fuchsia-500/10">
        查看完整 Intelligence →
      </RouterLink>
    </header>

    <div class="grid lg:grid-cols-3">
      <article class="border-b border-zinc-800 p-5 sm:p-6 lg:border-b-0 lg:border-r">
        <p class="text-[10px] uppercase tracking-[0.14em] text-emerald-300/60">Best setup</p>
        <template v-if="snapshot.bestSetup">
          <p class="mt-3 font-semibold text-emerald-300">{{ snapshot.bestSetup.signal }}</p>
          <p class="mt-1 text-sm text-zinc-400">{{ snapshot.bestSetup.playbook }}</p>
          <p class="mt-2 text-xs text-zinc-600">{{ snapshot.bestSetup.trades }} 筆 · 平均 {{ snapshot.bestSetup.averageR.toFixed(2) }}R · {{ intelligenceConfidenceLabel(snapshot.bestSetup.confidence) }}</p>
        </template>
        <p v-else class="mt-3 text-sm text-zinc-500">尚無正期望完整組合。</p>
      </article>

      <article class="border-b border-zinc-800 p-5 sm:p-6 lg:border-b-0 lg:border-r">
        <p class="text-[10px] uppercase tracking-[0.14em] text-rose-300/60">Biggest leak</p>
        <template v-if="snapshot.mostExpensiveMistake">
          <p class="mt-3 font-semibold text-rose-300">{{ snapshot.mostExpensiveMistake.label }}</p>
          <p class="mt-1 text-sm text-zinc-500">{{ snapshot.mostExpensiveMistake.affected.trades }} 次 · 差 {{ snapshot.mostExpensiveMistake.deltaR.toFixed(2) }}R / 筆</p>
        </template>
        <p v-else class="mt-3 text-sm text-zinc-500">尚無可量化錯誤成本。</p>
      </article>

      <article class="p-5 sm:p-6">
        <p class="text-[10px] uppercase tracking-[0.14em] text-violet-300/60">Data confidence</p>
        <p class="mt-3 text-2xl font-semibold text-violet-300">{{ snapshot.reviewCoverage }}%</p>
        <p class="mt-1 text-sm text-zinc-500">{{ snapshot.reviewedTrades }} / {{ snapshot.overall.trades }} 筆已完成 Journal</p>
      </article>
    </div>

    <div class="border-t border-zinc-800 bg-fuchsia-500/[0.025] px-5 py-4 sm:px-6">
      <p class="text-xs font-medium text-fuchsia-300/70">目前 Coach Action</p>
      <p class="mt-2 text-sm font-medium leading-7 text-zinc-200">{{ coachAction }}</p>
    </div>
  </section>
</template>
