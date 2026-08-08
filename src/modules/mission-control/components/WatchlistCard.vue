<script setup lang="ts">
import { computed } from 'vue'

import { watchlistService } from '@/services'
import type { MarketBias, WatchStatus } from '@/types'

const watchlist = watchlistService.getAll()
const primaryItem = computed(() => watchlist[0])
const secondaryItems = computed(() => watchlist.slice(1))

const biasLabel = (bias: MarketBias) => ({
  bullish: '偏多',
  bearish: '偏空',
  neutral: '中性',
}[bias])

const biasClasses = (bias: MarketBias) => ({
  bullish: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  bearish: 'border-rose-500/25 bg-rose-500/10 text-rose-300',
  neutral: 'border-zinc-700 bg-zinc-800/70 text-zinc-300',
}[bias])

const statusLabel = (status: WatchStatus) => ({
  waiting: '等待',
  ready: '可觀察',
  avoid: '避開',
}[status])

const statusClasses = (status: WatchStatus) => ({
  waiting: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  ready: 'border-sky-500/25 bg-sky-500/10 text-sky-300',
  avoid: 'border-rose-500/25 bg-rose-500/10 text-rose-300',
}[status])
</script>

<template>
  <section
    class="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-xl shadow-black/10"
  >
    <header
      class="flex flex-col gap-4 border-b border-zinc-800 pb-5 sm:flex-row sm:items-start sm:justify-between"
    >
      <div>
        <p class="text-xs font-medium uppercase tracking-[0.22em] text-amber-400">
          Market Focus
        </p>
        <h2 class="mt-2 text-xl font-semibold text-zinc-100">今日觀察清單</h2>
        <p class="mt-1 text-sm text-zinc-500">只追蹤會影響今日交易決策的市場</p>
      </div>

      <button
        type="button"
        class="rounded-xl border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-400 transition hover:border-amber-500/30 hover:text-amber-300"
      >
        管理清單
      </button>
    </header>

    <article
      v-if="primaryItem"
      class="mt-5 overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-zinc-950/80 to-zinc-950"
    >
      <div class="p-5">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-2xl font-semibold text-zinc-100">
                {{ primaryItem.symbol }}
              </h3>
              <span
                class="rounded-full border px-2.5 py-1 text-xs font-medium"
                :class="biasClasses(primaryItem.bias)"
              >
                {{ biasLabel(primaryItem.bias) }}
              </span>
              <span
                class="rounded-full border px-2.5 py-1 text-xs font-medium"
                :class="statusClasses(primaryItem.status)"
              >
                {{ statusLabel(primaryItem.status) }}
              </span>
            </div>

            <p class="mt-2 text-sm text-zinc-400">{{ primaryItem.name }}</p>
            <p class="mt-1 text-xs uppercase tracking-wider text-zinc-600">
              {{ primaryItem.category }}
            </p>
          </div>

          <div class="sm:text-right">
            <p class="text-xs uppercase tracking-wider text-zinc-500">
              Current Price
            </p>
            <p class="mt-1 font-medium text-zinc-300">
              {{ primaryItem.currentPrice }}
            </p>
          </div>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-[170px_minmax(0,1fr)]">
          <div class="rounded-xl border border-zinc-800 bg-zinc-950/65 p-4">
            <p class="text-xs uppercase tracking-wider text-zinc-500">
              Analysis Flow
            </p>
            <p class="mt-2 font-medium text-zinc-200">
              {{ primaryItem.timeframe }}
            </p>
          </div>

          <div class="rounded-xl border border-zinc-800 bg-zinc-950/65 p-4">
            <p class="text-xs uppercase tracking-wider text-zinc-500">
              Today's Focus
            </p>
            <p class="mt-2 text-sm leading-6 text-zinc-300">
              {{ primaryItem.focus }}
            </p>
          </div>
        </div>
      </div>
    </article>

    <div class="mt-4 grid gap-4 md:grid-cols-2">
      <article
        v-for="item in secondaryItems"
        :key="item.id"
        class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 transition hover:border-zinc-700"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="font-semibold text-zinc-100">{{ item.symbol }}</h3>
              <span
                class="rounded-full border px-2.5 py-1 text-xs font-medium"
                :class="biasClasses(item.bias)"
              >
                {{ biasLabel(item.bias) }}
              </span>
            </div>
            <p class="mt-2 text-sm text-zinc-400">{{ item.name }}</p>
          </div>

          <span
            class="rounded-full border px-2.5 py-1 text-xs font-medium"
            :class="statusClasses(item.status)"
          >
            {{ statusLabel(item.status) }}
          </span>
        </div>

        <div class="mt-4 border-t border-zinc-800 pt-4">
          <p class="text-xs uppercase tracking-wider text-zinc-500">
            {{ item.timeframe }}
          </p>
          <p class="mt-2 text-sm leading-6 text-zinc-300">{{ item.focus }}</p>
        </div>
      </article>
    </div>
  </section>
</template>
