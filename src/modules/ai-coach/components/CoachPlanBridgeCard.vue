<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'

import { useTradingPlanStore } from '@/stores/useTradingPlanStore'
import { useTradeReviewStore } from '@/stores/useTradeReviewStore'
import { useTradeStore } from '@/stores/useTradeStore'
import { useSignalStore } from '@/stores/useSignalStore'

const tradeStore = useTradeStore()
const reviewStore = useTradeReviewStore()
const planStore = useTradingPlanStore()
const signalStore = useSignalStore()

const { sortedClosedTrades } = storeToRefs(tradeStore)
const { sortedReviews } = storeToRefs(reviewStore)
const { plan } = storeToRefs(planStore)
const { selectableSignals } = storeToRefs(signalStore)

const availableSignalNames = computed(() => new Set(selectableSignals.value.map(signal => signal.name)))

const violationDefinitions = [
  { key: 'followedPlan', label: '沒有照盤前規劃', rule: '進場前重新核對今日盤前規劃，條件不符就不交易。' },
  { key: 'followedPlaybook', label: '沒有照策略條件', rule: '只做完整符合 Playbook 必要條件的交易。' },
  { key: 'respectedRisk', label: '沒有遵守風險', rule: '下單前先確認風險上限，禁止臨時放大倉位。' },
  { key: 'waitedForConfirmation', label: '沒有等待確認', rule: '沒有等到確認訊號就不進場。' },
  { key: 'avoidedNewsRisk', label: '沒有避開新聞', rule: '重大數據風險區間內不建立新倉。' },
] as const

const recentReviews = computed(() => sortedReviews.value.slice(0, 10))

const topViolation = computed(() =>
  violationDefinitions
    .map(definition => ({
      ...definition,
      count: recentReviews.value.filter(review => review[definition.key] === false).length,
    }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count)[0] ?? null,
)

const latestReviewRule = computed(() =>
  sortedReviews.value.find(review => review.nextTradeRule?.trim())?.nextTradeRule.trim() ?? '',
)

const suggestedRule = computed(() =>
  latestReviewRule.value || topViolation.value?.rule || '',
)

const signalEdges = computed(() => {
  const groups = new Map<string, { trades: number; wins: number; totalR: number }>()

  sortedClosedTrades.value.forEach(trade => {
    const signal = trade.signal.trim()
    if (!signal) return
    const group = groups.get(signal) ?? { trades: 0, wins: 0, totalR: 0 }
    group.trades += 1
    group.totalR += trade.rMultiple
    if (trade.result === 'win') group.wins += 1
    groups.set(signal, group)
  })

  return [...groups.entries()]
    .map(([signal, data]) => ({
      signal,
      trades: data.trades,
      winRate: Math.round((data.wins / data.trades) * 100),
      averageR: Number((data.totalR / data.trades).toFixed(2)),
    }))
    .filter(item => item.trades >= 3 && item.averageR > 0 && availableSignalNames.value.has(item.signal))
    .sort((a, b) => {
      const tierA = a.trades >= 20 ? 3 : a.trades >= 5 ? 2 : 1
      const tierB = b.trades >= 20 ? 3 : b.trades >= 5 ? 2 : 1
      return tierB - tierA || b.averageR - a.averageR || b.trades - a.trades
    })
})

const bestSignal = computed(() => signalEdges.value[0] ?? null)

const reviewCoverage = computed(() => {
  if (!sortedClosedTrades.value.length) return 0
  const reviewedIds = new Set(sortedReviews.value.map(review => review.tradeId))
  const reviewed = sortedClosedTrades.value.filter(trade => reviewedIds.has(trade.id)).length
  return Math.round((reviewed / sortedClosedTrades.value.length) * 100)
})

const sampleLabel = computed(() => {
  const count = bestSignal.value?.trades ?? 0
  if (count >= 20) return '較可靠'
  if (count >= 5) return '可觀察'
  return '樣本建立中'
})

const ruleApplied = computed(() =>
  Boolean(suggestedRule.value && plan.value.focusRule.trim() === suggestedRule.value),
)

const signalApplied = computed(() =>
  Boolean(bestSignal.value && plan.value.waitingSignals.includes(bestSignal.value.signal)),
)

const applyRule = (): void => {
  if (plan.value.completed || !suggestedRule.value) return
  plan.value.focusRule = suggestedRule.value
}

const applySignal = (): void => {
  if (plan.value.completed || !bestSignal.value || signalApplied.value) return
  planStore.toggleSignal(bestSignal.value.signal)
}
</script>

<template>
  <section class="overflow-hidden rounded-3xl border border-violet-500/15 bg-zinc-900/70 shadow-xl shadow-black/10">
    <header class="flex flex-col gap-4 border-b border-zinc-800 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-xs font-medium tracking-[0.2em] text-violet-400">COACH → PLAN BRIDGE</p>
        <h2 class="mt-2 text-xl font-semibold text-zinc-100">把復盤結論帶進下一次交易</h2>
        <p class="mt-1 text-sm leading-6 text-zinc-500">建議只來自你的真實交易、復盤與 Edge 樣本；套用前仍由你決定。</p>
      </div>
      <RouterLink to="/planning" class="shrink-0 rounded-xl border border-violet-500/20 bg-violet-500/[0.07] px-4 py-2 text-xs font-medium text-violet-300 transition hover:bg-violet-500/10">
        開啟今日 Planning →
      </RouterLink>
    </header>

    <div class="grid lg:grid-cols-3">
      <article class="border-b border-zinc-800 p-5 sm:p-6 lg:border-b-0 lg:border-r">
        <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-300/70">Recent friction</p>
        <p v-if="topViolation" class="mt-3 text-lg font-semibold text-zinc-100">{{ topViolation.label }}</p>
        <p v-if="topViolation" class="mt-1 text-sm text-zinc-500">最近 {{ recentReviews.length }} 筆復盤出現 {{ topViolation.count }} 次</p>
        <p v-else class="mt-3 text-sm leading-6 text-zinc-500">近期復盤沒有重複違規，先維持相同執行標準。</p>
      </article>

      <article class="border-b border-zinc-800 p-5 sm:p-6 lg:border-b-0 lg:border-r">
        <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-300/70">One rule</p>
        <p v-if="suggestedRule" class="mt-3 text-sm font-semibold leading-7 text-zinc-200">{{ suggestedRule }}</p>
        <p v-else class="mt-3 text-sm leading-6 text-zinc-500">完成復盤後，下一筆唯一規則會出現在這裡。</p>
        <button
          v-if="suggestedRule"
          type="button"
          :disabled="plan.completed || ruleApplied"
          class="mt-4 rounded-xl border border-sky-500/20 bg-sky-500/[0.06] px-3 py-2 text-xs font-medium text-sky-300 transition hover:bg-sky-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          @click="applyRule"
        >
          {{ plan.completed ? '今日計畫已鎖定' : ruleApplied ? '已帶入今日規則' : '帶入今日唯一規則' }}
        </button>
      </article>

      <article class="p-5 sm:p-6">
        <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300/70">Qualified edge</p>
        <template v-if="bestSignal">
          <div class="mt-3 flex items-center justify-between gap-3">
            <p class="text-lg font-semibold text-emerald-300">{{ bestSignal.signal }}</p>
            <span class="rounded-full border border-emerald-500/15 bg-emerald-500/[0.06] px-2.5 py-1 text-[10px] text-emerald-300">{{ sampleLabel }}</span>
          </div>
          <p class="mt-1 text-sm text-zinc-500">{{ bestSignal.trades }} 筆 · 勝率 {{ bestSignal.winRate }}% · 平均 {{ bestSignal.averageR.toFixed(2) }}R</p>
          <button
            type="button"
            :disabled="plan.completed || signalApplied"
            class="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            @click="applySignal"
          >
            {{ plan.completed ? '今日計畫已鎖定' : signalApplied ? '已加入等待訊號' : '加入今日等待訊號' }}
          </button>
        </template>
        <p v-else class="mt-3 text-sm leading-6 text-zinc-500">目前還沒有至少 3 筆且平均 R 為正的 Signal 樣本，不會硬推薦 Edge。</p>
      </article>
    </div>

    <footer class="flex flex-col gap-2 border-t border-zinc-800 bg-zinc-950/40 px-5 py-3 text-[11px] text-zinc-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <span>復盤涵蓋率 {{ reviewCoverage }}%</span>
      <span>Planning 鎖定後，Coach 不會修改當日規則。</span>
    </footer>
  </section>
</template>
