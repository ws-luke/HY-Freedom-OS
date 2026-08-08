<script setup lang="ts">
import AccountIcon from './AccountIcon.vue'
import { transactionTypeLabels } from '@/services/account-ledger.service'

import type {
  AccountTransaction,
  TradingAccount,
} from '@/types/account'

const props = defineProps<{
  account: TradingAccount
  transactions: AccountTransaction[]
  totalCount: number
}>()

const emit = defineEmits<{
  edit: [transaction: AccountTransaction]
  remove: [transaction: AccountTransaction]
}>()

const formatMoney = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: props.account.currency,
    maximumFractionDigits: 2,
  }).format(value)

const directionClasses = (
  transaction: AccountTransaction,
): string =>
  transaction.direction === 'in'
    ? 'text-emerald-300'
    : 'text-rose-300'

const badgeClasses = (
  transaction: AccountTransaction,
): string => {
  if (transaction.direction === 'in') {
    return 'border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300'
  }

  return 'border-rose-400/20 bg-rose-400/[0.07] text-rose-300'
}
</script>

<template>
  <div v-if="transactions.length">
    <div class="hidden overflow-x-auto lg:block">
      <table class="w-full min-w-[920px] border-collapse">
        <thead>
          <tr class="border-b border-white/[0.07] text-left">
            <th class="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-700">日期</th>
            <th class="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-700">類型</th>
            <th class="px-5 py-3.5 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-700">金額</th>
            <th class="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-700">方式／參考碼</th>
            <th class="px-5 py-3.5 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-700">完成後餘額</th>
            <th class="px-5 py-3.5 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-700">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/[0.055]">
          <tr
            v-for="transaction in transactions"
            :key="transaction.id"
            class="transition hover:bg-white/[0.02]"
          >
            <td class="whitespace-nowrap px-5 py-4 text-sm text-zinc-400">
              {{ transaction.date }}
            </td>
            <td class="px-5 py-4">
              <span
                class="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium"
                :class="badgeClasses(transaction)"
              >
                <AccountIcon
                  :name="transaction.direction === 'in' ? 'arrow-down' : 'arrow-up'"
                  :size="12"
                  :stroke-width="2.2"
                />
                {{ transactionTypeLabels[transaction.type] }}
              </span>
            </td>
            <td
              class="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold tabular-nums"
              :class="directionClasses(transaction)"
            >
              {{ transaction.direction === 'in' ? '+' : '−' }}{{ formatMoney(transaction.amount) }}
            </td>
            <td class="max-w-[280px] px-5 py-4">
              <p class="truncate text-sm text-zinc-400">
                {{ transaction.method || '未填寫方式' }}
              </p>
              <p class="mt-1 truncate text-[11px] text-zinc-700">
                {{ transaction.reference || transaction.notes || '沒有其他資料' }}
              </p>
            </td>
            <td class="whitespace-nowrap px-5 py-4 text-right text-sm tabular-nums text-zinc-400">
              {{ transaction.balanceAfter === null ? '—' : formatMoney(transaction.balanceAfter) }}
            </td>
            <td class="px-5 py-4">
              <div class="flex justify-end gap-1">
                <button
                  type="button"
                  class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-700 transition hover:bg-sky-400/[0.08] hover:text-sky-300"
                  aria-label="編輯資金紀錄"
                  @click="emit('edit', transaction)"
                >
                  <AccountIcon name="edit" :size="15" />
                </button>
                <button
                  type="button"
                  class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-700 transition hover:bg-rose-400/[0.08] hover:text-rose-300"
                  aria-label="刪除資金紀錄"
                  @click="emit('remove', transaction)"
                >
                  <AccountIcon name="trash" :size="15" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="divide-y divide-white/[0.06] lg:hidden">
      <article
        v-for="transaction in transactions"
        :key="transaction.id"
        class="p-4 sm:p-5"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <span
              class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium"
              :class="badgeClasses(transaction)"
            >
              {{ transactionTypeLabels[transaction.type] }}
            </span>
            <p class="mt-2 text-xs text-zinc-600">{{ transaction.date }}</p>
          </div>
          <p
            class="shrink-0 text-base font-semibold tabular-nums"
            :class="directionClasses(transaction)"
          >
            {{ transaction.direction === 'in' ? '+' : '−' }}{{ formatMoney(transaction.amount) }}
          </p>
        </div>

        <div class="mt-3 grid grid-cols-2 gap-3 rounded-xl border border-white/[0.055] bg-black/15 p-3">
          <div>
            <p class="text-[10px] text-zinc-700">資金方式</p>
            <p class="mt-1 truncate text-xs text-zinc-400">{{ transaction.method || '—' }}</p>
          </div>
          <div class="text-right">
            <p class="text-[10px] text-zinc-700">完成後餘額</p>
            <p class="mt-1 truncate text-xs text-zinc-400">
              {{ transaction.balanceAfter === null ? '—' : formatMoney(transaction.balanceAfter) }}
            </p>
          </div>
        </div>

        <p v-if="transaction.reference || transaction.notes" class="mt-3 text-xs leading-5 text-zinc-600">
          {{ transaction.reference }}<span v-if="transaction.reference && transaction.notes"> · </span>{{ transaction.notes }}
        </p>

        <div class="mt-3 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg border border-white/[0.07] px-3 py-2 text-xs text-zinc-500"
            @click="emit('edit', transaction)"
          >
            編輯
          </button>
          <button
            type="button"
            class="rounded-lg border border-rose-400/10 px-3 py-2 text-xs text-rose-300/70"
            @click="emit('remove', transaction)"
          >
            刪除
          </button>
        </div>
      </article>
    </div>
  </div>

  <div v-else class="px-5 py-14 text-center">
    <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.025] text-zinc-600">
      <AccountIcon name="receipt" :size="21" />
    </div>
    <p class="mt-4 text-sm font-medium text-zinc-400">
      {{ totalCount === 0 ? '尚未建立資金紀錄' : '沒有符合篩選條件的紀錄' }}
    </p>
    <p class="mt-1.5 text-xs text-zinc-700">
      {{ totalCount === 0 ? '新增第一筆入金、出金或費用紀錄。' : '調整搜尋或篩選條件後再試一次。' }}
    </p>
  </div>
</template>
