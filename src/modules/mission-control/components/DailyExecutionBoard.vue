<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { RouterLink } from 'vue-router'

import MissionControlIcon from './MissionControlIcon.vue'
import { useConfirmDialogStore } from '@/stores/useConfirmDialogStore'

import type { DashboardTone } from '../composables/useMissionControlDashboard'
import type { EconomicEvent } from '@/types/economic-calendar'
import type { DailyMission } from '@/types/mission'
import type { TradingPlan } from '@/types/trading-plan'

const props = defineProps<{
  missions: DailyMission[]
  completedCount: number
  totalCount: number
  progress: number
  plan: TradingPlan
  planProgress: number
  planBiasLabel: string
  planBiasTone: DashboardTone
  nextEvent: EconomicEvent | null
  eventCountdown: string
  highImpactCount: number
  restrictionStart: string
  restrictionEnd: string
  restrictionActive: boolean
  loadingEvents: boolean
}>()
const confirmDialog = useConfirmDialogStore()

const emit = defineEmits<{
  toggle: [missionId: string]
  add: [title: string]
  update: [missionId: string, title: string]
  remove: [missionId: string]
  reset: []
}>()

const newMissionTitle = ref('')
const editingMissionId = ref<string | null>(null)
const editingMissionTitle = ref('')
const editInput = ref<HTMLInputElement | null>(null)

const remainingCount = computed(() =>
  Math.max(0, props.totalCount - props.completedCount),
)

const planFields = computed(() => [
  {
    label: '4H 趨勢',
    value: props.plan.h4Trend || '尚未定義',
  },
  {
    label: '1H 結構',
    value: props.plan.h1Trend || '尚未定義',
  },
  {
    label: '15M 結構',
    value: props.plan.m15Structure || '尚未定義',
  },
])

const progressLabel = computed(() => {
  if (props.progress === 100) return '今日流程已完成'
  if (props.progress >= 60) return '盤前準備進行中'
  if (props.progress > 0) return '已開始今日流程'
  return '尚未開始今日流程'
})

const addMission = (): void => {
  const title = newMissionTitle.value.trim()
  if (!title) return

  emit('add', title)
  newMissionTitle.value = ''
}

const startEditing = async (mission: DailyMission): Promise<void> => {
  editingMissionId.value = mission.id
  editingMissionTitle.value = mission.title
  await nextTick()
  editInput.value?.focus()
}

const cancelEditing = (): void => {
  editingMissionId.value = null
  editingMissionTitle.value = ''
}

const saveEditing = (): void => {
  const title = editingMissionTitle.value.trim()
  if (!editingMissionId.value || !title) return

  emit('update', editingMissionId.value, title)
  cancelEditing()
}

const removeMission = async (mission: DailyMission): Promise<void> => {
  const confirmed = await confirmDialog.ask({
    title: `刪除「${mission.title}」？`,
    message: '這項今日任務會從執行清單中移除。',
    confirmLabel: '確認刪除',
    tone: 'danger',
  })
  if (!confirmed) return

  emit('remove', mission.id)
  if (editingMissionId.value === mission.id) {
    cancelEditing()
  }
}

const resetMissions = async (): Promise<void> => {
  const confirmed = await confirmDialog.ask({
    title: '重設今天的所有任務？',
    message: '今日任務的完成狀態與自訂內容將恢復為預設值。',
    confirmLabel: '確認重設',
    tone: 'danger',
  })
  if (!confirmed) return
  emit('reset')
  cancelEditing()
}
</script>

<template>
  <section
    id="daily-execution"
    class="overflow-hidden rounded-[1.75rem] border border-white/[0.07] bg-[#111113] shadow-xl shadow-black/20"
  >
    <header
      class="flex flex-col gap-5 border-b border-white/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
    >
      <div class="flex items-center gap-4">
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/[0.08] text-amber-300"
        >
          <MissionControlIcon name="target" :size="21" />
        </div>
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300/70">
            Daily execution
          </p>
          <h2 class="mt-1 text-lg font-semibold text-white">今日執行序列</h2>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <div class="text-right">
          <p class="text-sm font-medium text-zinc-300">{{ progressLabel }}</p>
          <p class="mt-1 text-xs text-zinc-600">
            {{ completedCount }}/{{ totalCount }} 完成 · {{ remainingCount }} 項待辦
          </p>
        </div>
        <div
          class="flex h-12 w-12 items-center justify-center rounded-2xl border text-sm font-semibold"
          :class="
            progress === 100
              ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
              : 'border-amber-400/20 bg-amber-400/10 text-amber-300'
          "
        >
          {{ progress }}%
        </div>
      </div>
    </header>

    <div class="grid xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
      <div class="p-5 sm:p-6 xl:border-r xl:border-white/[0.07]">
        <div class="space-y-2.5">
          <article
            v-for="mission in missions"
            :key="mission.id"
            class="group rounded-2xl border transition"
            :class="
              mission.completed
                ? 'border-emerald-400/[0.08] bg-emerald-400/[0.025]'
                : 'border-white/[0.07] bg-white/[0.025] hover:border-white/[0.12] hover:bg-white/[0.04]'
            "
          >
            <div
              v-if="editingMissionId !== mission.id"
              class="flex items-start gap-3 p-3.5"
            >
              <button
                type="button"
                class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border transition"
                :class="
                  mission.completed
                    ? 'border-emerald-400/25 bg-emerald-400/15 text-emerald-300'
                    : 'border-zinc-700 bg-zinc-900 text-transparent hover:border-amber-400/35 hover:text-amber-300/40'
                "
                :aria-label="mission.completed ? '設為未完成' : '設為已完成'"
                @click="emit('toggle', mission.id)"
              >
                <MissionControlIcon name="check" :size="15" :stroke-width="2.4" />
              </button>

              <button
                type="button"
                class="min-w-0 flex-1 text-left"
                @click="emit('toggle', mission.id)"
              >
                <span
                  class="block text-sm leading-6 transition"
                  :class="
                    mission.completed
                      ? 'text-zinc-600 line-through'
                      : 'text-zinc-200'
                  "
                >
                  {{ mission.title }}
                </span>
                <span class="mt-0.5 block text-[10px] uppercase tracking-[0.14em] text-zinc-700">
                  Step {{ String(mission.order).padStart(2, '0') }}
                </span>
              </button>

              <div
                class="flex shrink-0 items-center gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100"
              >
                <button
                  type="button"
                  class="rounded-lg px-2 py-1.5 text-xs text-zinc-600 transition hover:bg-sky-400/10 hover:text-sky-300"
                  @click="startEditing(mission)"
                >
                  編輯
                </button>
                <button
                  type="button"
                  class="rounded-lg px-2 py-1.5 text-xs text-zinc-600 transition hover:bg-rose-400/10 hover:text-rose-300"
                  @click="removeMission(mission)"
                >
                  刪除
                </button>
              </div>
            </div>

            <form
              v-else
              class="flex flex-col gap-2 p-3 sm:flex-row"
              @submit.prevent="saveEditing"
            >
              <input
                ref="editInput"
                v-model="editingMissionTitle"
                type="text"
                class="min-w-0 flex-1 rounded-xl border border-sky-400/25 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 outline-none ring-2 ring-sky-400/5"
                @keydown.esc="cancelEditing"
              />
              <div class="flex gap-2">
                <button
                  type="button"
                  class="rounded-xl px-3.5 py-2 text-xs text-zinc-500 hover:text-zinc-200"
                  @click="cancelEditing"
                >
                  取消
                </button>
                <button
                  type="submit"
                  :disabled="!editingMissionTitle.trim()"
                  class="rounded-xl bg-sky-300 px-3.5 py-2 text-xs font-semibold text-zinc-950 disabled:opacity-40"
                >
                  儲存
                </button>
              </div>
            </form>
          </article>
        </div>

        <form
          class="mt-4 flex gap-2"
          @submit.prevent="addMission"
        >
          <input
            v-model="newMissionTitle"
            type="text"
            placeholder="新增今日任務…"
            class="min-w-0 flex-1 rounded-xl border border-dashed border-zinc-700 bg-transparent px-3.5 py-2.5 text-sm text-zinc-200 outline-none transition placeholder:text-zinc-700 focus:border-amber-400/30"
          />
          <button
            type="submit"
            :disabled="!newMissionTitle.trim()"
            class="rounded-xl border border-amber-400/20 bg-amber-400/[0.08] px-4 py-2.5 text-sm font-medium text-amber-300 transition hover:bg-amber-400/[0.13] disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-transparent disabled:text-zinc-700"
          >
            新增
          </button>
        </form>

        <div class="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4">
          <button
            type="button"
            class="text-xs text-zinc-700 transition hover:text-rose-300"
            @click="resetMissions"
          >
            重設預設流程
          </button>
          <RouterLink
            to="/planning"
            class="inline-flex items-center gap-2 text-xs font-medium text-amber-300 transition hover:text-amber-200"
          >
            編輯完整規劃
            <MissionControlIcon name="arrow" :size="14" />
          </RouterLink>
        </div>
      </div>

      <aside class="border-t border-white/[0.07] p-5 sm:p-6 xl:border-t-0">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-[11px] uppercase tracking-[0.16em] text-zinc-600">Trading plan</p>
            <p class="mt-1 text-sm font-semibold text-zinc-200">{{ plan.symbol }} 決策框架</p>
          </div>
          <span
            class="rounded-full border px-2.5 py-1 text-xs font-medium"
            :class="{
              'border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300': planBiasTone === 'emerald',
              'border-rose-400/20 bg-rose-400/[0.08] text-rose-300': planBiasTone === 'rose',
              'border-sky-400/20 bg-sky-400/[0.08] text-sky-300': planBiasTone === 'sky',
              'border-zinc-700 bg-zinc-800/70 text-zinc-400': planBiasTone === 'zinc',
            }"
          >
            {{ planBiasLabel }}
          </span>
        </div>

        <div class="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-800">
          <div
            class="h-full rounded-full bg-amber-300 transition-all duration-500"
            :style="{ width: `${planProgress}%` }"
          />
        </div>
        <div class="mt-2 flex justify-between text-[10px] text-zinc-700">
          <span>規劃完成度</span>
          <span>{{ planProgress }}%</span>
        </div>

        <div class="mt-4 space-y-2">
          <div
            v-for="field in planFields"
            :key="field.label"
            class="rounded-xl border border-white/[0.06] bg-black/15 px-3.5 py-3"
          >
            <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">{{ field.label }}</p>
            <p
              class="mt-1.5 line-clamp-2 text-xs leading-5"
              :class="field.value === '尚未定義' ? 'text-zinc-700' : 'text-zinc-300'"
            >
              {{ field.value }}
            </p>
          </div>
        </div>

        <div
          class="mt-5 rounded-2xl border p-4"
          :class="
            restrictionActive
              ? 'border-rose-400/20 bg-rose-400/[0.07]'
              : 'border-white/[0.07] bg-white/[0.025]'
          "
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 items-start gap-3">
              <div
                class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                :class="restrictionActive ? 'bg-rose-400/10 text-rose-300' : 'bg-sky-400/10 text-sky-300'"
              >
                <MissionControlIcon name="calendar" :size="16" />
              </div>
              <div class="min-w-0">
                <p class="text-[10px] uppercase tracking-[0.13em] text-zinc-600">Next event</p>
                <p v-if="loadingEvents && !nextEvent" class="mt-1.5 text-xs text-zinc-500">載入今日事件…</p>
                <template v-else-if="nextEvent">
                  <p class="mt-1.5 truncate text-sm font-medium text-zinc-200">
                    {{ nextEvent.currency }} · {{ nextEvent.title }}
                  </p>
                  <p class="mt-1 text-xs text-zinc-600">
                    {{ nextEvent.time }} · {{ eventCountdown }}
                  </p>
                </template>
                <p v-else class="mt-1.5 text-xs text-emerald-300">今日事件已結束</p>
              </div>
            </div>
            <span class="shrink-0 text-xs text-rose-300">
              {{ highImpactCount }} 高影響
            </span>
          </div>

          <div class="mt-3 border-t border-white/[0.06] pt-3 text-xs">
            <span class="text-zinc-600">禁止新倉 </span>
            <span :class="restrictionActive ? 'font-semibold text-rose-300' : 'text-zinc-400'">
              {{ restrictionStart }}–{{ restrictionEnd }}
            </span>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>
