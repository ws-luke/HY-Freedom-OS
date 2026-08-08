<script setup lang="ts">
import { computed } from 'vue'
import {
  buildTradeIntelligence,
  intelligenceConfidenceLabel,
} from '@/services/trade-intelligence.service'
import type { TradeRecord } from '@/types/trade'
import type { StoredTradeReview } from '@/types/trade-review'

const props = defineProps<{
  trades: TradeRecord[]
  reviews: StoredTradeReview[]
}>()

const snapshot = computed(() => buildTradeIntelligence(props.trades, props.reviews))

const setupClass = (averageR: number): string =>
  averageR > 0 ? 'text-emerald-300' : averageR < 0 ? 'text-rose-300' : 'text-zinc-400'

const costText = computed(() => {
  const mistake = snapshot.value.mostExpensiveMistake
  if (!mistake) return '目前還沒有可量化的負面錯誤樣本。'
  return `「${mistake.label}」出現 ${mistake.affected.trades} 次；有這個錯誤時平均 ${mistake.affected.averageR.toFixed(2)}R，和沒有這個錯誤相比差 ${Math.abs(mistake.deltaR).toFixed(2)}R。`
})

const processMessage = computed(() => {
  const outcomes = snapshot.value.processOutcomes
  if (!outcomes.reviewedTrades) return '完成 Journal 復盤後，Freedom OS 才能區分交易結果與執行品質。'
  if (outcomes.badProcessWin > 0) {
    return `有 ${outcomes.badProcessWin} 筆「流程不佳但最後賺錢」的交易。這類單最容易強化錯誤習慣，不能因為獲利就視為好交易。`
  }
  return '目前沒有「流程不佳但獲利」的復盤樣本，繼續用執行品質而不是單筆盈虧評價交易。'
})
</script>

<template>
  <section class="overflow-hidden rounded-3xl border border-fuchsia-500/15 bg-zinc-900/70 shadow-xl shadow-black/10">
    <header class="border-b border-zinc-800 p-5 sm:p-6">
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-400">TRADE INTELLIGENCE V1</p>
      <div class="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 class="text-xl font-semibold text-zinc-100">決策層 · 什麼該做更多，什麼該停止</h2>
          <p class="mt-1 text-sm leading-6 text-zinc-500">不只看勝率；把 MT5 結果、Journal 與紀律交叉後，再給出個人化 Edge 判讀。</p>
        </div>
        <div class="flex gap-2 text-xs">
          <span class="rounded-full border border-zinc-800 bg-zinc-950/60 px-3 py-1.5 text-zinc-500">{{ snapshot.overall.trades }} 筆已平倉</span>
          <span class="rounded-full border border-violet-500/15 bg-violet-500/[0.06] px-3 py-1.5 text-violet-300">{{ snapshot.reviewCoverage }}% 已復盤</span>
        </div>
      </div>
    </header>

    <div class="grid lg:grid-cols-3">
      <article class="border-b border-zinc-800 p-5 sm:p-6 lg:border-b-0 lg:border-r">
        <p class="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300/70">DO MORE</p>
        <template v-if="snapshot.bestSetup">
          <h3 class="mt-3 text-lg font-semibold text-emerald-300">{{ snapshot.bestSetup.signal }}</h3>
          <p class="mt-1 text-sm text-zinc-400">{{ snapshot.bestSetup.playbook }}</p>
          <div class="mt-4 flex flex-wrap gap-2 text-xs">
            <span class="rounded-lg bg-emerald-500/[0.06] px-2.5 py-1.5 text-emerald-300">平均 {{ snapshot.bestSetup.averageR.toFixed(2) }}R</span>
            <span class="rounded-lg bg-zinc-950/60 px-2.5 py-1.5 text-zinc-500">勝率 {{ snapshot.bestSetup.winRate }}%</span>
            <span class="rounded-lg bg-zinc-950/60 px-2.5 py-1.5 text-zinc-500">{{ snapshot.bestSetup.trades }} 筆</span>
          </div>
          <p class="mt-3 text-[11px] text-zinc-600">{{ intelligenceConfidenceLabel(snapshot.bestSetup.confidence) }} · 不因短期領先自動增加風險</p>
        </template>
        <p v-else class="mt-3 text-sm leading-6 text-zinc-500">還沒有 Signal + Playbook 同時完整且平均 R 為正的組合。</p>
      </article>

      <article class="border-b border-zinc-800 p-5 sm:p-6 lg:border-b-0 lg:border-r">
        <p class="text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-300/70">REVIEW / REDUCE</p>
        <template v-if="snapshot.weakestSetup">
          <h3 class="mt-3 text-lg font-semibold text-rose-300">{{ snapshot.weakestSetup.signal }}</h3>
          <p class="mt-1 text-sm text-zinc-400">{{ snapshot.weakestSetup.playbook }}</p>
          <div class="mt-4 flex flex-wrap gap-2 text-xs">
            <span class="rounded-lg bg-rose-500/[0.06] px-2.5 py-1.5 text-rose-300">平均 {{ snapshot.weakestSetup.averageR.toFixed(2) }}R</span>
            <span class="rounded-lg bg-zinc-950/60 px-2.5 py-1.5 text-zinc-500">{{ snapshot.weakestSetup.trades }} 筆</span>
          </div>
          <p class="mt-3 text-[11px] text-zinc-600">{{ intelligenceConfidenceLabel(snapshot.weakestSetup.confidence) }} · 先檢查條件，不用少量樣本直接封殺策略</p>
        </template>
        <p v-else class="mt-3 text-sm leading-6 text-zinc-500">目前沒有平均 R 為負的完整交易組合。</p>
      </article>

      <article class="p-5 sm:p-6">
        <p class="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300/70">BIGGEST LEAK</p>
        <template v-if="snapshot.mostExpensiveMistake">
          <h3 class="mt-3 text-lg font-semibold text-amber-300">{{ snapshot.mostExpensiveMistake.label }}</h3>
          <p class="mt-2 text-sm leading-6 text-zinc-400">{{ costText }}</p>
          <p class="mt-3 text-xs text-rose-300/80">估算樣本影響 {{ snapshot.mostExpensiveMistake.estimatedRCost.toFixed(2) }}R</p>
        </template>
        <p v-else class="mt-3 text-sm leading-6 text-zinc-500">開始在 Journal 標記交易錯誤後，這裡會量化最傷績效的行為。</p>
      </article>
    </div>

    <div class="grid gap-5 border-t border-zinc-800 p-5 sm:p-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div>
        <div class="flex items-end justify-between gap-3">
          <div>
            <h3 class="font-semibold text-zinc-100">錯誤成本排行榜</h3>
            <p class="mt-1 text-xs text-zinc-500">比較「有這個錯誤」與「沒有這個錯誤」時的平均 R，不把出現次數直接誤當因果。</p>
          </div>
        </div>

        <div v-if="snapshot.mistakes.length" class="mt-4 space-y-2">
          <div v-for="item in snapshot.mistakes.slice(0, 6)" :key="item.key" class="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/45 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
            <div>
              <p class="text-sm font-medium text-zinc-200">{{ item.label }}</p>
              <p class="mt-1 text-[10px] text-zinc-600">{{ item.affected.trades }} 次 · {{ intelligenceConfidenceLabel(item.confidence) }}</p>
            </div>
            <div class="text-left sm:text-right">
              <p class="text-[9px] uppercase text-zinc-700">有錯誤</p>
              <p class="mt-1 text-xs font-semibold" :class="setupClass(item.affected.averageR)">{{ item.affected.averageR.toFixed(2) }}R</p>
            </div>
            <div class="text-left sm:text-right">
              <p class="text-[9px] uppercase text-zinc-700">vs 無此錯誤</p>
              <p class="mt-1 text-xs font-semibold" :class="setupClass(item.deltaR)">{{ item.deltaR > 0 ? '+' : '' }}{{ item.deltaR.toFixed(2) }}R</p>
            </div>
          </div>
        </div>
        <div v-else class="mt-4 rounded-2xl border border-dashed border-zinc-800 p-6 text-center text-sm text-zinc-600">尚無錯誤標籤樣本。</div>
      </div>

      <div>
        <h3 class="font-semibold text-zinc-100">流程品質 ≠ 單筆盈虧</h3>
        <p class="mt-1 text-xs leading-5 text-zinc-500">復盤 ≥ 75 分視為良好流程；重點是避免用一次運氣好的獲利合理化錯誤。</p>
        <div class="mt-4 grid grid-cols-2 gap-2">
          <div class="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.05] p-4"><p class="text-[10px] text-emerald-300/60">好流程 · 獲利</p><p class="mt-2 text-2xl font-semibold text-emerald-300">{{ snapshot.processOutcomes.goodProcessWin }}</p></div>
          <div class="rounded-2xl border border-sky-500/15 bg-sky-500/[0.05] p-4"><p class="text-[10px] text-sky-300/60">好流程 · 虧損</p><p class="mt-2 text-2xl font-semibold text-sky-300">{{ snapshot.processOutcomes.goodProcessLoss }}</p></div>
          <div class="rounded-2xl border border-amber-500/15 bg-amber-500/[0.05] p-4"><p class="text-[10px] text-amber-300/60">壞流程 · 獲利</p><p class="mt-2 text-2xl font-semibold text-amber-300">{{ snapshot.processOutcomes.badProcessWin }}</p></div>
          <div class="rounded-2xl border border-rose-500/15 bg-rose-500/[0.05] p-4"><p class="text-[10px] text-rose-300/60">壞流程 · 虧損</p><p class="mt-2 text-2xl font-semibold text-rose-300">{{ snapshot.processOutcomes.badProcessLoss }}</p></div>
        </div>
        <div class="mt-3 rounded-2xl border border-zinc-800 bg-zinc-950/45 p-4">
          <p class="text-xs leading-6 text-zinc-400">{{ processMessage }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
