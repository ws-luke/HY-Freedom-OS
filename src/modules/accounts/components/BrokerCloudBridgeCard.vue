<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import AccountIcon from './AccountIcon.vue'
import {
  BROKER_AGENT_STALE_MS,
  brokerCloudBridgeRuntime,
  getCloudBridgeAgentStatus,
  isBrokerAgentHeartbeatStale,
  pairCloudBridgeAgent,
  refreshBrokerCloudBridge,
  unpairCloudBridgeAgent,
} from '@/services/broker-cloud-bridge.service'
import { getCloudIdentity } from '@/services/cloud/cloud-auth.service'
import { getMt5SyncHealth, isMt5AgentCompatible, mt5SyncRuntime } from '@/services/mt5-sync-client.service'
import { useNotificationStore } from '@/stores/useNotificationStore'
import type { TradingAccount } from '@/types/account'

const props = defineProps<{
  accounts: TradingAccount[]
}>()

const notificationStore = useNotificationStore()
const email = ref('')
const password = ref('')
const pairing = ref(false)
const checking = ref(false)
const localAgentPaired = ref(false)
const pairedEmail = ref<string | null>(null)
const agentCycleAt = ref<string | null>(null)
const agentError = ref<string | null>(null)
let timer: number | null = null

const mt5Accounts = computed(() => props.accounts.filter(account => account.dataSource === 'mt5'))
const effectiveHeartbeat = computed(() => agentCycleAt.value || brokerCloudBridgeRuntime.agentLastSeen)
const cloudAgentSeen = computed(() => Boolean(effectiveHeartbeat.value))
const cloudAgentFresh = computed(() => !isBrokerAgentHeartbeatStale(effectiveHeartbeat.value))
const autostartEnabled = computed(() =>
  mt5SyncRuntime.agentHealth?.backgroundAutostart === true || brokerCloudBridgeRuntime.autostartEnabled,
)
const bridgeHealthy = computed(() =>
  brokerCloudBridgeRuntime.available &&
  !brokerCloudBridgeRuntime.reliabilityUpgradeRequired &&
  cloudAgentFresh.value &&
  !brokerCloudBridgeRuntime.lastError &&
  !agentError.value,
)

const statusLabel = computed(() => {
  if (!brokerCloudBridgeRuntime.available) return 'DATABASE UPGRADE REQUIRED'
  if (brokerCloudBridgeRuntime.reliabilityUpgradeRequired) return 'RELIABILITY V2 UPGRADE REQUIRED'
  if (mt5SyncRuntime.agentOnline && !isMt5AgentCompatible(mt5SyncRuntime.agentHealth?.version)) return 'AGENT UPDATE REQUIRED'
  if (bridgeHealthy.value) return 'CLOUD BRIDGE HEALTHY'
  if (cloudAgentSeen.value && !cloudAgentFresh.value) return 'AGENT HEARTBEAT STALE'
  if (mt5SyncRuntime.agentOnline && !localAgentPaired.value) return 'PAIR THIS PC'
  if (localAgentPaired.value && !cloudAgentSeen.value) return 'WAITING FIRST HEARTBEAT'
  return 'WAITING FOR WINDOWS AGENT'
})

const statusClasses = computed(() => {
  if (bridgeHealthy.value) return 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300'
  if (!brokerCloudBridgeRuntime.available || brokerCloudBridgeRuntime.reliabilityUpgradeRequired) {
    return 'border-amber-400/20 bg-amber-400/[0.06] text-amber-300'
  }
  if (cloudAgentSeen.value && !cloudAgentFresh.value) {
    return 'border-rose-400/20 bg-rose-400/[0.06] text-rose-300'
  }
  return 'border-sky-400/20 bg-sky-400/[0.06] text-sky-300'
})

const timeLabel = (value: string | null): string => {
  if (!value) return '尚未回報'
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

const accountCloudStatus = (account: TradingAccount): { label: string; classes: string } => {
  const state = brokerCloudBridgeRuntime.accountStates[account.id]
  if (!state) return { label: '等待 Agent 回報', classes: 'text-zinc-500' }
  if (isBrokerAgentHeartbeatStale(state.lastHeartbeatAt)) return { label: 'Agent 離線', classes: 'text-rose-300' }
  if (state.status === 'error') {
    return {
      label: state.nextRetryAt ? '異常 · 自動重試' : '需要處理',
      classes: 'text-rose-300',
    }
  }
  if (state.status === 'syncing') return { label: '同步中', classes: 'text-sky-300' }
  if (state.pending) return { label: '等待 Freedom OS 接收', classes: 'text-amber-300' }
  if (state.lastSuccessAt) return { label: '正常', classes: 'text-emerald-300' }
  return { label: '已連線 · 等待首次同步', classes: 'text-sky-300' }
}

const refresh = async (): Promise<void> => {
  if (checking.value) return
  checking.value = true
  try {
    const [identity, health, agentStatus] = await Promise.all([
      getCloudIdentity().catch(() => null),
      getMt5SyncHealth(),
      getCloudBridgeAgentStatus(),
      refreshBrokerCloudBridge(),
    ])
    if (identity?.email && !email.value) email.value = identity.email
    if (health && agentStatus) {
      localAgentPaired.value = agentStatus.paired
      pairedEmail.value = agentStatus.userEmail
      agentCycleAt.value = agentStatus.lastCycleAt
      agentError.value = agentStatus.lastError
    }
    else if (!health) {
      localAgentPaired.value = false
      pairedEmail.value = null
      agentCycleAt.value = null
      agentError.value = null
    }
  }
  finally {
    checking.value = false
  }
}

const pair = async (): Promise<void> => {
  if (!email.value.trim() || !password.value || pairing.value) return
  pairing.value = true
  try {
    const status = await pairCloudBridgeAgent(email.value, password.value)
    password.value = ''
    localAgentPaired.value = status.paired
    pairedEmail.value = status.userEmail
    agentCycleAt.value = status.lastCycleAt
    agentError.value = status.lastError
    notificationStore.addNotification({
      type: 'success',
      title: 'Freedom Cloud Bridge 已配對',
      message: 'Windows MT5 Agent 已連上 Freedom Cloud；Reliability v2 會持續監控與自動恢復。',
      route: '/accounts',
    })
    window.setTimeout(() => { void refresh() }, 1200)
  }
  catch (error) {
    notificationStore.addNotification({
      type: 'danger',
      title: 'Cloud Bridge 配對失敗',
      message: error instanceof Error ? error.message : '請確認 Freedom 帳號密碼與 Windows Agent。',
      route: '/accounts',
    })
  }
  finally {
    password.value = ''
    pairing.value = false
  }
}

const unpair = async (): Promise<void> => {
  if (pairing.value) return
  pairing.value = true
  try {
    await unpairCloudBridgeAgent()
    localAgentPaired.value = false
    pairedEmail.value = null
    agentCycleAt.value = null
    agentError.value = null
  }
  finally {
    pairing.value = false
  }
}

onMounted(() => {
  void refresh()
  timer = window.setInterval(() => { void refresh() }, 15_000)
})

onBeforeUnmount(() => {
  if (timer !== null) window.clearInterval(timer)
})
</script>

<template>
  <section class="overflow-hidden rounded-[1.75rem] border border-emerald-400/10 bg-[#101012] shadow-xl shadow-black/20">
    <header class="flex flex-col gap-4 border-b border-white/[0.07] p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex items-center gap-3">
        <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/[0.08] text-emerald-300">
          <AccountIcon name="shield" :size="19" />
        </div>
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300/55">Freedom Sync Reliability v2</p>
            <span class="rounded-full border px-2 py-0.5 text-[9px] font-semibold tracking-wide" :class="statusClasses">
              {{ statusLabel }}
            </span>
          </div>
          <h2 class="mt-1 text-base font-semibold text-zinc-100">MT5 → Freedom Cloud</h2>
          <p class="mt-1 text-xs text-zinc-600">背景自啟、心跳監控、失敗自動重試與多帳戶健康狀態。</p>
        </div>
      </div>

      <button
        type="button"
        class="rounded-xl border border-white/[0.08] px-3.5 py-2.5 text-xs text-zinc-500 transition hover:text-zinc-300 disabled:opacity-40"
        :disabled="checking || pairing"
        @click="refresh"
      >
        {{ checking ? '檢查中…' : '重新檢查' }}
      </button>
    </header>

    <div class="grid grid-cols-2 border-b border-white/[0.07] lg:grid-cols-4">
      <div class="border-b border-r border-white/[0.06] p-4 sm:px-5 lg:border-b-0">
        <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">Cloud Channel</p>
        <p class="mt-1.5 text-sm font-semibold" :class="brokerCloudBridgeRuntime.available ? 'text-emerald-300' : 'text-amber-300'">
          {{ brokerCloudBridgeRuntime.available ? 'READY' : 'MIGRATION NEEDED' }}
        </p>
      </div>
      <div class="border-b border-white/[0.06] p-4 sm:px-5 lg:border-b-0 lg:border-r">
        <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">Windows Agent</p>
        <p class="mt-1.5 text-sm font-semibold" :class="cloudAgentFresh ? 'text-emerald-300' : cloudAgentSeen ? 'text-rose-300' : 'text-zinc-500'">
          {{ cloudAgentFresh ? 'ONLINE' : cloudAgentSeen ? 'STALE' : 'WAITING' }}
        </p>
        <p class="mt-1 text-[9px] text-zinc-700">{{ timeLabel(effectiveHeartbeat) }}</p>
      </div>
      <div class="border-r border-white/[0.06] p-4 sm:px-5">
        <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">Background Autostart</p>
        <p class="mt-1.5 text-sm font-semibold" :class="autostartEnabled ? 'text-emerald-300' : 'text-amber-300'">
          {{ autostartEnabled ? 'ENABLED' : 'NEEDS SETUP' }}
        </p>
        <p class="mt-1 text-[9px] text-zinc-700">Windows 登入後自動啟動</p>
      </div>
      <div class="p-4 sm:px-5">
        <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">Pending Payload</p>
        <p class="mt-1.5 text-sm font-semibold text-sky-300">{{ brokerCloudBridgeRuntime.readyCount }} 個</p>
      </div>
    </div>

    <div v-if="!brokerCloudBridgeRuntime.available" class="border-b border-amber-400/10 bg-amber-400/[0.035] px-5 py-3.5 text-xs leading-5 text-amber-200/75 sm:px-6">
      Cloud Bridge 資料表尚未建立。先執行 202608080003_broker_cloud_bridge.sql；原本 Local MT5 Sync 不受影響。
    </div>
    <div v-else-if="brokerCloudBridgeRuntime.reliabilityUpgradeRequired" class="border-b border-amber-400/10 bg-amber-400/[0.035] px-5 py-3.5 text-xs leading-5 text-amber-200/75 sm:px-6">
      Reliability v2 等待資料庫升級。執行 202608080004_sync_reliability_v2.sql 後，會啟用每帳戶 Heartbeat、失敗重試與背景自啟監控。
    </div>

    <div v-if="mt5Accounts.length && !brokerCloudBridgeRuntime.reliabilityUpgradeRequired" class="border-b border-white/[0.06]">
      <div class="px-5 pb-2 pt-4 sm:px-6">
        <p class="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-700">Cloud Account Health</p>
      </div>
      <div class="divide-y divide-white/[0.05]">
        <article
          v-for="account in mt5Accounts"
          :key="account.id"
          class="grid gap-3 px-5 py-3.5 sm:px-6 lg:grid-cols-[minmax(190px,1.3fr)_minmax(150px,.8fr)_minmax(170px,1fr)_minmax(190px,1.2fr)] lg:items-center"
        >
          <div class="min-w-0">
            <p class="truncate text-xs font-semibold text-zinc-300">{{ account.name }}</p>
            <p class="mt-1 truncate text-[9px] text-zinc-700">{{ account.provider }} · {{ account.brokerServer || 'Server 未設定' }}</p>
          </div>
          <div>
            <p class="text-[9px] uppercase tracking-[0.1em] text-zinc-800">Status</p>
            <p class="mt-1 text-xs font-medium" :class="accountCloudStatus(account).classes">{{ accountCloudStatus(account).label }}</p>
          </div>
          <div>
            <p class="text-[9px] uppercase tracking-[0.1em] text-zinc-800">Last Success</p>
            <p class="mt-1 text-[11px] text-zinc-500">{{ timeLabel(brokerCloudBridgeRuntime.accountStates[account.id]?.lastSuccessAt ?? null) }}</p>
          </div>
          <div class="min-w-0">
            <p class="text-[9px] uppercase tracking-[0.1em] text-zinc-800">Recovery</p>
            <p v-if="brokerCloudBridgeRuntime.accountStates[account.id]?.lastError" class="mt-1 line-clamp-2 text-[10px] leading-4 text-rose-300/75">
              {{ brokerCloudBridgeRuntime.accountStates[account.id]?.lastError }}
            </p>
            <p v-else class="mt-1 text-[10px] text-emerald-300/70">自動監控 · {{ Math.round(BROKER_AGENT_STALE_MS / 1000) }} 秒離線判定</p>
          </div>
        </article>
      </div>
    </div>

    <div v-if="mt5SyncRuntime.agentOnline && isMt5AgentCompatible(mt5SyncRuntime.agentHealth?.version) && !localAgentPaired" class="p-5 sm:p-6">
      <div class="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
        <div class="mb-4">
          <p class="text-sm font-semibold text-zinc-200">配對這台 Windows 電腦</p>
          <p class="mt-1 text-[11px] leading-5 text-zinc-600">Freedom 密碼只用來建立獨立 Session，不保存；Session 與 MT5 Read-only Credential 都由 Windows DPAPI 保護。</p>
        </div>
        <form class="grid gap-3 md:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_auto]" @submit.prevent="pair">
          <input v-model="email" type="email" autocomplete="username" placeholder="Freedom OS Email" class="rounded-xl border border-white/[0.08] bg-black/20 px-3.5 py-2.5 text-sm text-zinc-200 outline-none transition focus:border-emerald-400/30">
          <input v-model="password" type="password" autocomplete="current-password" placeholder="Freedom OS 密碼" class="rounded-xl border border-white/[0.08] bg-black/20 px-3.5 py-2.5 text-sm text-zinc-200 outline-none transition focus:border-emerald-400/30">
          <button type="submit" class="rounded-xl bg-emerald-300 px-4 py-2.5 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-200 disabled:opacity-40" :disabled="pairing || !email.trim() || !password">
            {{ pairing ? '配對中…' : '配對 Cloud Bridge' }}
          </button>
        </form>
      </div>
    </div>

    <div v-else-if="localAgentPaired" class="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div>
        <p class="text-sm font-semibold text-emerald-300">此 Windows Agent 已安全配對</p>
        <p class="mt-1 text-[11px] text-zinc-600">{{ pairedEmail || email }} · Reliability v2 會自動同步所有已保存 Read-only Credential 的 MT5 帳戶。</p>
        <p v-if="!autostartEnabled" class="mt-1.5 text-[11px] text-amber-300/80">執行 Freedom-MT5-Sync-Install-Autostart.bat 後，Windows 下次登入即可背景自啟。</p>
        <p v-if="agentError" class="mt-2 text-[11px] text-rose-300/80">{{ agentError }}</p>
      </div>
      <button type="button" class="rounded-xl border border-white/[0.08] px-3.5 py-2.5 text-xs text-zinc-500 transition hover:text-rose-300" :disabled="pairing" @click="unpair">
        解除此電腦配對
      </button>
    </div>

    <div v-else-if="!mt5SyncRuntime.agentOnline" class="px-5 py-4 text-xs leading-5 text-zinc-600 sm:px-6">
      手機沒有 Local Agent 是正常的；只要 Windows Agent Heartbeat 維持 ONLINE，手機會直接從 Freedom Cloud 接收 MT5 資料。
    </div>

    <footer class="border-t border-white/[0.06] px-5 py-3.5 text-[10px] leading-5 text-zinc-700 sm:px-6">
      AUTO RECOVERY · 20s heartbeat · exponential retry · Windows background autostart · DPAPI · Local Sync fallback preserved
    </footer>
  </section>
</template>

