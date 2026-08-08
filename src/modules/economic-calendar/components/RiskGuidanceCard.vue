<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  messages: string[]
  riskLevel: number
  restrictionActive: boolean
}>()

const state = computed(() => {
  if (props.restrictionActive) {
    return {
      label: 'STOP',
      title: '目前停止建立新倉',
      classes: 'border-rose-400/25 bg-rose-400/[0.08] text-rose-300',
    }
  }

  if (props.riskLevel >= 4) {
    return {
      label: 'CAUTION',
      title: '今天提高進場標準',
      classes: 'border-amber-400/20 bg-amber-400/[0.07] text-amber-300',
    }
  }

  return {
    label: 'MONITOR',
    title: '依正常流程觀察',
    classes: 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300',
  }
})
</script>

<template>
  <section class="rounded-[1.75rem] border border-white/[0.08] bg-[#111113] p-5 shadow-xl shadow-black/15 sm:p-6">
    <header class="flex items-start justify-between gap-4">
      <div>
        <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300/60">Execution guidance</p>
        <h2 class="mt-2 text-xl font-semibold text-white">{{ state.title }}</h2>
        <p class="mt-1 text-sm text-zinc-600">依目前真實事件與禁區規則自動產生。</p>
      </div>
      <span class="rounded-full border px-3 py-1 text-[10px] font-semibold" :class="state.classes">{{ state.label }}</span>
    </header>

    <div class="mt-6 space-y-2.5">
      <article
        v-for="(message, index) in messages"
        :key="message"
        class="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-black/15 p-4"
      >
        <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-violet-400/15 bg-violet-400/[0.06] text-[10px] font-semibold text-violet-300">{{ index + 1 }}</span>
        <p class="text-sm leading-6 text-zinc-400">{{ message }}</p>
      </article>
    </div>

    <div class="mt-5 rounded-2xl border border-sky-400/15 bg-sky-400/[0.035] p-4">
      <p class="text-xs leading-6 text-sky-200/70">
        執行順序：確認事件時間 → 避開禁區 → 等待點差與波動恢復 → 重新確認高週期區域與 15M／5M／1M 訊號。
      </p>
    </div>
  </section>
</template>
