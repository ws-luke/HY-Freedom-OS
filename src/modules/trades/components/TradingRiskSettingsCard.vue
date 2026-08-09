<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { storeToRefs } from 'pinia'

import {
  useTradingRiskStore,
  type TradingRiskSettings,
} from '@/stores/useTradingRiskStore'
import { useConfirmDialogStore } from '@/stores/useConfirmDialogStore'

const tradingRiskStore = useTradingRiskStore()
const confirmDialog = useConfirmDialogStore()

const {
  settings,
  todaySummary,
  canTrade,
  stopReason,
} = storeToRefs(tradingRiskStore)

interface SettingsForm {
  maxTradesPerDay: number
  maxDailyLoss: number
  maxConsecutiveLosses: number
  maxRiskPerTrade: number
}

const form = reactive<SettingsForm>({
  maxTradesPerDay: settings.value.maxTradesPerDay,
  maxDailyLoss: Math.abs(settings.value.maxDailyLoss),
  maxConsecutiveLosses:
    settings.value.maxConsecutiveLosses,
  maxRiskPerTrade: settings.value.maxRiskPerTrade,
})

const successMessage = reactive({
  visible: false,
  text: '',
})

let successTimer: number | undefined

const hasChanges = computed(() => {
  return (
    form.maxTradesPerDay !==
      settings.value.maxTradesPerDay ||
    -Math.abs(form.maxDailyLoss) !==
      settings.value.maxDailyLoss ||
    form.maxConsecutiveLosses !==
      settings.value.maxConsecutiveLosses ||
    form.maxRiskPerTrade !==
      settings.value.maxRiskPerTrade
  )
})

const isValid = computed(() => {
  return Boolean(
    Number.isFinite(form.maxTradesPerDay) &&
      form.maxTradesPerDay >= 1 &&
      Number.isFinite(form.maxDailyLoss) &&
      form.maxDailyLoss > 0 &&
      Number.isFinite(form.maxConsecutiveLosses) &&
      form.maxConsecutiveLosses >= 1 &&
      Number.isFinite(form.maxRiskPerTrade) &&
      form.maxRiskPerTrade > 0,
  )
})

const validationMessage = computed(() => {
  if (
    !Number.isFinite(form.maxTradesPerDay) ||
    form.maxTradesPerDay < 1
  ) {
    return '每日最大交易次數至少必須為 1。'
  }

  if (
    !Number.isFinite(form.maxDailyLoss) ||
    form.maxDailyLoss <= 0
  ) {
    return '每日最大虧損必須大於 0。'
  }

  if (
    !Number.isFinite(form.maxConsecutiveLosses) ||
    form.maxConsecutiveLosses < 1
  ) {
    return '最大連敗次數至少必須為 1。'
  }

  if (
    !Number.isFinite(form.maxRiskPerTrade) ||
    form.maxRiskPerTrade <= 0
  ) {
    return '單筆最大風險必須大於 0。'
  }

  return ''
})

const formatMoney = (
  value: number,
): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)

const showSuccess = (
  message: string,
): void => {
  successMessage.visible = true
  successMessage.text = message

  if (successTimer) {
    window.clearTimeout(successTimer)
  }

  successTimer = window.setTimeout(() => {
    successMessage.visible = false
    successMessage.text = ''
  }, 3000)
}

const loadSettingsIntoForm = (): void => {
  form.maxTradesPerDay =
    settings.value.maxTradesPerDay

  form.maxDailyLoss = Math.abs(
    settings.value.maxDailyLoss,
  )

  form.maxConsecutiveLosses =
    settings.value.maxConsecutiveLosses

  form.maxRiskPerTrade =
    settings.value.maxRiskPerTrade
}

const saveSettings = (): void => {
  if (!isValid.value) {
    return
  }

  const nextSettings: Partial<TradingRiskSettings> = {
    maxTradesPerDay:
      Math.round(form.maxTradesPerDay),

    maxDailyLoss:
      -Math.abs(form.maxDailyLoss),

    maxConsecutiveLosses:
      Math.round(
        form.maxConsecutiveLosses,
      ),

    maxRiskPerTrade:
      Number(
        form.maxRiskPerTrade.toFixed(2),
      ),
  }

  tradingRiskStore.updateSettings(
    nextSettings,
  )

  loadSettingsIntoForm()

  showSuccess('交易風控設定已儲存。')
}

const resetForm = (): void => {
  loadSettingsIntoForm()
}

const resetToDefaults = async (): Promise<void> => {
  const confirmed = await confirmDialog.ask({
    title: '恢復預設風控設定？',
    message: '目前自訂的風險限制將被預設值取代。',
    confirmLabel: '恢復預設值',
    tone: 'danger',
  })

  if (!confirmed) {
    return
  }

  tradingRiskStore.resetSettings()
  loadSettingsIntoForm()

  showSuccess('交易風控設定已恢復預設值。')
}

watch(
  settings,
  () => {
    if (!hasChanges.value) {
      loadSettingsIntoForm()
    }
  },
  {
    deep: true,
  },
)
</script>

<template>
  <section
    class="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl shadow-black/10"
  >
    <div
      class="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-rose-500/10 blur-3xl"
    />

    <div class="relative">
      <header
        class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
      >
        <div>
          <p
            class="text-xs font-medium tracking-[0.2em] text-rose-400"
          >
            風險管理
          </p>

          <h2
            class="mt-2 text-xl font-semibold text-zinc-100"
          >
            交易風控設定
          </h2>

          <p
            class="mt-1 max-w-3xl text-sm leading-6 text-zinc-500"
          >
            設定每日交易次數、每日最大虧損、最大連敗與單筆風險限制。
          </p>
        </div>

        <span
          class="rounded-full border px-3 py-1.5 text-xs font-medium"
          :class="
            canTrade
              ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
              : 'border-rose-500/25 bg-rose-500/10 text-rose-300'
          "
        >
          {{
            canTrade
              ? '目前允許交易'
              : '目前停止交易'
          }}
        </span>
      </header>

      <div
        v-if="!canTrade"
        class="mt-5 rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4"
      >
        <p class="font-semibold text-rose-300">
          {{ stopReason || '今日已觸發風控限制' }}
        </p>

        <p
          class="mt-2 text-sm leading-6 text-rose-200/70"
        >
          修改限制後，系統會立即重新判斷今日是否允許交易。
        </p>
      </div>

      <form
        class="mt-6 space-y-6"
        @submit.prevent="saveSettings"
      >
        <div
          class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <label
            class="rounded-2xl border border-zinc-800 bg-zinc-950/55 p-4"
          >
            <span
              class="text-sm font-medium text-zinc-300"
            >
              每日最大交易次數
            </span>

            <input
              v-model.number="form.maxTradesPerDay"
              type="number"
              min="1"
              step="1"
              class="mt-3 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition focus:border-rose-500/40"
            />

            <p
              class="mt-2 text-xs leading-5 text-zinc-600"
            >
              今日目前已交易
              {{ todaySummary.trades }} 筆。
            </p>
          </label>

          <label
            class="rounded-2xl border border-zinc-800 bg-zinc-950/55 p-4"
          >
            <span
              class="text-sm font-medium text-zinc-300"
            >
              每日最大虧損
            </span>

            <div class="relative mt-3">
              <span
                class="pointer-events-none absolute inset-y-0 left-4 flex items-center text-zinc-600"
              >
                $
              </span>

              <input
                v-model.number="form.maxDailyLoss"
                type="number"
                min="0.01"
                step="0.01"
                class="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-3 pl-8 pr-4 text-zinc-100 outline-none transition focus:border-rose-500/40"
              />
            </div>

            <p
              class="mt-2 text-xs leading-5 text-zinc-600"
            >
              今日盈虧：
              {{ formatMoney(todaySummary.totalPnL) }}
            </p>
          </label>

          <label
            class="rounded-2xl border border-zinc-800 bg-zinc-950/55 p-4"
          >
            <span
              class="text-sm font-medium text-zinc-300"
            >
              最大連續虧損
            </span>

            <input
              v-model.number="
                form.maxConsecutiveLosses
              "
              type="number"
              min="1"
              step="1"
              class="mt-3 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition focus:border-rose-500/40"
            />

            <p
              class="mt-2 text-xs leading-5 text-zinc-600"
            >
              目前連敗
              {{ todaySummary.consecutiveLosses }}
              筆。
            </p>
          </label>

          <label
            class="rounded-2xl border border-zinc-800 bg-zinc-950/55 p-4"
          >
            <span
              class="text-sm font-medium text-zinc-300"
            >
              單筆最大風險
            </span>

            <div class="relative mt-3">
              <span
                class="pointer-events-none absolute inset-y-0 left-4 flex items-center text-zinc-600"
              >
                $
              </span>

              <input
                v-model.number="form.maxRiskPerTrade"
                type="number"
                min="0.01"
                step="0.01"
                class="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-3 pl-8 pr-4 text-zinc-100 outline-none transition focus:border-rose-500/40"
              />
            </div>

            <p
              class="mt-2 text-xs leading-5 text-zinc-600"
            >
              今日最大使用風險：
              {{
                formatMoney(
                  todaySummary.maxRiskUsed,
                )
              }}
            </p>
          </label>
        </div>

        <div
          v-if="validationMessage"
          class="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4"
        >
          <p class="text-sm text-rose-300">
            {{ validationMessage }}
          </p>
        </div>

        <div
          v-if="successMessage.visible"
          class="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4"
        >
          <p class="text-sm text-emerald-300">
            {{ successMessage.text }}
          </p>
        </div>

        <div
          class="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4"
        >
          <p
            class="text-sm leading-6 text-amber-200/70"
          >
            每日最大虧損在系統內會以負數儲存。例如輸入 300，代表今日盈虧到達 -$300 時停止交易。
          </p>
        </div>

        <footer
          class="flex flex-col-reverse gap-3 border-t border-zinc-800 pt-6 sm:flex-row sm:items-center sm:justify-between"
        >
          <button
            type="button"
            class="rounded-xl border border-rose-500/20 px-4 py-2.5 text-sm text-rose-300 transition hover:border-rose-500/40 hover:bg-rose-500/10"
            @click="resetToDefaults"
          >
            恢復預設值
          </button>

          <div
            class="flex flex-col gap-3 sm:flex-row"
          >
            <button
              type="button"
              :disabled="!hasChanges"
              class="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
              @click="resetForm"
            >
              放棄修改
            </button>

            <button
              type="submit"
              :disabled="
                !hasChanges || !isValid
              "
              class="rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 py-2.5 text-sm font-medium text-rose-300 transition hover:border-rose-400/50 hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-900 disabled:text-zinc-600"
            >
              儲存風控設定
            </button>
          </div>
        </footer>
      </form>
    </div>
  </section>
</template>
