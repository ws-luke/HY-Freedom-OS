<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'

import { useDailyMissionStore } from '@/stores/useDailyMissionStore'

const dailyMissionStore = useDailyMissionStore()

const {
  sortedMissions,
  completedCount,
  totalCount,
  progressPercent,
  allCompleted,
} = storeToRefs(dailyMissionStore)

const newMissionTitle = ref('')
const editingMissionId = ref<string | null>(null)
const editingMissionTitle = ref('')

const remainingCount = computed(() =>
  Math.max(0, totalCount.value - completedCount.value),
)

const progressLabel = computed(() => {
  if (allCompleted.value) {
    return '今日任務已全部完成'
  }

  if (progressPercent.value >= 75) {
    return '即將完成今日準備'
  }

  if (progressPercent.value >= 50) {
    return '今日準備進行中'
  }

  if (progressPercent.value > 0) {
    return '已開始今日準備'
  }

  return '尚未開始今日任務'
})

const progressClasses = computed(() => {
  if (allCompleted.value) {
    return {
      text: 'text-emerald-300',
      border: 'border-emerald-500/20',
      background: 'bg-emerald-500/5',
      bar: 'bg-emerald-400',
    }
  }

  if (progressPercent.value >= 50) {
    return {
      text: 'text-amber-300',
      border: 'border-amber-500/20',
      background: 'bg-amber-500/5',
      bar: 'bg-amber-400',
    }
  }

  return {
    text: 'text-rose-300',
    border: 'border-rose-500/20',
    background: 'bg-rose-500/5',
    bar: 'bg-rose-400',
  }
})

const addMission = (): void => {
  const title = newMissionTitle.value.trim()

  if (!title) {
    return
  }

  dailyMissionStore.addMission(title)
  newMissionTitle.value = ''
}

const beginEditing = (
  missionId: string,
  title: string,
): void => {
  editingMissionId.value = missionId
  editingMissionTitle.value = title
}

const cancelEditing = (): void => {
  editingMissionId.value = null
  editingMissionTitle.value = ''
}

const saveEditing = (): void => {
  if (!editingMissionId.value) {
    return
  }

  const title = editingMissionTitle.value.trim()

  if (!title) {
    return
  }

  dailyMissionStore.updateMission(
    editingMissionId.value,
    title,
  )

  cancelEditing()
}

const removeMission = (
  missionId: string,
  title: string,
): void => {
  const confirmed = window.confirm(
    `確定要刪除「${title}」嗎？`,
  )

  if (!confirmed) {
    return
  }

  dailyMissionStore.removeMission(missionId)

  if (editingMissionId.value === missionId) {
    cancelEditing()
  }
}

const resetToday = (): void => {
  const confirmed = window.confirm(
    '確定要重設今天的所有任務嗎？',
  )

  if (!confirmed) {
    return
  }

  dailyMissionStore.resetToday()
  cancelEditing()
}
</script>

<template>
  <section
    class="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-xl shadow-black/10"
  >
    <div
      class="pointer-events-none absolute -left-20 -top-20 h-52 w-52 rounded-full bg-amber-500/10 blur-3xl"
    />

    <div class="relative">
      <header
        class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <p
            class="text-xs font-medium tracking-[0.2em] text-amber-400"
          >
            每日執行流程
          </p>

          <h2
            class="mt-2 text-xl font-semibold text-zinc-100"
          >
            今日任務
          </h2>

          <p
            class="mt-1 text-sm leading-6 text-zinc-500"
          >
            先完成盤前準備，再開始尋找交易機會。
          </p>
        </div>

        <div
          class="rounded-2xl border px-4 py-3 text-center"
          :class="[
            progressClasses.border,
            progressClasses.background,
          ]"
        >
          <p class="text-xs text-zinc-500">
            今日進度
          </p>

          <p
            class="mt-1 text-2xl font-semibold"
            :class="progressClasses.text"
          >
            {{ progressPercent }}%
          </p>
        </div>
      </header>

      <div
        class="mt-6 rounded-2xl border p-5"
        :class="[
          progressClasses.border,
          progressClasses.background,
        ]"
      >
        <div
          class="flex items-center justify-between gap-4"
        >
          <div>
            <p
              class="font-medium"
              :class="progressClasses.text"
            >
              {{ progressLabel }}
            </p>

            <p
              class="mt-1 text-sm text-zinc-500"
            >
              已完成 {{ completedCount }}／{{ totalCount }} 項，
              剩下 {{ remainingCount }} 項。
            </p>
          </div>

          <div
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border"
            :class="[
              progressClasses.border,
              progressClasses.text,
            ]"
          >
            {{ allCompleted ? '✓' : completedCount }}
          </div>
        </div>

        <div
          class="mt-4 h-3 overflow-hidden rounded-full bg-zinc-800"
        >
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="progressClasses.bar"
            :style="{
              width: `${progressPercent}%`,
            }"
          />
        </div>
      </div>

      <div
        v-if="sortedMissions.length"
        class="mt-5 space-y-3"
      >
        <article
          v-for="mission in sortedMissions"
          :key="mission.id"
          class="rounded-2xl border border-zinc-800 bg-zinc-950/55 p-4 transition hover:border-zinc-700"
        >
          <div
            v-if="editingMissionId !== mission.id"
            class="flex items-start gap-3"
          >
            <button
              type="button"
              class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition"
              :class="
                mission.completed
                  ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                  : 'border-zinc-700 bg-zinc-900 text-transparent hover:border-amber-500/40'
              "
              :aria-label="
                mission.completed
                  ? '標記為尚未完成'
                  : '標記為已完成'
              "
              @click="
                dailyMissionStore.toggleMission(
                  mission.id,
                )
              "
            >
              ✓
            </button>

            <div class="min-w-0 flex-1">
              <p
                class="leading-6 transition"
                :class="
                  mission.completed
                    ? 'text-zinc-600 line-through'
                    : 'text-zinc-200'
                "
              >
                {{ mission.title }}
              </p>

              <p class="mt-1 text-xs text-zinc-600">
                第 {{ mission.order }} 項
              </p>
            </div>

            <div class="flex shrink-0 gap-2">
              <button
                type="button"
                class="rounded-lg border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-500 transition hover:border-sky-500/30 hover:text-sky-300"
                @click="
                  beginEditing(
                    mission.id,
                    mission.title,
                  )
                "
              >
                編輯
              </button>

              <button
                type="button"
                class="rounded-lg border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-500 transition hover:border-rose-500/30 hover:text-rose-300"
                @click="
                  removeMission(
                    mission.id,
                    mission.title,
                  )
                "
              >
                刪除
              </button>
            </div>
          </div>

          <form
            v-else
            class="flex flex-col gap-3 sm:flex-row"
            @submit.prevent="saveEditing"
          >
            <input
              v-model="editingMissionTitle"
              type="text"
              class="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-amber-500/40"
              autofocus
            />

            <div class="flex gap-2">
              <button
                type="button"
                class="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition hover:text-zinc-200"
                @click="cancelEditing"
              >
                取消
              </button>

              <button
                type="submit"
                :disabled="!editingMissionTitle.trim()"
                class="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                儲存
              </button>
            </div>
          </form>
        </article>
      </div>

      <div
        v-else
        class="mt-5 rounded-2xl border border-dashed border-zinc-800 p-8 text-center"
      >
        <p class="text-sm text-zinc-500">
          今天尚未建立任務。
        </p>
      </div>

      <form
        class="mt-5 flex flex-col gap-3 sm:flex-row"
        @submit.prevent="addMission"
      >
        <input
          v-model="newMissionTitle"
          type="text"
          placeholder="新增今天需要完成的任務"
          class="min-w-0 flex-1 rounded-2xl border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-amber-500/40"
        />

        <button
          type="submit"
          :disabled="!newMissionTitle.trim()"
          class="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-5 py-3 text-sm font-medium text-amber-300 transition hover:border-amber-400/40 hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-900 disabled:text-zinc-600"
        >
          新增任務
        </button>
      </form>

      <footer
        class="mt-5 flex flex-col-reverse gap-3 border-t border-zinc-800 pt-5 sm:flex-row sm:justify-between"
      >
        <button
          type="button"
          class="rounded-xl border border-zinc-800 px-4 py-2.5 text-sm text-zinc-500 transition hover:border-rose-500/30 hover:text-rose-300"
          @click="resetToday"
        >
          重設今日任務
        </button>

        <RouterLink
          to="/planning"
          class="flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 py-2.5 text-sm font-medium text-zinc-400 transition hover:border-amber-500/30 hover:text-amber-300"
        >
          前往盤前規劃
        </RouterLink>
      </footer>
    </div>
  </section>
</template>