<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import MissionControlIcon from './MissionControlIcon.vue'
import { formatTradePrice } from '@/services'
import type { TradeRecord } from '@/types/trade'

const props = defineProps<{
  positions: TradeRecord[]
}>()

const totalRisk = computed(() =>
  props.positions.reduce((sum, trade) => sum + trade.riskAmount, 0),
)

const totalLots = computed(() =>
  props.positions.reduce((sum, trade) => sum + trade.lotSize, 0),
)

const formatMoney = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)

const plannedR = (trade: TradeRecord): number | null => {
  const riskDistance = Math.abs(trade.entryPrice - trade.stopLoss)
  const rewardDistance = Math.abs(trade.takeProfit - trade.entryPrice)

  if (
    trade.entryPrice <= 0 ||
    trade.stopLoss <= 0 ||
    trade.takeProfit <= 0 ||
    riskDistance <= 0
  ) {
    return null
  }

  return Number((rewardDistance / riskDistance).toFixed(2))
}
</script>

<template>
  <section
    class="overflow-hidden rounded-[1.75rem] border border-white/[0.07] bg-[#111113] shadow-xl shadow-black/20"
  >
    <header
      class="flex flex-col gap-4 border-b border-white/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
    >
      <div class="flex items-center gap-4">
        <div
          class="flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-400/[0.08] text-sky-300"
        >
          <MissionControlIcon name="trade" :size="21" />
        </div>

        <div>
          <div class="flex flex-wrap items-center gap-2">
            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300/70">
              Active positions
            </p>
            <span
              v-if="positions.length"
              class="rounded-full border border-sky-400/20 bg-sky-400/[0.07] px-2 py-0.5 text-[10px] font-semibold text-sky-300"
            >
              LIVE {{ positions.length }}
            </span>
          </div>
          <h2 class="mt-1 text-lg font-semibold text-white">目前持倉</h2>
        </div>
      </div>

      <div v-if="positions.length" class="flex flex-wrap items-center gap-4 text-xs">
        <div>
          <span class="text-zinc-700">總初始風險</span>
          <span class="ml-2 font-semibold text-amber-300">{{ formatMoney(totalRisk) }}</span>
        </div>
        <div>
          <span class="text-zinc-700">總倉位</span>
          <span class="ml-2 font-semibold text-zinc-300">{{ totalLots.toFixed(2) }} lot</span>
        </div>
      </div>
    </header>

    <div v-if="positions.length" class="grid gap-3 p-5 lg:grid-cols-2 2xl:grid-cols-3 sm:p-6">
      <article
        v-for="trade in positions"
        :key="trade.id"
        class="group rounded-2xl border border-sky-400/10 bg-sky-400/[0.025] p-4 transition hover:border-sky-400/20 hover:bg-sky-400/[0.045]"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="rounded-lg px-2 py-1 text-[10px] font-bold"
                :class="
                  trade.direction === 'buy'
                    ? 'bg-emerald-400/10 text-emerald-300'
                    : 'bg-rose-400/10 text-rose-300'
                "
              >
                {{ trade.direction === 'buy' ? 'BUY' : 'SELL' }}
              </span>
              <h3 class="text-base font-semibold text-zinc-100">{{ trade.symbol }}</h3>
            </div>
            <p class="mt-1.5 truncate text-xs text-zinc-600">
              {{ trade.account }} · {{ trade.lotSize ? `${trade.lotSize.toFixed(2)} lot` : '未填手數' }}
            </p>
          </div>

          <RouterLink
            :to="{ path: '/trades', query: { manage: trade.id } }"
            class="shrink-0 rounded-xl border border-sky-400/20 bg-sky-400/[0.06] px-3 py-2 text-[11px] font-semibold text-sky-300 transition hover:bg-sky-400/10"
          >
            管理持倉
          </RouterLink>
        </div>

        <div class="mt-4 grid grid-cols-3 gap-2">
          <div class="rounded-xl border border-white/[0.055] bg-black/15 p-3">
            <p class="text-[9px] uppercase tracking-[0.12em] text-zinc-700">Entry</p>
            <p class="mt-1.5 text-sm font-semibold text-zinc-300">{{ formatTradePrice(trade.entryPrice) }}</p>
          </div>
          <div class="rounded-xl border border-rose-400/10 bg-rose-400/[0.025] p-3">
            <p class="text-[9px] uppercase tracking-[0.12em] text-rose-300/45">Stop</p>
            <p class="mt-1.5 text-sm font-semibold text-rose-300">{{ formatTradePrice(trade.stopLoss) }}</p>
          </div>
          <div class="rounded-xl border border-emerald-400/10 bg-emerald-400/[0.025] p-3">
            <p class="text-[9px] uppercase tracking-[0.12em] text-emerald-300/45">Target</p>
            <p class="mt-1.5 text-sm font-semibold text-emerald-300">{{ formatTradePrice(trade.takeProfit) }}</p>
          </div>
        </div>

        <div class="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.055] pt-3 text-[11px]">
          <span class="truncate text-zinc-600">{{ trade.playbook }}</span>
          <div class="flex shrink-0 items-center gap-3">
            <span class="text-zinc-600">風險 <strong class="font-semibold text-amber-300">{{ formatMoney(trade.riskAmount) }}</strong></span>
            <span class="text-zinc-600">
              目標 <strong class="font-semibold text-emerald-300">{{ plannedR(trade) === null ? '—' : `${plannedR(trade)?.toFixed(2)}R` }}</strong>
            </span>
          </div>
        </div>
      </article>
    </div>

    <div v-else class="p-6 sm:p-8">
      <div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-black/10 px-6 py-8 text-center">
        <div class="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800/70 text-zinc-500">
          <MissionControlIcon name="check" :size="18" />
        </div>
        <p class="mt-3 text-sm font-medium text-zinc-400">目前沒有未平倉交易</p>
        <p class="mt-1 text-xs text-zinc-700">新增交易時不填實際離場價，就會自動出現在這裡。</p>
      </div>
    </div>
  </section>
</template>
