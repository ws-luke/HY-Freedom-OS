<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

import { getCloudSyncRuntimeStatus, syncCloudNow } from '@/services/cloud/cloud-auto-sync.service'
import { getCloudIdentity, onCloudAuthStateChange } from '@/services/cloud/cloud-auth.service'
import { getCloudDeletionQueueSize } from '@/services/cloud/cloud-deletion.service'
import { inspectFreedomLocalIntegrity } from '@/services/cloud/cloud-integrity.service'
import type { FreedomCloudSyncRuntimeStatus } from '@/types/cloud'

const runtime = ref<FreedomCloudSyncRuntimeStatus>(getCloudSyncRuntimeStatus())
const integrity = ref(inspectFreedomLocalIntegrity())
const pendingDeletes = ref(getCloudDeletionQueueSize())
const checking = ref(false)
const signedIn = ref(false)
let unsubscribeAuth: (() => void) | null = null

const refresh = (): void => {
  runtime.value = getCloudSyncRuntimeStatus()
  integrity.value = inspectFreedomLocalIntegrity()
  pendingDeletes.value = getCloudDeletionQueueSize()
}

const status = computed(() => {
  if (!signedIn.value) {
    return { label: 'LOCAL SAFE', title: '等待 Cloud 登入', tone: 'sky', message: '目前資料安全保留在本機；登入 Freedom Cloud 後才會啟用跨裝置同步。' }
  }
  if (!runtime.value.online || runtime.value.state === 'offline') {
    return { label: 'OFFLINE SAFE', title: '離線保護中', tone: 'amber', message: '修改會先保留在本機；恢復網路後自動補同步。' }
  }
  if (runtime.value.state === 'syncing') {
    return { label: 'SYNCING', title: '正在同步', tone: 'sky', message: '正在進行 Cloud reconciliation，請保持頁面開啟。' }
  }
  if (runtime.value.state === 'error') {
    return { label: 'RETRYING', title: '同步等待重試', tone: 'rose', message: runtime.value.lastError || '同步失敗，系統會自動重試。' }
  }
  if (runtime.value.pending) {
    return { label: 'PENDING', title: '有待同步修改', tone: 'amber', message: 'Local 修改已保存，背景同步排程中。' }
  }
  return { label: 'HEALTHY', title: 'Cloud 狀態正常', tone: 'emerald', message: '本機快取與 Cloud 同步流程目前正常。' }
})

const toneClasses = computed(() => ({
  emerald: 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300',
  sky: 'border-sky-500/20 bg-sky-500/[0.06] text-sky-300',
  amber: 'border-amber-500/20 bg-amber-500/[0.06] text-amber-300',
  rose: 'border-rose-500/20 bg-rose-500/[0.06] text-rose-300',
}[status.value.tone]))

const formatDate = (value: string | null): string => {
  if (!value) return '尚未完成'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date)
}

const runCheckAndSync = async (): Promise<void> => {
  if (checking.value || !runtime.value.online || !signedIn.value) return
  checking.value = true
  try {
    await syncCloudNow()
  }
  catch {
    // Runtime status contains the user-facing error and retry schedule.
  }
  finally {
    refresh()
    checking.value = false
  }
}

onMounted(async () => {
  refresh()
  try {
    signedIn.value = Boolean(await getCloudIdentity())
  }
  catch {
    signedIn.value = false
  }
  unsubscribeAuth = onCloudAuthStateChange((_event, session) => {
    signedIn.value = Boolean(session?.user)
    refresh()
  })
  window.addEventListener('freedom-cloud-sync-runtime', refresh)
  window.addEventListener('freedom-cloud-synced', refresh)
})

onUnmounted(() => {
  unsubscribeAuth?.()
  unsubscribeAuth = null
  window.removeEventListener('freedom-cloud-sync-runtime', refresh)
  window.removeEventListener('freedom-cloud-synced', refresh)
})
</script>

<template>
  <section class="overflow-hidden rounded-3xl border border-emerald-500/15 bg-zinc-900/70 shadow-xl shadow-black/10">
    <header class="flex flex-col gap-4 border-b border-zinc-800 p-6 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <p class="text-xs font-medium tracking-[0.2em] text-emerald-400">PRODUCTION DATA HEALTH</p>
        <h2 class="mt-2 text-xl font-semibold text-zinc-100">Freedom Cloud Production v1</h2>
        <p class="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">監控背景同步、離線待處理資料、自動重試與 Local Cache 關聯完整性。</p>
      </div>
      <span class="shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-semibold tracking-[0.12em]" :class="toneClasses">{{ status.label }}</span>
    </header>

    <div class="grid gap-px bg-zinc-800 sm:grid-cols-2 xl:grid-cols-4">
      <div class="bg-zinc-900 p-5">
        <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-600">Connection</p>
        <p class="mt-2 text-lg font-semibold" :class="runtime.online ? 'text-emerald-300' : 'text-amber-300'">{{ runtime.online ? 'Online' : 'Offline' }}</p>
        <p class="mt-1 text-xs text-zinc-500">{{ status.title }}</p>
      </div>
      <div class="bg-zinc-900 p-5">
        <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-600">Pending</p>
        <p class="mt-2 text-lg font-semibold" :class="runtime.pending || pendingDeletes ? 'text-amber-300' : 'text-emerald-300'">{{ runtime.pending ? 'Local changes' : 'Clean' }}</p>
        <p class="mt-1 text-xs text-zinc-500">刪除佇列 {{ pendingDeletes }} 筆</p>
      </div>
      <div class="bg-zinc-900 p-5">
        <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-600">Integrity</p>
        <p class="mt-2 text-lg font-semibold" :class="integrity.healthy ? 'text-emerald-300' : 'text-rose-300'">{{ integrity.healthy ? 'Healthy' : `${integrity.issues.length} issues` }}</p>
        <p class="mt-1 text-xs text-zinc-500">已檢查 {{ integrity.records }} 筆核心紀錄</p>
      </div>
      <div class="bg-zinc-900 p-5">
        <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-600">Last success</p>
        <p class="mt-2 text-lg font-semibold text-sky-300">{{ formatDate(runtime.lastCompletedAt) }}</p>
        <p class="mt-1 text-xs text-zinc-500">重試次數 {{ runtime.retryAttempt }}</p>
      </div>
    </div>

    <div class="grid gap-4 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div>
        <p class="text-sm font-medium text-zinc-200">{{ status.message }}</p>
        <p v-if="runtime.nextRetryAt" class="mt-1 text-xs text-zinc-600">下次自動重試：{{ formatDate(runtime.nextRetryAt) }}</p>
        <div v-if="!integrity.healthy" class="mt-3 space-y-1">
          <p v-for="issue in integrity.issues.slice(0, 3)" :key="issue" class="text-xs text-rose-300">• {{ issue }}</p>
        </div>
      </div>
      <button
        type="button"
        :disabled="checking || !signedIn || !runtime.online || runtime.state === 'syncing'"
        class="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] px-4 py-2.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
        @click="runCheckAndSync"
      >
        {{ checking || runtime.state === 'syncing' ? '檢查同步中…' : '立即健康檢查＋同步' }}
      </button>
    </div>
  </section>
</template>
