<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import MissionControlIcon from './MissionControlIcon.vue'

import type {
  CommandState,
  DashboardAction,
  DashboardTone,
} from '../composables/useMissionControlDashboard'

interface StatusMetric {
  label: string
  value: string
  detail: string
  tone: DashboardTone
  progress?: number
}

const props = defineProps<{
  commandState: CommandState
  nextAction: DashboardAction
  readinessScore: number
  greeting: string
  formattedDate: string
  formattedTime: string
  missionProgress: number
  planProgress: number
  riskLabel: string
  pendingReviews: number
  openPositions: number
}>()

const toneClasses: Record<
  DashboardTone,
  {
    badge: string
    button: string
    glow: string
    text: string
  }
> = {
  emerald: {
    badge:
      'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
    button:
      'border-emerald-300/25 bg-emerald-300 text-zinc-950 hover:bg-emerald-200',
    glow: 'bg-emerald-400/15',
    text: 'text-emerald-300',
  },
  amber: {
    badge:
      'border-amber-400/25 bg-amber-400/10 text-amber-200',
    button:
      'border-amber-300/25 bg-amber-300 text-zinc-950 hover:bg-amber-200',
    glow: 'bg-amber-400/15',
    text: 'text-amber-300',
  },
  rose: {
    badge:
      'border-rose-400/25 bg-rose-400/10 text-rose-200',
    button:
      'border-rose-300/25 bg-rose-300 text-zinc-950 hover:bg-rose-200',
    glow: 'bg-rose-400/15',
    text: 'text-rose-300',
  },
  sky: {
    badge:
      'border-sky-400/25 bg-sky-400/10 text-sky-200',
    button:
      'border-sky-300/25 bg-sky-300 text-zinc-950 hover:bg-sky-200',
    glow: 'bg-sky-400/15',
    text: 'text-sky-300',
  },
  violet: {
    badge:
      'border-violet-400/25 bg-violet-400/10 text-violet-200',
    button:
      'border-violet-300/25 bg-violet-300 text-zinc-950 hover:bg-violet-200',
    glow: 'bg-violet-400/15',
    text: 'text-violet-300',
  },
  zinc: {
    badge:
      'border-zinc-600 bg-zinc-800/80 text-zinc-300',
    button:
      'border-zinc-600 bg-zinc-100 text-zinc-950 hover:bg-white',
    glow: 'bg-zinc-400/10',
    text: 'text-zinc-300',
  },
}

const readinessColor = computed(() => {
  if (props.readinessScore >= 90) return '#34d399'
  if (props.readinessScore >= 60) return '#fbbf24'
  return '#fb7185'
})

const readinessStyle = computed(() => ({
  background: `conic-gradient(${readinessColor.value} ${props.readinessScore * 3.6}deg, rgba(63, 63, 70, 0.55) 0deg)`,
}))

const metrics = computed<StatusMetric[]>(() => [
  {
    label: '盤前規劃',
    value: `${props.planProgress}%`,
    detail:
      props.planProgress === 100
        ? '條件已定義'
        : '尚未完成',
    tone:
      props.planProgress === 100
        ? 'emerald'
        : 'amber',
    progress: props.planProgress,
  },
  {
    label: '今日任務',
    value: `${props.missionProgress}%`,
    detail:
      props.missionProgress === 100
        ? '流程已完成'
        : '持續準備',
    tone:
      props.missionProgress === 100
        ? 'emerald'
        : 'amber',
    progress: props.missionProgress,
  },
  {
    label: '交易風控',
    value: props.riskLabel,
    detail:
      props.commandState.canObserve
        ? '維持固定風險'
        : '先不要下單',
    tone:
      props.commandState.canObserve
        ? 'emerald'
        : props.commandState.tone,
  },
  {
    label: '目前持倉',
    value: `${props.openPositions} 筆`,
    detail:
      props.openPositions > 0
        ? '執行原定計畫'
        : '目前無曝險',
    tone:
      props.openPositions > 0
        ? 'sky'
        : 'emerald',
  },
])
</script>

<template>
  <section
    class="relative isolate overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#101012] shadow-2xl shadow-black/30"
  >
    <div
      class="pointer-events-none absolute -left-24 -top-32 h-80 w-80 rounded-full blur-[100px]"
      :class="toneClasses[commandState.tone].glow"
    />
    <div
      class="pointer-events-none absolute -bottom-44 right-0 h-96 w-96 rounded-full bg-sky-400/[0.08] blur-[120px]"
    />
    <div
      class="pointer-events-none absolute inset-0 opacity-[0.035]"
      style="background-image: linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px); background-size: 48px 48px;"
    />

    <div class="relative p-5 sm:p-7 xl:p-9">
      <div
        class="flex flex-col gap-8 xl:flex-row xl:items-stretch xl:justify-between"
      >
        <div class="flex min-w-0 flex-1 flex-col">
          <div
            class="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-zinc-500"
          >
            <span
              class="inline-flex items-center gap-2 font-semibold uppercase tracking-[0.24em] text-zinc-300"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-amber-300" />
              Mission Control v3
            </span>
            <span class="hidden h-3 w-px bg-zinc-700 sm:block" />
            <span>{{ formattedDate }}</span>
            <span class="font-mono text-zinc-400">{{ formattedTime }}</span>
          </div>

          <div class="mt-7 max-w-3xl">
            <span
              class="inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]"
              :class="toneClasses[commandState.tone].badge"
            >
              {{ commandState.label }}
            </span>

            <h1
              class="mt-5 max-w-2xl text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl xl:text-[2.85rem] xl:leading-[1.08]"
            >
              {{ greeting }}，{{ commandState.title }}
            </h1>

            <p
              class="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base"
            >
              {{ commandState.description }}
            </p>
          </div>

          <div class="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <RouterLink
              :to="nextAction.route"
              class="group inline-flex items-center justify-between gap-5 rounded-2xl border px-5 py-3.5 text-sm font-semibold shadow-lg shadow-black/20 transition"
              :class="toneClasses[nextAction.tone].button"
            >
              <span>
                <span class="block">{{ nextAction.label }}</span>
                <span class="mt-0.5 block text-[11px] font-medium opacity-60">
                  {{ nextAction.description }}
                </span>
              </span>
              <MissionControlIcon
                name="arrow"
                :size="18"
                class="transition-transform group-hover:translate-x-1"
              />
            </RouterLink>

            <RouterLink
              to="/trades"
              class="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-3.5 text-sm font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
            >
              <MissionControlIcon name="journal" :size="18" />
              交易紀錄
            </RouterLink>
          </div>
        </div>

        <div
          class="flex flex-col gap-4 rounded-[1.65rem] border border-white/[0.08] bg-black/20 p-4 sm:flex-row xl:w-[470px] xl:flex-col xl:p-5"
        >
          <div
            class="flex items-center gap-5 border-b border-white/[0.07] pb-5 sm:w-48 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-5 xl:w-auto xl:border-b xl:border-r-0 xl:pb-5 xl:pr-0"
          >
            <div
              class="relative flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-full p-[7px]"
              :style="readinessStyle"
            >
              <div
                class="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#121214]"
              >
                <span class="text-2xl font-semibold text-white">
                  {{ readinessScore }}
                </span>
                <span class="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                  Ready
                </span>
              </div>
            </div>

            <div>
              <p class="text-sm font-semibold text-zinc-200">今日就緒度</p>
              <p class="mt-2 text-xs leading-5 text-zinc-500">
                綜合規劃、任務、風控與事件禁區。
              </p>
            </div>
          </div>

          <div class="grid flex-1 grid-cols-2 gap-2.5">
            <article
              v-for="metric in metrics"
              :key="metric.label"
              class="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5"
            >
              <div class="flex items-start justify-between gap-2">
                <p class="text-[11px] text-zinc-600">{{ metric.label }}</p>
                <span
                  class="mt-1 h-1.5 w-1.5 rounded-full"
                  :class="{
                    'bg-emerald-400': metric.tone === 'emerald',
                    'bg-amber-400': metric.tone === 'amber',
                    'bg-rose-400': metric.tone === 'rose',
                    'bg-sky-400': metric.tone === 'sky',
                    'bg-violet-400': metric.tone === 'violet',
                    'bg-zinc-500': metric.tone === 'zinc',
                  }"
                />
              </div>
              <p
                class="mt-2 truncate text-base font-semibold"
                :class="toneClasses[metric.tone].text"
              >
                {{ metric.value }}
              </p>
              <p class="mt-1 truncate text-[10px] text-zinc-600">
                {{ metric.detail }}
              </p>
              <div
                v-if="metric.progress !== undefined"
                class="mt-3 h-1 overflow-hidden rounded-full bg-zinc-800"
              >
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="{
                    'bg-emerald-400': metric.tone === 'emerald',
                    'bg-amber-400': metric.tone === 'amber',
                  }"
                  :style="{ width: `${metric.progress}%` }"
                />
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
