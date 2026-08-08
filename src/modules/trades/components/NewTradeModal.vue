<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'

import PlaybookSelect from './PlaybookSelect.vue'
import TradeScreenshotUploader from './TradeScreenshotUploader.vue'
import TradePositionSummary from './TradePositionSummary.vue'
import TradingRiskStatusCard from './TradingRiskStatusCard.vue'
import TradeSignalSelect from './TradeSignalSelect.vue'
import PreTradePlanGuard from './PreTradePlanGuard.vue'
import { calculateTradeMetrics } from '@/services/trade-calculation.service'
import { evaluateTradingRisk } from '@/services/trading-risk.service'
import { useAccountStore } from '@/stores/useAccountStore'
import { useTradeStore } from '@/stores/useTradeStore'
import { useTradingRiskStore } from '@/stores/useTradingRiskStore'
import { useSignalStore } from '@/stores/useSignalStore'
import { formatCurrency } from '@/services'
import type {
  NewTradeInput,
  TradeDirection,
  TradeResult,
  TradeScreenshot,
} from '@/types/trade'

type ScreenshotType = 'before' | 'after'

interface ScreenshotChangeData {
  type: ScreenshotType
  name: string
  dataUrl: string
}

interface TradeFormData {
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
}

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: [trade: NewTradeInput]
}>()

const accountStore = useAccountStore()
const tradeStore = useTradeStore()
const tradingRiskStore = useTradingRiskStore()
const signalStore = useSignalStore()

const {
  activeAccounts,
} = storeToRefs(accountStore)

const {
  accounts: recordedAccountNames,
} = storeToRefs(tradeStore)

const {
  settings,
  todaySummary,
} = storeToRefs(tradingRiskStore)

const risk = computed(() =>
  evaluateTradingRisk(
    settings.value,
    todaySummary.value,
  ),
)

const canTrade = computed(
  () => risk.value.canTrade,
)

const stopReason = computed(
  () => risk.value.stopReason,
)

const accountOptions = computed(() => {
  const managed = activeAccounts.value.map(account => ({
    id: account.id,
    name: account.name,
    managed: true,
  }))
  const managedNames = new Set(
    managed.map(account => account.name.toLowerCase()),
  )
  const legacy = recordedAccountNames.value
    .filter(name => !managedNames.has(name.toLowerCase()))
    .map(name => ({
      id: null,
      name,
      managed: false,
    }))

  return [...managed, ...legacy]
})

const getCurrentDate = (): string => {
  const now = new Date()

  const year = now.getFullYear()

  const month = String(
    now.getMonth() + 1,
  ).padStart(2, '0')

  const day = String(
    now.getDate(),
  ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const getCurrentTime = (): string => {
  const now = new Date()

  const hour = String(
    now.getHours(),
  ).padStart(2, '0')

  const minute = String(
    now.getMinutes(),
  ).padStart(2, '0')

  return `${hour}:${minute}`
}

const createInitialForm = (): TradeFormData => ({
  date: getCurrentDate(),
  time: getCurrentTime(),
  symbol: 'XAUUSD',
  direction: 'buy',
  account: accountOptions.value[0]?.name ?? '',
  signalId: null,
  entryPrice: null,
  exitPrice: null,
  stopLoss: null,
  takeProfit: null,
  lotSize: null,
  riskAmount: Math.min(
    100,
    settings.value.maxRiskPerTrade,
  ),
  profitLoss: null,
  playbook: '',
  reason: '',
  beforeScreenshot: null,
  afterScreenshot: null,
})

const form = reactive<TradeFormData>(
  createInitialForm(),
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

const effectiveRiskAmount = computed(() =>
  tradeMetrics.value.supported
    ? tradeMetrics.value.riskAmount
    : form.riskAmount,
)

const effectiveProfitLoss = computed(() =>
  tradeMetrics.value.supported
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
  if (tradeMetrics.value.supported) {
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

const riskAmountExceeded = computed(() => {
  if (effectiveRiskAmount.value === null) {
    return false
  }

  return (
    effectiveRiskAmount.value >
    settings.value.maxRiskPerTrade
  )
})

const baseFormValid = computed(() => {
  return Boolean(
    form.date &&
      form.time &&
      form.symbol.trim() &&
      form.account.trim() &&
      form.entryPrice !== null &&
      form.lotSize !== null &&
      form.lotSize > 0 &&
      effectiveRiskAmount.value !== null &&
      effectiveRiskAmount.value > 0 &&
      form.playbook.trim() &&
      form.reason.trim(),
  )
})

const isValid = computed(() => {
  return (
    baseFormValid.value &&
    risk.value.canTrade &&
    !riskAmountExceeded.value
  )
})

const blockingReason = computed(() => {
  if (!risk.value.canTrade) {
    return (
      risk.value.stopReason ||
      '今日已觸發交易風控限制。'
    )
  }

  if (riskAmountExceeded.value) {
    return `單筆風險不能超過 ${formatCurrency(
      settings.value.maxRiskPerTrade,
    )}。`
  }

  if (!form.date) {
    return '請選擇交易日期。'
  }

  if (!form.time) {
    return '請選擇交易時間。'
  }

  if (!form.symbol.trim()) {
    return '請輸入交易商品。'
  }

  if (!form.account.trim()) {
    return '請選擇或輸入交易帳戶。'
  }

  if (form.entryPrice === null) {
    return '請輸入進場價格。'
  }

  if (
    form.lotSize === null ||
    form.lotSize <= 0
  ) {
    return '請輸入大於 0 的手數（倉位）。'
  }

  if (
    tradeMetrics.value.supported &&
    !tradeMetrics.value.stopLossValid
  ) {
    return form.direction === 'buy'
      ? '多單停損必須低於進場價格。'
      : '空單停損必須高於進場價格。'
  }

  if (
    effectiveRiskAmount.value === null ||
    effectiveRiskAmount.value <= 0
  ) {
    return '風險金額必須大於 0。'
  }

  if (!form.playbook.trim()) {
    return '請選擇交易策略。'
  }

  if (!form.reason.trim()) {
    return '請填寫進場理由。'
  }

  return ''
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

const handleScreenshotChange = (
  screenshot: ScreenshotChangeData,
): void => {
  const value: TradeScreenshot = {
    name: screenshot.name,
    dataUrl: screenshot.dataUrl,
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

const submitForm = (): void => {
  if (!isValid.value) {
    return
  }

  const managedAccount = activeAccounts.value.find(
    account =>
      account.name.trim().toLowerCase() ===
      form.account.trim().toLowerCase(),
  )

  emit('submit', {
    date: form.date,
    time: form.time,
    symbol: form.symbol
      .trim()
      .toUpperCase(),
    direction: form.direction,
    signalId: form.signalId,
    signal: signalStore.getSignalById(form.signalId)?.name ?? '',
    accountId: managedAccount?.id ?? null,
    account: form.account.trim(),
    entryPrice: form.entryPrice,
    exitPrice: form.exitPrice,
    stopLoss: form.stopLoss,
    takeProfit: form.takeProfit,
    lotSize: form.lotSize,
    riskAmount: effectiveRiskAmount.value,
    profitLoss: effectiveProfitLoss.value,
    playbook: form.playbook.trim(),
    reason: form.reason.trim(),
    result: result.value,
    rMultiple: rMultiple.value,
    beforeScreenshot:
      form.beforeScreenshot,
    afterScreenshot:
      form.afterScreenshot,
    mistakeTags: [],
    customMistakeTags: [],
    isFavorite: false,
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
          class="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60"
        >
          <header
            class="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-zinc-800 bg-zinc-950/95 p-6 backdrop-blur"
          >
            <div>
              <p
                class="text-xs font-medium tracking-[0.2em] text-amber-400"
              >
                交易紀錄
              </p>

              <h2
                class="mt-2 text-2xl font-semibold text-zinc-100"
              >
                新增交易
              </h2>

              <p
                class="mt-1 text-sm leading-6 text-zinc-500"
              >
                新增前必須先通過今日交易風控限制。
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
            <TradingRiskStatusCard />

            <PreTradePlanGuard
              :direction="form.direction"
              :signal-id="form.signalId"
            />

            <section
              v-if="!canTrade"
              class="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6"
            >
              <p
                class="text-xs font-medium tracking-[0.18em] text-rose-400"
              >
                交易已鎖定
              </p>

              <h3
                class="mt-2 text-xl font-semibold text-rose-300"
              >
                {{ stopReason || '今日不可再新增交易' }}
              </h3>

              <p
                class="mt-3 text-sm leading-7 text-rose-200/70"
              >
                請停止下單並完成今日交易復盤。系統不允許透過此視窗建立新的交易紀錄。
              </p>
            </section>

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
                  :disabled="!canTrade"
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition focus:border-amber-500/40 disabled:cursor-not-allowed disabled:opacity-50"
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
                  :disabled="!canTrade"
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition focus:border-amber-500/40 disabled:cursor-not-allowed disabled:opacity-50"
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
                  :disabled="!canTrade"
                  placeholder="XAUUSD"
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-amber-500/40 disabled:cursor-not-allowed disabled:opacity-50"
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
                  :disabled="!canTrade"
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition focus:border-amber-500/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" disabled>
                    尚未選擇帳戶
                  </option>

                  <option
                    v-for="option in accountOptions"
                    :key="`${option.id ?? 'legacy'}-${option.name}`"
                    :value="option.name"
                  >
                    {{ option.name }}{{ option.managed ? '' : '（舊紀錄）' }}
                  </option>
                </select>

                <RouterLink
                  to="/accounts"
                  class="mt-2 inline-flex text-xs text-sky-400 transition hover:text-sky-300"
                  @click="closeModal"
                >
                  {{ activeAccounts.length ? '管理交易帳戶' : '先建立 FTMO、模擬倉或真倉帳戶' }}
                </RouterLink>
              </label>
            </section>

            <section>
              <p
                class="text-sm font-medium text-zinc-300"
              >
                交易方向
              </p>

              <div
                class="mt-3 grid grid-cols-2 gap-3"
              >
                <button
                  type="button"
                  :disabled="!canTrade"
                  class="rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50"
                  :class="
                    form.direction === 'buy'
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700'
                  "
                  @click="form.direction = 'buy'"
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
                  :disabled="!canTrade"
                  class="rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50"
                  :class="
                    form.direction === 'sell'
                      ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700'
                  "
                  @click="form.direction = 'sell'"
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
                  :disabled="!canTrade"
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition focus:border-amber-500/40 disabled:cursor-not-allowed disabled:opacity-50"
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
                  required
                  :disabled="!canTrade"
                  placeholder="0.10"
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-amber-500/40 disabled:cursor-not-allowed disabled:opacity-50"
                />
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
                  :disabled="!canTrade"
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition focus:border-amber-500/40 disabled:cursor-not-allowed disabled:opacity-50"
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
                  :disabled="!canTrade"
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition focus:border-amber-500/40 disabled:cursor-not-allowed disabled:opacity-50"
                />

                <p class="mt-2 text-xs text-zinc-600">
                  可留空；交易會先建立為「持倉中」，之後再補實際離場價。
                </p>

                <p
                  v-if="form.stopLoss !== null && form.entryPrice !== null && tradeMetrics.supported && !tradeMetrics.stopLossValid"
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
                  :disabled="!canTrade"
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition focus:border-amber-500/40 disabled:cursor-not-allowed disabled:opacity-50"
                />

                <p
                  v-if="form.takeProfit !== null && form.entryPrice !== null && tradeMetrics.supported && !tradeMetrics.takeProfitValid"
                  class="mt-2 text-xs text-amber-300"
                >
                  {{ form.direction === 'buy' ? '多單停利通常需高於進場價' : '空單停利通常需低於進場價' }}
                </p>
              </label>
            </section>

            <TradePositionSummary
              v-if="tradeMetrics.supported"
              :metrics="tradeMetrics"
              :risk-limit-exceeded="riskAmountExceeded"
            />

            <section
              v-else
              class="grid gap-4 sm:grid-cols-2"
            >
              <p class="sm:col-span-2 text-xs leading-5 text-amber-300">
                目前自動倉位損益計算以 XAUUSD 為主；其他商品維持手動輸入風險與盈虧，避免套用錯誤合約規格。
              </p>

              <label>
                <span
                  class="text-sm font-medium text-zinc-300"
                >
                  風險金額
                </span>

                <div class="relative mt-2">
                  <span
                    class="pointer-events-none absolute inset-y-0 left-4 flex items-center text-zinc-600"
                  >
                    $
                  </span>

                  <input
                    v-model.number="form.riskAmount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    :disabled="!canTrade"
                    class="w-full rounded-xl border bg-zinc-900 py-3 pl-8 pr-4 text-zinc-100 outline-none transition disabled:cursor-not-allowed disabled:opacity-50"
                    :class="
                      riskAmountExceeded
                        ? 'border-rose-500/50 focus:border-rose-500'
                        : 'border-zinc-800 focus:border-amber-500/40'
                    "
                  />
                </div>

                <p
                  class="mt-2 text-xs"
                  :class="
                    riskAmountExceeded
                      ? 'text-rose-300'
                      : 'text-zinc-600'
                  "
                >
                  單筆風險上限：
                  {{
                    formatCurrency(
                      settings.maxRiskPerTrade,
                    )
                  }}
                </p>
              </label>

              <label>
                <span
                  class="text-sm font-medium text-zinc-300"
                >
                  交易盈虧
                </span>

                <div class="relative mt-2">
                  <span
                    class="pointer-events-none absolute inset-y-0 left-4 flex items-center text-zinc-600"
                  >
                    $
                  </span>

                  <input
                    v-model.number="form.profitLoss"
                    type="number"
                    step="0.01"
                    :disabled="!canTrade"
                    class="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-3 pl-8 pr-4 text-zinc-100 outline-none transition focus:border-amber-500/40 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
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
                    form.exitPrice === null && tradeMetrics.supported
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

            <div
              :class="
                !canTrade
                  ? 'pointer-events-none opacity-50'
                  : ''
              "
            >
            <PlaybookSelect
              v-model="form.playbook"
                :trade-direction="form.direction"
                required
            />

            <TradeSignalSelect
              v-model="form.signalId"
              :disabled="!canTrade"
            />
            </div>

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
                :disabled="!canTrade"
                placeholder="記錄多週期結構、支撐壓力、確認訊號與進場邏輯。"
                class="mt-2 w-full resize-y rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm leading-7 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-amber-500/40 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </label>

            <section
              :class="
                !canTrade
                  ? 'pointer-events-none opacity-50'
                  : ''
              "
            >
              <div>
                <h3
                  class="text-lg font-semibold text-zinc-100"
                >
                  交易圖表截圖
                </h3>

                <p
                  class="mt-1 text-sm leading-6 text-zinc-500"
                >
                  登入 Freedom Cloud 後會安全上傳 Private Storage；離線時先保留本機，恢復連線後自動同步。
                </p>
              </div>

              <div
                class="mt-5 grid gap-5 xl:grid-cols-2"
              >
                <TradeScreenshotUploader
                  type="before"
                  :image-url="
                    form.beforeScreenshot?.dataUrl
                  "
                  @change="handleScreenshotChange"
                  @remove="handleScreenshotRemove"
                />

                <TradeScreenshotUploader
                  type="after"
                  :image-url="
                    form.afterScreenshot?.dataUrl
                  "
                  @change="handleScreenshotChange"
                  @remove="handleScreenshotRemove"
                />
              </div>
            </section>

            <div
              v-if="blockingReason"
              class="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4"
            >
              <p
                class="text-sm font-medium text-rose-300"
              >
                無法儲存交易
              </p>

              <p
                class="mt-2 text-sm leading-6 text-rose-200/70"
              >
                {{ blockingReason }}
              </p>
            </div>

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
                {{
                  canTrade
                    ? form.exitPrice !== null && form.exitPrice > 0
                      ? '儲存已平倉交易'
                      : '建立持倉'
                    : '今日交易已鎖定'
                }}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
