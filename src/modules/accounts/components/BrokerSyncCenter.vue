<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import AccountIcon from './AccountIcon.vue'
import {
  getMt5CredentialStatus,
  getMt5SyncHealth,
  isMt5AgentCompatible,
  MT5_SYNC_MIN_AGENT_VERSION,
  mt5SyncRuntime,
  syncMt5Account,
} from '@/services/mt5-sync-client.service'
import { useNotificationStore } from '@/stores/useNotificationStore'
import { useConfirmDialogStore } from '@/stores/useConfirmDialogStore'
import { useTradeStore } from '@/stores/useTradeStore'

import type { TradingAccount } from '@/types/account'

const props = defineProps<{
  accounts: TradingAccount[]
}>()

const emit = defineEmits<{
  configure: [account: TradingAccount]
  sync: [account: TradingAccount]
}>()

const notificationStore = useNotificationStore()
const confirmDialog = useConfirmDialogStore()
const tradeStore = useTradeStore()
const credentialStates = ref<Record<string, boolean | null>>({})
const refreshing = ref(false)
const syncingAll = ref(false)
const rebuildingAccountId = ref<string | null>(null)
let refreshTimer: number | null = null

const mt5Accounts = computed(() =>
  props.accounts.filter(account => account.dataSource === 'mt5'),
)

const runnableAccounts = computed(() =>
  mt5Accounts.value.filter(account =>
    account.status !== 'closed' &&
    Boolean(account.brokerLogin) &&
    Boolean(account.brokerServer),
  ),
)

const agentCompatible = computed(() =>
  isMt5AgentCompatible(mt5SyncRuntime.agentHealth?.version),
)

const pairedCount = computed(() =>
  runnableAccounts.value.filter(account => credentialStates.value[account.id] === true).length,
)

const healthyCount = computed(() =>
  runnableAccounts.value.filter(account => account.syncStatus === 'connected').length,
)

const errorCount = computed(() =>
  runnableAccounts.value.filter(account => account.syncStatus === 'error').length,
)

const overallLabel = computed(() => {
  if (!mt5SyncRuntime.agentOnline) return 'AGENT OFFLINE'
  if (!agentCompatible.value) return 'UPDATE REQUIRED'
  if (syncingAll.value || runnableAccounts.value.some(account => account.syncStatus === 'syncing')) return 'SYNCING'
  if (errorCount.value > 0) return 'NEEDS ATTENTION'
  return 'HEALTHY'
})

const overallClasses = computed(() => {
  if (!mt5SyncRuntime.agentOnline || errorCount.value > 0) {
    return 'border-rose-400/20 bg-rose-400/[0.06] text-rose-300'
  }
  if (!agentCompatible.value) {
    return 'border-amber-400/20 bg-amber-400/[0.06] text-amber-300'
  }
  if (syncingAll.value) {
    return 'border-sky-400/20 bg-sky-400/[0.06] text-sky-300'
  }
  return 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300'
})

const accountStatus = (account: TradingAccount): { label: string; classes: string } => {
  if (account.syncStatus === 'syncing') {
    return { label: '同步中', classes: 'text-sky-300' }
  }
  if (account.syncStatus === 'error') {
    return { label: '同步異常', classes: 'text-rose-300' }
  }
  if (!account.lastSyncedAt) {
    return { label: '等待首次同步', classes: 'text-amber-300' }
  }
  return { label: '正常', classes: 'text-emerald-300' }
}

const lastSyncedLabel = (value: string | null): string => {
  if (!value) return '尚未同步'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

const loginLabel = (login: string): string => {
  if (login.length <= 4) return login || '—'
  return `•••• ${login.slice(-4)}`
}

const resultLabel = (account: TradingAccount): string | null => {
  const runtime = mt5SyncRuntime.accountRuns[account.id]
  if (!runtime?.result || runtime.status !== 'success') return null
  const result = runtime.result
  const pieces: string[] = []
  if (result.addedTrades > 0) pieces.push(`新交易 ${result.addedTrades}`)
  if (result.updatedTrades > 0) pieces.push(`更新 ${result.updatedTrades}`)
  if (result.tradesReadyForReview > 0) pieces.push(`待復盤 ${result.tradesReadyForReview}`)
  if (result.addedCashflows > 0) pieces.push(`流水 ${result.addedCashflows}`)
  return pieces.length ? pieces.join(' · ') : '已是最新資料'
}

const refreshStatus = async (): Promise<void> => {
  if (refreshing.value) return
  refreshing.value = true
  try {
    const health = await getMt5SyncHealth()
    if (!health || !isMt5AgentCompatible(health.version)) return

    const pairs = await Promise.all(
      runnableAccounts.value.map(async account => [
        account.id,
        await getMt5CredentialStatus(account.id),
      ] as const),
    )
    credentialStates.value = Object.fromEntries(pairs)
  }
  finally {
    refreshing.value = false
  }
}

const syncAll = async (): Promise<void> => {
  if (syncingAll.value) return
  syncingAll.value = true

  try {
    const health = await getMt5SyncHealth()
    if (!health) {
      notificationStore.addNotification({
        type: 'danger',
        title: 'MT5 Agent 離線',
        message: '請先啟動 Freedom MT5 Sync Service。',
        route: '/accounts',
      })
      return
    }
    if (!isMt5AgentCompatible(health.version)) {
      notificationStore.addNotification({
        type: 'warning',
        title: 'MT5 Agent 版本過舊',
        message: `需要 ${MT5_SYNC_MIN_AGENT_VERSION} 以上，目前是 ${health.version}。`,
        route: '/accounts',
      })
      return
    }

    await refreshStatus()
    const targets = runnableAccounts.value.filter(account => credentialStates.value[account.id] === true)
    let succeeded = 0
    let failed = 0
    let newTrades = 0
    let readyForReview = 0

    for (const account of targets) {
      try {
        const result = await syncMt5Account(account, null, { background: true })
        succeeded += 1
        newTrades += result.addedTrades
        readyForReview += result.tradesReadyForReview
      }
      catch {
        failed += 1
      }
    }

    const unpaired = runnableAccounts.value.length - targets.length
    notificationStore.addNotification({
      type: failed > 0 ? 'warning' : 'success',
      title: '多帳戶同步完成',
      message: `成功 ${succeeded} · 失敗 ${failed} · 新交易 ${newTrades} · 待復盤 ${readyForReview}${unpaired ? ` · ${unpaired} 個待配對` : ''}`,
      route: '/accounts',
    })
  }
  finally {
    syncingAll.value = false
    await refreshStatus()
  }
}

const rebuildAccountTrades = async (account: TradingAccount): Promise<void> => {
  if (rebuildingAccountId.value || account.syncStatus === 'syncing') return

  const linkedTrades = tradeStore.trades.filter(trade =>
    trade.dataSource === 'mt5' &&
    (
      trade.accountId === account.id ||
      (!trade.accountId && trade.account.trim().toLowerCase() === account.name.trim().toLowerCase())
    ),
  )
  const confirmed = await confirmDialog.ask({
    title: `完整重建「${account.name}」交易？`,
    message: `將以 MT5 全部歷史取代目前 ${linkedTrades.length} 筆同步交易，相關復盤與交易截圖也會清除。帳戶、入金、出金及手動交易不受影響。`,
    confirmLabel: '完整重建',
    tone: 'danger',
  })
  if (!confirmed) return

  rebuildingAccountId.value = account.id
  try {
    const result = await syncMt5Account(account, null, {
      fullHistory: true,
      rebuildTrades: true,
    })
    notificationStore.addNotification({
      type: 'success',
      title: 'MT5 交易重建完成',
      message: `${account.name} 已從最早歷史重新建立 ${result.addedTrades} 筆交易。`,
      route: '/trades',
    })
  }
  catch (error) {
    notificationStore.addNotification({
      type: 'danger',
      title: 'MT5 交易重建未完成',
      message: error instanceof Error ? error.message : '請確認 MT5 Agent 與帳戶連線後重試。',
      route: '/accounts',
    })
  }
  finally {
    rebuildingAccountId.value = null
    await refreshStatus()
  }
}

onMounted(() => {
  void refreshStatus()
  refreshTimer = window.setInterval(() => { void refreshStatus() }, 10_000)
})

onBeforeUnmount(() => {
  if (refreshTimer !== null) window.clearInterval(refreshTimer)
})
</script>

<template>
  <section
    v-if="mt5Accounts.length"
    class="overflow-hidden rounded-[1.75rem] border border-sky-400/10 bg-[#101012] shadow-xl shadow-black/20"
  >
    <header class="flex flex-col gap-4 border-b border-white/[0.07] p-5 lg:flex-row lg:items-center lg:justify-between sm:p-6">
      <div class="flex items-center gap-3">
        <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-400/[0.08] text-sky-300">
          <AccountIcon name="activity" :size="19" />
        </div>
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300/55">Broker Sync Center v2</p>
            <span class="rounded-full border px-2 py-0.5 text-[9px] font-semibold tracking-wide" :class="overallClasses">
              {{ overallLabel }}
            </span>
          </div>
          <h2 class="mt-1 text-base font-semibold text-zinc-100">MT5 Multi-Account Control</h2>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="rounded-xl border border-white/[0.08] px-3.5 py-2.5 text-xs text-zinc-500 transition hover:text-zinc-300 disabled:opacity-40"
          :disabled="refreshing || syncingAll"
          @click="refreshStatus"
        >
          {{ refreshing ? '偵測中…' : '重新偵測' }}
        </button>
        <button
          type="button"
          class="rounded-xl bg-sky-300 px-4 py-2.5 text-xs font-semibold text-zinc-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
          :disabled="syncingAll || !mt5SyncRuntime.agentOnline || !agentCompatible || pairedCount === 0"
          @click="syncAll"
        >
          {{ syncingAll ? '正在輪流同步…' : '全部立即同步' }}
        </button>
      </div>
    </header>

    <div class="grid grid-cols-2 border-b border-white/[0.07] lg:grid-cols-4">
      <div class="border-b border-r border-white/[0.06] p-4 lg:border-b-0 sm:px-5">
        <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">Local Agent</p>
        <p class="mt-1.5 text-sm font-semibold" :class="mt5SyncRuntime.agentOnline ? 'text-emerald-300' : 'text-rose-300'">
          {{ mt5SyncRuntime.agentOnline ? 'ONLINE' : 'OFFLINE' }}
        </p>
      </div>
      <div class="border-b border-white/[0.06] p-4 lg:border-b-0 lg:border-r sm:px-5">
        <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">Agent Version</p>
        <p class="mt-1.5 text-sm font-semibold" :class="agentCompatible ? 'text-zinc-300' : 'text-amber-300'">
          {{ mt5SyncRuntime.agentHealth?.version ? `v${mt5SyncRuntime.agentHealth.version}` : '—' }}
          <span v-if="mt5SyncRuntime.agentOnline && !agentCompatible" class="ml-1 text-[10px]">需更新</span>
        </p>
      </div>
      <div class="border-r border-white/[0.06] p-4 sm:px-5">
        <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">Secure Paired</p>
        <p class="mt-1.5 text-sm font-semibold text-sky-300">{{ pairedCount }} / {{ runnableAccounts.length }}</p>
      </div>
      <div class="p-4 sm:px-5">
        <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">Account Health</p>
        <p class="mt-1.5 text-sm font-semibold" :class="errorCount ? 'text-rose-300' : 'text-emerald-300'">
          {{ healthyCount }} 正常<span v-if="errorCount"> · {{ errorCount }} 異常</span>
        </p>
      </div>
    </div>

    <div v-if="!mt5SyncRuntime.agentOnline" class="border-b border-rose-400/10 bg-rose-400/[0.035] px-5 py-3.5 text-xs text-rose-200/70 sm:px-6">
      Freedom MT5 Sync Service 目前沒有回應。帳戶資料會保留；Agent 恢復後背景同步會自動繼續。
    </div>
    <div v-else-if="!agentCompatible" class="border-b border-amber-400/10 bg-amber-400/[0.035] px-5 py-3.5 text-xs text-amber-200/70 sm:px-6">
      網站需要 Agent v{{ MT5_SYNC_MIN_AGENT_VERSION }} 以上，目前為 v{{ mt5SyncRuntime.agentHealth?.version }}。請使用此版本專案內的 MT5 Agent。
    </div>

    <div class="divide-y divide-white/[0.06]">
      <article
        v-for="account in mt5Accounts"
        :key="account.id"
        class="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(180px,1.25fr)_minmax(160px,1fr)_minmax(150px,.9fr)_minmax(170px,1.1fr)_auto] lg:items-center sm:px-6"
      >
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span
              class="h-2 w-2 shrink-0 rounded-full"
              :class="account.syncStatus === 'error' ? 'bg-rose-300' : account.syncStatus === 'syncing' ? 'animate-pulse bg-sky-300' : account.lastSyncedAt ? 'bg-emerald-300' : 'bg-amber-300'"
            />
            <p class="truncate text-sm font-semibold text-zinc-200">{{ account.name }}</p>
          </div>
          <p class="mt-1 truncate pl-4 text-[10px] text-zinc-700">{{ account.provider }} · {{ account.brokerServer || 'Server 未設定' }}</p>
        </div>

        <div>
          <p class="text-[9px] uppercase tracking-[0.1em] text-zinc-800">MT5 LOGIN</p>
          <p class="mt-1 text-xs text-zinc-500">{{ loginLabel(account.brokerLogin) }}</p>
        </div>

        <div>
          <p class="text-[9px] uppercase tracking-[0.1em] text-zinc-800">WINDOWS CREDENTIAL</p>
          <p
            class="mt-1 text-xs font-medium"
            :class="credentialStates[account.id] === true ? 'text-emerald-300' : credentialStates[account.id] === false ? 'text-amber-300' : 'text-zinc-600'"
          >
            {{ credentialStates[account.id] === true ? '已安全配對' : credentialStates[account.id] === false ? '需要配對' : '偵測中…' }}
          </p>
        </div>

        <div class="min-w-0">
          <p class="text-xs font-medium" :class="accountStatus(account).classes">{{ accountStatus(account).label }}</p>
          <p class="mt-1 truncate text-[10px] text-zinc-700">{{ lastSyncedLabel(account.lastSyncedAt) }}</p>
          <p v-if="resultLabel(account)" class="mt-1 truncate text-[10px] text-sky-300/60">{{ resultLabel(account) }}</p>
          <p v-else-if="account.syncError" class="mt-1 line-clamp-2 text-[10px] leading-4 text-rose-300/70">{{ account.syncError }}</p>
        </div>

        <div class="flex gap-2 lg:justify-end">
          <button
            type="button"
            class="rounded-lg border border-rose-400/15 bg-rose-400/[0.04] px-3 py-2 text-[10px] text-rose-300 transition hover:bg-rose-400/[0.09] disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="rebuildingAccountId !== null || account.syncStatus === 'syncing' || !mt5SyncRuntime.agentOnline || !agentCompatible || credentialStates[account.id] !== true"
            @click="rebuildAccountTrades(account)"
          >
            {{ rebuildingAccountId === account.id ? '重建中…' : '完整重建' }}
          </button>
          <button
            type="button"
            class="rounded-lg border border-white/[0.07] px-3 py-2 text-[10px] text-zinc-600 transition hover:text-zinc-300"
            @click="emit('configure', account)"
          >
            設定
          </button>
          <button
            type="button"
            class="rounded-lg border border-sky-400/15 bg-sky-400/[0.05] px-3 py-2 text-[10px] font-medium text-sky-300 transition hover:bg-sky-400/[0.1] disabled:opacity-40"
            :disabled="account.syncStatus === 'syncing'"
            @click="emit('sync', account)"
          >
            {{ credentialStates[account.id] === true ? '同步' : '配對' }}
          </button>
        </div>
      </article>
    </div>

    <footer class="border-t border-white/[0.06] px-5 py-3.5 text-[10px] leading-5 text-zinc-700 sm:px-6">
      AUTO RECOVERY · Agent 每 20 秒檢查一次。已安全配對的帳戶若短暫斷線或同步失敗，會在冷卻後自動重試，不需要重新輸入密碼。
    </footer>
  </section>
</template>
