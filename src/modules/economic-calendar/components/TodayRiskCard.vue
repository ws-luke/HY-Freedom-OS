<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  riskLevel: number
  highImpactCount: number
  relevantCount: number
  restrictionActive: boolean
}>()

const riskText = computed(() => {
  if (props.restrictionActive) return '新聞禁區啟動'
  if (props.riskLevel >= 4) return '高風險交易日'
  if (props.riskLevel >= 3) return '中等新聞風險'
  return '目前事件風險低'
})

const cardClasses = computed(() => {
  if (props.restrictionActive || props.riskLevel >= 5) {
    return 'border-rose-400/25 bg-rose-400/[0.07]'
  }

  if (props.riskLevel >= 4) {
    return 'border-orange-400/20 bg-orange-400/[0.055]'
  }

  if (props.riskLevel >= 3) {
    return 'border-amber-400/20 bg-amber-400/[0.05]'
  }

  return 'border-emerald-400/20 bg-emerald-400/[0.045]'
})

const accentClasses = computed(() => {
  if (props.restrictionActive || props.riskLevel >= 5) return 'text-rose-300'
  if (props.riskLevel >= 4) return 'text-orange-300'
  if (props.riskLevel >= 3) return 'text-amber-300'
  return 'text-emerald-300'
})
</script>

<template>
  <section class="rounded-[1.75rem] border p-5 shadow-xl shadow-black/15 sm:p-6" :class="cardClasses">
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Today risk</p>
        <h2 class="mt-2 text-2xl font-semibold text-white">{{ riskText }}</h2>
      </div>
      <span class="rounded-full border border-current/20 bg-black/15 px-3 py-1 text-xs font-semibold" :class="accentClasses">
        {{ riskLevel }}/5
      </span>
    </div>

    <div class="mt-6 grid grid-cols-2 gap-3">
      <div class="rounded-2xl border border-white/[0.07] bg-black/15 p-4">
        <p class="text-[10px] text-zinc-700">USD 中高影響</p>
        <p class="mt-2 text-2xl font-semibold text-zinc-200">{{ relevantCount }}</p>
      </div>
      <div class="rounded-2xl border border-white/[0.07] bg-black/15 p-4">
        <p class="text-[10px] text-zinc-700">高影響</p>
        <p class="mt-2 text-2xl font-semibold" :class="highImpactCount ? 'text-rose-300' : 'text-zinc-500'">
          {{ highImpactCount }}
        </p>
      </div>
    </div>

    <p class="mt-5 text-sm leading-7 text-zinc-400">
      風險分數依今日 USD 事件與目前是否進入禁新倉區間動態計算，不使用固定假分數。
    </p>
  </section>
</template>
