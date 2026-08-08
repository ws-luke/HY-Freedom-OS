<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'

import { useEconomicCalendarStore } from '@/stores/useEconomicCalendarStore'
import { useSignalStore } from '@/stores/useSignalStore'
import { useTradingPlanStore } from '@/stores/useTradingPlanStore'
import type { TradeDirection } from '@/types/trade'

const props = defineProps<{ direction: TradeDirection; signalId: string | null }>()

const planStore = useTradingPlanStore()
const signalStore = useSignalStore()
const economicStore = useEconomicCalendarStore()
const { plan } = storeToRefs(planStore)
const { restriction } = storeToRefs(economicStore)

const selectedSignal = computed(() => signalStore.getSignalById(props.signalId))
const directionAligned = computed(() => {
  if (plan.value.marketBias === 'range') return true
  if (plan.value.marketBias === 'wait') return false
  return plan.value.marketBias === 'bullish' ? props.direction === 'buy' : props.direction === 'sell'
})
const signalAligned = computed(() => selectedSignal.value ? plan.value.waitingSignals.includes(selectedSignal.value.name) : false)

onMounted(() => {
  economicStore.refreshClock()
  void economicStore.load()
})
</script>

<template>
  <section class="rounded-2xl border border-sky-500/15 bg-sky-500/5 p-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p class="text-xs font-semibold tracking-[0.14em] text-sky-300">PRE-TRADE PLAN CHECK</p>
        <p v-if="plan.focusRule" class="mt-2 text-sm font-medium leading-6 text-zinc-200">今日唯一規則：「{{ plan.focusRule }}」</p>
      </div>
      <span class="text-[10px] text-zinc-600">軟警示 · 不影響補登紀錄</span>
    </div>
    <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div class="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3"><p class="text-[10px] text-zinc-600">盤前規劃</p><p class="mt-1 text-xs font-semibold" :class="plan.completed ? 'text-emerald-300' : 'text-amber-300'">{{ plan.completed ? '已鎖定' : '未完成' }}</p></div>
      <div class="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3"><p class="text-[10px] text-zinc-600">方向一致</p><p class="mt-1 text-xs font-semibold" :class="directionAligned ? 'text-emerald-300' : 'text-amber-300'">{{ directionAligned ? '符合' : '不一致' }}</p></div>
      <div class="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3"><p class="text-[10px] text-zinc-600">計畫訊號</p><p class="mt-1 text-xs font-semibold" :class="signalAligned ? 'text-emerald-300' : 'text-amber-300'">{{ selectedSignal ? (signalAligned ? '符合' : '未列入') : '未指定' }}</p></div>
      <div class="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3"><p class="text-[10px] text-zinc-600">新聞禁區</p><p class="mt-1 text-xs font-semibold" :class="restriction.isActive ? 'text-rose-300' : 'text-emerald-300'">{{ restriction.isActive ? '禁止新倉' : '目前無' }}</p></div>
    </div>
  </section>
</template>
