<script setup lang="ts">
import { computed, ref } from 'vue'

import type { EconomicEvent } from '@/types/economic-calendar'

type ImpactFilter = 'relevant' | 'all' | 'high' | 'medium' | 'low'

const props = defineProps<{
  events: EconomicEvent[]
  rangeLabel: string
}>()

const selectedImpact = ref<ImpactFilter>('relevant')
const keyword = ref('')

const filteredEvents = computed(() => {
  const normalizedKeyword = keyword.value.trim().toLowerCase()

  return [...props.events]
    .filter(event => {
      const matchesKeyword =
        !normalizedKeyword ||
        event.title.toLowerCase().includes(normalizedKeyword) ||
        event.originalTitle.toLowerCase().includes(normalizedKeyword) ||
        event.indicator.toLowerCase().includes(normalizedKeyword)
      const matchesImpact =
        selectedImpact.value === 'all' ||
        (selectedImpact.value === 'relevant' && event.isGoldRelevant) ||
        (selectedImpact.value === 'high' && event.impact >= 5) ||
        (selectedImpact.value === 'medium' && event.impact === 3) ||
        (selectedImpact.value === 'low' && event.impact === 1)

      return matchesKeyword && matchesImpact
    })
    .sort((a, b) =>
      a.scheduledAt.localeCompare(b.scheduledAt),
    )
})

const impactLabel = (impact: number): string => {
  if (impact >= 5) return '高影響'
  if (impact >= 3) return '中等影響'
  return '低影響'
}

const impactClasses = (impact: number): string => {
  if (impact >= 5) {
    return 'border-rose-400/25 bg-rose-400/[0.08] text-rose-300'
  }

  if (impact >= 3) {
    return 'border-amber-400/25 bg-amber-400/[0.07] text-amber-300'
  }

  return 'border-white/[0.07] bg-white/[0.025] text-zinc-500'
}

const released = (event: EconomicEvent): boolean =>
  Boolean(event.actual) ||
  new Date(event.scheduledAt).getTime() < Date.now()
</script>

<template>
  <section class="overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-[#111113] shadow-xl shadow-black/15">
    <header class="flex flex-col gap-5 border-b border-white/[0.07] p-5 lg:flex-row lg:items-end lg:justify-between sm:p-6">
      <div>
        <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-300/60">Live event feed</p>
        <h2 class="mt-2 text-xl font-semibold text-white">{{ rangeLabel }}經濟數據</h2>
        <p class="mt-1 text-sm text-zinc-600">
          顯示 {{ filteredEvents.length }}／{{ events.length }} 筆 · 台灣時間
        </p>
      </div>

      <div class="flex flex-col gap-2.5 sm:flex-row">
        <input
          v-model="keyword"
          type="search"
          placeholder="搜尋 CPI、NFP、FOMC…"
          class="min-w-0 rounded-xl border border-white/[0.08] bg-black/20 px-4 py-2.5 text-sm text-zinc-300 outline-none placeholder:text-zinc-700 focus:border-sky-400/30 sm:w-64"
        />
        <select
          v-model="selectedImpact"
          class="rounded-xl border border-white/[0.08] bg-black/20 px-4 py-2.5 text-sm text-zinc-300 outline-none focus:border-sky-400/30"
        >
          <option value="relevant">XAU/USD 相關</option>
          <option value="all">全部事件</option>
          <option value="high">高影響</option>
          <option value="medium">中等影響</option>
          <option value="low">低影響</option>
        </select>
      </div>
    </header>

    <div v-if="filteredEvents.length" class="divide-y divide-white/[0.06]">
      <article
        v-for="event in filteredEvents"
        :key="event.id"
        class="grid gap-4 p-5 transition hover:bg-white/[0.02] lg:grid-cols-[112px_130px_minmax(0,1fr)_300px] lg:items-center"
      >
        <div>
          <p class="text-xl font-semibold text-zinc-100">{{ event.time }}</p>
          <p class="mt-1 text-[10px] text-zinc-700">{{ event.localDate }}</p>
        </div>

        <div class="flex flex-wrap items-center gap-2 lg:block">
          <span class="inline-flex rounded-lg border border-sky-400/20 bg-sky-400/[0.07] px-2.5 py-1 text-xs font-semibold text-sky-300">
            {{ event.currency }}
          </span>
          <span class="inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium lg:mt-2" :class="impactClasses(event.impact)">
            {{ impactLabel(event.impact) }}
          </span>
        </div>

        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="font-medium leading-6 text-zinc-200">{{ event.title }}</h3>
            <span v-if="event.isGoldRelevant" class="rounded-full bg-amber-400/[0.08] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-amber-300">
              Gold
            </span>
          </div>
          <p v-if="event.title !== event.originalTitle" class="mt-1 text-xs text-zinc-700">
            {{ event.originalTitle }}
          </p>
          <a
            v-if="event.sourceUrl"
            :href="event.sourceUrl"
            target="_blank"
            rel="noreferrer"
            class="mt-2 inline-flex text-[10px] text-zinc-700 transition hover:text-sky-300"
          >
            {{ event.source }} ↗
          </a>
        </div>

        <div class="grid grid-cols-3 gap-2">
          <div class="rounded-xl border border-white/[0.06] bg-black/15 p-3">
            <p class="text-[9px] uppercase tracking-[0.1em] text-zinc-700">前值</p>
            <p class="mt-1.5 truncate text-xs font-medium text-zinc-400">{{ event.previous || '—' }}</p>
          </div>
          <div class="rounded-xl border border-white/[0.06] bg-black/15 p-3">
            <p class="text-[9px] uppercase tracking-[0.1em] text-zinc-700">預測</p>
            <p class="mt-1.5 truncate text-xs font-medium text-amber-300">{{ event.forecast || '—' }}</p>
          </div>
          <div class="rounded-xl border border-white/[0.06] bg-black/15 p-3">
            <p class="text-[9px] uppercase tracking-[0.1em] text-zinc-700">實際</p>
            <p class="mt-1.5 truncate text-xs font-semibold" :class="event.actual ? 'text-emerald-300' : released(event) ? 'text-zinc-500' : 'text-zinc-700'">
              {{ event.actual || (released(event) ? '更新中' : '待公布') }}
            </p>
          </div>
        </div>
      </article>
    </div>

    <div v-else class="p-12 text-center">
      <p class="text-sm text-zinc-500">目前範圍沒有符合條件的事件。</p>
      <button
        type="button"
        class="mt-4 text-xs font-medium text-sky-300 transition hover:text-sky-200"
        @click="selectedImpact = 'all'; keyword = ''"
      >
        顯示全部事件
      </button>
    </div>
  </section>
</template>
