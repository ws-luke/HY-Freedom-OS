<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'

import { useDailyMissionStore } from '@/stores/useDailyMissionStore'
import { useEconomicCalendarStore } from '@/stores/useEconomicCalendarStore'
import { useTradeStore } from '@/stores/useTradeStore'

const dailyMissionStore = useDailyMissionStore()
const economicCalendarStore = useEconomicCalendarStore()
const tradeStore = useTradeStore()

const {
  completedCount,
  totalCount,
  progressPercent,
  allCompleted,
} = storeToRefs(dailyMissionStore)

const {
  loading: economicLoading,
  riskLevel,
  nextEvent,
  highImpactEvents,
} = storeToRefs(economicCalendarStore)

const {
  statistics,
  pendingReviewTrades,
} = storeToRefs(tradeStore)

const currentTime = ref(new Date())

let timer: number | undefined

const hour = computed(() => currentTime.value.getHours())

const greeting = computed(() => {
  if (hour.value < 5) return '夜深了'
  if (hour.value < 12) return '早安'
  if (hour.value < 18) return '午安'

  return '晚安'
})

const greetingMessage = computed(() => {
  if (hour.value < 5) {
    return '目前已經很晚，除非交易計畫明確，否則不要勉強進場。'
  }

  if (hour.value < 12) {
    return '先完成盤前準備，再等待真正符合條件的交易機會。'
  }

  if (hour.value < 18) {
    return '確認高週期結構與重要事件，保持耐心等待進場位置。'
  }

  return '美盤波動即將增加，請先確認新聞時間與風險限制。'
})

const formattedDate = computed(() =>
  new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(currentTime.value),
)

const formattedTime = computed(() =>
  new Intl.DateTimeFormat('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(currentTime.value),
)

const riskLabel = computed(() => {
  if (riskLevel.value >= 5) return '高風險'
  if (riskLevel.value >= 4) return '偏高風險'
  if (riskLevel.value >= 3) return '中等風險'
  if (riskLevel.value >= 2) return '低風險'

  return '風險正常'
})

const riskClasses = computed(() => {
  if (riskLevel.value >= 5) {
    return 'border-rose-500/25 bg-rose-500/10 text-rose-300'
  }

  if (riskLevel.value >= 4) {
    return 'border-orange-500/25 bg-orange-500/10 text-orange-300'
  }

  if (riskLevel.value >= 3) {
    return 'border-amber-500/25 bg-amber-500/10 text-amber-300'
  }

  return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
})

const missionStatus = computed(() => {
  if (allCompleted.value) {
    return {
      title: '今日任務已全部完成',
      description: '盤前準備與交易流程已完成，可以專注等待機會。',
      classes:
        'border-emerald-500/20 bg-emerald-500/5 text-emerald-300',
    }
  }

  if (progressPercent.value >= 50) {
    return {
      title: '今日準備進行中',
      description: `目前已完成 ${completedCount.value}／${totalCount.value} 項任務。`,
      classes:
        'border-amber-500/20 bg-amber-500/5 text-amber-300',
    }
  }

  return {
    title: '請先完成盤前準備',
    description: `目前只完成 ${completedCount.value}／${totalCount.value} 項任務。`,
    classes:
      'border-rose-500/20 bg-rose-500/5 text-rose-300',
  }
})

const tradingStatus = computed(() => {
  if (!allCompleted.value) {
    return {
      label: '尚未準備完成',
      description: '先完成今日任務，不要急著尋找進場訊號。',
      classes:
        'border-rose-500/25 bg-rose-500/10 text-rose-300',
    }
  }

  if (riskLevel.value >= 5) {
    return {
      label: '高風險觀察',
      description: '今天有重大經濟事件，數據公布前避免建立新倉。',
      classes:
        'border-rose-500/25 bg-rose-500/10 text-rose-300',
    }
  }

  if (riskLevel.value >= 4) {
    return {
      label: '降低交易頻率',
      description: '只處理完整符合策略的高品質交易機會。',
      classes:
        'border-amber-500/25 bg-amber-500/10 text-amber-300',
    }
  }

  return {
    label: '可以正常觀察',
    description: '維持固定風險，等待符合策略的進場機會。',
    classes:
      'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  }
})

const profitLossClasses = computed(() => {
  if (statistics.value.totalProfitLoss > 0) {
    return 'text-emerald-300'
  }

  if (statistics.value.totalProfitLoss < 0) {
    return 'text-rose-300'
  }

  return 'text-zinc-300'
})

const formatMoney = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)

onMounted(() => {
  dailyMissionStore.ensureCurrentDay()

  if (!nextEvent.value && !economicLoading.value) {
    economicCalendarStore.load()
  }

  timer = window.setInterval(() => {
    currentTime.value = new Date()
    dailyMissionStore.ensureCurrentDay()
  }, 1000)
})
</script>

<template>
  <section
    class="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-xl shadow-black/10 lg:p-8"
  >
    <div
      class="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl"
    />

    <div
      class="pointer-events-none absolute -bottom-32 right-0 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl"
    />

    <div class="relative">
      <div
        class="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between"
      >
        <div class="max-w-3xl">
          <p
            class="text-xs font-medium tracking-[0.22em] text-amber-400"
          >
            HY 自由交易系統
          </p>

          <h1 class="mt-3 text-3xl font-bold text-zinc-100 sm:text-4xl">
            {{ greeting }}，今天也要按計畫交易
          </h1>

          <p class="mt-3 text-sm leading-7 text-zinc-400">
            {{ greetingMessage }}
          </p>

          <div class="mt-5 flex flex-wrap items-center gap-3">
            <span
              class="rounded-full border border-zinc-700 bg-zinc-950/60 px-3 py-1.5 text-xs text-zinc-400"
            >
              {{ formattedDate }}
            </span>

            <span
              class="rounded-full border border-zinc-700 bg-zinc-950/60 px-3 py-1.5 font-mono text-xs text-zinc-300"
            >
              {{ formattedTime }}
            </span>

            <span
              class="rounded-full border px-3 py-1.5 text-xs font-medium"
              :class="tradingStatus.classes"
            >
              {{ tradingStatus.label }}
            </span>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[540px]">
          <div
            class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
          >
            <p class="text-xs text-zinc-500">
              今日任務
            </p>

            <p class="mt-2 text-2xl font-semibold text-zinc-100">
              {{ completedCount }}／{{ totalCount }}
            </p>

            <p class="mt-1 text-xs text-amber-300">
              {{ progressPercent }}%
            </p>
          </div>

          <div
            class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
          >
            <p class="text-xs text-zinc-500">
              今日風險
            </p>

            <p
              class="mt-2 text-lg font-semibold"
              :class="riskClasses"
            >
              {{ riskLabel }}
            </p>

            <p class="mt-1 text-xs text-rose-300">
              {{ highImpactEvents.length }} 個高影響
            </p>
          </div>

          <div
            class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
          >
            <p class="text-xs text-zinc-500">
              總盈虧
            </p>

            <p
              class="mt-2 text-xl font-semibold"
              :class="profitLossClasses"
            >
              {{ statistics.totalProfitLoss > 0 ? '+' : '' }}
              {{ formatMoney(statistics.totalProfitLoss) }}
            </p>

            <p class="mt-1 text-xs text-zinc-600">
              勝率 {{ statistics.winRate }}%
            </p>
          </div>

          <div
            class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
          >
            <p class="text-xs text-zinc-500">
              待復盤
            </p>

            <p class="mt-2 text-2xl font-semibold text-amber-300">
              {{ pendingReviewTrades.length }}
            </p>

            <p class="mt-1 text-xs text-zinc-600">
              筆交易
            </p>
          </div>
        </div>
      </div>

      <div class="mt-6 grid gap-4 xl:grid-cols-[1fr_1fr_auto]">
        <div
          class="rounded-2xl border p-5"
          :class="missionStatus.classes"
        >
          <p class="font-semibold">
            {{ missionStatus.title }}
          </p>

          <p class="mt-2 text-sm leading-6 opacity-75">
            {{ missionStatus.description }}
          </p>

          <div class="mt-4 h-2.5 overflow-hidden rounded-full bg-black/20">
            <div
              class="h-full rounded-full bg-current transition-all duration-500"
              :style="{
                width: `${progressPercent}%`,
              }"
            />
          </div>
        </div>

        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/55 p-5"
        >
          <p class="text-xs text-zinc-500">
            下一個重大事件
          </p>

          <template v-if="nextEvent">
            <div class="mt-3 flex items-start justify-between gap-4">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span
                    class="rounded-lg border border-blue-500/25 bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-300"
                  >
                    {{ nextEvent.currency }}
                  </span>

                  <span class="text-xs text-rose-300">
                    {{ '★'.repeat(nextEvent.impact) }}
                  </span>
                </div>

                <p class="mt-2 truncate font-medium text-zinc-200">
                  {{ nextEvent.title }}
                </p>
              </div>

              <p class="shrink-0 text-2xl font-semibold text-amber-300">
                {{ nextEvent.time }}
              </p>
            </div>
          </template>

          <p
            v-else
            class="mt-3 text-sm text-emerald-300"
          >
            今日沒有重大經濟事件
          </p>
        </div>

        <div class="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          <RouterLink
            to="/planning"
            class="flex min-w-40 items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/10 px-5 py-3 text-sm font-medium text-amber-300 transition hover:border-amber-400/50 hover:bg-amber-500/15"
          >
            開始盤前規劃
          </RouterLink>

          <RouterLink
            to="/trades"
            class="flex min-w-40 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-950/60 px-5 py-3 text-sm font-medium text-zinc-400 transition hover:border-sky-500/30 hover:text-sky-300"
          >
            新增交易紀錄
          </RouterLink>

          <RouterLink
            to="/review"
            class="flex min-w-40 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-950/60 px-5 py-3 text-sm font-medium text-zinc-400 transition hover:border-emerald-500/30 hover:text-emerald-300"
          >
            前往復盤中心
          </RouterLink>
        </div>
      </div>
    </div>
  </section>
</template>