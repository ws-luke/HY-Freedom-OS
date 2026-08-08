<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import PlaybookSelect from './PlaybookSelect.vue'
import TradeScreenshotUploader from './TradeScreenshotUploader.vue'
import TradeSignalSelect from './TradeSignalSelect.vue'
import TradeTagEditor from './TradeTagEditor.vue'
import { useSignalStore } from '@/stores/useSignalStore'

import type {
  TradeMistakeTag,
  TradeRecord,
  TradeScreenshot,
} from '@/types/trade'
import type {
  StoredTradeReview,
  TradeReviewForm,
  TradeReviewResult,
} from '@/types/trade-review'

const props = defineProps<{
  open: boolean
  trade: TradeRecord | null
  existingReview?: StoredTradeReview | null
}>()

const emit = defineEmits<{
  close: []
  submit: [review: TradeReviewResult]
  'update-trade': [tradeId: string, updates: Partial<TradeRecord>]
}>()

const signalStore = useSignalStore()

type ScreenshotType = 'before' | 'after'

interface ScreenshotChangeData {
  type: ScreenshotType
  name: string
  dataUrl: string
}

interface JournalContextForm {
  signalId: string | null
  playbook: string
  reason: string
  beforeScreenshot: TradeScreenshot | null
  afterScreenshot: TradeScreenshot | null
  mistakeTags: TradeMistakeTag[]
  customMistakeTags: string[]
}

const createJournalContext = (): JournalContextForm => ({
  signalId: null,
  playbook: '',
  reason: '',
  beforeScreenshot: null,
  afterScreenshot: null,
  mistakeTags: [],
  customMistakeTags: [],
})

const journal = reactive<JournalContextForm>(createJournalContext())

const createInitialForm = (): TradeReviewForm => ({
  followedPlan: null,
  followedPlaybook: null,
  respectedRisk: null,
  waitedForConfirmation: null,
  avoidedNewsRisk: null,
  emotionalControl: 5,
  executionScore: 5,
  strengths: '',
  mistakes: '',
  improvement: '',
  nextTradeRule: '',
  summary: '',
})

const form = reactive<TradeReviewForm>(
  createInitialForm(),
)

const checklistItems = computed(() => [
  {
    key: 'followedPlan' as const,
    title: '是否符合盤前規劃？',
    description:
      '交易方向、關鍵區域與允許條件是否符合當日規劃。',
  },
  {
    key: 'followedPlaybook' as const,
    title: '是否符合交易策略？',
    description:
      '進場條件是否完整符合所選的交易策略。',
  },
  {
    key: 'respectedRisk' as const,
    title: '是否遵守風險限制？',
    description:
      '風險金額、停損位置與交易次數是否符合規則。',
  },
  {
    key: 'waitedForConfirmation' as const,
    title: '是否等待確認訊號？',
    description:
      '是否等到結構、回踩或低週期訊號完成才進場。',
  },
  {
    key: 'avoidedNewsRisk' as const,
    title: '是否避開重大數據風險？',
    description:
      '是否避開新聞公布前後的禁止交易時段。',
  },
])

const completedChecklistCount = computed(() =>
  checklistItems.value.filter(
    item => form[item.key] !== null,
  ).length,
)

const yesCount = computed(() =>
  checklistItems.value.filter(
    item => form[item.key] === true,
  ).length,
)

const checklistScore = computed(() => {
  if (checklistItems.value.length === 0) {
    return 0
  }

  return Math.round(
    (yesCount.value / checklistItems.value.length) *
      60,
  )
})

const emotionalScore = computed(
  () => form.emotionalControl * 2,
)

const executionPoints = computed(
  () => form.executionScore * 2,
)

const totalScore = computed(() =>
  Math.min(
    checklistScore.value +
      emotionalScore.value +
      executionPoints.value,
    100,
  ),
)

const scoreLabel = computed(() => {
  if (totalScore.value >= 90) {
    return '紀律表現優秀'
  }

  if (totalScore.value >= 75) {
    return '整體執行良好'
  }

  if (totalScore.value >= 60) {
    return '仍有改善空間'
  }

  return '需要重新檢視流程'
})

const scoreClasses = computed(() => {
  if (totalScore.value >= 90) {
    return 'text-emerald-300'
  }

  if (totalScore.value >= 75) {
    return 'text-sky-300'
  }

  if (totalScore.value >= 60) {
    return 'text-amber-300'
  }

  return 'text-rose-300'
})

const isValid = computed(() => {
  return (
    completedChecklistCount.value ===
      checklistItems.value.length &&
    Boolean(journal.signalId) &&
    journal.playbook.trim() &&
    journal.reason.trim() &&
    form.nextTradeRule.trim() &&
    form.summary.trim()
  )
})

const evidenceItems = computed(() => [
  { label: 'Signal', done: Boolean(journal.signalId) },
  { label: 'Playbook', done: Boolean(journal.playbook.trim()) },
  { label: '進場理由', done: Boolean(journal.reason.trim()) },
  { label: '交易前圖', done: Boolean(journal.beforeScreenshot) },
  { label: '交易後圖', done: Boolean(journal.afterScreenshot) },
])

const evidenceCompletedCount = computed(() =>
  evidenceItems.value.filter(item => item.done).length,
)

const evidenceProgress = computed(() =>
  Math.round((evidenceCompletedCount.value / evidenceItems.value.length) * 100),
)

const setChecklistValue = (
  key:
    | 'followedPlan'
    | 'followedPlaybook'
    | 'respectedRisk'
    | 'waitedForConfirmation'
    | 'avoidedNewsRisk',
  value: boolean,
): void => {
  form[key] = value
}

const resetForm = (): void => {
  Object.assign(form, createInitialForm())
  Object.assign(journal, createJournalContext())
}

const loadForm = (): void => {
  resetForm()

  if (props.trade) {
    Object.assign(journal, {
      signalId: props.trade.signalId,
      playbook: props.trade.playbook,
      reason: props.trade.reason,
      beforeScreenshot: props.trade.beforeScreenshot
        ? { ...props.trade.beforeScreenshot }
        : null,
      afterScreenshot: props.trade.afterScreenshot
        ? { ...props.trade.afterScreenshot }
        : null,
      mistakeTags: [...props.trade.mistakeTags],
      customMistakeTags: [...props.trade.customMistakeTags],
    })
  }

  if (!props.existingReview) return

  Object.assign(form, {
    followedPlan: props.existingReview.followedPlan,
    followedPlaybook: props.existingReview.followedPlaybook,
    respectedRisk: props.existingReview.respectedRisk,
    waitedForConfirmation: props.existingReview.waitedForConfirmation,
    avoidedNewsRisk: props.existingReview.avoidedNewsRisk,
    emotionalControl: props.existingReview.emotionalControl,
    executionScore: props.existingReview.executionScore,
    strengths: props.existingReview.strengths,
    mistakes: props.existingReview.mistakes,
    improvement: props.existingReview.improvement,
    nextTradeRule: props.existingReview.nextTradeRule,
    summary: props.existingReview.summary,
  })
}

const handleScreenshotChange = (
  screenshot: ScreenshotChangeData,
): void => {
  const existing = screenshot.type === 'before'
    ? journal.beforeScreenshot
    : journal.afterScreenshot
  const next: TradeScreenshot = {
    name: screenshot.name,
    dataUrl: screenshot.dataUrl,
    storagePath: existing?.storagePath ?? null,
  }

  if (screenshot.type === 'before') {
    journal.beforeScreenshot = next
  }
  else {
    journal.afterScreenshot = next
  }
}

const handleScreenshotRemove = (type: ScreenshotType): void => {
  if (type === 'before') {
    journal.beforeScreenshot = null
  }
  else {
    journal.afterScreenshot = null
  }
}

const updateMistakeTags = (tags: TradeMistakeTag[]): void => {
  journal.mistakeTags = [...tags]
}

const updateCustomMistakeTags = (tags: string[]): void => {
  journal.customMistakeTags = [...tags]
}

const closeModal = (): void => {
  emit('close')
}

const submitReview = (): void => {
  if (!props.trade || !isValid.value) {
    return
  }

  const selectedSignal = signalStore.getSignalById(journal.signalId)

  emit('update-trade', props.trade.id, {
    signalId: journal.signalId,
    signal: selectedSignal?.name ?? props.trade.signal,
    playbook: journal.playbook.trim(),
    reason: journal.reason.trim(),
    beforeScreenshot: journal.beforeScreenshot,
    afterScreenshot: journal.afterScreenshot,
    mistakeTags: [...journal.mistakeTags],
    customMistakeTags: [...journal.customMistakeTags],
  })

  emit('submit', {
    tradeId: props.trade.id,
    followedPlan: form.followedPlan,
    followedPlaybook: form.followedPlaybook,
    respectedRisk: form.respectedRisk,
    waitedForConfirmation:
      form.waitedForConfirmation,
    avoidedNewsRisk: form.avoidedNewsRisk,
    emotionalControl: form.emotionalControl,
    executionScore: form.executionScore,
    strengths: form.strengths.trim(),
    mistakes: form.mistakes.trim(),
    improvement: form.improvement.trim(),
    nextTradeRule: form.nextTradeRule.trim(),
    summary: form.summary.trim(),
    totalScore: totalScore.value,
    completedAt: new Date().toISOString(),
  })

  resetForm()
  emit('close')
}

watch(
  [() => props.open, () => props.existingReview],
  ([isOpen]) => {
    if (isOpen) {
      loadForm()
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
        v-if="open && trade"
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
                FREEDOM TRADE JOURNAL
              </p>

              <h2
                class="mt-2 text-2xl font-semibold text-zinc-100"
              >
                {{ trade.symbol }} 交易復盤
              </h2>

              <p class="mt-1 text-sm text-zinc-500">
                {{ trade.date }} {{ trade.time }}
                ·
                {{
                  trade.direction === 'buy'
                    ? '多單'
                    : '空單'
                }}
                ·
                {{ trade.playbook }}
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
            @submit.prevent="submitReview"
          >
            <section
              class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
              <div
                class="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"
              >
                <p class="text-xs text-zinc-500">
                  交易結果
                </p>

                <p
                  class="mt-2 text-xl font-semibold"
                  :class="
                    trade.profitLoss > 0
                      ? 'text-emerald-300'
                      : trade.profitLoss < 0
                        ? 'text-rose-300'
                        : 'text-zinc-300'
                  "
                >
                  {{
                    trade.profitLoss > 0
                      ? '獲利'
                      : trade.profitLoss < 0
                        ? '虧損'
                        : '平手'
                  }}
                </p>
              </div>

              <div
                class="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"
              >
                <p class="text-xs text-zinc-500">
                  報酬倍數
                </p>

                <p
                  class="mt-2 text-xl font-semibold"
                  :class="
                    trade.rMultiple > 0
                      ? 'text-emerald-300'
                      : trade.rMultiple < 0
                        ? 'text-rose-300'
                        : 'text-zinc-300'
                  "
                >
                  {{ trade.rMultiple > 0 ? '+' : '' }}
                  {{ trade.rMultiple.toFixed(2) }}R
                </p>
              </div>

              <div
                class="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"
              >
                <p class="text-xs text-zinc-500">
                  使用策略
                </p>

                <p
                  class="mt-2 text-lg font-semibold text-amber-300"
                >
                  {{ trade.playbook }}
                </p>
              </div>

              <div
                class="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"
              >
                <p class="text-xs text-zinc-500">
                  目前評分
                </p>

                <p
                  class="mt-2 text-2xl font-semibold"
                  :class="scoreClasses"
                >
                  {{ totalScore }} 分
                </p>

                <p class="mt-1 text-xs text-zinc-500">
                  {{ scoreLabel }}
                </p>
              </div>
            </section>

            <section
              class="overflow-hidden rounded-3xl border border-sky-500/20 bg-sky-500/[0.04]"
            >
              <div class="border-b border-zinc-800 p-5">
                <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p class="text-[10px] font-medium uppercase tracking-[0.2em] text-sky-300/70">
                      Journal Context
                    </p>
                    <h3 class="mt-2 text-lg font-semibold text-zinc-100">
                      這筆單為什麼做？
                    </h3>
                    <p class="mt-1 text-sm leading-6 text-zinc-500">
                      MT5 已提供成交資料；這裡只補上你的交易決策與圖表證據，不修改 Broker 原始成交結果。
                    </p>
                  </div>

                  <div class="shrink-0 rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-right">
                    <p class="text-[10px] uppercase tracking-[0.16em] text-zinc-600">Evidence</p>
                    <p class="mt-1 text-lg font-semibold text-sky-300">{{ evidenceProgress }}%</p>
                    <p class="text-xs text-zinc-600">{{ evidenceCompletedCount }}/{{ evidenceItems.length }} 項</p>
                  </div>
                </div>

                <div class="mt-4 flex flex-wrap gap-2">
                  <span
                    v-for="item in evidenceItems"
                    :key="item.label"
                    class="rounded-full border px-2.5 py-1 text-xs"
                    :class="item.done
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                      : 'border-zinc-800 bg-zinc-950/50 text-zinc-600'"
                  >
                    {{ item.done ? '✓' : '○' }} {{ item.label }}
                  </span>
                </div>
              </div>

              <div class="space-y-5 p-5">
                <div class="grid gap-5 xl:grid-cols-2">
                  <TradeSignalSelect v-model="journal.signalId" />

                  <PlaybookSelect
                    v-model="journal.playbook"
                    :trade-direction="trade.direction"
                    include-paused
                    required
                  />
                </div>

                <label class="block">
                  <span class="text-sm font-medium text-zinc-300">當時的進場理由</span>
                  <textarea
                    v-model="journal.reason"
                    rows="4"
                    required
                    placeholder="例如：1H 支撐區反應，15M 結構轉強，1M 出現 W 型確認後進場。"
                    class="mt-2 w-full resize-y rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm leading-7 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-sky-500/40"
                  />
                </label>

                <TradeTagEditor
                  :model-value="journal.mistakeTags"
                  :custom-tags="journal.customMistakeTags"
                  @update:model-value="updateMistakeTags"
                  @update:custom-tags="updateCustomMistakeTags"
                />

                <div>
                  <div class="flex items-end justify-between gap-4">
                    <div>
                      <h4 class="font-medium text-zinc-200">圖表證據</h4>
                      <p class="mt-1 text-sm text-zinc-500">前後圖不是完成復盤的硬性條件，但有圖才能讓之後的 Review / AI 分析更有價值。</p>
                    </div>
                  </div>

                  <div class="mt-4 grid gap-5 xl:grid-cols-2">
                    <TradeScreenshotUploader
                      type="before"
                      :image-url="journal.beforeScreenshot?.dataUrl"
                      :storage-path="journal.beforeScreenshot?.storagePath"
                      @change="handleScreenshotChange"
                      @remove="handleScreenshotRemove"
                    />

                    <TradeScreenshotUploader
                      type="after"
                      :image-url="journal.afterScreenshot?.dataUrl"
                      :storage-path="journal.afterScreenshot?.storagePath"
                      @change="handleScreenshotChange"
                      @remove="handleScreenshotRemove"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section
              class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
            >
              <div
                class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h3
                    class="text-lg font-semibold text-zinc-100"
                  >
                    紀律檢查
                  </h3>

                  <p
                    class="mt-1 text-sm leading-6 text-zinc-500"
                  >
                    請依照實際執行情況回答，不要依照交易結果回答。
                  </p>
                </div>

                <div
                  class="rounded-full border border-zinc-700 bg-zinc-950/60 px-3 py-1 text-xs text-zinc-400"
                >
                  已完成
                  {{ completedChecklistCount }}
                  /
                  {{ checklistItems.length }}
                </div>
              </div>

              <div class="mt-5 space-y-3">
                <article
                  v-for="item in checklistItems"
                  :key="item.key"
                  class="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"
                >
                  <div
                    class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div class="min-w-0">
                      <p
                        class="font-medium text-zinc-200"
                      >
                        {{ item.title }}
                      </p>

                      <p
                        class="mt-1 text-sm leading-6 text-zinc-500"
                      >
                        {{ item.description }}
                      </p>
                    </div>

                    <div
                      class="grid shrink-0 grid-cols-2 gap-2"
                    >
                      <button
                        type="button"
                        class="rounded-xl border px-4 py-2 text-sm font-medium transition"
                        :class="
                          form[item.key] === true
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                            : 'border-zinc-700 bg-zinc-900 text-zinc-500 hover:border-emerald-500/30 hover:text-emerald-300'
                        "
                        @click="
                          setChecklistValue(
                            item.key,
                            true,
                          )
                        "
                      >
                        有做到
                      </button>

                      <button
                        type="button"
                        class="rounded-xl border px-4 py-2 text-sm font-medium transition"
                        :class="
                          form[item.key] === false
                            ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                            : 'border-zinc-700 bg-zinc-900 text-zinc-500 hover:border-rose-500/30 hover:text-rose-300'
                        "
                        @click="
                          setChecklistValue(
                            item.key,
                            false,
                          )
                        "
                      >
                        沒做到
                      </button>
                    </div>
                  </div>
                </article>
              </div>
            </section>

            <section
              class="grid gap-4 xl:grid-cols-2"
            >
              <label
                class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
              >
                <span
                  class="text-lg font-semibold text-zinc-100"
                >
                  情緒控制
                </span>

                <span
                  class="mt-1 block text-sm text-zinc-500"
                >
                  評估進場、持倉及離場期間的情緒穩定程度。
                </span>

                <div
                  class="mt-5 flex items-center gap-4"
                >
                  <input
                    v-model.number="
                      form.emotionalControl
                    "
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    class="w-full accent-amber-400"
                  />

                  <span
                    class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-xl font-semibold text-amber-300"
                  >
                    {{ form.emotionalControl }}
                  </span>
                </div>

                <div
                  class="mt-2 flex justify-between text-xs text-zinc-600"
                >
                  <span>情緒失控</span>
                  <span>非常穩定</span>
                </div>
              </label>

              <label
                class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
              >
                <span
                  class="text-lg font-semibold text-zinc-100"
                >
                  執行品質
                </span>

                <span
                  class="mt-1 block text-sm text-zinc-500"
                >
                  評估進場、停損、持倉管理與離場執行品質。
                </span>

                <div
                  class="mt-5 flex items-center gap-4"
                >
                  <input
                    v-model.number="
                      form.executionScore
                    "
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    class="w-full accent-amber-400"
                  />

                  <span
                    class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-xl font-semibold text-amber-300"
                  >
                    {{ form.executionScore }}
                  </span>
                </div>

                <div
                  class="mt-2 flex justify-between text-xs text-zinc-600"
                >
                  <span>執行混亂</span>
                  <span>完全按計畫</span>
                </div>
              </label>
            </section>

            <section
              class="grid gap-4 xl:grid-cols-2"
            >
              <label
                class="rounded-3xl border border-emerald-500/15 bg-emerald-500/5 p-5"
              >
                <span
                  class="text-lg font-semibold text-emerald-300"
                >
                  做得好的地方
                </span>

                <textarea
                  v-model="form.strengths"
                  rows="5"
                  required
                  placeholder="例如：耐心等待價格回踩支撐，沒有提前進場。"
                  class="mt-4 w-full resize-y rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm leading-7 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-emerald-500/40"
                />
              </label>

              <label
                class="rounded-3xl border border-rose-500/15 bg-rose-500/5 p-5"
              >
                <span
                  class="text-lg font-semibold text-rose-300"
                >
                  做錯的地方
                </span>

                <textarea
                  v-model="form.mistakes"
                  rows="5"
                  required
                  placeholder="例如：看到短線反應後太快進場，沒有等待結構完成。"
                  class="mt-4 w-full resize-y rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm leading-7 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-rose-500/40"
                />
              </label>
            </section>

            <label
              class="block rounded-3xl border border-amber-500/15 bg-amber-500/5 p-5"
            >
              <span
                class="text-lg font-semibold text-amber-300"
              >
                下一次如何改善
              </span>

              <textarea
                v-model="form.improvement"
                rows="5"
                required
                placeholder="寫下下一次遇到相同情況時，具體要採取的行動。"
                class="mt-4 w-full resize-y rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm leading-7 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-amber-500/40"
              />
            </label>

            <label
              class="block rounded-3xl border border-sky-500/20 bg-sky-500/5 p-5"
            >
              <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <span class="text-lg font-semibold text-sky-300">
                    下一筆唯一規則
                  </span>
                  <span class="mt-1 block text-sm text-zinc-500">
                    把這次學習濃縮成一句下次進場前能直接執行的規則。
                  </span>
                </div>
                <span class="text-[10px] font-medium uppercase tracking-[0.16em] text-sky-300/50">One rule</span>
              </div>

              <input
                v-model="form.nextTradeRule"
                type="text"
                maxlength="160"
                required
                placeholder="例如：15M 結構未確認以前，不因 1M W 型提前進場。"
                class="mt-4 w-full rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-sky-500/40"
              />
            </label>

            <label
              class="block rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
            >
              <span
                class="text-lg font-semibold text-zinc-100"
              >
                本次交易總結
              </span>

              <textarea
                v-model="form.summary"
                rows="5"
                required
                placeholder="用一段話總結這筆交易的核心學習。"
                class="mt-4 w-full resize-y rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm leading-7 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-amber-500/40"
              />
            </label>

            <section
              class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
            >
              <div
                class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p class="text-sm text-zinc-500">
                    復盤總分
                  </p>

                  <p
                    class="mt-2 text-4xl font-semibold"
                    :class="scoreClasses"
                  >
                    {{ totalScore }}
                    <span class="text-lg">／100</span>
                  </p>

                  <p class="mt-2 text-sm text-zinc-400">
                    {{ scoreLabel }}
                  </p>
                </div>

                <div
                  class="w-full max-w-sm"
                >
                  <div
                    class="h-3 overflow-hidden rounded-full bg-zinc-800"
                  >
                    <div
                      class="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 transition-all duration-500"
                      :style="{
                        width: `${totalScore}%`,
                      }"
                    />
                  </div>

                  <div
                    class="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-zinc-500"
                  >
                    <span>
                      紀律 {{ checklistScore }}
                    </span>

                    <span>
                      情緒 {{ emotionalScore }}
                    </span>

                    <span>
                      執行 {{ executionPoints }}
                    </span>
                  </div>
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
                稍後再填
              </button>

              <button
                type="submit"
                :disabled="!isValid"
                class="rounded-xl border border-amber-500/30 bg-amber-500/10 px-6 py-3 text-sm font-medium text-amber-300 transition hover:border-amber-400/50 hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-900 disabled:text-zinc-600"
              >
                {{ existingReview ? '更新 Journal' : '完成並儲存 Journal' }}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
