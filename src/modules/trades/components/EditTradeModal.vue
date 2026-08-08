<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'
import PlaybookSelect from './PlaybookSelect.vue'
import TradePositionSummary from './TradePositionSummary.vue'
import TradeScreenshotUploader from './TradeScreenshotUploader.vue'
import TradeTagEditor from './TradeTagEditor.vue'
import TradeSignalSelect from './TradeSignalSelect.vue'
import { calculateTradeMetrics } from '@/services/trade-calculation.service'
import { inferTradeExitReason } from '@/services/trade-lifecycle.service'
import { useAccountStore } from '@/stores/useAccountStore'
import { useTradeStore } from '@/stores/useTradeStore'
import { useSignalStore } from '@/stores/useSignalStore'

import type {
  TradeDirection,
  TradeMistakeTag,
  TradeRecord,
  TradeResult,
  TradeScreenshot,
} from '@/types/trade'

type ScreenshotType = 'before' | 'after'

interface ScreenshotChangeData {
  type: ScreenshotType
  name: string
  dataUrl: string
}

interface EditTradeForm {
  date: string
  time: string
  symbol: string
  direction: TradeDirection
  account: string
  signalId: string | null
  entryPrice: number | null
  exitPrice: number | null
  stopLoss: number | null
  takeProfit: number | null
  lotSize: number | null
  riskAmount: number | null
  profitLoss: number | null
  playbook: string
  reason: string
  beforeScreenshot: TradeScreenshot | null
  afterScreenshot: TradeScreenshot | null
  mistakeTags: TradeMistakeTag[]
  customMistakeTags: string[]
  isFavorite: boolean
}

const props = defineProps<{
  open: boolean
  trade: TradeRecord | null
}>()

const emit = defineEmits<{
  close: []
  submit: [
    tradeId: string,
    updates: Partial<TradeRecord>,
  ]
}>()

const accountStore = useAccountStore()
const tradeStore = useTradeStore()
const signalStore = useSignalStore()

const {
  sortedAccounts,
} = storeToRefs(accountStore)

const {
  accounts: recordedAccountNames,
} = storeToRefs(tradeStore)

const accountOptions = computed(() => {
  const names = new Set<string>()

  sortedAccounts.value.forEach(account => names.add(account.name))
  recordedAccountNames.value.forEach(name => names.add(name))

  if (props.trade?.account) names.add(props.trade.account)

  return [...names]
})

const createEmptyForm = (): EditTradeForm => ({
  date: '',
  time: '',
  symbol: '',
  direction: 'buy',
  account: '',
  signalId: null,
  entryPrice: null,
  exitPrice: null,
  stopLoss: null,
  takeProfit: null,
  lotSize: null,
  riskAmount: null,
  profitLoss: null,
  playbook: '',
  reason: '',
  beforeScreenshot: null,
  afterScreenshot: null,
  mistakeTags: [],
  customMistakeTags: [],
  isFavorite: false,
})

const form = reactive<EditTradeForm>(
  createEmptyForm(),
)

const tradeMetrics = computed(() =>
  calculateTradeMetrics({
    symbol: form.symbol,
    direction: form.direction,
    entryPrice: form.entryPrice,
    exitPrice: form.exitPrice,
    stopLoss: form.stopLoss,
    takeProfit: form.takeProfit,
    lotSize: form.lotSize,
  }),
)

const autoCalculationActive = computed(() =>
  tradeMetrics.value.supported &&
  form.lotSize !== null &&
  form.lotSize > 0,
)

const effectiveRiskAmount = computed(() =>
  autoCalculationActive.value
    ? tradeMetrics.value.riskAmount
    : form.riskAmount,
)

const effectiveProfitLoss = computed(() =>
  autoCalculationActive.value
    ? tradeMetrics.value.actualProfitLoss
    : form.profitLoss,
)

const result = computed<TradeResult>(() => {
  if (
    effectiveProfitLoss.value === null ||
    effectiveProfitLoss.value === 0
  ) {
    return 'breakeven'
  }

  return effectiveProfitLoss.value > 0
    ? 'win'
    : 'loss'
})

const rMultiple = computed(() => {
  if (autoCalculationActive.value) {
    return tradeMetrics.value.actualRMultiple ?? 0
  }

  if (
    form.profitLoss === null ||
    form.riskAmount === null ||
    form.riskAmount <= 0
  ) {
    return 0
  }

  return Number(
    (
      form.profitLoss /
      form.riskAmount
    ).toFixed(2),
  )
})

const isValid = computed(() => {
  return Boolean(
    form.date &&
      form.time &&
      form.symbol.trim() &&
      form.account.trim() &&
      form.entryPrice !== null &&
      effectiveRiskAmount.value !== null &&
      effectiveRiskAmount.value > 0 &&
      (!autoCalculationActive.value || tradeMetrics.value.stopLossValid) &&
      form.playbook.trim() &&
      form.reason.trim(),
  )
})

const loadTrade = (): void => {
  if (!props.trade) {
    Object.assign(
      form,
      createEmptyForm(),
    )

    return
  }

  const linkedAccount = sortedAccounts.value.find(
    account => account.id === props.trade?.accountId,
  )

  Object.assign(form, {
    date: props.trade.date,
    time: props.trade.time,
    symbol: props.trade.symbol,
    direction: props.trade.direction,
    account: linkedAccount?.name ?? props.trade.account,
    signalId:
      props.trade.signalId ??
      signalStore.sortedSignals.find(signal => signal.name === props.trade?.signal)?.id ??
      null,
    entryPrice: props.trade.entryPrice,
    exitPrice:
      props.trade.exitPrice || null,
    stopLoss:
      props.trade.stopLoss || null,
    takeProfit:
      props.trade.takeProfit || null,
    lotSize:
      props.trade.lotSize || null,
    riskAmount: props.trade.riskAmount,
    profitLoss: props.trade.profitLoss,
    playbook: props.trade.playbook,
    reason: props.trade.reason,
    beforeScreenshot:
      props.trade.beforeScreenshot
        ? { ...props.trade.beforeScreenshot }
        : null,
    afterScreenshot:
      props.trade.afterScreenshot
        ? { ...props.trade.afterScreenshot }
        : null,
    mistakeTags: [
      ...props.trade.mistakeTags,
    ],
    customMistakeTags: [
      ...props.trade.customMistakeTags,
    ],
    isFavorite: props.trade.isFavorite,
  })
}

const closeModal = (): void => {
  emit('close')
}

const handleScreenshotChange = (
  screenshot: ScreenshotChangeData,
): void => {
  const existingStoragePath = screenshot.type === 'before'
    ? form.beforeScreenshot?.storagePath
    : form.afterScreenshot?.storagePath
  const value: TradeScreenshot = {
    name: screenshot.name,
    dataUrl: screenshot.dataUrl,
    storagePath: existingStoragePath ?? null,
  }

  if (screenshot.type === 'before') {
    form.beforeScreenshot = value
    return
  }

  form.afterScreenshot = value
}

const handleScreenshotRemove = (
  type: ScreenshotType,
): void => {
  if (type === 'before') {
    form.beforeScreenshot = null
    return
  }

  form.afterScreenshot = null
}

const updateMistakeTags = (
  tags: TradeMistakeTag[],
): void => {
  form.mistakeTags = [...tags]
}

const updateCustomMistakeTags = (
  tags: string[],
): void => {
  form.customMistakeTags = [...tags]
}

const submitForm = (): void => {
  if (!props.trade || !isValid.value) {
    return
  }

  const managedAccount = sortedAccounts.value.find(
    account =>
      account.name.trim().toLowerCase() ===
      form.account.trim().toLowerCase(),
  )

  const isClosed = form.exitPrice !== null && form.exitPrice > 0
  const wasClosed = props.trade.positionStatus === 'closed'
  const now = new Date().toISOString()

  emit(
    'submit',
    props.trade.id,
    {
      date: form.date,
      time: form.time,
      symbol: form.symbol
        .trim()
        .toUpperCase(),
      direction: form.direction,
      signalId: form.signalId,
      signal: signalStore.getSignalById(form.signalId)?.name ?? props.trade.signal,
      result: result.value,
      positionStatus: isClosed ? 'closed' : 'open',
      exitReason: isClosed
        ? inferTradeExitReason(form.exitPrice, form.stopLoss, form.takeProfit)
        : null,
      closedAt: isClosed
        ? wasClosed
          ? props.trade.closedAt ?? now
          : now
        : null,
      status: isClosed
        ? wasClosed
          ? props.trade.status
          : 'waiting-review'
        : 'waiting-review',
      accountId: managedAccount?.id ?? null,
      account: form.account.trim(),
      entryPrice:
        form.entryPrice ?? 0,
      exitPrice:
        form.exitPrice ?? 0,
      stopLoss:
        form.stopLoss ?? 0,
      takeProfit:
        form.takeProfit ?? 0,
      lotSize:
        form.lotSize ?? 0,
      riskAmount:
        effectiveRiskAmount.value ?? 0,
      profitLoss:
        effectiveProfitLoss.value ?? 0,
      rMultiple: rMultiple.value,
      playbook:
        form.playbook.trim(),
      reason:
        form.reason.trim(),
      beforeScreenshot:
        form.beforeScreenshot,
      afterScreenshot:
        form.afterScreenshot,
      mistakeTags: [
        ...new Set(form.mistakeTags),
      ],
      customMistakeTags: [
        ...new Set(
          form.customMistakeTags
            .map(tag => tag.trim())
            .filter(Boolean),
        ),
      ],
      isFavorite: form.isFavorite,
    },
  )

  emit('close')
}

watch(
  [
    () => props.open,
    () => props.trade,
  ],
  ([isOpen]) => {
    if (isOpen) {
      loadTrade()
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
        v-if="open && trade"
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
                class="text-xs font-medium tracking-[0.2em] text-sky-400"
              >
                交易管理
              </p>

              <h2
                class="mt-2 text-2xl font-semibold text-zinc-100"
              >
                {{ trade.positionStatus === 'open' ? '管理持倉' : '編輯交易紀錄' }}
              </h2>

              <p
                class="mt-1 text-sm leading-6 text-zinc-500"
              >
                {{ trade.positionStatus === 'open' ? '補上實際離場價格後，系統會自動結算 P/L 與 R。' : '修改交易資料、截圖、錯誤標籤與收藏狀態。' }}
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
              class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
              <label>
                <span
                  class="text-sm font-medium text-zinc-300"
                >
                  日期
                </span>

                <input
                  v-model="form.date"
                  type="date"
                  required
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition focus:border-sky-500/40"
                />
              </label>

              <label>
                <span
                  class="text-sm font-medium text-zinc-300"
                >
                  時間
                </span>

                <input
                  v-model="form.time"
                  type="time"
                  required
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition focus:border-sky-500/40"
                />
              </label>

              <label>
                <span
                  class="text-sm font-medium text-zinc-300"
                >
                  交易商品
                </span>

                <input
                  v-model="form.symbol"
                  type="text"
                  required
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition focus:border-sky-500/40"
                />
              </label>

              <label>
                <span
                  class="text-sm font-medium text-zinc-300"
                >
                  交易帳戶
                </span>

                <select
                  v-model="form.account"
                  required
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition focus:border-sky-500/40"
                >
                  <option value="" disabled>尚未選擇帳戶</option>
                  <option
                    v-for="accountName in accountOptions"
                    :key="accountName"
                    :value="accountName"
                  >
                    {{ accountName }}
                  </option>
                </select>

                <RouterLink
                  to="/accounts"
                  class="mt-2 inline-flex text-xs text-sky-400 transition hover:text-sky-300"
                  @click="closeModal"
                >
                  管理交易帳戶
                </RouterLink>
              </label>
            </section>

            <section>
              <div
                class="flex items-center justify-between gap-4"
              >
                <p
                  class="text-sm font-medium text-zinc-300"
                >
                  交易方向
                </p>

                <button
                  type="button"
                  class="rounded-full border px-3 py-1 text-xs font-medium transition"
                  :class="
                    form.isFavorite
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                      : 'border-zinc-700 text-zinc-500 hover:border-amber-500/30 hover:text-amber-300'
                  "
                  @click="
                    form.isFavorite =
                      !form.isFavorite
                  "
                >
                  {{
                    form.isFavorite
                      ? '★ 已收藏'
                      : '☆ 加入收藏'
                  }}
                </button>
              </div>

              <div
                class="mt-3 grid grid-cols-2 gap-3"
              >
                <button
                  type="button"
                  class="rounded-2xl border p-4 text-left transition"
                  :class="
                    form.direction === 'buy'
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700'
                  "
                  @click="
                    form.direction = 'buy'
                  "
                >
                  <p class="font-semibold">
                    多單
                  </p>

                  <p class="mt-1 text-xs opacity-70">
                    預期價格上漲
                  </p>
                </button>

                <button
                  type="button"
                  class="rounded-2xl border p-4 text-left transition"
                  :class="
                    form.direction === 'sell'
                      ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700'
                  "
                  @click="
                    form.direction = 'sell'
                  "
                >
                  <p class="font-semibold">
                    空單
                  </p>

                  <p class="mt-1 text-xs opacity-70">
                    預期價格下跌
                  </p>
                </button>
              </div>
            </section>

            <section
              class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
            >
              <label>
                <span
                  class="text-sm font-medium text-zinc-300"
                >
                  進場價格
                </span>

                <input
                  v-model.number="form.entryPrice"
                  type="number"
                  step="0.01"
                  required
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition focus:border-sky-500/40"
                />
              </label>

              <label>
                <span
                  class="text-sm font-medium text-zinc-300"
                >
                  手數（倉位）
                </span>

                <input
                  v-model.number="form.lotSize"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.10"
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-sky-500/40"
                />

                <p class="mt-2 text-xs text-zinc-600">
                  舊紀錄可留空；填入後改由系統自動計算損益。
                </p>
              </label>

              <label>
                <span
                  class="text-sm font-medium text-zinc-300"
                >
                  實際離場價格
                </span>

                <input
                  v-model.number="form.exitPrice"
                  type="number"
                  step="0.01"
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition focus:border-sky-500/40"
                />
              </label>

              <label>
                <span
                  class="text-sm font-medium text-zinc-300"
                >
                  停損價格
                </span>

                <input
                  v-model.number="form.stopLoss"
                  type="number"
                  step="0.01"
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition focus:border-sky-500/40"
                />

                <p class="mt-2 text-xs text-zinc-600">
                  留空代表仍在持倉；填入後即完成平倉結算。
                </p>

                <p
                  v-if="autoCalculationActive && form.stopLoss !== null && !tradeMetrics.stopLossValid"
                  class="mt-2 text-xs text-rose-300"
                >
                  {{ form.direction === 'buy' ? '多單停損需低於進場價' : '空單停損需高於進場價' }}
                </p>
              </label>

              <label>
                <span
                  class="text-sm font-medium text-zinc-300"
                >
                  停利價格
                </span>

                <input
                  v-model.number="form.takeProfit"
                  type="number"
                  step="0.01"
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition focus:border-sky-500/40"
                />

                <p
                  v-if="autoCalculationActive && form.takeProfit !== null && !tradeMetrics.takeProfitValid"
                  class="mt-2 text-xs text-amber-300"
                >
                  {{ form.direction === 'buy' ? '多單停利通常需高於進場價' : '空單停利通常需低於進場價' }}
                </p>
              </label>
            </section>

            <TradePositionSummary
              v-if="autoCalculationActive"
              :metrics="tradeMetrics"
            />

            <section
              v-if="!autoCalculationActive"
              class="grid gap-4 sm:grid-cols-2"
            >
              <p class="sm:col-span-2 text-xs leading-5 text-zinc-600">
                這是舊交易或非 XAUUSD 商品，目前沿用原本手動風險／盈虧資料；填入 XAUUSD 手數後會啟用自動計算。
              </p>

              <label>
                <span
                  class="text-sm font-medium text-zinc-300"
                >
                  風險金額
                </span>

                <input
                  v-model.number="form.riskAmount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition focus:border-sky-500/40"
                />
              </label>

              <label>
                <span
                  class="text-sm font-medium text-zinc-300"
                >
                  交易盈虧
                </span>

                <input
                  v-model.number="form.profitLoss"
                  type="number"
                  step="0.01"
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition focus:border-sky-500/40"
                />
              </label>
            </section>

            <section
              class="grid gap-4 sm:grid-cols-2"
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
                    result === 'win'
                      ? 'text-emerald-300'
                      : result === 'loss'
                        ? 'text-rose-300'
                        : 'text-zinc-300'
                  "
                >
                  {{
                    form.exitPrice === null && autoCalculationActive
                      ? '尚未離場'
                      : result === 'win'
                      ? '獲利'
                      : result === 'loss'
                        ? '虧損'
                        : '平手'
                  }}
                </p>
              </div>

              <div
                class="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"
              >
                <p class="text-xs text-zinc-500">
                  實際 R 倍數（盈虧 ÷ 初始風險）
                </p>

                <p
                  class="mt-2 text-xl font-semibold"
                  :class="
                    rMultiple > 0
                      ? 'text-emerald-300'
                      : rMultiple < 0
                        ? 'text-rose-300'
                        : 'text-zinc-300'
                  "
                >
                  {{ rMultiple > 0 ? '+' : '' }}
                  {{ rMultiple.toFixed(2) }}R
                </p>
              </div>
            </section>

            <PlaybookSelect
              v-model="form.playbook"
              :trade-direction="form.direction"
              include-paused
              required
            />

            <TradeSignalSelect v-model="form.signalId" />

            <label class="block">
              <span
                class="text-sm font-medium text-zinc-300"
              >
                進場理由
              </span>

              <textarea
                v-model="form.reason"
                rows="5"
                required
                class="mt-2 w-full resize-y rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm leading-7 text-zinc-100 outline-none transition focus:border-sky-500/40"
              />
            </label>

            <TradeTagEditor
              :model-value="form.mistakeTags"
              :custom-tags="
                form.customMistakeTags
              "
              @update:model-value="
                updateMistakeTags
              "
              @update:custom-tags="
                updateCustomMistakeTags
              "
            />

            <section>
              <div>
                <h3
                  class="text-lg font-semibold text-zinc-100"
                >
                  交易圖表
                </h3>

                <p
                  class="mt-1 text-sm leading-6 text-zinc-500"
                >
                  修改交易前與交易後的圖表截圖。
                </p>
              </div>

              <div
                class="mt-5 grid gap-5 xl:grid-cols-2"
              >
                <TradeScreenshotUploader
                  type="before"
                  :image-url="
                    form.beforeScreenshot
                      ?.dataUrl
                  "
                  :storage-path="form.beforeScreenshot?.storagePath"
                  @change="
                    handleScreenshotChange
                  "
                  @remove="
                    handleScreenshotRemove
                  "
                />

                <TradeScreenshotUploader
                  type="after"
                  :image-url="
                    form.afterScreenshot
                      ?.dataUrl
                  "
                  :storage-path="form.afterScreenshot?.storagePath"
                  @change="
                    handleScreenshotChange
                  "
                  @remove="
                    handleScreenshotRemove
                  "
                />
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
                class="rounded-xl border border-sky-500/30 bg-sky-500/10 px-6 py-3 text-sm font-medium text-sky-300 transition hover:border-sky-400/50 hover:bg-sky-500/15 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-900 disabled:text-zinc-600"
              >
                {{
                  trade.positionStatus === 'open'
                    ? form.exitPrice !== null && form.exitPrice > 0
                      ? '確認平倉'
                      : '更新持倉'
                    : '儲存修改'
                }}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
