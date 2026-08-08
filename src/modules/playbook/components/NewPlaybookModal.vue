<script setup lang="ts">
import { computed, reactive, watch } from 'vue'

import type {
  NewPlaybookInput,
  PlaybookDirection,
  PlaybookStatus,
} from '@/types/playbook'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: [playbook: NewPlaybookInput]
}>()

interface PlaybookForm {
  name: string
  shortName: string
  description: string
  direction: PlaybookDirection
  status: PlaybookStatus
  entryConditionsText: string
  avoidConditionsText: string
  rating: number
}

const createInitialForm = (): PlaybookForm => ({
  name: '',
  shortName: '',
  description: '',
  direction: 'both',
  status: 'testing',
  entryConditionsText: '',
  avoidConditionsText: '',
  rating: 3,
})

const form = reactive<PlaybookForm>(
  createInitialForm(),
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

const isValid = computed(() => {
  return Boolean(
    form.name.trim() &&
      form.shortName.trim() &&
      form.description.trim() &&
      entryConditions.value.length > 0 &&
      avoidConditions.value.length > 0,
  )
})

const resetForm = (): void => {
  Object.assign(
    form,
    createInitialForm(),
  )
}

const closeModal = (): void => {
  emit('close')
}

const submitForm = (): void => {
  if (!isValid.value) {
    return
  }

  emit('submit', {
    name: form.name.trim(),
    shortName: form.shortName.trim(),
    description: form.description.trim(),
    direction: form.direction,
    status: form.status,
    timeframe: '',
    marketCondition: '',
    entryConditions:
      entryConditions.value,
    avoidConditions:
      avoidConditions.value,
    rating: form.rating,
  })

  resetForm()
  emit('close')
}

watch(
  () => props.open,
  isOpen => {
    if (isOpen) {
      resetForm()
    }
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
        v-if="open"
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
                新增交易策略
              </h2>

              <p
                class="mt-1 text-sm leading-6 text-zinc-500"
              >
                建立策略名稱、進場必要條件與禁止交易條件。
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
                  placeholder="例如：W 型支撐反轉"
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-amber-500/40"
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
                  placeholder="例如：W 型"
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-amber-500/40"
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
                placeholder="說明這個策略的核心邏輯與使用方式。"
                class="mt-2 w-full resize-y rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm leading-7 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-amber-500/40"
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
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition focus:border-amber-500/40"
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
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition focus:border-amber-500/40"
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
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition focus:border-amber-500/40"
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
                  class="mt-1 block text-sm leading-6 text-emerald-200/60"
                >
                  每行輸入一個條件。
                </span>

                <textarea
                  v-model="form.entryConditionsText"
                  rows="9"
                  required
                  placeholder="價格到達 4H 或 1H 重要支撐區&#10;15M 結構停止創低&#10;1M 或 5M 形成清楚 W 型"
                  class="mt-4 w-full resize-y rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm leading-7 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-emerald-500/40"
                />

                <p class="mt-3 text-xs text-zinc-500">
                  已輸入
                  {{ entryConditions.length }}
                  個條件
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
                  class="mt-1 block text-sm leading-6 text-rose-200/60"
                >
                  每行輸入一個條件。
                </span>

                <textarea
                  v-model="form.avoidConditionsText"
                  rows="9"
                  required
                  placeholder="重大數據公布前後&#10;價格位於區間中央&#10;結構尚未完成就提前進場"
                  class="mt-4 w-full resize-y rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm leading-7 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-rose-500/40"
                />

                <p class="mt-3 text-xs text-zinc-500">
                  已輸入
                  {{ avoidConditions.length }}
                  個條件
                </p>
              </label>
            </section>

            <section
              class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
            >
              <h3
                class="text-lg font-semibold text-zinc-100"
              >
                策略預覽
              </h3>

              <div
                class="mt-4 flex flex-wrap items-center gap-2"
              >
                <span
                  class="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300"
                >
                  {{ form.shortName || '尚未命名' }}
                </span>

                <span
                  class="rounded-full border border-zinc-700 bg-zinc-800/70 px-3 py-1 text-xs text-zinc-300"
                >
                  {{
                    form.direction === 'buy'
                      ? '多單策略'
                      : form.direction === 'sell'
                        ? '空單策略'
                        : '雙向策略'
                  }}
                </span>

                <span
                  class="text-amber-300"
                >
                  {{ '★'.repeat(form.rating) }}
                </span>
              </div>

              <p
                class="mt-4 text-sm leading-7 text-zinc-400"
              >
                {{
                  form.description ||
                  '尚未輸入策略說明。'
                }}
              </p>
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
                儲存策略
              </button>
            </footer>
          </form>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
