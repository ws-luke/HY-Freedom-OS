<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'

import { useEconomicCalendarStore } from '@/stores/useEconomicCalendarStore'

const economicCalendarStore = useEconomicCalendarStore()

const {
  loading,
  riskLevel,
  nextEvent,
  highImpactEvents,
  restriction,
  aiMessages,
} = storeToRefs(economicCalendarStore)

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

const riskTextClasses = computed(() => {
  if (riskLevel.value >= 5) return 'text-rose-300'
  if (riskLevel.value >= 4) return 'text-orange-300'
  if (riskLevel.value >= 3) return 'text-amber-300'

  return 'text-emerald-300'
})

const riskStars = computed(() => {
  const level = Math.max(
    0,
    Math.min(riskLevel.value, 5),
  )

  return '★'.repeat(level)
})

const primaryAdvice = computed(() => {
  if (aiMessages.value.length > 0) {
    return aiMessages.value[0]
  }

  if (riskLevel.value >= 4) {
    return '重大數據公布前後請避免建立新倉。'
  }

  return '今日可依正常交易流程觀察市場。'
})

const secondaryAdvice = computed(() => {
  if (aiMessages.value.length > 1) {
    return aiMessages.value.slice(1, 3)
  }

  return []
})

onMounted(() => {
  if (
    !nextEvent.value &&
    !loading.value
  ) {
    economicCalendarStore.load()
  }
})
</script>

<template>
  <section
    class="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-xl shadow-black/10"
  >
    <div
      class="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-rose-500/10 blur-3xl"
    />

    <div class="relative">
      <header class="flex items-start justify-between gap-4">
        <div>
          <p
            class="text-xs font-medium tracking-[0.2em] text-rose-400"
          >
            今日市場風險
          </p>

          <h2
            class="mt-2 text-xl font-semibold text-zinc-100"
          >
            重大經濟事件
          </h2>

          <p
            class="mt-1 text-sm leading-6 text-zinc-500"
          >
            進場前先確認事件時間與禁止交易區間。
          </p>
        </div>

        <span
          class="rounded-full border px-3 py-1 text-xs font-medium"
          :class="riskClasses"
        >
          {{ riskLabel }}
        </span>
      </header>

      <div
        v-if="loading && !nextEvent"
        class="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-8 text-center"
      >
        <div
          class="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-zinc-800 border-t-amber-400"
        />

        <p class="mt-4 text-sm text-zinc-500">
          正在載入今日經濟事件…
        </p>
      </div>

      <template v-else>
        <div class="mt-6 grid grid-cols-2 gap-3">
          <div
            class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
          >
            <p class="text-xs text-zinc-500">
              今日風險
            </p>

            <p
              class="mt-2 text-2xl font-semibold"
              :class="riskTextClasses"
            >
              {{ riskStars || '—' }}
            </p>

            <p
              class="mt-1 text-xs"
              :class="riskTextClasses"
            >
              {{ riskLabel }}
            </p>
          </div>

          <div
            class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
          >
            <p class="text-xs text-zinc-500">
              高影響事件
            </p>

            <p
              class="mt-2 text-2xl font-semibold text-rose-300"
            >
              {{ highImpactEvents.length }}
              <span class="text-sm text-zinc-600">
                個
              </span>
            </p>

            <p class="mt-1 text-xs text-zinc-600">
              影響等級四星以上
            </p>
          </div>
        </div>

        <div
          v-if="nextEvent"
          class="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/65 p-5"
        >
          <div
            class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div class="min-w-0">
              <div
                class="flex flex-wrap items-center gap-2"
              >
                <span
                  class="rounded-lg border border-blue-500/25 bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-300"
                >
                  {{ nextEvent.currency }}
                </span>

                <span
                  class="rounded-lg border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-300"
                >
                  {{ '★'.repeat(nextEvent.impact) }}
                </span>
              </div>

              <h3
                class="mt-3 text-lg font-semibold text-zinc-100"
              >
                {{ nextEvent.title }}
              </h3>

              <p class="mt-1 text-sm text-zinc-500">
                {{ nextEvent.country }}
              </p>
            </div>

            <div class="shrink-0 sm:text-right">
              <p class="text-xs text-zinc-500">
                公布時間
              </p>

              <p
                class="mt-1 text-3xl font-semibold text-amber-300"
              >
                {{ nextEvent.time }}
              </p>

              <p class="mt-1 text-xs text-zinc-600">
                台灣時間
              </p>
            </div>
          </div>

          <div class="mt-5 grid grid-cols-3 gap-3">
            <div
              class="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3"
            >
              <p class="text-xs text-zinc-500">
                前值
              </p>

              <p
                class="mt-2 text-sm font-medium text-zinc-300"
              >
                {{ nextEvent.previous || '—' }}
              </p>
            </div>

            <div
              class="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3"
            >
              <p class="text-xs text-zinc-500">
                預期
              </p>

              <p
                class="mt-2 text-sm font-medium text-amber-300"
              >
                {{ nextEvent.forecast || '—' }}
              </p>
            </div>

            <div
              class="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3"
            >
              <p class="text-xs text-zinc-500">
                公布值
              </p>

              <p
                class="mt-2 text-sm font-medium text-emerald-300"
              >
                {{ nextEvent.actual || '尚未公布' }}
              </p>
            </div>
          </div>
        </div>

        <div
          v-else
          class="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5"
        >
          <p class="font-medium text-emerald-300">
            今日沒有重大經濟事件
          </p>

          <p
            class="mt-2 text-sm leading-6 text-emerald-200/70"
          >
            可依照正常交易流程觀察市場，但仍需遵守盤前規劃。
          </p>
        </div>

        <div
          class="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4"
        >
          <p class="text-xs text-rose-300/70">
            禁止建立新倉時段
          </p>

          <p
            class="mt-2 text-xl font-semibold text-rose-300"
          >
            {{ restriction.start }}
            －
            {{ restriction.end }}
          </p>
        </div>

        <div
          class="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5"
        >
          <p class="text-xs text-amber-300/70">
            AI 今日提醒
          </p>

          <p
            class="mt-3 text-base font-medium leading-7 text-amber-200"
          >
            {{ primaryAdvice }}
          </p>

          <div
            v-if="secondaryAdvice.length"
            class="mt-4 space-y-2"
          >
            <div
              v-for="message in secondaryAdvice"
              :key="message"
              class="flex items-start gap-3"
            >
              <span
                class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"
              />

              <p
                class="text-sm leading-6 text-zinc-400"
              >
                {{ message }}
              </p>
            </div>
          </div>
        </div>

        <RouterLink
          to="/economic-calendar"
          class="mt-5 flex w-full items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-950/60 px-4 py-3 text-sm font-medium text-zinc-400 transition hover:border-rose-500/30 hover:text-rose-300"
        >
          查看完整經濟日曆
        </RouterLink>
      </template>
    </div>
  </section>
</template>