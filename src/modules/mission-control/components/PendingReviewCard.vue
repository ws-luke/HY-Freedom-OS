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
} = storeToRefs(tradeStore)

const pendingTrades = computed(() =>
  sortedTrades.value.filter(
    trade =>
      !tradeReviewStore.hasReview(trade.id) &&
      trade.status !== 'completed',
  ),
)

const displayedTrades = computed(() =>
  pendingTrades.value.slice(0, 4),
)

const pendingCount = computed(
  () => pendingTrades.value.length,
)

const reviewingCount = computed(
  () =>
    pendingTrades.value.filter(
      trade => trade.status === 'reviewing',
    ).length,
)

const waitingCount = computed(
  () =>
    pendingTrades.value.filter(
      trade => trade.status === 'waiting-review',
    ).length,
)

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
): string =>
  direction === 'buy'
    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
    : 'border-rose-500/25 bg-rose-500/10 text-rose-300'

const statusLabel = (
  status: 'waiting-review' | 'reviewing' | 'completed',
): string => {
  if (status === 'reviewing') {
    return '復盤中'
  }

  if (status === 'completed') {
    return '已完成'
  }

  return '待復盤'
}

const statusClasses = (
  status: 'waiting-review' | 'reviewing' | 'completed',
): string => {
  if (status === 'reviewing') {
    return 'border-sky-500/25 bg-sky-500/10 text-sky-300'
  }

  if (status === 'completed') {
    return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
  }

  return 'border-amber-500/25 bg-amber-500/10 text-amber-300'
}
</script>

<template>
  <section
    class="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-xl shadow-black/10"
  >
    <div
      class="pointer-events-none absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl"
    />

    <div class="relative">
      <header
        class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <p
            class="text-xs font-medium tracking-[0.2em] text-amber-400"
          >
            復盤任務
          </p>

          <h2
            class="mt-2 text-xl font-semibold text-zinc-100"
          >
            待完成復盤
          </h2>

          <p
            class="mt-1 text-sm leading-6 text-zinc-500"
          >
            完成交易檢討，整理錯誤與下一次改善方式。
          </p>
        </div>

        <div
          class="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-center"
        >
          <p class="text-xs text-amber-300/70">
            尚未完成
          </p>

          <p
            class="mt-1 text-2xl font-semibold text-amber-300"
          >
            {{ pendingCount }}
          </p>
        </div>
      </header>

      <div
        class="mt-6 grid grid-cols-2 gap-3"
      >
        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
        >
          <p class="text-xs text-zinc-500">
            等待開始
          </p>

          <p
            class="mt-2 text-2xl font-semibold text-amber-300"
          >
            {{ waitingCount }}
          </p>
        </div>

        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
        >
          <p class="text-xs text-zinc-500">
            復盤進行中
          </p>

          <p
            class="mt-2 text-2xl font-semibold text-sky-300"
          >
            {{ reviewingCount }}
          </p>
        </div>
      </div>

      <div
        v-if="displayedTrades.length"
        class="mt-5 space-y-3"
      >
        <article
          v-for="trade in displayedTrades"
          :key="trade.id"
          class="rounded-2xl border border-zinc-800 bg-zinc-950/55 p-4 transition hover:border-zinc-700"
        >
          <div
            class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div class="min-w-0">
              <div
                class="flex flex-wrap items-center gap-2"
              >
                <h3
                  class="font-semibold text-zinc-100"
                >
                  {{ trade.symbol }}
                </h3>

                <span
                  class="rounded-full border px-2 py-0.5 text-[11px] font-medium"
                  :class="directionClasses(trade.direction)"
                >
                  {{
                    trade.direction === 'buy'
                      ? '多單'
                      : '空單'
                  }}
                </span>

                <span
                  class="rounded-full border px-2 py-0.5 text-[11px] font-medium"
                  :class="statusClasses(trade.status)"
                >
                  {{ statusLabel(trade.status) }}
                </span>
              </div>

              <p
                class="mt-2 truncate text-sm font-medium text-zinc-300"
              >
                {{ trade.playbook }}
              </p>

              <p
                class="mt-1 text-xs text-zinc-600"
              >
                {{ trade.date }} {{ trade.time }}
                · {{ trade.account }}
              </p>
            </div>

            <div class="shrink-0 sm:text-right">
              <p
                class="font-semibold"
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
                  profitLossClasses(
                    trade.rMultiple,
                  )
                "
              >
                {{
                  trade.rMultiple > 0
                    ? '+'
                    : ''
                }}
                {{ trade.rMultiple.toFixed(2) }}R
              </p>
            </div>
          </div>

          <div
            class="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3"
          >
            <p class="text-xs text-zinc-500">
              進場理由
            </p>

            <p
              class="mt-2 line-clamp-2 text-sm leading-6 text-zinc-400"
            >
              {{ trade.reason }}
            </p>
          </div>

          <RouterLink
            to="/trades"
            class="mt-4 flex w-full items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-300 transition hover:border-amber-400/40 hover:bg-amber-500/15"
          >
            {{
              trade.status === 'reviewing'
                ? '繼續復盤'
                : '開始復盤'
            }}
          </RouterLink>
        </article>

        <p
          v-if="pendingCount > displayedTrades.length"
          class="text-center text-xs text-zinc-600"
        >
          另外還有
          {{ pendingCount - displayedTrades.length }}
          筆交易尚未完成復盤
        </p>
      </div>

      <div
        v-else
        class="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center"
      >
        <div
          class="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 text-xl text-emerald-300"
        >
          ✓
        </div>

        <p
          class="mt-4 font-medium text-emerald-300"
        >
          所有交易都已完成復盤
        </p>

        <p
          class="mt-2 text-sm leading-6 text-emerald-200/60"
        >
          維持紀律，把每一筆交易的經驗轉化成下一次的執行規則。
        </p>
      </div>

      <RouterLink
        to="/review"
        class="mt-5 flex w-full items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-950/60 px-4 py-3 text-sm font-medium text-zinc-400 transition hover:border-amber-500/30 hover:text-amber-300"
      >
        查看完整復盤中心
      </RouterLink>
    </div>
  </section>
</template>