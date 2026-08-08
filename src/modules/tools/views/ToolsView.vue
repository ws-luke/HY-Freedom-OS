<script setup lang="ts">
import { computed, reactive } from 'vue'
import { storeToRefs } from 'pinia'

import {
  calculatePositionSize,
  calculateTradeMetrics,
} from '@/services/trade-calculation.service'
import { useAccountStore } from '@/stores/useAccountStore'
import { useTradingRiskStore } from '@/stores/useTradingRiskStore'
import type { TradeDirection } from '@/types/trade'

const accountStore = useAccountStore()
const riskStore = useTradingRiskStore()
const { activeAccounts } = storeToRefs(accountStore)
const { settings } = storeToRefs(riskStore)

interface PositionForm {
  accountId: string
  direction: TradeDirection
  entryPrice: number | null
  stopLoss: number | null
  takeProfit: number | null
  riskAmount: number | null
}

const position = reactive<PositionForm>({
  accountId: '',
  direction: 'buy',
  entryPrice: null,
  stopLoss: null,
  takeProfit: null,
  riskAmount: settings.value.maxRiskPerTrade,
})

const selectedAccount = computed(() =>
  activeAccounts.value.find(
    account => account.id === position.accountId,
  ) ?? null,
)

const positionSizing = computed(() =>
  calculatePositionSize(
    'XAUUSD',
    position.direction,
    position.entryPrice,
    position.stopLoss,
    position.riskAmount,
  ),
)

const positionMetrics = computed(() =>
  calculateTradeMetrics({
    symbol: 'XAUUSD',
    direction: position.direction,
    entryPrice: position.entryPrice,
    exitPrice: null,
    stopLoss: position.stopLoss,
    takeProfit: position.takeProfit,
    lotSize: positionSizing.value.lotSize,
  }),
)

const accountRiskPercent = computed(() => {
  const equity = selectedAccount.value?.equity ?? 0
  const riskAmount = position.riskAmount ?? 0
  return equity > 0
    ? (riskAmount / equity) * 100
    : null
})

const riskLimitExceeded = computed(() =>
  (position.riskAmount ?? 0) > settings.value.maxRiskPerTrade,
)

const targetPrice = (rMultiple: number): number | null => {
  const entry = position.entryPrice
  const distance = positionSizing.value.stopDistance

  if (entry === null || distance === null) return null

  const direction = position.direction === 'buy' ? 1 : -1
  return Number(
    (entry + direction * distance * rMultiple).toFixed(2),
  )
}

const applyRiskPercent = (percent: number): void => {
  const equity = selectedAccount.value?.equity ?? 0
  if (equity <= 0) return

  position.riskAmount = Number(
    (equity * (percent / 100)).toFixed(2),
  )
}

const useRiskLimit = (): void => {
  position.riskAmount = settings.value.maxRiskPerTrade
}

const money = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)

const price = (value: number | null): string =>
  value === null
    ? '—'
    : value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })

const drawdown = reactive({
  peakBalance: 10000,
  currentBalance: 9000,
})

const drawdownMetrics = computed(() => {
  const peak = Math.max(0, Number(drawdown.peakBalance) || 0)
  const current = Math.max(0, Number(drawdown.currentBalance) || 0)
  const loss = peak > 0 ? Math.max(0, peak - current) : 0
  const drawdownPercent =
    peak > 0 ? (loss / peak) * 100 : 0
  const recoveryAmount = Math.max(0, peak - current)
  const recoveryPercent =
    current > 0 ? (recoveryAmount / current) * 100 : 0

  return {
    loss,
    drawdownPercent,
    recoveryAmount,
    recoveryPercent,
  }
})

const compound = reactive({
  initialCapital: 10000,
  monthlyReturn: 3,
  months: 12,
  monthlyContribution: 0,
})

const compoundMetrics = computed(() => {
  const initial = Math.max(
    0,
    Number(compound.initialCapital) || 0,
  )
  const rate = (Number(compound.monthlyReturn) || 0) / 100
  const months = Math.max(
    0,
    Math.min(240, Math.floor(Number(compound.months) || 0)),
  )
  const contribution = Math.max(
    0,
    Number(compound.monthlyContribution) || 0,
  )
  let endingBalance = initial

  for (let month = 0; month < months; month += 1) {
    endingBalance =
      endingBalance * (1 + rate) + contribution
  }

  const contributedCapital = initial + contribution * months

  return {
    endingBalance,
    contributedCapital,
    profit: endingBalance - contributedCapital,
    totalReturnPercent:
      contributedCapital > 0
        ? ((endingBalance - contributedCapital) / contributedCapital) * 100
        : 0,
  }
})

const quickLots = [0.01, 0.05, 0.1, 0.2, 0.5, 1]

const pnlPreview = reactive({
  direction: 'buy' as TradeDirection,
  entryPrice: null as number | null,
  exitPrice: null as number | null,
  lotSize: 0.1 as number | null,
})

const pnlPreviewMetrics = computed(() =>
  calculateTradeMetrics({
    symbol: 'XAUUSD',
    direction: pnlPreview.direction,
    entryPrice: pnlPreview.entryPrice,
    exitPrice: pnlPreview.exitPrice,
    stopLoss: null,
    takeProfit: null,
    lotSize: pnlPreview.lotSize,
  }),
)

const pnlPriceMove = computed(() => {
  if (
    pnlPreview.entryPrice === null ||
    pnlPreview.exitPrice === null
  ) {
    return null
  }

  const directionFactor = pnlPreview.direction === 'buy' ? 1 : -1
  return Number(
    (
      (pnlPreview.exitPrice - pnlPreview.entryPrice) *
      directionFactor
    ).toFixed(2),
  )
})

const pnlPerDollar = computed(() =>
  pnlPreview.lotSize !== null && pnlPreview.lotSize > 0
    ? Number((pnlPreview.lotSize * 100).toFixed(2))
    : null,
)

const pnlTone = computed(() => {
  const value = pnlPreviewMetrics.value.actualProfitLoss
  if (value === null || value === 0) return 'text-zinc-300'
  return value > 0 ? 'text-emerald-300' : 'text-rose-300'
})
</script>

<template>
  <div class="space-y-6 pb-10">
    <section
      class="relative overflow-hidden rounded-3xl border border-zinc-800 bg-[#101012] p-6 shadow-2xl shadow-black/15 sm:p-7"
    >
      <div class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
      <div class="relative">
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-amber-300">
            TRADER TOOLKIT
          </span>
          <span class="text-xs text-zinc-600">XAUUSD 下單前計算中心</span>
        </div>

        <h1 class="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
          工具箱
        </h1>
        <p class="mt-3 max-w-3xl text-sm leading-7 text-zinc-500">
          先決定這單最多願意虧多少，再讓系統反推手數。這裡只做下單前計算，不會建立交易紀錄或送出任何訂單。
        </p>
      </div>
    </section>

    <section class="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
      <div class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="text-xs font-medium tracking-[0.16em] text-amber-400">POSITION SIZE</p>
            <h2 class="mt-2 text-xl font-semibold text-white">XAUUSD 倉位計算器</h2>
            <p class="mt-1 text-xs leading-5 text-zinc-600">1.00 lot = 100 oz；建議手數以 0.01 lot 向下取整，避免超過設定風險。</p>
          </div>
          <button
            type="button"
            class="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-300 transition hover:bg-amber-500/15"
            @click="useRiskLimit"
          >
            使用系統單筆上限 {{ money(settings.maxRiskPerTrade) }}
          </button>
        </div>

        <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <label class="sm:col-span-2 xl:col-span-1">
            <span class="text-xs font-medium text-zinc-400">參考帳戶（選填）</span>
            <select
              v-model="position.accountId"
              class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-200 outline-none transition focus:border-amber-500/40"
            >
              <option value="">不指定帳戶</option>
              <option v-for="account in activeAccounts" :key="account.id" :value="account.id">
                {{ account.name }} · Equity {{ money(account.equity) }}
              </option>
            </select>
          </label>

          <div>
            <span class="text-xs font-medium text-zinc-400">交易方向</span>
            <div class="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                class="rounded-xl border px-3 py-3 text-sm font-medium transition"
                :class="position.direction === 'buy' ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300' : 'border-zinc-800 bg-zinc-950/60 text-zinc-500'"
                @click="position.direction = 'buy'"
              >
                多單
              </button>
              <button
                type="button"
                class="rounded-xl border px-3 py-3 text-sm font-medium transition"
                :class="position.direction === 'sell' ? 'border-rose-500/35 bg-rose-500/10 text-rose-300' : 'border-zinc-800 bg-zinc-950/60 text-zinc-500'"
                @click="position.direction = 'sell'"
              >
                空單
              </button>
            </div>
          </div>

          <label>
            <span class="text-xs font-medium text-zinc-400">最多風險金額</span>
            <div class="relative mt-2">
              <span class="pointer-events-none absolute inset-y-0 left-4 flex items-center text-zinc-600">$</span>
              <input
                v-model.number="position.riskAmount"
                type="number"
                min="0.01"
                step="0.01"
                class="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 py-3 pl-8 pr-4 text-sm text-zinc-200 outline-none transition focus:border-amber-500/40"
              />
            </div>
            <p v-if="accountRiskPercent !== null" class="mt-2 text-[11px] text-zinc-600">
              約佔 {{ selectedAccount?.name }} Equity 的 {{ accountRiskPercent.toFixed(2) }}%
            </p>
            <p v-if="riskLimitExceeded" class="mt-2 text-[11px] font-medium text-rose-300">
              已高於 Freedom OS 單筆風險上限 {{ money(settings.maxRiskPerTrade) }}
            </p>
          </label>

          <label>
            <span class="text-xs font-medium text-zinc-400">進場價格</span>
            <input
              v-model.number="position.entryPrice"
              type="number"
              step="0.01"
              placeholder="例如 3380.00"
              class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-200 outline-none transition placeholder:text-zinc-700 focus:border-amber-500/40"
            />
          </label>

          <label>
            <span class="text-xs font-medium text-zinc-400">停損價格</span>
            <input
              v-model.number="position.stopLoss"
              type="number"
              step="0.01"
              placeholder="輸入你的 SL"
              class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-200 outline-none transition placeholder:text-zinc-700 focus:border-rose-500/40"
            />
            <p
              v-if="position.entryPrice !== null && position.stopLoss !== null && !positionSizing.validStop"
              class="mt-2 text-[11px] text-rose-300"
            >
              {{ position.direction === 'buy' ? '多單 SL 必須低於進場價' : '空單 SL 必須高於進場價' }}
            </p>
          </label>

          <label>
            <span class="text-xs font-medium text-zinc-400">預計停利價格（選填）</span>
            <input
              v-model.number="position.takeProfit"
              type="number"
              step="0.01"
              placeholder="輸入你的 TP"
              class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-200 outline-none transition placeholder:text-zinc-700 focus:border-emerald-500/40"
            />
          </label>
        </div>

        <div v-if="selectedAccount" class="mt-4 flex flex-wrap items-center gap-2">
          <span class="text-[11px] text-zinc-600">快速風險：</span>
          <button
            v-for="percentValue in [0.25, 0.5, 1]"
            :key="percentValue"
            type="button"
            class="rounded-lg border border-zinc-800 bg-zinc-950/50 px-2.5 py-1.5 text-[11px] text-zinc-500 transition hover:border-amber-500/25 hover:text-amber-300"
            @click="applyRiskPercent(percentValue)"
          >
            {{ percentValue }}%
          </button>
        </div>

        <div class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article class="rounded-2xl border border-amber-500/20 bg-amber-500/7 p-4">
            <p class="text-xs text-zinc-500">建議手數</p>
            <p class="mt-2 text-2xl font-semibold text-amber-300">
              {{ positionSizing.lotSize === null ? '—' : `${positionSizing.lotSize.toFixed(2)} lot` }}
            </p>
            <p class="mt-1 text-[11px] text-zinc-600">
              原始 {{ positionSizing.rawLotSize === null ? '—' : `${positionSizing.rawLotSize.toFixed(4)} lot` }}
            </p>
          </article>

          <article class="rounded-2xl border border-rose-500/15 bg-rose-500/5 p-4">
            <p class="text-xs text-zinc-500">實際風險</p>
            <p class="mt-2 text-2xl font-semibold text-rose-300">
              {{ positionSizing.actualRiskAmount === null ? '—' : money(positionSizing.actualRiskAmount) }}
            </p>
            <p class="mt-1 text-[11px] text-zinc-600">
              SL 距離 {{ positionSizing.stopDistance === null ? '—' : `$${positionSizing.stopDistance.toFixed(2)}` }}
            </p>
          </article>

          <article class="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4">
            <p class="text-xs text-zinc-500">你的 TP 風報比</p>
            <p class="mt-2 text-2xl font-semibold text-emerald-300">
              {{ positionMetrics.plannedRMultiple === null ? '—' : `1 : ${positionMetrics.plannedRMultiple.toFixed(2)}` }}
            </p>
            <p class="mt-1 text-[11px] text-zinc-600">
              預估 {{ positionMetrics.targetProfitLoss === null ? '—' : money(positionMetrics.targetProfitLoss) }}
            </p>
          </article>

          <article class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
            <p class="text-xs text-zinc-500">價格每移動 $1</p>
            <p class="mt-2 text-2xl font-semibold text-zinc-200">
              {{ positionSizing.pnlPerDollarMove === null ? '—' : money(positionSizing.pnlPerDollarMove) }}
            </p>
            <p class="mt-1 text-[11px] text-zinc-600">依建議手數計算</p>
          </article>
        </div>

        <div class="mt-4 grid gap-3 sm:grid-cols-3">
          <div v-for="rValue in [1, 2, 3]" :key="rValue" class="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
            <div class="flex items-center justify-between gap-3">
              <span class="text-xs font-semibold text-zinc-400">{{ rValue }}R 目標</span>
              <span class="text-sm font-semibold text-zinc-200">{{ price(targetPrice(rValue)) }}</span>
            </div>
            <p class="mt-2 text-[11px] text-zinc-600">
              預估獲利 {{ positionSizing.actualRiskAmount === null ? '—' : money(positionSizing.actualRiskAmount * rValue) }}
            </p>
          </div>
        </div>
      </div>

      <aside class="space-y-6">
        <section class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
          <p class="text-xs font-medium tracking-[0.16em] text-sky-400">GOLD QUICK REF</p>
          <h2 class="mt-2 text-xl font-semibold text-white">黃金手數速查</h2>
          <p class="mt-2 text-xs leading-5 text-zinc-600">XAUUSD 價格每移動 $1 時的約略損益。</p>

          <div class="mt-5 divide-y divide-zinc-800">
            <div v-for="lot in quickLots" :key="lot" class="flex items-center justify-between py-3 text-sm">
              <span class="font-medium text-zinc-300">{{ lot.toFixed(2) }} lot</span>
              <span class="text-zinc-500">≈ {{ money(lot * 100) }} / $1</span>
            </div>
          </div>
        </section>

        <section class="rounded-3xl border border-violet-500/15 bg-violet-500/5 p-5">
          <p class="text-xs font-semibold text-violet-300">風控優先</p>
          <p class="mt-2 text-xs leading-6 text-zinc-500">
            倉位是風險的結果，不是起點。先決定最多可以虧多少，再用 Entry → SL 的距離反推出 Lot，會比先決定「今天想下 0.2 手」穩定很多。
          </p>
        </section>
      </aside>
    </section>

    <section class="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <div class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="text-xs font-medium tracking-[0.16em] text-sky-400">
              QUICK P/L
            </p>
            <h2 class="mt-2 text-xl font-semibold text-white">
              XAUUSD 快速損益試算
            </h2>
          </div>
          <p class="text-xs text-zinc-600">
            適合下單前或離場前快速看「這個價格值多少錢」
          </p>
        </div>

        <div class="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <span class="text-xs font-medium text-zinc-400">方向</span>
            <div class="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                class="rounded-xl border px-3 py-3 text-sm font-medium transition"
                :class="pnlPreview.direction === 'buy' ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300' : 'border-zinc-800 bg-zinc-950/60 text-zinc-500'"
                @click="pnlPreview.direction = 'buy'"
              >
                多
              </button>
              <button
                type="button"
                class="rounded-xl border px-3 py-3 text-sm font-medium transition"
                :class="pnlPreview.direction === 'sell' ? 'border-rose-500/35 bg-rose-500/10 text-rose-300' : 'border-zinc-800 bg-zinc-950/60 text-zinc-500'"
                @click="pnlPreview.direction = 'sell'"
              >
                空
              </button>
            </div>
          </div>

          <label>
            <span class="text-xs font-medium text-zinc-400">進場價格</span>
            <input
              v-model.number="pnlPreview.entryPrice"
              type="number"
              step="0.01"
              placeholder="例如 3380.00"
              class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-200 outline-none transition placeholder:text-zinc-700 focus:border-sky-500/40"
            />
          </label>

          <label>
            <span class="text-xs font-medium text-zinc-400">預計／實際離場</span>
            <input
              v-model.number="pnlPreview.exitPrice"
              type="number"
              step="0.01"
              placeholder="例如 3392.00"
              class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-200 outline-none transition placeholder:text-zinc-700 focus:border-sky-500/40"
            />
          </label>

          <label>
            <span class="text-xs font-medium text-zinc-400">手數</span>
            <input
              v-model.number="pnlPreview.lotSize"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.10"
              class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-200 outline-none transition placeholder:text-zinc-700 focus:border-sky-500/40"
            />
          </label>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-3">
          <article class="rounded-2xl border border-zinc-800 bg-zinc-950/55 p-4">
            <p class="text-xs text-zinc-600">有效價格移動</p>
            <p class="mt-2 text-xl font-semibold" :class="pnlPriceMove !== null && pnlPriceMove < 0 ? 'text-rose-300' : 'text-zinc-200'">
              {{ pnlPriceMove === null ? '—' : `${pnlPriceMove > 0 ? '+' : ''}$${pnlPriceMove.toFixed(2)}` }}
            </p>
          </article>

          <article class="rounded-2xl border border-zinc-800 bg-zinc-950/55 p-4">
            <p class="text-xs text-zinc-600">價格每移動 $1</p>
            <p class="mt-2 text-xl font-semibold text-zinc-200">
              {{ pnlPerDollar === null ? '—' : money(pnlPerDollar) }}
            </p>
          </article>

          <article class="rounded-2xl border border-sky-500/15 bg-sky-500/5 p-4">
            <p class="text-xs text-zinc-600">預估損益</p>
            <p class="mt-2 text-2xl font-semibold" :class="pnlTone">
              {{ pnlPreviewMetrics.actualProfitLoss === null ? '—' : `${pnlPreviewMetrics.actualProfitLoss > 0 ? '+' : ''}${money(pnlPreviewMetrics.actualProfitLoss)}` }}
            </p>
          </article>
        </div>
      </div>

      <aside class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
        <p class="text-xs font-medium tracking-[0.16em] text-emerald-400">
          XAUUSD CONTRACT
        </p>
        <h2 class="mt-2 text-xl font-semibold text-white">
          黃金損益換算規則
        </h2>
        <div class="mt-5 space-y-3 text-sm">
          <div class="flex items-center justify-between rounded-xl bg-zinc-950/50 px-4 py-3">
            <span class="text-zinc-500">1.00 lot</span>
            <span class="font-medium text-zinc-200">$100 / 每 $1</span>
          </div>
          <div class="flex items-center justify-between rounded-xl bg-zinc-950/50 px-4 py-3">
            <span class="text-zinc-500">0.10 lot</span>
            <span class="font-medium text-zinc-200">$10 / 每 $1</span>
          </div>
          <div class="flex items-center justify-between rounded-xl bg-zinc-950/50 px-4 py-3">
            <span class="text-zinc-500">0.01 lot</span>
            <span class="font-medium text-zinc-200">$1 / 每 $1</span>
          </div>
        </div>
        <p class="mt-4 text-[11px] leading-5 text-zinc-600">
          依標準 XAUUSD 1 lot = 100 oz 計算。不同券商若使用特殊合約規格，仍以券商 Contract Size 為準。
        </p>
      </aside>
    </section>

    <section class="grid gap-6 xl:grid-cols-2">
      <div class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
        <p class="text-xs font-medium tracking-[0.16em] text-rose-400">DRAWDOWN RECOVERY</p>
        <h2 class="mt-2 text-xl font-semibold text-white">回撤恢復計算器</h2>
        <p class="mt-1 text-xs leading-5 text-zinc-600">虧 20% 不是賺 20% 就回本。這裡直接算回到前高需要多少報酬。</p>

        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <label>
            <span class="text-xs text-zinc-500">前高資金</span>
            <input v-model.number="drawdown.peakBalance" type="number" min="0" step="100" class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-zinc-200 outline-none focus:border-rose-500/40" />
          </label>
          <label>
            <span class="text-xs text-zinc-500">目前資金</span>
            <input v-model.number="drawdown.currentBalance" type="number" min="0" step="100" class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-zinc-200 outline-none focus:border-rose-500/40" />
          </label>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-3">
          <div class="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
            <p class="text-xs text-zinc-600">目前回撤</p>
            <p class="mt-2 text-xl font-semibold text-rose-300">{{ drawdownMetrics.drawdownPercent.toFixed(2) }}%</p>
          </div>
          <div class="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
            <p class="text-xs text-zinc-600">已回撤金額</p>
            <p class="mt-2 text-xl font-semibold text-zinc-200">{{ money(drawdownMetrics.loss) }}</p>
          </div>
          <div class="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4">
            <p class="text-xs text-zinc-600">回本所需報酬</p>
            <p class="mt-2 text-xl font-semibold text-emerald-300">+{{ drawdownMetrics.recoveryPercent.toFixed(2) }}%</p>
          </div>
        </div>
      </div>

      <div class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
        <p class="text-xs font-medium tracking-[0.16em] text-emerald-400">COMPOUND GROWTH</p>
        <h2 class="mt-2 text-xl font-semibold text-white">複利成長試算</h2>
        <p class="mt-1 text-xs leading-5 text-zinc-600">用來看長期資金成長情境，不把試算結果當成保證報酬。</p>

        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <label>
            <span class="text-xs text-zinc-500">初始資金</span>
            <input v-model.number="compound.initialCapital" type="number" min="0" step="100" class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-zinc-200 outline-none focus:border-emerald-500/40" />
          </label>
          <label>
            <span class="text-xs text-zinc-500">每月假設報酬率 %</span>
            <input v-model.number="compound.monthlyReturn" type="number" step="0.1" class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-zinc-200 outline-none focus:border-emerald-500/40" />
          </label>
          <label>
            <span class="text-xs text-zinc-500">期間（月）</span>
            <input v-model.number="compound.months" type="number" min="0" max="240" step="1" class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-zinc-200 outline-none focus:border-emerald-500/40" />
          </label>
          <label>
            <span class="text-xs text-zinc-500">每月追加資金</span>
            <input v-model.number="compound.monthlyContribution" type="number" min="0" step="100" class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-zinc-200 outline-none focus:border-emerald-500/40" />
          </label>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-3">
          <div class="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4">
            <p class="text-xs text-zinc-600">期末資金</p>
            <p class="mt-2 text-xl font-semibold text-emerald-300">{{ money(compoundMetrics.endingBalance) }}</p>
          </div>
          <div class="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
            <p class="text-xs text-zinc-600">累計成長</p>
            <p class="mt-2 text-xl font-semibold" :class="compoundMetrics.profit >= 0 ? 'text-emerald-300' : 'text-rose-300'">
              {{ compoundMetrics.profit > 0 ? '+' : '' }}{{ money(compoundMetrics.profit) }}
            </p>
          </div>
          <div class="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
            <p class="text-xs text-zinc-600">相對投入報酬</p>
            <p class="mt-2 text-xl font-semibold text-zinc-200">{{ compoundMetrics.totalReturnPercent.toFixed(2) }}%</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
