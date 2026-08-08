<script setup lang="ts">
import { formatCurrency } from '@/services'
import type { TradeCalculationResult } from '@/services/trade-calculation.service'

defineProps<{
  metrics: TradeCalculationResult
  riskLimitExceeded?: boolean
}>()
</script>

<template>
  <section
    class="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-5"
  >
    <div
      class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <p class="text-sm font-semibold text-zinc-200">
          XAUUSD 倉位損益計算
        </p>

        <p class="mt-1 text-xs leading-5 text-zinc-600">
          依 1.00 lot = 100 oz 自動計算，不需要手填盈虧或 R 倍數。
        </p>
      </div>

      <p class="text-xs text-zinc-600">
        1.00 手每移動 $1 ≈ $100
      </p>
    </div>

    <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div
        class="rounded-2xl border border-rose-500/15 bg-rose-500/5 p-4"
      >
        <p class="text-xs text-zinc-500">
          預估停損
        </p>

        <p class="mt-2 text-lg font-semibold text-rose-300">
          {{ metrics.riskAmount === null ? '—' : `-${formatCurrency(metrics.riskAmount)}` }}
        </p>

        <p
          v-if="riskLimitExceeded"
          class="mt-1 text-xs font-medium text-rose-300"
        >
          已超過目前單筆風控上限
        </p>
      </div>

      <div
        class="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4"
      >
        <p class="text-xs text-zinc-500">
          預估停利
        </p>

        <p class="mt-2 text-lg font-semibold text-emerald-300">
          {{ metrics.targetProfitLoss === null ? '—' : `+${formatCurrency(metrics.targetProfitLoss)}` }}
        </p>
      </div>

      <div
        class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
      >
        <p class="text-xs text-zinc-500">
          計畫風報比
        </p>

        <p class="mt-2 text-lg font-semibold text-amber-300">
          {{ metrics.plannedRMultiple === null ? '—' : `1 : ${metrics.plannedRMultiple.toFixed(2)}` }}
        </p>
      </div>

      <div
        class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
      >
        <p class="text-xs text-zinc-500">
          實際離場損益
        </p>

        <p
          class="mt-2 text-lg font-semibold"
          :class="
            metrics.actualProfitLoss === null
              ? 'text-zinc-400'
              : metrics.actualProfitLoss > 0
                ? 'text-emerald-300'
                : metrics.actualProfitLoss < 0
                  ? 'text-rose-300'
                  : 'text-zinc-300'
          "
        >
          {{ metrics.actualProfitLoss === null ? '尚未離場' : formatCurrency(metrics.actualProfitLoss) }}
        </p>

        <p
          v-if="metrics.actualRMultiple !== null"
          class="mt-1 text-xs text-zinc-500"
        >
          {{ metrics.actualRMultiple > 0 ? '+' : '' }}{{ metrics.actualRMultiple.toFixed(2) }}R
        </p>
      </div>
    </div>
  </section>
</template>
