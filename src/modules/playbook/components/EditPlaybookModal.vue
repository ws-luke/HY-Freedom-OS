<script setup lang="ts">
import { computed, reactive, watch } from 'vue'

import type {
  PlaybookDirection,
  PlaybookRecord,
  PlaybookStatus,
} from '@/types/playbook'

interface EditPlaybookForm {
  name: string
  shortName: string
  description: string
  direction: PlaybookDirection
  status: PlaybookStatus
  entryConditionsText: string
  avoidConditionsText: string
  rating: number
  totalTrades: number
  wins: number
  averageR: number
}

const props = defineProps<{
  open: boolean
  playbook: PlaybookRecord | null
}>()

const emit = defineEmits<{
  close: []
  submit: [
    playbookId: string,
    updates: Partial<PlaybookRecord>,
  ]
}>()

const createEmptyForm = (): EditPlaybookForm => ({
  name: '',
  shortName: '',
  description: '',
  direction: 'both',
  status: 'testing',
  entryConditionsText: '',
  avoidConditionsText: '',
  rating: 3,
  totalTrades: 0,
  wins: 0,
  averageR: 0,
})

const form = reactive<EditPlaybookForm>(
  createEmptyForm(),
)

const normalizeConditions = (
  value: string,
): string[] => {
  return value
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean)
}

const entryConditions = computed(() =>
  normalizeConditions(
    form.entryConditionsText,
  ),
)

const avoidConditions = computed(() =>
  normalizeConditions(
    form.avoidConditionsText,
  ),
)

const calculatedWinRate = computed(() => {
  if (form.totalTrades <= 0) {
    return 0
  }

  return Math.round(
    (form.wins / form.totalTrades) * 100,
  )
})

const isValid = computed(() => {
  return Boolean(
    form.name.trim() &&
      form.shortName.trim() &&
      form.description.trim() &&
      entryConditions.value.length > 0 &&
      avoidConditions.value.length > 0 &&
      form.totalTrades >= 0 &&
      form.wins >= 0 &&
      form.wins <= form.totalTrades,
  )
})

const loadPlaybook = (): void => {
  if (!props.playbook) {
    Object.assign(
      form,
      createEmptyForm(),
    )

    return
  }

  Object.assign(form, {
    name: props.playbook.name,
    shortName: props.playbook.shortName,
    description: props.playbook.description,
    direction: props.playbook.direction,
    status: props.playbook.status,
    entryConditionsText:
      props.playbook.entryConditions.join('\n'),
    avoidConditionsText:
      props.playbook.avoidConditions.join('\n'),
    rating: props.playbook.rating,
    totalTrades: props.playbook.totalTrades,
    wins: props.playbook.wins,
    averageR: props.playbook.averageR,
  })
}

const closeModal = (): void => {
  emit('close')
}

const submitForm = (): void => {
  if (!props.playbook || !isValid.value) {
    return
  }

  emit(
    'submit',
    props.playbook.id,
    {
      name: form.name.trim(),
      shortName: form.shortName.trim(),
      description: form.description.trim(),
      direction: form.direction,
      status: form.status,
      entryConditions:
        entryConditions.value,
      avoidConditions:
        avoidConditions.value,
      rating: Math.max(
        1,
        Math.min(form.rating, 5),
      ),
      totalTrades: Math.max(
        0,
        form.totalTrades,
      ),
      wins: Math.max(
        0,
        Math.min(
          form.wins,
          form.totalTrades,
        ),
      ),
      averageR: Number(
        form.averageR.toFixed(2),
      ),
    },
  )

  emit('close')
}

watch(
  [
    () => props.open,
    () => props.playbook,
  ],
  ([isOpen]) => {
    if (isOpen) {
      loadPlaybook()
    }
  },
  {
    immediate: true,
  },
)
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
          class="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60"
        >
          <header
            class="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-zinc-800 bg-zinc-950/95 p-6 backdrop-blur"
          >
            <div>
              <p
                class="text-xs font-medium tracking-[0.2em] text-amber-400"
              >
                策略管理
              </p>

              <h2
                class="mt-2 text-2xl font-semibold text-zinc-100"
              >
                編輯交易策略
              </h2>

              <p
                class="mt-1 text-sm leading-6 text-zinc-500"
              >
                修改策略內容、使用狀態與歷史表現。
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

          <form
            class="space-y-6 p-6"
            @submit.prevent="submitForm"
          >
            <section
              class="grid gap-4 md:grid-cols-2"
            >
              <label>
                <span
                  class="text-sm font-medium text-zinc-300"
                >
                  策略名稱
                </span>

                <input
                  v-model="form.name"
                  type="text"
                  required
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition focus:border-amber-500/40"
                />
              </label>

              <label>
                <span
                  class="text-sm font-medium text-zinc-300"
                >
                  策略簡稱
                </span>

                <input
                  v-model="form.shortName"
                  type="text"
                  required
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition focus:border-amber-500/40"
                />
              </label>
            </section>

            <label class="block">
              <span
                class="text-sm font-medium text-zinc-300"
              >
                策略說明
              </span>

              <textarea
                v-model="form.description"
                rows="4"
                required
                class="mt-2 w-full resize-y rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm leading-7 text-zinc-100 outline-none transition focus:border-amber-500/40"
              />
            </label>

            <section
              class="grid gap-4 md:grid-cols-3"
            >
              <label>
                <span
                  class="text-sm font-medium text-zinc-300"
                >
                  交易方向
                </span>

                <select
                  v-model="form.direction"
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none focus:border-amber-500/40"
                >
                  <option value="buy">
                    多單策略
                  </option>

                  <option value="sell">
                    空單策略
                  </option>

                  <option value="both">
                    雙向策略
                  </option>
                </select>
              </label>

              <label>
                <span
                  class="text-sm font-medium text-zinc-300"
                >
                  使用狀態
                </span>

                <select
                  v-model="form.status"
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none focus:border-amber-500/40"
                >
                  <option value="active">
                    正式使用
                  </option>

                  <option value="testing">
                    測試中
                  </option>

                  <option value="paused">
                    暫停使用
                  </option>
                </select>
              </label>

              <label>
                <span
                  class="text-sm font-medium text-zinc-300"
                >
                  策略評級
                </span>

                <select
                  v-model.number="form.rating"
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none focus:border-amber-500/40"
                >
                  <option :value="1">
                    ★
                  </option>

                  <option :value="2">
                    ★★
                  </option>

                  <option :value="3">
                    ★★★
                  </option>

                  <option :value="4">
                    ★★★★
                  </option>

                  <option :value="5">
                    ★★★★★
                  </option>
                </select>
              </label>
            </section>

            <section
              class="grid gap-5 xl:grid-cols-2"
            >
              <label
                class="rounded-3xl border border-emerald-500/15 bg-emerald-500/5 p-5"
              >
                <span
                  class="text-lg font-semibold text-emerald-300"
                >
                  進場必要條件
                </span>

                <span
                  class="mt-1 block text-sm text-emerald-200/60"
                >
                  每行輸入一個條件。
                </span>

                <textarea
                  v-model="form.entryConditionsText"
                  rows="10"
                  required
                  class="mt-4 w-full resize-y rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm leading-7 text-zinc-100 outline-none transition focus:border-emerald-500/40"
                />

                <p class="mt-3 text-xs text-zinc-500">
                  共 {{ entryConditions.length }} 個條件
                </p>
              </label>

              <label
                class="rounded-3xl border border-rose-500/15 bg-rose-500/5 p-5"
              >
                <span
                  class="text-lg font-semibold text-rose-300"
                >
                  禁止交易條件
                </span>

                <span
                  class="mt-1 block text-sm text-rose-200/60"
                >
                  每行輸入一個條件。
                </span>

                <textarea
                  v-model="form.avoidConditionsText"
                  rows="10"
                  required
                  class="mt-4 w-full resize-y rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm leading-7 text-zinc-100 outline-none transition focus:border-rose-500/40"
                />

                <p class="mt-3 text-xs text-zinc-500">
                  共 {{ avoidConditions.length }} 個條件
                </p>
              </label>
            </section>

            <section
              class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
            >
              <div>
                <h3
                  class="text-lg font-semibold text-zinc-100"
                >
                  歷史表現
                </h3>

                <p
                  class="mt-1 text-sm leading-6 text-zinc-500"
                >
                  可手動調整目前策略的統計資料。
                </p>
              </div>

              <div
                class="mt-5 grid gap-4 md:grid-cols-3"
              >
                <label>
                  <span
                    class="text-sm font-medium text-zinc-300"
                  >
                    交易筆數
                  </span>

                  <input
                    v-model.number="form.totalTrades"
                    type="number"
                    min="0"
                    step="1"
                    class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-zinc-100 outline-none transition focus:border-amber-500/40"
                  />
                </label>

                <label>
                  <span
                    class="text-sm font-medium text-zinc-300"
                  >
                    獲利筆數
                  </span>

                  <input
                    v-model.number="form.wins"
                    type="number"
                    min="0"
                    :max="form.totalTrades"
                    step="1"
                    class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-zinc-100 outline-none transition focus:border-amber-500/40"
                  />
                </label>

                <label>
                  <span
                    class="text-sm font-medium text-zinc-300"
                  >
                    平均報酬倍數
                  </span>

                  <input
                    v-model.number="form.averageR"
                    type="number"
                    step="0.01"
                    class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-zinc-100 outline-none transition focus:border-amber-500/40"
                  />
                </label>
              </div>

              <div
                class="mt-5 grid gap-3 sm:grid-cols-3"
              >
                <div
                  class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
                >
                  <p class="text-xs text-zinc-500">
                    交易筆數
                  </p>

                  <p
                    class="mt-2 text-xl font-semibold text-zinc-100"
                  >
                    {{ form.totalTrades }}
                  </p>
                </div>

                <div
                  class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
                >
                  <p class="text-xs text-zinc-500">
                    自動計算勝率
                  </p>

                  <p
                    class="mt-2 text-xl font-semibold text-emerald-300"
                  >
                    {{ calculatedWinRate }}%
                  </p>
                </div>

                <div
                  class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
                >
                  <p class="text-xs text-zinc-500">
                    平均報酬
                  </p>

                  <p
                    class="mt-2 text-xl font-semibold text-amber-300"
                  >
                    {{ form.averageR.toFixed(2) }}R
                  </p>
                </div>
              </div>
            </section>

            <footer
              class="flex flex-col-reverse gap-3 border-t border-zinc-800 pt-6 sm:flex-row sm:justify-end"
            >
              <button
                type="button"
                class="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-medium text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
                @click="closeModal"
              >
                取消
              </button>

              <button
                type="submit"
                :disabled="!isValid"
                class="rounded-xl border border-amber-500/30 bg-amber-500/10 px-6 py-3 text-sm font-medium text-amber-300 transition hover:border-amber-400/50 hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-900 disabled:text-zinc-600"
              >
                儲存修改
              </button>
            </footer>
          </form>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
