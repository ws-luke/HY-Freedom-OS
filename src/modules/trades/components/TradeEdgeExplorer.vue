<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useTradeStore } from '@/stores/useTradeStore'
import type { TradeDirection, TradeRecord } from '@/types/trade'

const props = defineProps<{
  trades?: TradeRecord[]
}>()

interface EdgeGroup {
  key: string
  label: string
  trades: number
  wins: number
  winRate: number
  averageR: number
  totalR: number
  profitFactor: number | null
}

const tradeStore = useTradeStore()
const { sortedClosedTrades } = storeToRefs(tradeStore)
const analyticsTrades = computed(() => props.trades ?? sortedClosedTrades.value)

const calculate = (key: string, label: string, trades: TradeRecord[]): EdgeGroup => {
  const wins = trades.filter(trade => trade.result === 'win').length
  const totalR = trades.reduce((sum, trade) => sum + trade.rMultiple, 0)
  const grossPositiveR = trades
    .filter(trade => trade.rMultiple > 0)
    .reduce((sum, trade) => sum + trade.rMultiple, 0)
  const grossNegativeR = Math.abs(
    trades
      .filter(trade => trade.rMultiple < 0)
      .reduce((sum, trade) => sum + trade.rMultiple, 0),
  )

  return {
    key,
    label,
    trades: trades.length,
    wins,
    winRate: trades.length ? Math.round((wins / trades.length) * 100) : 0,
    averageR: trades.length ? Number((totalR / trades.length).toFixed(2)) : 0,
    totalR: Number(totalR.toFixed(2)),
    profitFactor:
      grossNegativeR > 0
        ? Number((grossPositiveR / grossNegativeR).toFixed(2))
        : grossPositiveR > 0
          ? null
          : 0,
  }
}

const signalGroups = computed(() => {
  const groups = new Map<string, TradeRecord[]>()

  analyticsTrades.value.forEach(trade => {
    const name = trade.signal.trim() || '未記錄訊號'
    const items = groups.get(name) ?? []
    items.push(trade)
    groups.set(name, items)
  })

  return [...groups.entries()]
    .map(([name, trades]) => calculate(name, name, trades))
    .sort((a, b) => b.trades - a.trades || b.averageR - a.averageR)
})

const directionGroups = computed(() =>
  (['buy', 'sell'] as TradeDirection[]).map(direction =>
    calculate(
      direction,
      direction === 'buy' ? '多單' : '空單',
      analyticsTrades.value.filter(trade => trade.direction === direction),
    ),
  ),
)

const signalCoverage = computed(() => {
  if (!analyticsTrades.value.length) return 0
  const recorded = analyticsTrades.value.filter(trade => trade.signal.trim()).length
  return Math.round((recorded / analyticsTrades.value.length) * 100)
})

const qualifiedSignals = computed(() =>
  signalGroups.value.filter(group => group.label !== '未記錄訊號' && group.trades >= 3),
)

const bestSignal = computed(() =>
  [...qualifiedSignals.value].sort(
    (a, b) => b.averageR - a.averageR || b.totalR - a.totalR || b.trades - a.trades,
  )[0] ?? null,
)

const sampleLabel = (count: number): string => {
  if (count >= 20) return '較可靠'
  if (count >= 5) return '可觀察'
  return '樣本建立中'
}

const sampleClasses = (count: number): string => {
  if (count >= 20) return 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300'
  if (count >= 5) return 'border-sky-500/20 bg-sky-500/5 text-sky-300'
  return 'border-zinc-700 bg-zinc-800/50 text-zinc-500'
}

const rClasses = (value: number): string => {
  if (value > 0) return 'text-emerald-300'
  if (value < 0) return 'text-rose-300'
  return 'text-zinc-400'
}

const formatProfitFactor = (value: number | null): string =>
  value === null ? '∞' : value.toFixed(2)

const edgeMessage = computed(() => {
  if (!analyticsTrades.value.length) {
    return '完成已平倉交易後，Edge Explorer 會開始建立你的個人交易優勢樣本。'
  }

  if (signalCoverage.value < 70) {
    return `目前只有 ${signalCoverage.value}% 的已平倉交易有記錄進場訊號。先提高訊號紀錄完整度，再判斷真正 Edge。`
  }

  if (!bestSignal.value) {
    return '目前各訊號還沒有至少 3 筆樣本。先累積資料，不急著把短期結果當成優勢。'
  }

  if (bestSignal.value.averageR > 0) {
    return `目前「${bestSignal.value.label}」在有效樣本中平均 ${bestSignal.value.averageR.toFixed(2)}R，先持續觀察，不因短期領先放大風險。`
  }

  return '目前還沒有正期望的訊號樣本。維持固定風險，先提升執行品質與資料量。'
})
</script>

<template>
  <section class="overflow-hidden rounded-3xl border border-sky-500/15 bg-zinc-900/70 shadow-xl shadow-black/10">
    <header class="flex flex-col gap-4 border-b border-zinc-800 p-6 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <p class="text-xs font-medium tracking-[0.2em] text-sky-400">EDGE EXPLORER</p>
        <h2 class="mt-2 text-xl font-semibold text-zinc-100">你的真正交易優勢</h2>
        <p class="mt-1 text-sm leading-6 text-zinc-500">依「進場訊號」拆解期望值，並用樣本數避免被短期勝率誤導。</p>
      </div>
      <div class="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3">
        <p class="text-[10px] uppercase tracking-[0.14em] text-zinc-600">訊號紀錄完整度</p>
        <p class="mt-1 text-xl font-semibold" :class="signalCoverage >= 80 ? 'text-emerald-300' : 'text-amber-300'">{{ signalCoverage }}%</p>
      </div>
    </header>

    <div class="border-b border-zinc-800 p-5 sm:p-6">
      <div class="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4">
        <p class="text-xs font-medium text-amber-300">Edge 判讀</p>
        <p class="mt-2 text-sm leading-7 text-zinc-300">{{ edgeMessage }}</p>
      </div>
    </div>

    <div class="grid xl:grid-cols-[1.25fr_0.75fr]">
      <div class="p-5 sm:p-6 xl:border-r xl:border-zinc-800">
        <div class="flex items-center justify-between gap-3">
          <h3 class="font-semibold text-zinc-100">訊號績效</h3>
          <span class="text-[10px] text-zinc-600">≥ 3 筆才進入最佳訊號判斷</span>
        </div>

        <div v-if="signalGroups.length" class="mt-4 space-y-2.5">
          <article
            v-for="group in signalGroups"
            :key="group.key"
            class="grid grid-cols-[minmax(0,1fr)_repeat(4,auto)] items-center gap-x-4 gap-y-2 rounded-2xl border border-zinc-800 bg-zinc-950/45 p-4"
          >
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <p class="truncate text-sm font-semibold text-zinc-200">{{ group.label }}</p>
                <span class="rounded-full border px-2 py-0.5 text-[9px]" :class="sampleClasses(group.trades)">{{ sampleLabel(group.trades) }}</span>
              </div>
              <p class="mt-1 text-[10px] text-zinc-600">{{ group.trades }} 筆樣本</p>
            </div>
            <div class="text-right">
              <p class="text-[9px] text-zinc-700">勝率</p>
              <p class="mt-1 text-xs font-semibold text-zinc-300">{{ group.winRate }}%</p>
            </div>
            <div class="text-right">
              <p class="text-[9px] text-zinc-700">平均 R</p>
              <p class="mt-1 text-xs font-semibold" :class="rClasses(group.averageR)">{{ group.averageR.toFixed(2) }}R</p>
            </div>
            <div class="text-right">
              <p class="text-[9px] text-zinc-700">累積 R</p>
              <p class="mt-1 text-xs font-semibold" :class="rClasses(group.totalR)">{{ group.totalR > 0 ? '+' : '' }}{{ group.totalR.toFixed(2) }}R</p>
            </div>
            <div class="text-right">
              <p class="text-[9px] text-zinc-700">PF</p>
              <p class="mt-1 text-xs font-semibold text-sky-300">{{ formatProfitFactor(group.profitFactor) }}</p>
            </div>
          </article>
        </div>

        <div v-else class="mt-4 rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-xs text-zinc-600">尚無已平倉交易資料。</div>
      </div>

      <div class="p-5 sm:p-6">
        <h3 class="font-semibold text-zinc-100">方向比較</h3>
        <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <article v-for="group in directionGroups" :key="group.key" class="rounded-2xl border border-zinc-800 bg-zinc-950/45 p-4">
            <div class="flex items-center justify-between gap-3">
              <span class="rounded-lg px-2.5 py-1 text-xs font-bold" :class="group.key === 'buy' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'">{{ group.label }}</span>
              <span class="text-[10px] text-zinc-600">{{ group.trades }} 筆</span>
            </div>
            <div class="mt-4 grid grid-cols-3 gap-2">
              <div><p class="text-[9px] text-zinc-700">勝率</p><p class="mt-1 text-sm font-semibold text-zinc-300">{{ group.winRate }}%</p></div>
              <div><p class="text-[9px] text-zinc-700">平均 R</p><p class="mt-1 text-sm font-semibold" :class="rClasses(group.averageR)">{{ group.averageR.toFixed(2) }}R</p></div>
              <div><p class="text-[9px] text-zinc-700">PF</p><p class="mt-1 text-sm font-semibold text-sky-300">{{ formatProfitFactor(group.profitFactor) }}</p></div>
            </div>
          </article>
        </div>

        <div class="mt-4 rounded-2xl border border-zinc-800 bg-black/15 p-4">
          <p class="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">Sample policy</p>
          <p class="mt-2 text-xs leading-6 text-zinc-500">1–4 筆只視為建立樣本；5–19 筆可觀察；20 筆以上才逐步提高對統計的信任。風險大小不會因短期勝率自動增加。</p>
        </div>
      </div>
    </div>
  </section>
</template>
