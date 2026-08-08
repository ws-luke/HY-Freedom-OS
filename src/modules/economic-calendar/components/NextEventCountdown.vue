<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import type { EconomicEvent } from '@/types/economic-calendar'

const props = defineProps<{
  event: EconomicEvent
}>()

const now = ref(Date.now())
let timer: number | undefined

const millisecondsRemaining = computed(() =>
  new Date(props.event.scheduledAt).getTime() - now.value,
)

const countdown = computed(() => {
  const difference = millisecondsRemaining.value

  if (difference <= 0) return '已公布／更新中'

  const totalSeconds = Math.floor(difference / 1000)
  const days = Math.floor(totalSeconds / 86_400)
  const hours = Math.floor(totalSeconds / 3_600) % 24
  const minutes = Math.floor(totalSeconds / 60) % 60
  const seconds = totalSeconds % 60
  const time = [hours, minutes, seconds]
    .map(value => String(value).padStart(2, '0'))
    .join(':')

  return days > 0 ? `${days} 天 ${time}` : time
})

const impactLabel = computed(() => {
  if (props.event.impact >= 5) return '高影響'
  if (props.event.impact >= 3) return '中等影響'
  return '低影響'
})

const impactClasses = computed(() => {
  if (props.event.impact >= 5) {
    return 'border-rose-400/25 bg-rose-400/[0.08] text-rose-300'
  }

  if (props.event.impact >= 3) {
    return 'border-amber-400/25 bg-amber-400/[0.08] text-amber-300'
  }

  return 'border-zinc-700 bg-zinc-800/60 text-zinc-400'
})

onMounted(() => {
  timer = window.setInterval(() => {
    now.value = Date.now()
  }, 1_000)
})

onBeforeUnmount(() => {
  if (timer !== undefined) window.clearInterval(timer)
})
</script>

<template>
  <section class="relative overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-[#111113] p-5 shadow-xl shadow-black/20 sm:p-6">
    <div class="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full bg-rose-400/[0.08] blur-[90px]" />

    <div class="relative">
      <header class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0">
          <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-300/60">
            Next XAU/USD event
          </p>
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <span class="rounded-lg border border-sky-400/20 bg-sky-400/[0.08] px-2.5 py-1 text-xs font-semibold text-sky-300">
              {{ event.currency }}
            </span>
            <span class="rounded-full border px-2.5 py-1 text-[10px] font-medium" :class="impactClasses">
              {{ impactLabel }}
            </span>
          </div>
          <h2 class="mt-3 text-xl font-semibold leading-tight text-white sm:text-2xl">
            {{ event.title }}
          </h2>
          <p v-if="event.title !== event.originalTitle" class="mt-1.5 text-xs text-zinc-600">
            {{ event.originalTitle }}
          </p>
        </div>

        <div class="shrink-0 rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 text-right">
          <p class="text-[10px] uppercase tracking-[0.13em] text-zinc-700">台灣時間</p>
          <p class="mt-1.5 text-lg font-semibold text-zinc-200">{{ event.time }}</p>
          <p class="mt-0.5 text-[10px] text-zinc-600">{{ event.localDate }}</p>
        </div>
      </header>

      <div class="mt-6 rounded-2xl border border-white/[0.07] bg-black/20 p-4 sm:p-5">
        <p class="text-xs text-zinc-600">距離公布</p>
        <p class="mt-2 font-mono text-3xl font-semibold tracking-tight text-amber-300 sm:text-4xl">
          {{ countdown }}
        </p>
      </div>

      <div class="mt-3 grid grid-cols-3 gap-2.5">
        <div class="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <p class="text-[10px] text-zinc-700">前值</p>
          <p class="mt-1.5 truncate text-sm font-medium text-zinc-300">{{ event.previous || '—' }}</p>
        </div>
        <div class="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <p class="text-[10px] text-zinc-700">預測</p>
          <p class="mt-1.5 truncate text-sm font-medium text-amber-300">{{ event.forecast || '—' }}</p>
        </div>
        <div class="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <p class="text-[10px] text-zinc-700">實際</p>
          <p class="mt-1.5 truncate text-sm font-semibold" :class="event.actual ? 'text-emerald-300' : 'text-zinc-600'">
            {{ event.actual || '待公布' }}
          </p>
        </div>
      </div>

      <a
        v-if="event.sourceUrl"
        :href="event.sourceUrl"
        target="_blank"
        rel="noreferrer"
        class="mt-4 inline-flex text-xs text-zinc-600 transition hover:text-sky-300"
      >
        原始發布來源：{{ event.source }} ↗
      </a>
    </div>
  </section>
</template>
