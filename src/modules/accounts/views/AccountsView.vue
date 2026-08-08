<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import AccountFormModal from '../components/AccountFormModal.vue'
import AccountIcon from '../components/AccountIcon.vue'
import AccountLedgerTable from '../components/AccountLedgerTable.vue'
import AccountPerformanceCard from '../components/AccountPerformanceCard.vue'
import BrokerSyncCenter from '../components/BrokerSyncCenter.vue'
import Mt5SyncModal from '../components/Mt5SyncModal.vue'
import TransactionFormModal from '../components/TransactionFormModal.vue'
import {
  calculateAccountBalanceHealth,
  calculateAccountTradePerformance,
  summarizeAccountCashflow,
  transactionTypeLabels,
} from '@/services/account-ledger.service'
import { useAccountStore } from '@/stores/useAccountStore'
import { useNotificationStore } from '@/stores/useNotificationStore'
import { useTradeStore } from '@/stores/useTradeStore'

import type {
  AccountTransaction,
  AccountTransactionDirection,
  AccountTransactionType,
  AccountType,
  NewAccountTransactionInput,
  NewTradingAccountInput,
  TradingAccount,
} from '@/types/account'
import type { BrokerSyncImportResult } from '@/types/broker-sync'

type TransactionTypeFilter =
  | 'all'
  | AccountTransactionType

type DirectionFilter =
  | 'all'
  | AccountTransactionDirection

interface LedgerFilters {
  keyword: string
  type: TransactionTypeFilter
  direction: DirectionFilter
  dateFrom: string
  dateTo: string
}

const accountStore = useAccountStore()
const notificationStore = useNotificationStore()
const tradeStore = useTradeStore()

const {
  activeAccounts,
  sortedAccounts,
  sortedTransactions,
} = storeToRefs(accountStore)

const {
  sortedTrades,
} = storeToRefs(tradeStore)

const selectedAccountId = ref<string | null>(
  sortedAccounts.value[0]?.id ?? null,
)
const accountModalOpen = ref(false)
const transactionModalOpen = ref(false)
const mt5SyncModalOpen = ref(false)
const mt5SyncAccount = ref<TradingAccount | null>(null)
const editingAccount = ref<TradingAccount | null>(null)
const editingTransaction = ref<AccountTransaction | null>(null)
const accountPresetType = ref<AccountType>('live')
const transactionPresetType = ref<AccountTransactionType>('deposit')

const openMt5Sync = (account: TradingAccount): void => {
  if (account.dataSource !== 'mt5') return
  mt5SyncAccount.value = account
  mt5SyncModalOpen.value = true
}

const closeMt5Sync = (): void => {
  mt5SyncModalOpen.value = false
  mt5SyncAccount.value = null
}

const handleMt5Synced = (result: BrokerSyncImportResult): void => {
  notificationStore.addNotification({
    type: result.tradesReadyForReview > 0 ? 'warning' : 'success',
    title: result.tradesReadyForReview > 0 ? 'MT5 同步完成 · 有交易待復盤' : 'MT5 同步完成',
    message: `新增 ${result.addedTrades} 筆交易 · 更新 ${result.updatedTrades} 筆 · 待復盤 ${result.tradesReadyForReview} 筆 · 資金流水新增 ${result.addedCashflows} 筆`,
    route: result.tradesReadyForReview > 0 ? '/review' : '/accounts',
  })
}

const filters = reactive<LedgerFilters>({
  keyword: '',
  type: 'all',
  direction: 'all',
  dateFrom: '',
  dateTo: '',
})

const typeLabels: Record<AccountType, string> = {
  prop: 'FTMO／Prop Firm',
  demo: '模擬帳戶',
  live: '個人真倉',
}

const statusLabels: Record<TradingAccount['status'], string> = {
  active: '使用中',
  paused: '暫停',
  passed: '已通過',
  failed: '已失敗',
  closed: '已關閉',
}

const propStageLabels = {
  challenge: 'Challenge',
  verification: 'Verification',
  funded: 'Funded',
} as const

const selectedAccount = computed(() =>
  sortedAccounts.value.find(
    account => account.id === selectedAccountId.value,
  ) ?? null,
)

const selectedTransactions = computed(() => {
  if (!selectedAccount.value) return []

  return accountStore.getTransactionsByAccountId(
    selectedAccount.value.id,
  )
})

const filteredTransactions = computed(() => {
  const keyword = filters.keyword
    .trim()
    .toLowerCase()

  return selectedTransactions.value.filter(
    transaction => {
      const matchesKeyword =
        !keyword ||
        transaction.method
          .toLowerCase()
          .includes(keyword) ||
        transaction.reference
          .toLowerCase()
          .includes(keyword) ||
        transaction.notes
          .toLowerCase()
          .includes(keyword) ||
        transactionTypeLabels[transaction.type]
          .toLowerCase()
          .includes(keyword)

      const matchesType =
        filters.type === 'all' ||
        transaction.type === filters.type
      const matchesDirection =
        filters.direction === 'all' ||
        transaction.direction === filters.direction
      const matchesDateFrom =
        !filters.dateFrom ||
        transaction.date >= filters.dateFrom
      const matchesDateTo =
        !filters.dateTo ||
        transaction.date <= filters.dateTo

      return (
        matchesKeyword &&
        matchesType &&
        matchesDirection &&
        matchesDateFrom &&
        matchesDateTo
      )
    },
  )
})

const cashflowSummary = computed(() =>
  summarizeAccountCashflow(
    selectedTransactions.value,
  ),
)

const balanceHealth = computed(() =>
  selectedAccount.value
    ? calculateAccountBalanceHealth(
        selectedAccount.value,
      )
    : null,
)

const tradePerformance = computed(() =>
  selectedAccount.value
    ? calculateAccountTradePerformance(
        selectedAccount.value,
        sortedTrades.value,
      )
    : null,
)

const portfolioByCurrency = computed(() => {
  const groups = new Map<
    string,
    {
      currency: string
      balance: number
      equity: number
      accounts: number
    }
  >()

  sortedAccounts.value.forEach(account => {
    const group = groups.get(account.currency) ?? {
      currency: account.currency,
      balance: 0,
      equity: 0,
      accounts: 0,
    }

    group.balance += account.balance
    group.equity += account.equity
    group.accounts += 1
    groups.set(account.currency, group)
  })

  return [...groups.values()].sort(
    (a, b) => b.balance - a.balance,
  )
})

const payoutRecordCount = computed(() =>
  sortedTransactions.value
    .filter(transaction => transaction.type === 'payout')
    .length,
)

const linkedTradeCount = computed(() => {
  const managedIds = new Set(
    sortedAccounts.value.map(account => account.id),
  )
  const managedNames = new Set(sortedAccounts.value.map(
    account => account.name.trim().toLowerCase(),
  ))

  return sortedTrades.value.filter(trade =>
    (trade.accountId && managedIds.has(trade.accountId)) ||
    (!trade.accountId && managedNames.has(
      trade.account.trim().toLowerCase(),
    )),
  ).length
})

const hasFilters = computed(() =>
  Boolean(
    filters.keyword ||
      filters.type !== 'all' ||
      filters.direction !== 'all' ||
      filters.dateFrom ||
      filters.dateTo,
  ),
)

const formatMoney = (
  value: number,
  currency = selectedAccount.value?.currency ?? 'USD',
): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value)

const pnlClasses = (value: number): string => {
  if (value > 0) return 'text-emerald-300'
  if (value < 0) return 'text-rose-300'
  return 'text-zinc-300'
}

const statusClasses = (
  status: TradingAccount['status'],
): string => {
  if (status === 'active' || status === 'passed') {
    return 'border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300'
  }

  if (status === 'paused') {
    return 'border-amber-400/20 bg-amber-400/[0.07] text-amber-300'
  }

  return 'border-zinc-700 bg-zinc-800/60 text-zinc-500'
}

const typeClasses = (type: AccountType): string => ({
  prop: 'border-violet-400/20 bg-violet-400/[0.07] text-violet-300',
  demo: 'border-sky-400/20 bg-sky-400/[0.07] text-sky-300',
  live: 'border-amber-400/20 bg-amber-400/[0.07] text-amber-300',
}[type])

const selectAccount = (accountId: string): void => {
  selectedAccountId.value = accountId
  Object.assign(filters, {
    keyword: '',
    type: 'all',
    direction: 'all',
    dateFrom: '',
    dateTo: '',
  })
}

const openNewAccount = (
  type: AccountType = 'live',
): void => {
  editingAccount.value = null
  accountPresetType.value = type
  accountModalOpen.value = true
}

const openEditAccount = (
  account: TradingAccount,
): void => {
  editingAccount.value = account
  accountPresetType.value = account.type
  accountModalOpen.value = true
}

const closeAccountModal = (): void => {
  accountModalOpen.value = false
  editingAccount.value = null
}

const submitAccount = (
  input: NewTradingAccountInput,
): void => {
  const duplicate = sortedAccounts.value.find(
    account =>
      account.name.trim().toLowerCase() ===
        input.name.trim().toLowerCase() &&
      account.id !== editingAccount.value?.id,
  )

  if (duplicate) {
    notificationStore.addNotification({
      type: 'danger',
      title: '帳戶名稱重複',
      message:
        '帳戶名稱必須唯一，才能正確連結交易績效。',
      route: '/accounts',
    })
    return
  }

  if (editingAccount.value) {
    const updated = accountStore.updateAccount(
      editingAccount.value.id,
      input,
    )

    if (updated) {
      selectedAccountId.value = updated.id
      notificationStore.addNotification({
        type: 'success',
        title: '帳戶已更新',
        message: `${updated.name} 的資料已儲存。`,
        route: '/accounts',
      })
    }
  }
  else {
    const account = accountStore.addAccount(input)
    selectedAccountId.value = account.id
    notificationStore.addNotification({
      type: 'success',
      title: '帳戶已建立',
      message: `${account.name} 已加入帳戶管理。`,
      route: '/accounts',
    })
  }

  closeAccountModal()
}

const deleteAccount = (
  account: TradingAccount,
): void => {
  const transactionCount =
    accountStore.getTransactionsByAccountId(
      account.id,
    ).length
  const tradeCount = sortedTrades.value.filter(
    trade =>
      trade.accountId === account.id ||
      (!trade.accountId &&
        trade.account.trim().toLowerCase() ===
          account.name.trim().toLowerCase()),
  ).length
  const confirmed = window.confirm(
    `確定刪除「${account.name}」？\n\n將一併刪除 ${transactionCount} 筆資金流水；${tradeCount} 筆既有交易紀錄會保留，但不再連結此帳戶。`,
  )

  if (!confirmed) return

  accountStore.removeAccount(account.id)
  notificationStore.addNotification({
    type: 'warning',
    title: '帳戶已刪除',
    message: `${account.name} 與其資金流水已移除。`,
    route: '/accounts',
  })
}

const openNewTransaction = (
  type: AccountTransactionType = 'deposit',
): void => {
  if (!selectedAccount.value) return

  editingTransaction.value = null
  transactionPresetType.value = type
  transactionModalOpen.value = true
}

const openEditTransaction = (
  transaction: AccountTransaction,
): void => {
  editingTransaction.value = transaction
  transactionPresetType.value = transaction.type
  transactionModalOpen.value = true
}

const closeTransactionModal = (): void => {
  transactionModalOpen.value = false
  editingTransaction.value = null
}

const submitTransaction = (
  input: NewAccountTransactionInput,
): void => {
  if (editingTransaction.value) {
    const updated = accountStore.updateTransaction(
      editingTransaction.value.id,
      input,
    )

    if (updated) {
      notificationStore.addNotification({
        type: 'success',
        title: '資金紀錄已更新',
        message: `${transactionTypeLabels[updated.type]} ${formatMoney(updated.amount)} 已儲存。`,
        route: '/accounts',
      })
    }
  }
  else {
    const transaction = accountStore.addTransaction(
      input,
    )

    if (transaction) {
      notificationStore.addNotification({
        type: 'success',
        title: '資金紀錄已新增',
        message: `${transactionTypeLabels[transaction.type]} ${formatMoney(transaction.amount)} 已記錄。`,
        route: '/accounts',
      })
    }
  }

  closeTransactionModal()
}

const deleteTransaction = (
  transaction: AccountTransaction,
): void => {
  const confirmed = window.confirm(
    `確定刪除 ${transaction.date} 的「${transactionTypeLabels[transaction.type]} ${formatMoney(transaction.amount)}」？${
      transaction.balanceAfter !== null
        ? '\n\n這筆紀錄曾同步帳戶餘額；刪除後不會自動回復舊餘額。'
        : ''
    }`,
  )

  if (!confirmed) return

  accountStore.removeTransaction(transaction.id)
  notificationStore.addNotification({
    type: 'warning',
    title: '資金紀錄已刪除',
    message: '這筆流水已從帳戶中移除。',
    route: '/accounts',
  })
}

const resetFilters = (): void => {
  Object.assign(filters, {
    keyword: '',
    type: 'all',
    direction: 'all',
    dateFrom: '',
    dateTo: '',
  })
}

watch(
  sortedAccounts,
  accounts => {
    if (
      selectedAccountId.value &&
      accounts.some(
        account => account.id === selectedAccountId.value,
      )
    ) {
      return
    }

    selectedAccountId.value = accounts[0]?.id ?? null
  },
  { immediate: true },
)
</script>

<template>
  <div class="relative space-y-5 pb-12">
    <div
      class="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(circle_at_55%_-10%,rgba(56,189,248,0.07),transparent_58%)]"
    />

    <section
      class="relative isolate overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#101012] p-5 shadow-2xl shadow-black/25 sm:p-7"
    >
      <div class="pointer-events-none absolute -left-28 -top-36 h-80 w-80 rounded-full bg-sky-400/[0.09] blur-[110px]" />
      <div class="pointer-events-none absolute -bottom-40 right-0 h-80 w-80 rounded-full bg-violet-400/[0.07] blur-[110px]" />

      <div class="relative flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
        <div class="max-w-2xl">
          <div class="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300/70">
            <span class="h-1.5 w-1.5 rounded-full bg-sky-300" />
            Account command center
          </div>
          <h1 class="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
            帳戶與資金流水
          </h1>
          <p class="mt-3 text-sm leading-7 text-zinc-500 sm:text-base">
            集中管理 FTMO、模擬倉與個人真倉；每一筆入金、出金、分潤與費用都有完整紀錄。
          </p>
        </div>

        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-300 px-5 py-3.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-sky-500/10 transition hover:bg-sky-200"
          @click="openNewAccount()"
        >
          <AccountIcon name="plus" :size="18" :stroke-width="2.2" />
          建立帳戶
        </button>
      </div>

      <div class="relative mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <article class="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
          <p class="text-[10px] uppercase tracking-[0.14em] text-zinc-700">活動帳戶</p>
          <p class="mt-2 text-2xl font-semibold text-white">{{ activeAccounts.length }}</p>
          <p class="mt-1 text-xs text-zinc-600">共 {{ sortedAccounts.length }} 個帳戶</p>
        </article>
        <article class="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
          <p class="text-[10px] uppercase tracking-[0.14em] text-zinc-700">資金流水</p>
          <p class="mt-2 text-2xl font-semibold text-sky-300">{{ sortedTransactions.length }}</p>
          <p class="mt-1 text-xs text-zinc-600">每筆獨立保存</p>
        </article>
        <article class="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
          <p class="text-[10px] uppercase tracking-[0.14em] text-zinc-700">已連結交易</p>
          <p class="mt-2 text-2xl font-semibold text-emerald-300">{{ linkedTradeCount }}</p>
          <p class="mt-1 text-xs text-zinc-600">依帳戶 ID 穩定對應</p>
        </article>
        <article class="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
          <p class="text-[10px] uppercase tracking-[0.14em] text-zinc-700">分潤紀錄</p>
          <p class="mt-2 truncate text-2xl font-semibold text-violet-300">
            {{ payoutRecordCount }} 筆
          </p>
          <p class="mt-1 text-xs text-zinc-600">不跨幣別錯誤加總</p>
        </article>
      </div>

      <div v-if="portfolioByCurrency.length" class="relative mt-4 flex flex-wrap gap-2">
        <span
          v-for="group in portfolioByCurrency"
          :key="group.currency"
          class="rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-xs text-zinc-500"
        >
          {{ group.currency }} 餘額
          <strong class="ml-1 font-semibold text-zinc-300">{{ formatMoney(group.balance, group.currency) }}</strong>
          · {{ group.accounts }} 帳戶
        </span>
      </div>
    </section>

    <BrokerSyncCenter
      v-if="sortedAccounts.length"
      :accounts="sortedAccounts"
      @configure="openEditAccount"
      @sync="openMt5Sync"
    />

    <section
      v-if="sortedAccounts.length"
      class="rounded-[1.6rem] border border-white/[0.07] bg-[#111113] p-3 shadow-xl shadow-black/15"
    >
      <div class="grid gap-2 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        <button
          v-for="account in sortedAccounts"
          :key="account.id"
          type="button"
          class="group rounded-2xl border p-4 text-left transition"
          :class="
            selectedAccountId === account.id
              ? 'border-sky-400/25 bg-sky-400/[0.055]'
              : 'border-transparent bg-white/[0.02] hover:border-white/[0.08] hover:bg-white/[0.035]'
          "
          @click="selectAccount(account.id)"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-zinc-200">{{ account.name }}</p>
              <p class="mt-1 truncate text-[11px] text-zinc-700">{{ account.provider }} · {{ account.platform || '未填平台' }}</p>
            </div>
            <span class="rounded-full border px-2 py-0.5 text-[10px]" :class="statusClasses(account.status)">
              {{ statusLabels[account.status] }}
            </span>
          </div>
          <div class="mt-4 flex items-end justify-between gap-3">
            <div>
              <p class="text-[10px] text-zinc-700">目前餘額</p>
              <p class="mt-1 text-lg font-semibold text-zinc-300">{{ formatMoney(account.balance, account.currency) }}</p>
            </div>
            <AccountIcon name="chevron" :size="16" class="text-zinc-800 transition group-hover:translate-x-0.5 group-hover:text-sky-300" />
          </div>
        </button>
      </div>
    </section>

    <section
      v-else
      class="overflow-hidden rounded-[1.75rem] border border-dashed border-zinc-800 bg-[#111113] p-6 text-center sm:p-10"
    >
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-400/15 bg-sky-400/[0.06] text-sky-300">
        <AccountIcon name="account" :size="24" />
      </div>
      <h2 class="mt-5 text-xl font-semibold text-white">建立你的第一個交易帳戶</h2>
      <p class="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-600">
        不會自動產生假資料。選擇實際帳戶類型後，從真實資料開始記錄。
      </p>
      <div class="mx-auto mt-6 grid max-w-3xl gap-3 sm:grid-cols-3">
        <button
          type="button"
          class="rounded-2xl border border-violet-400/15 bg-violet-400/[0.04] p-4 text-left transition hover:border-violet-400/30"
          @click="openNewAccount('prop')"
        >
          <p class="text-sm font-semibold text-violet-300">FTMO／Prop Firm</p>
          <p class="mt-1.5 text-xs text-zinc-600">挑戰、驗證或 Funded</p>
        </button>
        <button
          type="button"
          class="rounded-2xl border border-sky-400/15 bg-sky-400/[0.04] p-4 text-left transition hover:border-sky-400/30"
          @click="openNewAccount('demo')"
        >
          <p class="text-sm font-semibold text-sky-300">模擬帳戶</p>
          <p class="mt-1.5 text-xs text-zinc-600">策略練習與流程驗證</p>
        </button>
        <button
          type="button"
          class="rounded-2xl border border-amber-400/15 bg-amber-400/[0.04] p-4 text-left transition hover:border-amber-400/30"
          @click="openNewAccount('live')"
        >
          <p class="text-sm font-semibold text-amber-300">個人真倉</p>
          <p class="mt-1.5 text-xs text-zinc-600">券商實盤與真實資金</p>
        </button>
      </div>
    </section>

    <template v-if="selectedAccount && balanceHealth && tradePerformance">
      <section
        class="overflow-hidden rounded-[1.75rem] border border-white/[0.07] bg-[#111113] shadow-xl shadow-black/20"
      >
        <header class="relative border-b border-white/[0.07] p-5 sm:p-6">
          <div class="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-violet-400/[0.06] blur-[80px]" />
          <div class="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full border px-2.5 py-1 text-[11px] font-medium" :class="typeClasses(selectedAccount.type)">
                  {{ typeLabels[selectedAccount.type] }}
                </span>
                <span class="rounded-full border px-2.5 py-1 text-[11px] font-medium" :class="statusClasses(selectedAccount.status)">
                  {{ statusLabels[selectedAccount.status] }}
                </span>
                <span v-if="selectedAccount.propStage" class="rounded-full border border-white/[0.08] px-2.5 py-1 text-[11px] text-zinc-500">
                  {{ propStageLabels[selectedAccount.propStage] }}
                </span>
                <span
                  class="rounded-full border px-2.5 py-1 text-[11px] font-medium"
                  :class="selectedAccount.dataSource === 'mt5' ? 'border-sky-400/20 bg-sky-400/[0.06] text-sky-300' : 'border-white/[0.08] text-zinc-600'"
                >
                  {{ selectedAccount.dataSource === 'mt5' ? 'MT5 Sync' : 'Manual' }}
                </span>
              </div>
              <h2 class="mt-3 text-2xl font-semibold tracking-tight text-white">{{ selectedAccount.name }}</h2>
              <p class="mt-1 text-sm text-zinc-600">
                {{ selectedAccount.provider }} · {{ selectedAccount.platform || '未填平台' }}
                <span v-if="selectedAccount.accountNumber"> · •••• {{ selectedAccount.accountNumber }}</span>
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] px-4 py-2.5 text-xs font-medium text-zinc-400 transition hover:border-sky-400/20 hover:text-sky-300"
                @click="openEditAccount(selectedAccount)"
              >
                <AccountIcon name="edit" :size="15" />
                編輯帳戶
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-xl border border-rose-400/10 px-4 py-2.5 text-xs font-medium text-rose-300/70 transition hover:border-rose-400/25 hover:bg-rose-400/[0.05]"
                @click="deleteAccount(selectedAccount)"
              >
                <AccountIcon name="trash" :size="15" />
                刪除
              </button>
            </div>
          </div>
        </header>

        <div class="grid grid-cols-2 divide-x divide-y divide-white/[0.06] sm:grid-cols-3 xl:grid-cols-6 xl:divide-y-0">
          <article class="p-4 sm:p-5">
            <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">目前餘額</p>
            <p class="mt-2 truncate text-xl font-semibold text-zinc-200">{{ formatMoney(selectedAccount.balance) }}</p>
            <p class="mt-1 text-[10px] text-zinc-700">初始 {{ formatMoney(selectedAccount.startingBalance) }}</p>
          </article>
          <article class="p-4 sm:p-5">
            <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">目前淨值</p>
            <p class="mt-2 truncate text-xl font-semibold text-sky-300">{{ formatMoney(selectedAccount.equity) }}</p>
            <p class="mt-1 text-[10px] text-zinc-700">浮動 {{ formatMoney(balanceHealth.equityDifference) }}</p>
          </article>
          <article class="p-4 sm:p-5">
            <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">帳戶報酬</p>
            <p class="mt-2 text-xl font-semibold" :class="pnlClasses(balanceHealth.returnPercent)">
              {{ balanceHealth.returnPercent > 0 ? '+' : '' }}{{ balanceHealth.returnPercent.toFixed(2) }}%
            </p>
            <p class="mt-1 text-[10px] text-zinc-700">{{ formatMoney(balanceHealth.profitLoss) }}</p>
          </article>
          <article class="p-4 sm:p-5">
            <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">交易盈虧</p>
            <p class="mt-2 truncate text-xl font-semibold" :class="pnlClasses(tradePerformance.totalProfitLoss)">
              {{ tradePerformance.totalProfitLoss > 0 ? '+' : '' }}{{ formatMoney(tradePerformance.totalProfitLoss) }}
            </p>
            <p class="mt-1 text-[10px] text-zinc-700">{{ tradePerformance.totalTrades }} 筆已連結</p>
          </article>
          <article class="p-4 sm:p-5">
            <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">勝率</p>
            <p class="mt-2 text-xl font-semibold text-emerald-300">{{ tradePerformance.winRate }}%</p>
            <p class="mt-1 text-[10px] text-zinc-700">平均 {{ tradePerformance.averageR.toFixed(2) }}R</p>
          </article>
          <article class="p-4 sm:p-5">
            <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">資金異動</p>
            <p class="mt-2 text-xl font-semibold text-violet-300">{{ cashflowSummary.count }}</p>
            <p class="mt-1 text-[10px] text-zinc-700">筆完整流水</p>
          </article>
        </div>

        <div v-if="selectedAccount.type === 'prop'" class="border-t border-white/[0.07] p-5 sm:p-6">
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-400/[0.07] text-violet-300">
              <AccountIcon name="shield" :size="17" />
            </div>
            <div>
              <p class="text-sm font-medium text-zinc-300">Prop Firm 規則快照</p>
              <p class="mt-0.5 text-[11px] text-zinc-700">依實際方案記錄，不取代官方帳戶規則。</p>
            </div>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-4">
            <div class="rounded-xl border border-white/[0.055] bg-black/15 p-3.5">
              <p class="text-[10px] text-zinc-700">獲利目標</p>
              <p class="mt-1.5 text-sm font-semibold text-zinc-300">{{ selectedAccount.profitTargetPercent ?? '—' }}%</p>
            </div>
            <div class="rounded-xl border border-white/[0.055] bg-black/15 p-3.5">
              <p class="text-[10px] text-zinc-700">單日虧損上限</p>
              <p class="mt-1.5 text-sm font-semibold text-rose-300">{{ selectedAccount.maxDailyLossPercent ?? '—' }}%</p>
            </div>
            <div class="rounded-xl border border-white/[0.055] bg-black/15 p-3.5">
              <p class="text-[10px] text-zinc-700">總虧損上限</p>
              <p class="mt-1.5 text-sm font-semibold text-rose-300">{{ selectedAccount.maxDrawdownPercent ?? '—' }}%</p>
            </div>
            <div class="rounded-xl border border-white/[0.055] bg-black/15 p-3.5">
              <p class="text-[10px] text-zinc-700">分潤比例</p>
              <p class="mt-1.5 text-sm font-semibold text-emerald-300">{{ selectedAccount.profitSplitPercent ?? '—' }}%</p>
            </div>
          </div>
          <div v-if="selectedAccount.maxDrawdownPercent" class="mt-4">
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-zinc-700">總虧損額度使用率</span>
              <span :class="balanceHealth.drawdownUsagePercent >= 70 ? 'text-rose-300' : 'text-zinc-500'">
                {{ balanceHealth.drawdownUsagePercent.toFixed(1) }}%
              </span>
            </div>
            <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div
                class="h-full rounded-full transition-all"
                :class="balanceHealth.drawdownUsagePercent >= 70 ? 'bg-rose-400' : 'bg-violet-400'"
                :style="{ width: `${balanceHealth.drawdownUsagePercent}%` }"
              />
            </div>
          </div>
        </div>

        <div v-if="selectedAccount.notes" class="border-t border-white/[0.07] px-5 py-4 text-xs leading-6 text-zinc-600 sm:px-6">
          {{ selectedAccount.notes }}
        </div>
      </section>

      <AccountPerformanceCard
        :account="selectedAccount"
        :trades="sortedTrades"
      />

      <section class="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <article class="rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.035] p-4">
          <p class="text-[10px] uppercase tracking-[0.12em] text-emerald-300/50">累計入金</p>
          <p class="mt-2 truncate text-xl font-semibold text-emerald-300">{{ formatMoney(cashflowSummary.deposits) }}</p>
          <p class="mt-1 text-[10px] text-zinc-700">退款 {{ formatMoney(cashflowSummary.refunds) }}</p>
        </article>
        <article class="rounded-2xl border border-rose-400/10 bg-rose-400/[0.035] p-4">
          <p class="text-[10px] uppercase tracking-[0.12em] text-rose-300/50">累計出金</p>
          <p class="mt-2 truncate text-xl font-semibold text-rose-300">{{ formatMoney(cashflowSummary.withdrawals) }}</p>
          <p class="mt-1 text-[10px] text-zinc-700">一般資金提領</p>
        </article>
        <article class="rounded-2xl border border-violet-400/10 bg-violet-400/[0.035] p-4">
          <p class="text-[10px] uppercase tracking-[0.12em] text-violet-300/50">分潤出金</p>
          <p class="mt-2 truncate text-xl font-semibold text-violet-300">{{ formatMoney(cashflowSummary.payouts) }}</p>
          <p class="mt-1 text-[10px] text-zinc-700">Prop Firm Payout</p>
        </article>
        <article class="rounded-2xl border border-amber-400/10 bg-amber-400/[0.035] p-4">
          <p class="text-[10px] uppercase tracking-[0.12em] text-amber-300/50">費用支出</p>
          <p class="mt-2 truncate text-xl font-semibold text-amber-300">{{ formatMoney(cashflowSummary.fees) }}</p>
          <p class="mt-1 text-[10px] text-zinc-700">挑戰費與平台費</p>
        </article>
      </section>

      <section class="overflow-hidden rounded-[1.75rem] border border-white/[0.07] bg-[#111113] shadow-xl shadow-black/20">
        <header class="border-b border-white/[0.07] p-5 sm:p-6">
          <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300/60">Cash ledger</p>
              <h2 class="mt-1.5 text-lg font-semibold text-white">資金流水明細</h2>
              <p class="mt-1 text-xs text-zinc-600">顯示 {{ filteredTransactions.length }}／{{ selectedTransactions.length }} 筆</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.05] px-4 py-2.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-400/[0.09]"
                @click="openNewTransaction('deposit')"
              >
                <AccountIcon name="arrow-down" :size="15" />
                入金
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-xl border border-rose-400/15 bg-rose-400/[0.05] px-4 py-2.5 text-xs font-medium text-rose-300 transition hover:bg-rose-400/[0.09]"
                @click="openNewTransaction('withdrawal')"
              >
                <AccountIcon name="arrow-up" :size="15" />
                出金
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-xl bg-sky-300 px-4 py-2.5 text-xs font-semibold text-zinc-950 transition hover:bg-sky-200"
                @click="openNewTransaction()"
              >
                <AccountIcon name="plus" :size="15" :stroke-width="2.2" />
                新增紀錄
              </button>
            </div>
          </div>

          <div class="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_170px_150px_155px_155px_auto]">
            <label class="relative">
              <AccountIcon name="search" :size="15" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-700" />
              <input
                v-model="filters.keyword"
                type="search"
                placeholder="搜尋方式、參考碼或備註…"
                class="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 pl-10 pr-3 text-xs text-zinc-300 outline-none placeholder:text-zinc-700 focus:border-sky-400/25"
              />
            </label>
            <select
              v-model="filters.type"
              class="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-400 outline-none focus:border-sky-400/25"
            >
              <option value="all">全部類型</option>
              <option v-for="(label, value) in transactionTypeLabels" :key="value" :value="value">{{ label }}</option>
            </select>
            <select
              v-model="filters.direction"
              class="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-400 outline-none focus:border-sky-400/25"
            >
              <option value="all">全部方向</option>
              <option value="in">資金增加</option>
              <option value="out">資金減少</option>
            </select>
            <input
              v-model="filters.dateFrom"
              type="date"
              aria-label="起始日期"
              class="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-400 outline-none focus:border-sky-400/25"
            />
            <input
              v-model="filters.dateTo"
              type="date"
              aria-label="結束日期"
              class="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-400 outline-none focus:border-sky-400/25"
            />
            <button
              v-if="hasFilters"
              type="button"
              class="rounded-xl border border-white/[0.07] px-3 py-2.5 text-xs text-zinc-600 transition hover:text-zinc-300"
              @click="resetFilters"
            >
              清除
            </button>
          </div>
        </header>

        <AccountLedgerTable
          :account="selectedAccount"
          :transactions="filteredTransactions"
          :total-count="selectedTransactions.length"
          @edit="openEditTransaction"
          @remove="deleteTransaction"
        />
      </section>
    </template>

    <AccountFormModal
      :open="accountModalOpen"
      :account="editingAccount"
      :preset-type="accountPresetType"
      @close="closeAccountModal"
      @submit="submitAccount"
    />

    <TransactionFormModal
      :open="transactionModalOpen"
      :account="selectedAccount"
      :transaction="editingTransaction"
      :preset-type="transactionPresetType"
      @close="closeTransactionModal"
      @submit="submitTransaction"
    />

    <Mt5SyncModal
      :open="mt5SyncModalOpen"
      :account="mt5SyncAccount"
      @close="closeMt5Sync"
      @synced="handleMt5Synced"
    />
  </div>
</template>
