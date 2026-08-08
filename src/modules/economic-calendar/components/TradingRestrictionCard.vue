<script setup lang="ts">
import { computed } from 'vue'

import type { TradingRestriction } from '@/types/economic-calendar'

const props = defineProps<{
  restriction: TradingRestriction
}>()

const hasWindow = computed(() =>
  Boolean(props.restriction.eventId),
)

const statusLabel = computed(() => {
  if (!hasWindow.value) return '目前無禁區'
  if (props.restriction.isActive) return '禁止新倉中'
  return '下一個禁區'
})

const statusClasses = computed(() =>
  props.restriction.isActive
    ? 'border-rose-400/25 bg-rose-400/[0.09] text-rose-300'
    : 'border-amber-400/20 bg-amber-400/[0.06] text-amber-300',
)
</script>

<template>
  <section class="rounded-[1.75rem] border border-white/[0.08] bg-[#111113] p-5 shadow-xl shadow-black/15 sm:p-6">
    <header class="flex items-start justify-between gap-4">
      <div>
        <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-300/60">News risk window</p>
        <h2 class="mt-2 text-xl font-semibold text-white">禁止建立新倉區間</h2>
        <p class="mt-1 text-sm leading-6 text-zinc-600">依事件重要度自動產生，不是固定時段。</p>
      </div>
      <span class="shrink-0 rounded-full border px-3 py-1 text-[10px] font-semibold" :class="statusClasses">
        {{ statusLabel }}
      </span>
    </header>

    <div v-if="hasWindow" class="mt-6 rounded-2xl border p-5" :class="restriction.isActive ? 'border-rose-400/20 bg-rose-400/[0.055]' : 'border-white/[0.07] bg-black/15'">
      <p class="truncate text-sm font-medium text-zinc-300">{{ restriction.eventTitle }}</p>
      <div class="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div>
          <p class="text-[10px] text-zinc-700">開始</p>
          <p class="mt-1.5 text-2xl font-semibold" :class="restriction.isActive ? 'text-rose-300' : 'text-zinc-200'">{{ restriction.start }}</p>
        </div>
        <div class="flex items-center gap-2 text-zinc-700">
          <span class="h-px w-4 bg-current sm:w-10" />
          <span class="text-[10px]">NO ENTRY</span>
          <span class="h-px w-4 bg-current sm:w-10" />
        </div>
        <div class="text-right">
          <p class="text-[10px] text-zinc-700">結束</p>
          <p class="mt-1.5 text-2xl font-semibold" :class="restriction.isActive ? 'text-rose-300' : 'text-zinc-200'">{{ restriction.end }}</p>
        </div>
      </div>
    </div>

    <div v-else class="mt-6 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.035] p-6 text-center">
      <p class="text-sm font-medium text-emerald-300">目前資料範圍沒有待執行的新聞禁區</p>
    </div>

    <div class="mt-5 grid gap-2.5 sm:grid-cols-2">
      <p class="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs leading-5 text-zinc-500">高影響：公布前 30 分鐘至公布後 30 分鐘</p>
      <p class="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs leading-5 text-zinc-500">CPI、NFP、FOMC 等重大事件：公布前 45 分鐘</p>
      <p class="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs leading-5 text-zinc-500">中等影響：公布前後各 15 分鐘</p>
      <p class="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs leading-5 text-zinc-500">禁區結束後仍需確認點差、波動與市場結構</p>
    </div>
  </section>
</template>
