<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'

import { useEconomicCalendarStore } from '@/stores/useEconomicCalendarStore'
import { useTradingPlanStore } from '@/stores/useTradingPlanStore'
import { useTradingRiskStore } from '@/stores/useTradingRiskStore'
import { useTradeReviewStore } from '@/stores/useTradeReviewStore'

const planStore = useTradingPlanStore()
const reviewStore = useTradeReviewStore()
const riskStore = useTradingRiskStore()
const economicStore = useEconomicCalendarStore()

const { plan, completionPercent } = storeToRefs(planStore)
const { sortedReviews } = storeToRefs(reviewStore)
const { risk, todaySummary } = storeToRefs(riskStore)
const { restriction, nextEvent, dataStatus } = storeToRefs(economicStore)

const latestRule = computed(() =>
  sortedReviews.value.find(review => review.nextTradeRule?.trim())?.nextTradeRule.trim() ?? '',
)

const decision = computed(() => {
  if (!risk.value.canTrade) return { label: 'STOP', title: '風控已鎖定', tone: 'rose', message: risk.value.stopReason || '今天停止建立新倉。' }
  if (restriction.value.isActive) return { label: 'PAUSE', title: '目前位於新聞禁區', tone: 'rose', message: `等待 ${restriction.value.end} 後重新確認結構。` }
  if (!plan.value.completed) return { label: 'PREP', title: '盤前規劃尚未鎖定', tone: 'amber', message: `目前完成度 ${completionPercent.value}%，先把條件定義清楚。` }
  if (plan.value.marketBias === 'wait') return { label: 'WAIT', title: '今日計畫是等待', tone: 'amber', message: '方向不明時不主動尋找進場。' }
  return { label: 'READY', title: '允許等待計畫內訊號', tone: 'emerald', message: '只執行已列入今日規劃的訊號，沒有就不交易。' }
})

const decisionClasses = computed(() => ({
  rose: 'border-rose-500/20 bg-rose-500/5 text-rose-300',
  amber: 'border-amber-500/20 bg-amber-500/5 text-amber-300',
  emerald: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300',
}[decision.value.tone]))

const syncLatestRule = (): void => {
  if (latestRule.value && !plan.value.completed) plan.value.focusRule = latestRule.value
}

onMounted(() => {
  if (!plan.value.focusRule.trim()) syncLatestRule()
  economicStore.refreshClock()
  void economicStore.load()
})
</script>

<template>
  <section class="overflow-hidden rounded-3xl border border-sky-500/15 bg-zinc-900/70 shadow-xl shadow-black/10">
    <div class="grid xl:grid-cols-[1.15fr_0.85fr]">
      <div class="p-5 sm:p-6 xl:border-r xl:border-zinc-800">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p class="text-xs font-medium tracking-[0.2em] text-sky-400">PRE-TRADE COMMAND</p>
            <h2 class="mt-2 text-xl font-semibold text-zinc-100">今天只執行什麼？</h2>
          </div>
          <span class="rounded-full border px-3 py-1.5 text-xs font-semibold" :class="decisionClasses">{{ decision.label }} · {{ decision.title }}</span>
        </div>

        <div class="mt-5 rounded-2xl border border-sky-500/15 bg-sky-500/5 p-4">
          <div class="flex items-center justify-between gap-3">
            <p class="text-xs font-medium text-sky-300">今日唯一規則</p>
            <button v-if="latestRule && !plan.completed && latestRule !== plan.focusRule" type="button" class="text-[10px] text-sky-400/70 hover:text-sky-300" @click="syncLatestRule">套用最新復盤規則</button>
          </div>
          <input v-model="plan.focusRule" :disabled="plan.completed" type="text" maxlength="160" placeholder="完成復盤後會自動帶入；也可以輸入今天唯一要遵守的規則。" class="mt-3 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm font-medium text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-sky-500/40 disabled:cursor-not-allowed disabled:opacity-70" />
        </div>

        <p class="mt-4 text-sm leading-6 text-zinc-400">{{ decision.message }}</p>
      </div>

      <div class="grid grid-cols-2 gap-3 p-5 sm:p-6">
        <article class="rounded-2xl border border-zinc-800 bg-zinc-950/45 p-4"><p class="text-[10px] uppercase tracking-[0.12em] text-zinc-600">今日方向</p><p class="mt-2 text-sm font-semibold text-zinc-200">{{ plan.marketBias === 'bullish' ? '偏多' : plan.marketBias === 'bearish' ? '偏空' : plan.marketBias === 'range' ? '區間' : '等待' }}</p></article>
        <article class="rounded-2xl border border-zinc-800 bg-zinc-950/45 p-4"><p class="text-[10px] uppercase tracking-[0.12em] text-zinc-600">允許訊號</p><p class="mt-2 text-sm font-semibold text-sky-300">{{ plan.waitingSignals.length }} 個</p></article>
        <article class="rounded-2xl border border-zinc-800 bg-zinc-950/45 p-4"><p class="text-[10px] uppercase tracking-[0.12em] text-zinc-600">今日交易</p><p class="mt-2 text-sm font-semibold" :class="risk.canTrade ? 'text-emerald-300' : 'text-rose-300'">{{ todaySummary.trades }} 筆 · {{ risk.canTrade ? '風控內' : '已鎖定' }}</p></article>
        <article class="rounded-2xl border border-zinc-800 bg-zinc-950/45 p-4"><p class="text-[10px] uppercase tracking-[0.12em] text-zinc-600">新聞狀態</p><p class="mt-2 text-sm font-semibold" :class="restriction.isActive ? 'text-rose-300' : 'text-emerald-300'">{{ restriction.isActive ? '禁新倉' : dataStatus === 'unavailable' ? '資料不可用' : '目前可觀察' }}</p><p v-if="nextEvent" class="mt-1 truncate text-[10px] text-zinc-700">下一個 · {{ nextEvent.title }}</p></article>
      </div>
    </div>
  </section>
</template>
