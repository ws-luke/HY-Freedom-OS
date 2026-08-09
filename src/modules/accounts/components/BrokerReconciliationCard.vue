<script setup lang="ts">
import { computed } from 'vue'
import {
  brokerReconciliationRuntime,
  refreshBrokerReconciliation,
} from '@/services/broker-reconciliation.service'
import type { TradingAccount } from '@/types/account'

const props = defineProps<{
  accounts: TradingAccount[]
}>()

const mt5Accounts = computed(() => props.accounts.filter(account => account.dataSource === 'mt5'))

const status = computed(() => {
  if (brokerReconciliationRuntime.state === 'checking') return { label: 'CHECKING', classes: 'border-sky-500/20 bg-sky-500/[0.06] text-sky-300' }
  if (brokerReconciliationRuntime.state === 'healthy') return { label: 'IN SYNC', classes: 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300' }
  if (brokerReconciliationRuntime.state === 'warning') return { label: 'REVIEW NEEDED', classes: 'border-amber-500/20 bg-amber-500/[0.06] text-amber-300' }
  if (brokerReconciliationRuntime.state === 'error') return { label: 'CHECK FAILED', classes: 'border-rose-500/20 bg-rose-500/[0.06] text-rose-300' }
  if (brokerReconciliationRuntime.state === 'unavailable') return { label: 'WAITING LEDGER', classes: 'border-zinc-700 bg-zinc-800/50 text-zinc-400' }
  return { label: 'READY', classes: 'border-zinc-700 bg-zinc-800/50 text-zinc-400' }
})

const timeLabel = (value: string | null): string => {
  if (!value) return '尚未核對'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-TW', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(date)
}

const accountState = (accountId: string) => brokerReconciliationRuntime.accountStates[accountId]

const runCheck = (): void => {
  void refreshBrokerReconciliation()
}
</script>

<template>
  <section class="overflow-hidden rounded-[1.8rem] border border-emerald-500/15 bg-zinc-900/70 shadow-xl shadow-black/15">
    <header class="flex flex-col gap-4 border-b border-white/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300/60">BROKER RECONCILIATION V1</p>
          <span class="rounded-full border px-2.5 py-1 text-[9px] font-semibold" :class="status.classes">{{ status.label }}</span>
        </div>
        <h2 class="mt-2 text-lg font-semibold text-zinc-100">Ledger ↔ Freedom Journal 完整性核對</h2>
        <p class="mt-1 text-xs leading-5 text-zinc-600">Broker 成交欄位可自動補齊；Signal、Playbook、理由、截圖與復盤內容永遠由 Journal 保留。</p>
      </div>
      <button
        type="button"
        :disabled="brokerReconciliationRuntime.running"
        class="shrink-0 rounded-xl border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-400 transition hover:border-emerald-500/30 hover:text-emerald-300 disabled:cursor-wait disabled:opacity-50"
        @click="runCheck"
      >
        {{ brokerReconciliationRuntime.running ? '核對中…' : '立即核對' }}
      </button>
    </header>

    <div class="grid grid-cols-2 gap-px bg-white/[0.06] lg:grid-cols-4">
      <div class="bg-zinc-900/70 p-4 sm:p-5">
        <p class="text-[9px] uppercase tracking-[0.12em] text-zinc-700">Ledger trades</p>
        <p class="mt-2 text-xl font-semibold text-zinc-200">{{ brokerReconciliationRuntime.ledgerTrades }}</p>
        <p class="mt-1 text-[10px] text-zinc-700">Journal MT5 {{ brokerReconciliationRuntime.localTrades }} 筆</p>
      </div>
      <div class="bg-zinc-900/70 p-4 sm:p-5">
        <p class="text-[9px] uppercase tracking-[0.12em] text-zinc-700">Cashflows</p>
        <p class="mt-2 text-xl font-semibold text-sky-300">{{ brokerReconciliationRuntime.ledgerCashflows }}</p>
        <p class="mt-1 text-[10px] text-zinc-700">帳戶流水 {{ brokerReconciliationRuntime.localCashflows }} 筆</p>
      </div>
      <div class="bg-zinc-900/70 p-4 sm:p-5">
        <p class="text-[9px] uppercase tracking-[0.12em] text-zinc-700">Auto repaired</p>
        <p class="mt-2 text-xl font-semibold" :class="brokerReconciliationRuntime.repaired ? 'text-amber-300' : 'text-emerald-300'">{{ brokerReconciliationRuntime.repaired }}</p>
        <p class="mt-1 text-[10px] text-zinc-700">本次核對安全補齊</p>
      </div>
      <div class="bg-zinc-900/70 p-4 sm:p-5">
        <p class="text-[9px] uppercase tracking-[0.12em] text-zinc-700">Duplicates</p>
        <p class="mt-2 text-xl font-semibold" :class="brokerReconciliationRuntime.duplicates ? 'text-rose-300' : 'text-emerald-300'">{{ brokerReconciliationRuntime.duplicates }}</p>
        <p class="mt-1 text-[10px] text-zinc-700">不自動刪除，避免誤傷 Journal</p>
      </div>
    </div>

    <div v-if="brokerReconciliationRuntime.lastError" class="border-t border-rose-500/10 bg-rose-500/[0.035] px-5 py-3 text-xs text-rose-300/80 sm:px-6">
      {{ brokerReconciliationRuntime.lastError }}
    </div>

    <div v-if="mt5Accounts.length" class="divide-y divide-white/[0.05] border-t border-white/[0.06]">
      <div v-for="account in mt5Accounts" :key="account.id" class="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_repeat(4,auto)] sm:items-center sm:px-6">
        <div class="min-w-0">
          <p class="truncate text-sm font-medium text-zinc-300">{{ account.name }}</p>
          <p class="mt-1 text-[9px] text-zinc-700">{{ account.provider }} · {{ account.brokerServer || 'MT5' }}</p>
        </div>
        <div class="text-left sm:text-right"><p class="text-[9px] text-zinc-700">Ledger / Journal</p><p class="mt-1 text-xs text-zinc-400">{{ accountState(account.id)?.ledgerTrades ?? 0 }} / {{ accountState(account.id)?.localTrades ?? 0 }}</p></div>
        <div class="text-left sm:text-right"><p class="text-[9px] text-zinc-700">修復</p><p class="mt-1 text-xs" :class="accountState(account.id)?.repaired ? 'text-amber-300' : 'text-emerald-300'">{{ accountState(account.id)?.repaired ?? 0 }}</p></div>
        <div class="text-left sm:text-right"><p class="text-[9px] text-zinc-700">重複</p><p class="mt-1 text-xs" :class="accountState(account.id)?.duplicates ? 'text-rose-300' : 'text-emerald-300'">{{ accountState(account.id)?.duplicates ?? 0 }}</p></div>
        <div class="text-left sm:text-right"><p class="text-[9px] text-zinc-700">狀態</p><p class="mt-1 text-xs" :class="accountState(account.id)?.duplicates ? 'text-amber-300' : 'text-emerald-300'">{{ accountState(account.id) ? accountState(account.id)?.duplicates ? '需檢查' : '一致' : '等待核對' }}</p></div>
      </div>
    </div>

    <footer class="flex flex-col gap-1 border-t border-white/[0.06] bg-black/10 px-5 py-3 text-[10px] text-zinc-700 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <span>上次核對 {{ timeLabel(brokerReconciliationRuntime.lastCheckedAt) }}</span>
      <span v-if="brokerReconciliationRuntime.lastRepairedAt">上次自動修復 {{ timeLabel(brokerReconciliationRuntime.lastRepairedAt) }}</span>
      <span v-else>未發現需要修復的資料</span>
    </footer>
  </section>
</template>
