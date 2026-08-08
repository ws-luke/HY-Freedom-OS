<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'

import { useTradeStore } from '@/stores/useTradeStore'
import { useTradeReviewStore } from '@/stores/useTradeReviewStore'

const tradeStore = useTradeStore()
const tradeReviewStore = useTradeReviewStore()

const {
  sortedTrades,
  statistics,
  pendingReviewTrades,
} = storeToRefs(tradeStore)

const {
  completedReviewCount,
} = storeToRefs(tradeReviewStore)

const recentTrades = computed(() =>
  sortedTrades.value.slice(0, 3),
)

const reviewCompletionRate = computed(() => {
  if (statistics.value.totalTrades === 0) {
    return 0
  }

  return Math.min(
    100,
    Math.round(
      (
        completedReviewCount.value /
        statistics.value.totalTrades
      ) * 100,
    ),
  )
})

const performanceStatus = computed(() => {
  if (statistics.value.totalTrades === 0) {
    return {
      label: '尚無資料',
      classes:
        'border-zinc-700 bg-zinc-800/70 text-zinc-300',
    }
  }

  if (
    statistics.value.totalProfitLoss > 0 &&
    statistics.value.averageR > 0
  ) {
    return {
      label: '目前獲利',
      classes:
        'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    }
  }

  if (statistics.value.totalProfitLoss < 0) {
    return {
      label: '目前虧損',
      classes:
        'border-rose-500/25 bg-rose-500/10 text-rose-300',
    }
  }

  return {
    label: '損益持平',
    classes:
      'border-amber-500/25 bg-amber-500/10 text-amber-300',
  }
})

const formatMoney = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)

const profitLossClasses = (
  value: number,
): string => {
  if (value > 0) {
    return 'text-emerald-300'
  }

  if (value < 0) {
    return 'text-rose-300'
  }

  return 'text-zinc-300'
}

const directionClasses = (
  direction: 'buy' | 'sell',
): string => {
  return direction === 'buy'
    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
    : 'border-rose-500/25 bg-rose-500/10 text-rose-300'
}

const resultClasses = (
  result: 'win' | 'loss' | 'breakeven',
): string => {
  if (result === 'win') {
    return 'text-emerald-300'
  }

  if (result === 'loss') {
    return 'text-rose-300'
  }

  return 'text-zinc-300'
}

const resultLabel = (
  result: 'win' | 'loss' | 'breakeven',
): string => {
  if (result === 'win') {
    return '獲利'
  }

  if (result === 'loss') {
    return '虧損'
  }

  return '平手'
}
</script>

<template>
  <section
    class="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-xl shadow-black/10"
  >
    <div
      class="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl"
    />

    <div class="relative">
      <header
        class="flex items-start justify-between gap-4"
      >
        <div>
          <p
            class="text-xs font-medium tracking-[0.2em] text-emerald-400"
          >
            交易表現
          </p>

          <h2
            class="mt-2 text-xl font-semibold text-zinc-100"
          >
            近期交易統計
          </h2>

          <p
            class="mt-1 text-sm leading-6 text-zinc-500"
          >
            查看盈虧、勝率、報酬倍數與復盤進度。
          </p>
        </div>

        <span
          class="rounded-full border px-3 py-1 text-xs font-medium"
          :class="performanceStatus.classes"
        >
          {{ performanceStatus.label }}
        </span>
      </header>

      <div
        class="mt-6 grid grid-cols-2 gap-3"
      >
        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
        >
          <p class="text-xs text-zinc-500">
            總盈虧
          </p>

          <p
            class="mt-2 text-2xl font-semibold"
            :class="
              profitLossClasses(
                statistics.totalProfitLoss,
              )
            "
          >
            {{
              statistics.totalProfitLoss > 0
                ? '+'
                : ''
            }}
            {{
              formatMoney(
                statistics.totalProfitLoss,
              )
            }}
          </p>
        </div>

        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
        >
          <p class="text-xs text-zinc-500">
            勝率
          </p>

          <p
            class="mt-2 text-2xl font-semibold text-sky-300"
          >
            {{ statistics.winRate }}%
          </p>
        </div>

        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
        >
          <p class="text-xs text-zinc-500">
            平均報酬
          </p>

          <p
            class="mt-2 text-2xl font-semibold"
            :class="
              profitLossClasses(
                statistics.averageR,
              )
            "
          >
            {{ statistics.averageR.toFixed(2) }}R
          </p>
        </div>

        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
        >
          <p class="text-xs text-zinc-500">
            交易筆數
          </p>

          <p
            class="mt-2 text-2xl font-semibold text-zinc-100"
          >
            {{ statistics.totalTrades }}
          </p>
        </div>
      </div>

      <div
        class="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"
      >
        <div
          class="flex items-center justify-between gap-4"
        >
          <div>
            <p class="text-xs text-zinc-500">
              復盤完成率
            </p>

            <p
              class="mt-1 text-sm font-medium text-zinc-300"
            >
              {{ completedReviewCount }}／
              {{ statistics.totalTrades }} 筆
            </p>
          </div>

          <p
            class="text-lg font-semibold text-amber-300"
          >
            {{ reviewCompletionRate }}%
          </p>
        </div>

        <div
          class="mt-3 h-2.5 overflow-hidden rounded-full bg-zinc-800"
        >
          <div
            class="h-full rounded-full bg-amber-400 transition-all duration-500"
            :style="{
              width: `${reviewCompletionRate}%`,
            }"
          />
        </div>

        <p
          v-if="pendingReviewTrades.length"
          class="mt-3 text-xs text-amber-300/70"
        >
          尚有 {{ pendingReviewTrades.length }}
          筆交易需要完成復盤。
        </p>
      </div>

      <div class="mt-5">
        <div
          class="flex items-center justify-between gap-4"
        >
          <h3
            class="text-sm font-semibold text-zinc-300"
          >
            最近交易
          </h3>

          <RouterLink
            to="/trades"
            class="text-xs font-medium text-amber-300 transition hover:text-amber-200"
          >
            查看全部
          </RouterLink>
        </div>

        <div
          v-if="recentTrades.length"
          class="mt-3 space-y-2"
        >
          <article
            v-for="trade in recentTrades"
            :key="trade.id"
            class="flex items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"
          >
            <div class="min-w-0">
              <div
                class="flex flex-wrap items-center gap-2"
              >
                <p
                  class="font-medium text-zinc-200"
                >
                  {{ trade.symbol }}
                </p>

                <span
                  class="rounded-full border px-2 py-0.5 text-[11px] font-medium"
                  :class="
                    directionClasses(
                      trade.direction,
                    )
                  "
                >
                  {{
                    trade.direction === 'buy'
                      ? '多單'
                      : '空單'
                  }}
                </span>
              </div>

              <p
                class="mt-1 truncate text-xs text-zinc-600"
              >
                {{ trade.date }}
                ·
                {{ trade.playbook }}
              </p>
            </div>

            <div class="shrink-0 text-right">
              <p
                class="text-sm font-semibold"
                :class="
                  profitLossClasses(
                    trade.profitLoss,
                  )
                "
              >
                {{
                  trade.profitLoss > 0
                    ? '+'
                    : ''
                }}
                {{ formatMoney(trade.profitLoss) }}
              </p>

              <p
                class="mt-1 text-xs"
                :class="
                  resultClasses(
                    trade.result,
                  )
                "
              >
                {{ resultLabel(trade.result) }}
                ·
                {{ trade.rMultiple.toFixed(2) }}R
              </p>
            </div>
          </article>
        </div>

        <div
          v-else
          class="mt-3 rounded-2xl border border-dashed border-zinc-800 p-7 text-center"
        >
          <p class="text-sm text-zinc-500">
            尚未建立交易紀錄。
          </p>
        </div>
      </div>

      <RouterLink
        to="/trades"
        class="mt-5 flex w-full items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-950/60 px-4 py-3 text-sm font-medium text-zinc-400 transition hover:border-emerald-500/30 hover:text-emerald-300"
      >
        前往交易紀錄
      </RouterLink>
    </div>
  </section>
</template>