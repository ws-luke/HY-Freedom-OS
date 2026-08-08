<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'

import { useTradeReviewStore } from '@/stores/useTradeReviewStore'
import { useTradeStore } from '@/stores/useTradeStore'

const tradeStore = useTradeStore()
const reviewStore = useTradeReviewStore()

const { sortedClosedTrades } = storeToRefs(tradeStore)
const { sortedReviews } = storeToRefs(reviewStore)

const definitions = [
  { key: 'followedPlan', label: '沒有照盤前規劃' },
  { key: 'followedPlaybook', label: '沒有照策略條件' },
  { key: 'respectedRisk', label: '沒有遵守風險' },
  { key: 'waitedForConfirmation', label: '沒有等待確認' },
  { key: 'avoidedNewsRisk', label: '沒有避開新聞' },
] as const

const activeRule = computed(() =>
  sortedReviews.value.find(review => review.nextTradeRule?.trim())?.nextTradeRule.trim() ?? '',
)

const violationRanking = computed(() =>
  definitions
    .map(item => ({
      label: item.label,
      count: sortedReviews.value.filter(review => review[item.key] === false).length,
    }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count),
)

const topViolation = computed(() => violationRanking.value[0] ?? null)

const reviewedTrades = computed(() =>
  sortedReviews.value.slice(0, 10).flatMap(review => {
    const trade = sortedClosedTrades.value.find(item => item.id === review.tradeId)
    return trade ? [{ review, trade }] : []
  }),
)

const processQuality = computed(() => ({
  badWins: reviewedTrades.value.filter(
    item => item.trade.profitLoss > 0 && item.review.totalScore < 75,
  ).length,
  goodLosses: reviewedTrades.value.filter(
    item => item.trade.profitLoss <= 0 && item.review.totalScore >= 75,
  ).length,
  highQuality: reviewedTrades.value.filter(item => item.review.totalScore >= 75).length,
}))

const recentAverage = computed(() => {
  const recent = sortedReviews.value.slice(0, 5)
  if (!recent.length) return 0
  return Math.round(recent.reduce((sum, review) => sum + review.totalScore, 0) / recent.length)
})

const previousAverage = computed(() => {
  const previous = sortedReviews.value.slice(5, 10)
  if (!previous.length) return null
  return Math.round(previous.reduce((sum, review) => sum + review.totalScore, 0) / previous.length)
})

const trend = computed(() =>
  previousAverage.value === null ? null : recentAverage.value - previousAverage.value,
)

const coachFocus = computed(() => {
  if (!sortedReviews.value.length) {
    return '先完成第一筆復盤，系統才有足夠資料建立你的行為規則。'
  }

  if (processQuality.value.badWins > 0) {
    return `最近 10 筆有 ${processQuality.value.badWins} 筆壞獲利。先修正流程，不要讓獲利強化錯誤行為。`
  }

  if (topViolation.value) {
    return `目前最高頻問題是「${topViolation.value.label}」，累計 ${topViolation.value.count} 次。下一筆只專注修正這一項。`
  }

  if (activeRule.value) {
    return '近期沒有明顯重複違規。繼續執行目前唯一規則，不要同時增加新條件。'
  }

  return '目前執行穩定，維持固定風險與相同進場標準。'
})
</script>

<template>
  <section class="overflow-hidden rounded-3xl border border-sky-500/15 bg-zinc-900/70 shadow-xl shadow-black/10">
    <header class="flex flex-col gap-4 border-b border-zinc-800 p-6 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <p class="text-xs font-medium tracking-[0.2em] text-sky-400">RULE INTELLIGENCE</p>
        <h2 class="mt-2 text-xl font-semibold text-zinc-100">行為規則引擎</h2>
        <p class="mt-1 text-sm leading-6 text-zinc-500">把復盤轉成下一筆真正要執行的行為，而不是再多一份統計。</p>
      </div>
      <RouterLink
        to="/review"
        class="shrink-0 rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-2 text-xs font-medium text-sky-300 transition hover:bg-sky-500/10"
      >
        查看 Review Center
      </RouterLink>
    </header>

    <div class="grid xl:grid-cols-[1.15fr_0.85fr]">
      <div class="p-5 sm:p-6 xl:border-r xl:border-zinc-800">
        <div class="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5">
          <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300/60">Current one rule</p>
          <p v-if="activeRule" class="mt-3 text-lg font-semibold leading-8 text-sky-100">
            「{{ activeRule }}」
          </p>
          <p v-else class="mt-3 text-sm leading-6 text-zinc-500">完成一筆 Review Center v2 復盤後，這裡會鎖定你的下一筆唯一規則。</p>
        </div>

        <div class="mt-4 rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4">
          <p class="text-xs font-medium text-amber-300">教練目前焦點</p>
          <p class="mt-2 text-sm leading-7 text-zinc-300">{{ coachFocus }}</p>
        </div>
      </div>

      <div class="p-5 sm:p-6">
        <div class="grid grid-cols-2 gap-3">
          <article class="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
            <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-600">近 5 筆評分</p>
            <p class="mt-2 text-2xl font-semibold text-zinc-100">{{ recentAverage || '—' }}</p>
            <p v-if="trend !== null" class="mt-1 text-[10px]" :class="trend >= 0 ? 'text-emerald-300' : 'text-rose-300'">
              {{ trend > 0 ? '+' : '' }}{{ trend }} vs 前 5 筆
            </p>
          </article>

          <article class="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
            <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-600">高品質執行</p>
            <p class="mt-2 text-2xl font-semibold text-emerald-300">{{ processQuality.highQuality }}</p>
            <p class="mt-1 text-[10px] text-zinc-700">最近 10 筆復盤</p>
          </article>

          <article class="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4">
            <p class="text-[10px] uppercase tracking-[0.12em] text-amber-300/60">壞獲利</p>
            <p class="mt-2 text-2xl font-semibold text-amber-300">{{ processQuality.badWins }}</p>
            <p class="mt-1 text-[10px] text-zinc-700">賺錢但流程低分</p>
          </article>

          <article class="rounded-2xl border border-sky-500/15 bg-sky-500/5 p-4">
            <p class="text-[10px] uppercase tracking-[0.12em] text-sky-300/60">好虧損</p>
            <p class="mt-2 text-2xl font-semibold text-sky-300">{{ processQuality.goodLosses }}</p>
            <p class="mt-1 text-[10px] text-zinc-700">虧損但守住流程</p>
          </article>
        </div>

        <div v-if="violationRanking.length" class="mt-4">
          <p class="text-xs font-medium text-zinc-500">違規排行</p>
          <div class="mt-2 flex flex-wrap gap-2">
            <span
              v-for="item in violationRanking.slice(0, 3)"
              :key="item.label"
              class="rounded-full border border-rose-500/15 bg-rose-500/5 px-3 py-1.5 text-[11px] text-rose-300"
            >
              {{ item.label }} · {{ item.count }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
