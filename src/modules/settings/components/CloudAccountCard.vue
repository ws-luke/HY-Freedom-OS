<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'

import {
  getCloudIdentity,
  onCloudAuthStateChange,
  signInWithPassword,
  signOutCloud,
} from '@/services/cloud/cloud-auth.service'
import {
  getCloudSyncRecord,
} from '@/services/cloud/cloud-sync.service'
import { syncCloudNow } from '@/services/cloud/cloud-auto-sync.service'
import { getCloudRuntime } from '@/services/cloud/supabase.client'
import { getVaultSummary } from '@/services/data-vault.service'
import type {
  FreedomCloudIdentity,
  FreedomCloudSyncSummary,
} from '@/types/cloud'

const runtime = getCloudRuntime()
const loading = ref(false)
const syncing = ref(false)
const identity = ref<FreedomCloudIdentity | null>(null)
const syncSummary = ref<FreedomCloudSyncSummary | null>(null)
const successMessage = ref('')
const errorMessage = ref('')
const form = reactive({
  email: '',
  password: '',
})
const vault = getVaultSummary()

let unsubscribeAuth: (() => void) | null = null

const refreshBackgroundSyncStatus = (): void => {
  if (!identity.value) return
  const record = getCloudSyncRecord()
  if (record?.userId === identity.value.userId) {
    syncSummary.value = record.summary
  }
}

const isValid = computed(() =>
  form.email.trim().includes('@') && form.password.length >= 8,
)

const lastSyncForCurrentUser = computed(() => {
  if (!identity.value) return null
  const record = getCloudSyncRecord()
  return record?.userId === identity.value.userId ? record.summary : null
})

const displayedSync = computed(() => syncSummary.value ?? lastSyncForCurrentUser.value)

const formatDateTime = (value: string): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const clearMessages = (): void => {
  successMessage.value = ''
  errorMessage.value = ''
}

const submitAccount = async (): Promise<void> => {
  if (!runtime.configured || !isValid.value || loading.value) return

  loading.value = true
  clearMessages()

  try {
    await signInWithPassword(form.email.trim(), form.password)
    identity.value = await getCloudIdentity()
    successMessage.value = '已登入 Freedom Cloud。'

    form.password = ''
  }
  catch (error) {
    errorMessage.value = error instanceof Error
      ? error.message
      : 'Freedom Cloud 帳號操作失敗。'
  }
  finally {
    loading.value = false
  }
}

const logout = async (): Promise<void> => {
  loading.value = true
  clearMessages()

  try {
    await signOutCloud()
    identity.value = null
    syncSummary.value = null
    successMessage.value = '已登出 Freedom Cloud；本機資料仍保留。'
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '登出失敗。'
  }
  finally {
    loading.value = false
  }
}

const syncNow = async (): Promise<void> => {
  if (!identity.value || syncing.value) return

  syncing.value = true
  clearMessages()

  try {
    const summary = await syncCloudNow()
    if (!summary) throw new Error('Freedom Cloud 尚未登入或目前無法同步。')
    syncSummary.value = summary
    successMessage.value = syncSummary.value.direction === 'cloud-to-local'
      ? `首次裝置同步完成：已安全讀取 ${syncSummary.value.pulledRows} 筆 Cloud 資料，正在套用。`
      : `Freedom Cloud 同步完成：上傳 ${syncSummary.value.pushedRows} 筆、讀取 ${syncSummary.value.pulledRows} 筆，正在套用。`

    window.setTimeout(() => window.location.reload(), 900)
  }
  catch (error) {
    errorMessage.value = error instanceof Error
      ? `Cloud Sync 尚未完成：${error.message}。本機資料未被刪除，可直接重試。`
      : 'Cloud Sync 尚未完成；本機資料仍完整保留。'
  }
  finally {
    syncing.value = false
  }
}

onMounted(async () => {
  if (!runtime.configured) return

  try {
    identity.value = await getCloudIdentity()
  }
  catch {
    identity.value = null
  }

  unsubscribeAuth = onCloudAuthStateChange((_event, session) => {
    identity.value = session?.user
      ? {
          userId: session.user.id,
          email: session.user.email ?? null,
        }
      : null
  })

  window.addEventListener('freedom-cloud-synced', refreshBackgroundSyncStatus)
})

onUnmounted(() => {
  unsubscribeAuth?.()
  window.removeEventListener('freedom-cloud-synced', refreshBackgroundSyncStatus)
})
</script>

<template>
  <section class="overflow-hidden rounded-3xl border border-violet-500/15 bg-zinc-900/70 shadow-xl shadow-black/10">
    <header class="border-b border-zinc-800 p-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p class="text-xs font-medium tracking-[0.2em] text-violet-400">FREEDOM ACCOUNT</p>
          <h2 class="mt-2 text-xl font-semibold text-zinc-100">Cloud Account & Sync</h2>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            Supabase 是登入後的跨裝置資料層；Local 保留作快取與離線保護，同步不會清除本機資料。
          </p>
        </div>

        <span
          class="shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-semibold tracking-[0.12em]"
          :class="identity
            ? 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300'
            : runtime.configured
              ? 'border-sky-400/20 bg-sky-400/[0.06] text-sky-300'
              : 'border-amber-400/20 bg-amber-400/[0.06] text-amber-300'"
        >
          {{ identity ? 'SIGNED IN' : runtime.configured ? 'AUTH READY' : 'LOCAL ONLY' }}
        </span>
      </div>
    </header>

    <div v-if="!runtime.configured" class="p-6">
      <div class="rounded-2xl border border-amber-400/15 bg-amber-400/[0.04] p-5">
        <p class="font-medium text-amber-300">Cloud Account 已就緒，但還沒有 Supabase Project 連線資料。</p>
        <p class="mt-2 text-sm leading-6 text-zinc-600">
          目前 Freedom OS 會繼續完整使用 Local Storage。帳號與 Cloud Sync 在連上 Supabase 後會直接啟用。
        </p>
      </div>
    </div>

    <div v-else-if="!identity" class="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_320px] sm:p-6">
      <form class="rounded-2xl border border-white/[0.06] bg-black/15 p-5" @submit.prevent="submitAccount">
        <div class="rounded-xl border border-sky-400/10 bg-sky-400/[0.04] px-4 py-3">
          <p class="text-xs font-medium text-sky-300">PRIVATE ACCESS</p>
          <p class="mt-1 text-xs leading-5 text-zinc-600">Freedom Cloud 目前只開放既有帳號登入。</p>
        </div>

        <label class="mt-5 block">
          <span class="text-xs font-medium text-zinc-400">Email</span>
          <input
            v-model.trim="form.email"
            type="email"
            autocomplete="email"
            required
            class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-200 outline-none transition focus:border-sky-400/30"
            placeholder="you@example.com"
          />
        </label>

        <label class="mt-4 block">
          <span class="text-xs font-medium text-zinc-400">密碼</span>
          <input
            v-model="form.password"
            type="password"
            autocomplete="current-password"
            minlength="8"
            required
            class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-200 outline-none transition focus:border-sky-400/30"
            placeholder="至少 8 個字元"
          />
        </label>

        <button
          type="submit"
          :disabled="!isValid || loading"
          class="mt-5 w-full rounded-xl bg-sky-300 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
        >
          {{ loading ? '處理中…' : '登入 Freedom Cloud' }}
        </button>
      </form>

      <aside class="rounded-2xl border border-white/[0.06] bg-black/15 p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-600">Local Data Safe</p>
        <p class="mt-3 text-3xl font-semibold text-zinc-200">{{ vault.modules }}</p>
        <p class="mt-1 text-xs text-zinc-600">個本機資料模組等待雲端帳號。</p>
        <div class="mt-5 space-y-2 text-xs text-zinc-600">
          <p>✓ 未登入不會上傳</p>
          <p>✓ 登入後仍不會自動刪 Local</p>
          <p>✓ RLS 以 User ID 分離資料</p>
        </div>
      </aside>
    </div>

    <div v-else class="p-5 sm:p-6">
      <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.7fr)]">
        <article class="rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.025] p-5">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300/55">Cloud Identity</p>
              <p class="mt-2 font-semibold text-zinc-200">{{ identity.email ?? '已驗證使用者' }}</p>
              <p class="mt-1 font-mono text-[10px] text-zinc-700">{{ identity.userId }}</p>
            </div>
            <button
              type="button"
              :disabled="loading"
              class="rounded-xl border border-white/[0.07] px-3 py-2 text-xs text-zinc-500 transition hover:text-zinc-200"
              @click="logout"
            >
              登出
            </button>
          </div>

          <div class="mt-5 rounded-xl border border-white/[0.055] bg-black/15 p-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p class="text-sm font-medium text-zinc-300">Freedom Cloud Smart Sync</p>
                <p class="mt-1 text-xs text-zinc-600">AUTO ON · 修改後背景同步；新裝置先讀 Cloud，已信任裝置才雙向同步。</p>
              </div>
              <button
                type="button"
                :disabled="syncing"
                class="shrink-0 rounded-xl bg-emerald-300 px-4 py-2.5 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-200 disabled:cursor-wait disabled:bg-zinc-800 disabled:text-zinc-600"
                @click="syncNow"
              >
                {{ syncing ? '正在安全同步…' : displayedSync ? '立即同步' : '開始第一次同步' }}
              </button>
            </div>
          </div>
        </article>

        <article class="rounded-2xl border border-white/[0.06] bg-black/15 p-5">
          <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-300/55">Cloud Sync Status</p>
          <template v-if="displayedSync">
            <p class="mt-3 text-lg font-semibold text-violet-300">{{ displayedSync.direction === 'two-way' ? '雙向同步' : 'Cloud → Local' }}</p>
            <p class="mt-1 text-xs text-zinc-600">↑ {{ displayedSync.pushedRows }} · ↓ {{ displayedSync.pulledRows }} rows</p>
            <p class="mt-4 text-[10px] text-zinc-700">
              {{ formatDateTime(displayedSync.syncedAt) }}
            </p>
          </template>
          <template v-else>
            <p class="mt-3 text-lg font-semibold text-zinc-400">尚未執行</p>
            <p class="mt-1 text-xs leading-6 text-zinc-700">第一次同步會自動判斷 Cloud 與目前裝置的安全方向。</p>
          </template>
        </article>
      </div>

      <div
        v-if="displayedSync"
        class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        <div v-for="item in [
          ['Push', displayedSync.pushedRows],
          ['Pull', displayedSync.pulledRows],
          ['Cloud existed', displayedSync.cloudHadData ? 'YES' : 'NO'],
          ['Mode', displayedSync.direction === 'two-way' ? 'TWO-WAY' : 'RESTORE'],
        ]" :key="String(item[0])" class="rounded-xl border border-white/[0.055] bg-black/15 p-3">
          <p class="text-[10px] text-zinc-700">{{ item[0] }}</p>
          <p class="mt-1 text-lg font-semibold text-zinc-300">{{ item[1] }}</p>
        </div>
      </div>
    </div>

    <div v-if="successMessage || errorMessage" class="border-t border-white/[0.06] px-5 py-4 text-xs sm:px-6">
      <p v-if="successMessage" class="text-emerald-300">{{ successMessage }}</p>
      <p v-if="errorMessage" class="text-rose-300">{{ errorMessage }}</p>
    </div>
  </section>
</template>
