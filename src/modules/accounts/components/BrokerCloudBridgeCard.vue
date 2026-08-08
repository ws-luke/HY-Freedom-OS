<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import AccountIcon from './AccountIcon.vue'
import {
  brokerCloudBridgeRuntime,
  getCloudBridgeAgentStatus,
  pairCloudBridgeAgent,
  refreshBrokerCloudBridge,
  unpairCloudBridgeAgent,
} from '@/services/broker-cloud-bridge.service'
import { getCloudIdentity } from '@/services/cloud/cloud-auth.service'
import { getMt5SyncHealth, isMt5AgentCompatible, mt5SyncRuntime } from '@/services/mt5-sync-client.service'
import { useNotificationStore } from '@/stores/useNotificationStore'

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

const cloudAgentSeen = computed(() => Boolean(brokerCloudBridgeRuntime.agentLastSeen))
const bridgeHealthy = computed(() =>
  brokerCloudBridgeRuntime.available &&
  (localAgentPaired.value || cloudAgentSeen.value) &&
  !brokerCloudBridgeRuntime.lastError &&
  !agentError.value,
)

const statusLabel = computed(() => {
  if (!brokerCloudBridgeRuntime.available) return 'DATABASE UPGRADE REQUIRED'
  if (bridgeHealthy.value) return 'CLOUD BRIDGE READY'
  if (mt5SyncRuntime.agentOnline && !isMt5AgentCompatible(mt5SyncRuntime.agentHealth?.version)) return 'AGENT UPDATE REQUIRED'
  if (mt5SyncRuntime.agentOnline && !localAgentPaired.value) return 'PAIR THIS PC'
  if (cloudAgentSeen.value) return 'AGENT CONNECTED'
  return 'WAITING FOR WINDOWS AGENT'
})

const statusClasses = computed(() => {
  if (bridgeHealthy.value) return 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300'
  if (!brokerCloudBridgeRuntime.available) return 'border-amber-400/20 bg-amber-400/[0.06] text-amber-300'
  return 'border-sky-400/20 bg-sky-400/[0.06] text-sky-300'
})

const timeLabel = (value: string | null): string => {
  if (!value) return '尚未回報'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-TW', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(date)
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
      message: 'Windows MT5 Agent 現在會主動把 Broker 資料交給 Freedom Cloud。',
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
    <header class="flex flex-col gap-4 border-b border-white/[0.07] p-5 lg:flex-row lg:items-center lg:justify-between sm:p-6">
      <div class="flex items-center gap-3">
        <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/[0.08] text-emerald-300">
          <AccountIcon name="shield" :size="19" />
        </div>
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300/55">Freedom Sync Cloud Bridge v1</p>
            <span class="rounded-full border px-2 py-0.5 text-[9px] font-semibold tracking-wide" :class="statusClasses">
              {{ statusLabel }}
            </span>
          </div>
          <h2 class="mt-1 text-base font-semibold text-zinc-100">MT5 → Freedom Cloud</h2>
          <p class="mt-1 text-xs text-zinc-600">Windows Agent 主動連雲端；手機與線上版不需要連你電腦的 localhost。</p>
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
      <div class="border-b border-r border-white/[0.06] p-4 lg:border-b-0 sm:px-5">
        <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">Cloud Channel</p>
        <p class="mt-1.5 text-sm font-semibold" :class="brokerCloudBridgeRuntime.available ? 'text-emerald-300' : 'text-amber-300'">
          {{ brokerCloudBridgeRuntime.available ? 'READY' : 'MIGRATION NEEDED' }}
        </p>
      </div>
      <div class="border-b border-white/[0.06] p-4 lg:border-b-0 lg:border-r sm:px-5">
        <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">Windows Agent</p>
        <p class="mt-1.5 text-sm font-semibold" :class="localAgentPaired || cloudAgentSeen ? 'text-emerald-300' : 'text-zinc-500'">
          {{ localAgentPaired ? 'PAIRED' : cloudAgentSeen ? 'CLOUD ONLINE' : 'WAITING' }}
        </p>
      </div>
      <div class="border-r border-white/[0.06] p-4 sm:px-5">
        <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">Last Agent Heartbeat</p>
        <p class="mt-1.5 text-xs font-medium text-zinc-400">{{ timeLabel(agentCycleAt || brokerCloudBridgeRuntime.agentLastSeen) }}</p>
      </div>
      <div class="p-4 sm:px-5">
        <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">Pending Payload</p>
        <p class="mt-1.5 text-sm font-semibold text-sky-300">{{ brokerCloudBridgeRuntime.readyCount }} 個</p>
      </div>
    </div>

    <div v-if="!brokerCloudBridgeRuntime.available" class="border-b border-amber-400/10 bg-amber-400/[0.035] px-5 py-3.5 text-xs leading-5 text-amber-200/75 sm:px-6">
      Cloud Bridge 資料表尚未建立。先執行本版本的 202608080003_broker_cloud_bridge.sql；原本 Local MT5 Sync 不受影響。
    </div>

    <div v-if="mt5SyncRuntime.agentOnline && isMt5AgentCompatible(mt5SyncRuntime.agentHealth?.version) && !localAgentPaired" class="p-5 sm:p-6">
      <div class="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
        <div class="mb-4">
          <p class="text-sm font-semibold text-zinc-200">配對這台 Windows 電腦</p>
          <p class="mt-1 text-[11px] leading-5 text-zinc-600">使用 Freedom OS 帳號登入一次。密碼不保存；Agent 只保存可撤銷的 Session，並由 Windows DPAPI 加密。</p>
        </div>
        <form class="grid gap-3 md:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_auto]" @submit.prevent="pair">
          <input
            v-model="email"
            type="email"
            autocomplete="username"
            placeholder="Freedom OS Email"
            class="rounded-xl border border-white/[0.08] bg-black/20 px-3.5 py-2.5 text-sm text-zinc-200 outline-none transition focus:border-emerald-400/30"
          >
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="Freedom OS 密碼"
            class="rounded-xl border border-white/[0.08] bg-black/20 px-3.5 py-2.5 text-sm text-zinc-200 outline-none transition focus:border-emerald-400/30"
          >
          <button
            type="submit"
            class="rounded-xl bg-emerald-300 px-4 py-2.5 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-200 disabled:opacity-40"
            :disabled="pairing || !email.trim() || !password"
          >
            {{ pairing ? '配對中…' : '配對 Cloud Bridge' }}
          </button>
        </form>
      </div>
    </div>

    <div v-else-if="localAgentPaired" class="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div>
        <p class="text-sm font-semibold text-emerald-300">此 Windows Agent 已安全配對</p>
        <p class="mt-1 text-[11px] text-zinc-600">{{ pairedEmail || email }} · Agent 保持開啟時會自動同步所有已保存 Read-only Credential 的 MT5 帳戶。</p>
        <p v-if="agentError" class="mt-2 text-[11px] text-rose-300/80">{{ agentError }}</p>
      </div>
      <button type="button" class="rounded-xl border border-white/[0.08] px-3.5 py-2.5 text-xs text-zinc-500 transition hover:text-rose-300" :disabled="pairing" @click="unpair">
        解除此電腦配對
      </button>
    </div>

    <div v-else-if="!mt5SyncRuntime.agentOnline" class="px-5 py-4 text-xs leading-5 text-zinc-600 sm:px-6">
      目前這台裝置沒有 Local Agent。這在手機上是正常的；只要 Windows Agent 已配對並保持運行，這裡仍會從 Freedom Cloud 接收 MT5 資料。
    </div>

    <footer class="border-t border-white/[0.06] px-5 py-3.5 text-[10px] leading-5 text-zinc-700 sm:px-6">
      OUTBOUND ONLY · MT5 Password 不上雲 · Supabase user session + RLS · Windows DPAPI · Local Sync fallback preserved
    </footer>
  </section>
</template>
