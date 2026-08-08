<script setup lang="ts">
import { computed } from 'vue'

import { accountService } from '@/services'
import type { AccountStatus, AccountType } from '@/types'

const accounts = accountService.getAll()

const totalEquity = computed(() =>
  accounts.reduce((total, account) => total + account.equity, 0),
)

const activeAccountsCount = computed(
  () => accounts.filter((account) => account.status !== 'inactive').length,
)

const formatMoney = (value: number, currency: string) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)

const accountTypeLabel = (type: AccountType) => {
  const labels: Record<AccountType, string> = {
    funded: '基金倉',
    live: '真倉',
    demo: '模擬倉',
  }

  return labels[type]
}

const statusLabel = (status: AccountStatus) => {
  const labels: Record<AccountStatus, string> = {
    healthy: 'Healthy',
    warning: 'Warning',
    inactive: 'Inactive',
  }

  return labels[status]
}

const statusClasses = (status: AccountStatus) => {
  const classes: Record<AccountStatus, string> = {
    healthy: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
    warning: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
    inactive: 'border-zinc-700 bg-zinc-800/70 text-zinc-400',
  }

  return classes[status]
}

const dailyProfitLossClasses = (value: number) => {
  if (value > 0) return 'text-emerald-300'
  if (value < 0) return 'text-rose-300'
  return 'text-zinc-400'
}
</script>

<template>
  <section
    class="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-xl shadow-black/10"
  >
    <header
      class="flex flex-col gap-4 border-b border-zinc-800 pb-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p class="text-xs font-medium uppercase tracking-[0.22em] text-amber-400">
          Portfolio
        </p>
        <h2 class="mt-2 text-xl font-semibold text-zinc-100">Accounts</h2>
        <p class="mt-1 text-sm text-zinc-500">管理基金倉、真倉與模擬倉</p>
      </div>

      <div class="flex items-center gap-3">
        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-right"
        >
          <p class="text-xs uppercase tracking-wider text-zinc-500">Total Equity</p>
          <p class="mt-1 text-lg font-semibold text-zinc-100">
            {{ formatMoney(totalEquity, 'USD') }}
          </p>
        </div>

        <button
          type="button"
          class="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-300 transition hover:border-amber-400/50 hover:bg-amber-500/15"
        >
          ＋ 新增帳戶
        </button>
      </div>
    </header>

    <div class="mt-5 flex items-center justify-between">
      <p class="text-sm text-zinc-500">{{ activeAccountsCount }} 個使用中帳戶</p>
      <button
        type="button"
        class="text-sm font-medium text-zinc-400 transition hover:text-amber-300"
      >
        查看全部
      </button>
    </div>

    <div class="mt-4 space-y-4">
      <article
        v-for="account in accounts"
        :key="account.id"
        class="group rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 transition duration-200 hover:border-zinc-700 hover:bg-zinc-950"
      >
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="font-semibold text-zinc-100">{{ account.name }}</h3>

              <span
                class="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-400"
              >
                {{ accountTypeLabel(account.type) }}
              </span>

              <span
                class="rounded-full border px-2.5 py-1 text-xs font-medium"
                :class="statusClasses(account.status)"
              >
                {{ statusLabel(account.status) }}
              </span>
            </div>

            <p class="mt-2 text-sm text-zinc-500">
              Balance
              <span class="ml-2 font-medium text-zinc-300">
                {{ formatMoney(account.balance, account.currency) }}
              </span>
            </p>
          </div>

          <div class="sm:text-right">
            <p class="text-xs uppercase tracking-wider text-zinc-500">Equity</p>
            <p class="mt-1 text-2xl font-semibold text-zinc-100">
              {{ formatMoney(account.equity, account.currency) }}
            </p>
          </div>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-3">
          <div class="rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-3">
            <p class="text-xs uppercase tracking-wider text-zinc-500">Daily P/L</p>
            <p
              class="mt-1 font-semibold"
              :class="dailyProfitLossClasses(account.dailyProfitLoss)"
            >
              {{ account.dailyProfitLoss > 0 ? '+' : '' }}{{ formatMoney(account.dailyProfitLoss, account.currency) }}
            </p>
          </div>

          <div class="rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-3">
            <p class="text-xs uppercase tracking-wider text-zinc-500">
              Max Drawdown
            </p>
            <p class="mt-1 font-semibold text-zinc-200">
              {{ account.maxDrawdownPercent !== undefined ? `${account.maxDrawdownPercent}%` : '—' }}
            </p>
          </div>

          <div class="rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-3">
            <p class="text-xs uppercase tracking-wider text-zinc-500">
              Profit Target
            </p>
            <p class="mt-1 font-semibold text-zinc-200">
              {{ account.profitTargetPercent !== undefined ? `${account.profitTargetPercent}%` : '—' }}
            </p>
          </div>
        </div>

        <div
          v-if="
            account.profitTargetPercent !== undefined &&
            account.currentProfitPercent !== undefined
          "
          class="mt-5"
        >
          <div class="flex items-center justify-between text-xs">
            <span class="text-zinc-500">Challenge Progress</span>
            <span class="font-medium text-amber-300">
              {{ account.currentProfitPercent.toFixed(2) }}% /
              {{ account.profitTargetPercent }}%
            </span>
          </div>

          <div class="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              class="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-500"
              :style="{
                width: `${Math.min(
                  (account.currentProfitPercent / account.profitTargetPercent) * 100,
                  100,
                )}%`,
              }"
            />
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
