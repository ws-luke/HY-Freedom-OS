<script setup lang="ts">
import { computed } from 'vue'

import type {
  PlaybookDirection,
  PlaybookRecord,
  PlaybookStatus,
} from '@/types/playbook'

const props = defineProps<{
  open: boolean
  playbook: PlaybookRecord | null
}>()

const emit = defineEmits<{
  close: []
  remove: [playbookId: string, playbookName: string]
  toggleStatus: [playbook: PlaybookRecord]
}>()

const directionLabel = (
  direction: PlaybookDirection,
): string => {
  const labels: Record<PlaybookDirection, string> = {
    buy: '多單策略',
    sell: '空單策略',
    both: '雙向策略',
  }

  return labels[direction]
}

const directionClasses = (
  direction: PlaybookDirection,
): string => {
  const classes: Record<PlaybookDirection, string> = {
    buy: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    sell: 'border-rose-500/25 bg-rose-500/10 text-rose-300',
    both: 'border-sky-500/25 bg-sky-500/10 text-sky-300',
  }

  return classes[direction]
}

const statusLabel = (
  status: PlaybookStatus,
): string => {
  const labels: Record<PlaybookStatus, string> = {
    active: '正式使用',
    testing: '測試中',
    paused: '暫停使用',
  }

  return labels[status]
}

const statusClasses = (
  status: PlaybookStatus,
): string => {
  const classes: Record<PlaybookStatus, string> = {
    active:
      'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    testing:
      'border-amber-500/25 bg-amber-500/10 text-amber-300',
    paused:
      'border-zinc-700 bg-zinc-800/70 text-zinc-400',
  }

  return classes[status]
}

const winRate = computed(() => {
  if (!props.playbook || props.playbook.totalTrades === 0) {
    return 0
  }

  return Math.round(
    (props.playbook.wins /
      props.playbook.totalTrades) *
      100,
  )
})

const losses = computed(() => {
  if (!props.playbook) {
    return 0
  }

  return Math.max(
    0,
    props.playbook.totalTrades -
      props.playbook.wins,
  )
})

const closeModal = (): void => {
  emit('close')
}

const requestRemove = (): void => {
  if (!props.playbook) {
    return
  }

  emit(
    'remove',
    props.playbook.id,
    props.playbook.name,
  )
}

const requestToggleStatus = (): void => {
  if (!props.playbook) {
    return
  }

  emit('toggleStatus', props.playbook)
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open && playbook"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        @click.self="closeModal"
      >
        <section
          class="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60"
        >
          <header
            class="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-zinc-800 bg-zinc-950/95 p-6 backdrop-blur"
          >
            <div>
              <p
                class="text-xs font-medium tracking-[0.2em] text-amber-400"
              >
                策略詳情
              </p>

              <div class="mt-2 flex flex-wrap items-center gap-2">
                <h2 class="text-2xl font-semibold text-zinc-100">
                  {{ playbook.name }}
                </h2>

                <span
                  class="rounded-full border px-2.5 py-1 text-xs font-medium"
                  :class="directionClasses(playbook.direction)"
                >
                  {{ directionLabel(playbook.direction) }}
                </span>

                <span
                  class="rounded-full border px-2.5 py-1 text-xs font-medium"
                  :class="statusClasses(playbook.status)"
                >
                  {{ statusLabel(playbook.status) }}
                </span>
              </div>

              <p class="mt-2 text-sm text-zinc-500">
                {{ playbook.shortName }}
              </p>
            </div>

            <button
              type="button"
              class="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 text-xl text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-200"
              aria-label="關閉視窗"
              @click="closeModal"
            >
              ×
            </button>
          </header>

          <div class="space-y-6 p-6">
            <section
              class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
            >
              <div
                class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"
              >
                <div class="max-w-3xl">
                  <h3 class="text-lg font-semibold text-zinc-100">
                    策略說明
                  </h3>

                  <p class="mt-3 text-sm leading-7 text-zinc-300">
                    {{ playbook.description }}
                  </p>
                </div>

                <div
                  class="shrink-0 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 text-center"
                >
                  <p class="text-xs text-zinc-500">
                    策略評級
                  </p>

                  <p class="mt-2 text-xl text-amber-300">
                    {{ '★'.repeat(playbook.rating) }}
                  </p>
                </div>
              </div>
            </section>

            <section
              class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
              <div
                class="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"
              >
                <p class="text-xs text-zinc-500">
                  交易筆數
                </p>

                <p class="mt-2 text-2xl font-semibold text-zinc-100">
                  {{ playbook.totalTrades }}
                </p>
              </div>

              <div
                class="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"
              >
                <p class="text-xs text-zinc-500">
                  獲利筆數
                </p>

                <p class="mt-2 text-2xl font-semibold text-emerald-300">
                  {{ playbook.wins }}
                </p>
              </div>

              <div
                class="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"
              >
                <p class="text-xs text-zinc-500">
                  虧損筆數
                </p>

                <p class="mt-2 text-2xl font-semibold text-rose-300">
                  {{ losses }}
                </p>
              </div>

              <div
                class="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"
              >
                <p class="text-xs text-zinc-500">
                  歷史勝率
                </p>

                <p class="mt-2 text-2xl font-semibold text-sky-300">
                  {{ winRate }}%
                </p>
              </div>
            </section>

            <section
              class="grid gap-5 xl:grid-cols-2"
            >
              <div
                class="rounded-3xl border border-emerald-500/15 bg-emerald-500/5 p-5"
              >
                <h3 class="text-lg font-semibold text-emerald-300">
                  進場必要條件
                </h3>

                <p class="mt-1 text-sm text-emerald-200/60">
                  所有核心條件都確認後，才允許進場。
                </p>

                <div class="mt-5 space-y-3">
                  <article
                    v-for="(condition, index) in playbook.entryConditions"
                    :key="`${index}-${condition}`"
                    class="flex items-start gap-3 rounded-2xl border border-emerald-500/10 bg-zinc-950/50 p-4"
                  >
                    <div
                      class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 text-xs font-semibold text-emerald-300"
                    >
                      {{ index + 1 }}
                    </div>

                    <p class="text-sm leading-6 text-zinc-300">
                      {{ condition }}
                    </p>
                  </article>
                </div>
              </div>

              <div
                class="rounded-3xl border border-rose-500/15 bg-rose-500/5 p-5"
              >
                <h3 class="text-lg font-semibold text-rose-300">
                  禁止交易條件
                </h3>

                <p class="mt-1 text-sm text-rose-200/60">
                  只要出現其中一項，就應暫停這套策略。
                </p>

                <div class="mt-5 space-y-3">
                  <article
                    v-for="(condition, index) in playbook.avoidConditions"
                    :key="`${index}-${condition}`"
                    class="flex items-start gap-3 rounded-2xl border border-rose-500/10 bg-zinc-950/50 p-4"
                  >
                    <div
                      class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-rose-500/25 bg-rose-500/10 text-xs font-semibold text-rose-300"
                    >
                      ×
                    </div>

                    <p class="text-sm leading-6 text-zinc-300">
                      {{ condition }}
                    </p>
                  </article>
                </div>
              </div>
            </section>

            <section
              class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
            >
              <div
                class="flex flex-col gap-5 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <h3 class="text-lg font-semibold text-zinc-100">
                    策略表現
                  </h3>

                  <p class="mt-1 text-sm text-zinc-500">
                    目前平均報酬倍數與歷史勝率。
                  </p>
                </div>

                <div class="flex flex-wrap gap-3">
                  <div
                    class="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-5 py-3 text-center"
                  >
                    <p class="text-xs text-zinc-500">
                      平均報酬
                    </p>

                    <p class="mt-1 text-xl font-semibold text-amber-300">
                      {{ playbook.averageR.toFixed(2) }}R
                    </p>
                  </div>

                  <div
                    class="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-5 py-3 text-center"
                  >
                    <p class="text-xs text-zinc-500">
                      歷史勝率
                    </p>

                    <p class="mt-1 text-xl font-semibold text-emerald-300">
                      {{ winRate }}%
                    </p>
                  </div>
                </div>
              </div>

              <div class="mt-5 h-3 overflow-hidden rounded-full bg-zinc-800">
                <div
                  class="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 transition-all duration-500"
                  :style="{
                    width: `${winRate}%`,
                  }"
                />
              </div>
            </section>

            <section
              class="rounded-3xl border border-amber-500/15 bg-amber-500/5 p-5"
            >
              <h3 class="font-semibold text-amber-300">
                執行提醒
              </h3>

              <p class="mt-2 text-sm leading-7 text-amber-200/70">
                策略名稱只是分類，真正決定是否能進場的是必要條件、禁止交易條件與風險限制。
              </p>
            </section>

            <footer
              class="flex flex-col-reverse gap-3 border-t border-zinc-800 pt-6 sm:flex-row sm:justify-between"
            >
              <button
                type="button"
                class="rounded-xl border border-rose-500/20 px-5 py-3 text-sm font-medium text-rose-300 transition hover:border-rose-500/40 hover:bg-rose-500/10"
                @click="requestRemove"
              >
                刪除策略
              </button>

              <div class="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  class="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-medium text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
                  @click="closeModal"
                >
                  關閉
                </button>

                <button
                  type="button"
                  class="rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-3 text-sm font-medium text-amber-300 transition hover:border-amber-400/50 hover:bg-amber-500/15"
                  @click="requestToggleStatus"
                >
                  {{
                    playbook.status === 'active'
                      ? '暫停使用'
                      : '恢復使用'
                  }}
                </button>
              </div>
            </footer>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
