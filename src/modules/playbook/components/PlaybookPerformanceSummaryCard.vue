<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useTradeStore } from '@/stores/useTradeStore'

const tradeStore = useTradeStore()

const { sortedClosedTrades: sortedTrades } = storeToRefs(tradeStore)

const performance = computed(() => {
  const map = new Map<
    string,
    {
      trades: number
      wins: number
      losses: number
      totalR: number
      totalProfitLoss: number
    }
  >()

  sortedTrades.value.forEach(trade => {
    const name =
      trade.playbook.trim() ||
      '未分類策略'

    const current =
      map.get(name) ?? {
        trades: 0,
        wins: 0,
        losses: 0,
        totalR: 0,
        totalProfitLoss: 0,
      }

    current.trades += 1
    current.totalR += trade.rMultiple
    current.totalProfitLoss +=
      trade.profitLoss

    if (trade.result === 'win') {
      current.wins += 1
    }

    if (trade.result === 'loss') {
      current.losses += 1
    }

    map.set(name, current)
  })

  return [...map.entries()]
    .map(([name, data]) => ({
      name,
      ...data,
      winRate:
        data.trades > 0
          ? Math.round(
              (
                data.wins /
                data.trades
              ) * 100,
            )
          : 0,
      averageR:
        data.trades > 0
          ? Number(
              (
                data.totalR /
                data.trades
              ).toFixed(2),
            )
          : 0,
    }))
    .sort((a, b) => {
      if (b.averageR !== a.averageR) {
        return b.averageR - a.averageR
      }

      return b.winRate - a.winRate
    })
})

const bestStrategy = computed(
  () => performance.value[0] ?? null,
)

const weakestStrategy = computed(() => {
  if (performance.value.length === 0) {
    return null
  }

  return performance.value.at(-1) ?? null
})

const totalStrategies = computed(
  () => performance.value.length,
)

const profitableStrategies = computed(
  () =>
    performance.value.filter(
      item =>
        item.totalProfitLoss > 0 &&
        item.averageR > 0,
    ).length,
)

const formatMoney = (
  value: number,
): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)

const valueClasses = (
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
</script>

<template>
  <section
    class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl shadow-black/10"
  >
    <header>
      <p
        class="text-xs font-medium tracking-[0.2em] text-violet-400"
      >
        PLAYBOOK PERFORMANCE
      </p>

      <h2
        class="mt-2 text-xl font-semibold text-zinc-100"
      >
        策略表現摘要
      </h2>

      <p
        class="mt-1 text-sm leading-6 text-zinc-500"
      >
        依據實際交易紀錄比較各策略的勝率、平均 R 與盈虧。
      </p>
    </header>

    <div
      class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <div
        class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
      >
        <p class="text-xs text-zinc-500">
          已使用策略
        </p>

        <p
          class="mt-2 text-2xl font-semibold text-zinc-100"
        >
          {{ totalStrategies }}
        </p>
      </div>

      <div
        class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
      >
        <p class="text-xs text-zinc-500">
          正期望策略
        </p>

        <p
          class="mt-2 text-2xl font-semibold text-emerald-300"
        >
          {{ profitableStrategies }}
        </p>
      </div>

      <div
        class="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4"
      >
        <p class="text-xs text-emerald-300/70">
          最佳策略
        </p>

        <p
          class="mt-2 truncate font-semibold text-zinc-100"
        >
          {{ bestStrategy?.name ?? '尚無資料' }}
        </p>

        <p
          v-if="bestStrategy"
          class="mt-1 text-xs text-zinc-500"
        >
          {{ bestStrategy.winRate }}% ·
          {{ bestStrategy.averageR.toFixed(2) }}R
        </p>
      </div>

      <div
        class="rounded-2xl border border-rose-500/15 bg-rose-500/5 p-4"
      >
        <p class="text-xs text-rose-300/70">
          優先檢查策略
        </p>

        <p
          class="mt-2 truncate font-semibold text-zinc-100"
        >
          {{ weakestStrategy?.name ?? '尚無資料' }}
        </p>

        <p
          v-if="weakestStrategy"
          class="mt-1 text-xs text-zinc-500"
        >
          {{ weakestStrategy.winRate }}% ·
          {{ weakestStrategy.averageR.toFixed(2) }}R
        </p>
      </div>
    </div>

    <div
      v-if="performance.length"
      class="mt-5 overflow-x-auto rounded-2xl border border-zinc-800"
    >
      <table class="w-full min-w-[720px]">
        <thead
          class="border-b border-zinc-800 bg-zinc-950/70"
        >
          <tr
            class="text-left text-xs text-zinc-500"
          >
            <th class="px-4 py-3 font-medium">
              策略
            </th>

            <th class="px-4 py-3 font-medium">
              交易
            </th>

            <th class="px-4 py-3 font-medium">
              勝率
            </th>

            <th class="px-4 py-3 font-medium">
              平均 R
            </th>

            <th class="px-4 py-3 font-medium">
              總盈虧
            </th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="item in performance"
            :key="item.name"
            class="border-b border-zinc-800/70 last:border-b-0"
          >
            <td
              class="px-4 py-4 font-medium text-zinc-200"
            >
              {{ item.name }}
            </td>

            <td class="px-4 py-4 text-zinc-400">
              {{ item.trades }}
            </td>

            <td class="px-4 py-4 text-sky-300">
              {{ item.winRate }}%
            </td>

            <td
              class="px-4 py-4 font-medium"
              :class="
                valueClasses(
                  item.averageR,
                )
              "
            >
              {{ item.averageR.toFixed(2) }}R
            </td>

            <td
              class="px-4 py-4 font-medium"
              :class="
                valueClasses(
                  item.totalProfitLoss,
                )
              "
            >
              {{
                item.totalProfitLoss > 0
                  ? '+'
                  : ''
              }}
              {{
                formatMoney(
                  item.totalProfitLoss,
                )
              }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-else
      class="mt-5 rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500"
    >
      尚無交易資料，建立交易後會自動產生策略績效。
    </div>
  </section>
</template>
