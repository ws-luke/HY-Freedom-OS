<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
} from 'vue'
import { storeToRefs } from 'pinia'

import NextEventCountdown from '../components/NextEventCountdown.vue'
import RiskGuidanceCard from '../components/RiskGuidanceCard.vue'
import TodayEventsTable from '../components/TodayEventsTable.vue'
import TodayRiskCard from '../components/TodayRiskCard.vue'
import TradingRestrictionCard from '../components/TradingRestrictionCard.vue'
import { useEconomicCalendarStore } from '@/stores/useEconomicCalendarStore'

type CalendarRange = 'today' | 'tomorrow' | 'week'

const economicCalendarStore = useEconomicCalendarStore()

const {
  allEvents,
  dataStatus,
  error,
  guidance,
  highImpactEvents,
  lastUpdatedLabel,
  loading,
  nextEvent,
  restriction,
  riskLevel,
  todayEvents,
  todayKey,
  tomorrowEvents,
  tomorrowKey,
} = storeToRefs(economicCalendarStore)

const selectedRange = ref<CalendarRange>('today')
let clockTimer: number | undefined
let refreshTimer: number | undefined

const rangeOptions: Array<{
  value: CalendarRange
  label: string
}> = [
  { value: 'today', label: '今天' },
  { value: 'tomorrow', label: '明天' },
  { value: 'week', label: '未來 7 天' },
]

const displayedEvents = computed(() => {
  if (selectedRange.value === 'today') return todayEvents.value
  if (selectedRange.value === 'tomorrow') return tomorrowEvents.value

  const weekEnd = new Date()
  weekEnd.setDate(weekEnd.getDate() + 7)

  return allEvents.value.filter(event => {
    const eventTime = new Date(event.scheduledAt).getTime()
    return (
      eventTime >= Date.now() - 60 * 60 * 1000 &&
      eventTime <= weekEnd.getTime()
    )
  })
})

const rangeLabel = computed(() => {
  if (selectedRange.value === 'today') {
    return `今天 ${todayKey.value}`
  }

  if (selectedRange.value === 'tomorrow') {
    return `明天 ${tomorrowKey.value}`
  }

  return '未來 7 天'
})

const displayedRelevantCount = computed(() =>
  displayedEvents.value.filter(event => event.isGoldRelevant).length,
)

const displayedHighImpactCount = computed(() =>
  displayedEvents.value.filter(
    event => event.isGoldRelevant && event.impact >= 5,
  ).length,
)

const statusContent = computed(() => {
  if (dataStatus.value === 'live') {
    return {
      label: 'LIVE',
      description: 'TradingView 即時資料',
      classes:
        'border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300',
    }
  }

  if (dataStatus.value === 'cached') {
    return {
      label: 'CACHE',
      description: '顯示上次成功資料',
      classes:
        'border-amber-400/20 bg-amber-400/[0.07] text-amber-300',
    }
  }

  return {
    label: 'OFFLINE',
    description: '目前無可用資料',
    classes:
      'border-rose-400/20 bg-rose-400/[0.07] text-rose-300',
  }
})

const refresh = (): void => {
  void economicCalendarStore.load(true)
}

onMounted(() => {
  economicCalendarStore.refreshClock()
  void economicCalendarStore.load()

  clockTimer = window.setInterval(() => {
    economicCalendarStore.refreshClock()
  }, 30_000)

  refreshTimer = window.setInterval(() => {
    const nextEventTime = nextEvent.value
      ? new Date(nextEvent.value.scheduledAt).getTime()
      : Number.POSITIVE_INFINITY
    const isNearEvent =
      Math.abs(nextEventTime - Date.now()) <= 30 * 60_000

    void economicCalendarStore.load(
      restriction.value.isActive || isNearEvent,
    )
  }, 60_000)
})

onBeforeUnmount(() => {
  if (clockTimer !== undefined) {
    window.clearInterval(clockTimer)
  }

  if (refreshTimer !== undefined) {
    window.clearInterval(refreshTimer)
  }
})
</script>

<template>
  <div class="relative space-y-5 pb-12">
    <div class="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(circle_at_55%_-10%,rgba(251,191,36,0.065),transparent_58%)]" />

    <section class="relative isolate overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#101012] p-5 shadow-2xl shadow-black/25 sm:p-7">
      <div class="pointer-events-none absolute -left-28 -top-36 h-80 w-80 rounded-full bg-amber-400/[0.08] blur-[110px]" />
      <div class="pointer-events-none absolute -bottom-40 right-0 h-80 w-80 rounded-full bg-sky-400/[0.06] blur-[110px]" />

      <div class="relative flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
        <div class="max-w-3xl">
          <div class="flex flex-wrap items-center gap-3">
            <span class="rounded-full border px-3 py-1 text-[10px] font-semibold tracking-[0.14em]" :class="statusContent.classes">
              {{ statusContent.label }}
            </span>
            <span class="text-xs text-zinc-600">{{ statusContent.description }}</span>
          </div>
          <h1 class="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
            Real Economic Calendar
          </h1>
          <p class="mt-3 text-sm leading-7 text-zinc-500 sm:text-base">
            專注會影響 XAU/USD 的美國經濟數據，統一轉換為台灣時間，並自動建立新聞禁新倉區間。
          </p>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div class="rounded-2xl border border-white/[0.07] bg-black/20 px-4 py-3">
            <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">最後更新</p>
            <p class="mt-1 text-xs font-medium text-zinc-400">{{ lastUpdatedLabel }}</p>
          </div>
          <button
            type="button"
            :disabled="loading"
            class="inline-flex items-center justify-center rounded-2xl border border-white/[0.09] bg-white/[0.035] px-5 py-3.5 text-sm font-medium text-zinc-300 transition hover:border-sky-400/25 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
            @click="refresh"
          >
            {{ loading ? '同步中…' : '立即同步' }}
          </button>
        </div>
      </div>

      <div class="relative mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <article class="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
          <p class="text-[10px] uppercase tracking-[0.14em] text-zinc-700">今天全部事件</p>
          <p class="mt-2 text-2xl font-semibold text-white">{{ todayEvents.length }}</p>
          <p class="mt-1 text-xs text-zinc-600">美國經濟日曆</p>
        </article>
        <article class="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
          <p class="text-[10px] uppercase tracking-[0.14em] text-zinc-700">黃金相關</p>
          <p class="mt-2 text-2xl font-semibold text-amber-300">{{ todayEvents.filter(event => event.isGoldRelevant).length }}</p>
          <p class="mt-1 text-xs text-zinc-600">USD 中高影響</p>
        </article>
        <article class="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
          <p class="text-[10px] uppercase tracking-[0.14em] text-zinc-700">高影響</p>
          <p class="mt-2 text-2xl font-semibold" :class="highImpactEvents.length ? 'text-rose-300' : 'text-zinc-500'">{{ highImpactEvents.length }}</p>
          <p class="mt-1 text-xs text-zinc-600">自動提高風控</p>
        </article>
        <article class="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
          <p class="text-[10px] uppercase tracking-[0.14em] text-zinc-700">目前狀態</p>
          <p class="mt-2 text-lg font-semibold" :class="restriction.isActive ? 'text-rose-300' : 'text-emerald-300'">
            {{ restriction.isActive ? '禁止新倉' : '禁區外' }}
          </p>
          <p class="mt-1 text-xs text-zinc-600">風險 {{ riskLevel }}/5</p>
        </article>
      </div>
    </section>

    <section
      v-if="error"
      class="rounded-2xl border p-4"
      :class="dataStatus === 'cached' ? 'border-amber-400/20 bg-amber-400/[0.05]' : 'border-rose-400/20 bg-rose-400/[0.06]'"
    >
      <p class="text-sm font-medium" :class="dataStatus === 'cached' ? 'text-amber-300' : 'text-rose-300'">
        {{ error }}
      </p>
      <p class="mt-1 text-xs leading-5 text-zinc-600">
        {{ dataStatus === 'cached' ? '目前保留上次成功同步的資料，畫面已明確標示 CACHE。' : '系統沒有使用假資料替代，請稍後重新同步。' }}
      </p>
    </section>

    <section v-if="loading && allEvents.length === 0" class="rounded-[1.75rem] border border-white/[0.08] bg-[#111113] p-12 text-center">
      <div class="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-zinc-800 border-t-sky-300" />
      <p class="mt-4 text-sm text-zinc-500">正在同步 TradingView 經濟日曆…</p>
    </section>

    <template v-else>
      <section class="grid gap-4 xl:grid-cols-2">
        <TodayRiskCard
          :risk-level="riskLevel"
          :high-impact-count="todayEvents.filter(event => event.isGoldRelevant && event.impact >= 5).length"
          :relevant-count="todayEvents.filter(event => event.isGoldRelevant).length"
          :restriction-active="restriction.isActive"
        />

        <NextEventCountdown v-if="nextEvent" :event="nextEvent" />

        <article v-else class="rounded-[1.75rem] border border-emerald-400/15 bg-emerald-400/[0.035] p-6 shadow-xl shadow-black/15">
          <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300/60">Next XAU/USD event</p>
          <h2 class="mt-3 text-2xl font-semibold text-white">目前沒有待公布的中高影響事件</h2>
          <p class="mt-3 text-sm leading-7 text-zinc-500">資料範圍內沒有下一個 USD 中高影響事件，仍需遵守你的盤前規劃與固定風險。</p>
        </article>
      </section>

      <section class="flex flex-wrap gap-2 rounded-2xl border border-white/[0.07] bg-[#111113] p-2.5">
        <button
          v-for="option in rangeOptions"
          :key="option.value"
          type="button"
          class="rounded-xl px-4 py-2.5 text-sm font-medium transition"
          :class="selectedRange === option.value ? 'bg-white/[0.08] text-white' : 'text-zinc-600 hover:text-zinc-300'"
          @click="selectedRange = option.value"
        >
          {{ option.label }}
        </button>
        <span class="ml-auto hidden items-center pr-3 text-xs text-zinc-700 sm:flex">
          {{ displayedRelevantCount }} 黃金相關 · {{ displayedHighImpactCount }} 高影響
        </span>
      </section>

      <TodayEventsTable :events="displayedEvents" :range-label="rangeLabel" />

      <section class="grid gap-4 xl:grid-cols-2">
        <TradingRestrictionCard :restriction="restriction" />
        <RiskGuidanceCard
          :messages="guidance"
          :risk-level="riskLevel"
          :restriction-active="restriction.isActive"
        />
      </section>

      <footer class="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs leading-6 text-zinc-700">
        資料來源：TradingView Economic Calendar；原始發布機構連結保留於每筆事件。平時每 5 分鐘同步，事件前後提高至每分鐘。經濟數據時間可能臨時變更，交易前仍應再次確認事件狀態。
      </footer>
    </template>
  </div>
</template>
