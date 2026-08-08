<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import AccountIcon from './AccountIcon.vue'
import {
  checkMt5SyncService,
  forgetMt5Credential,
  getMt5CredentialStatus,
  syncMt5Account,
} from '@/services/mt5-sync-client.service'

import type { TradingAccount } from '@/types/account'
import type { BrokerSyncImportResult } from '@/types/broker-sync'

const props = defineProps<{
  open: boolean
  account: TradingAccount | null
}>()

const emit = defineEmits<{
  close: []
  synced: [result: BrokerSyncImportResult]
}>()

const password = ref('')
const serviceOnline = ref(false)
const checkingService = ref(false)
const syncing = ref(false)
const errorMessage = ref('')
const rememberPassword = ref(false)
const credentialSaved = ref(false)
const checkingCredential = ref(false)

const canSync = computed(() =>
  Boolean(
    props.account?.dataSource === 'mt5' &&
    props.account.brokerServer &&
    props.account.brokerLogin &&
    (password.value || credentialSaved.value) &&
    serviceOnline.value &&
    !syncing.value,
  ),
)

const maskedLogin = computed(() => {
  const login = props.account?.brokerLogin ?? ''
  if (login.length <= 4) return login || '—'
  return `•••• ${login.slice(-4)}`
})

const checkService = async (): Promise<void> => {
  checkingService.value = true
  serviceOnline.value = await checkMt5SyncService()
  checkingService.value = false
}

const checkCredential = async (): Promise<void> => {
  if (!props.account || !serviceOnline.value) return
  checkingCredential.value = true
  credentialSaved.value = await getMt5CredentialStatus(props.account.id)
  checkingCredential.value = false
}

const forgetCredential = async (): Promise<void> => {
  if (!props.account || syncing.value) return
  try {
    await forgetMt5Credential(props.account.id)
    credentialSaved.value = false
    rememberPassword.value = false
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '無法移除保存的 MT5 credential。'
  }
}

const close = (): void => {
  if (syncing.value) return
  password.value = ''
  rememberPassword.value = false
  errorMessage.value = ''
  emit('close')
}

const runSync = async (): Promise<void> => {
  if (!props.account || !canSync.value) return

  syncing.value = true
  errorMessage.value = ''

  try {
    const result = await syncMt5Account(
      props.account,
      password.value || null,
      { rememberPassword: rememberPassword.value || (credentialSaved.value && Boolean(password.value)) },
    )
    password.value = ''
    rememberPassword.value = false
    emit('synced', result)
    emit('close')
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '同步失敗，請確認 MT5 連線設定。'
  }
  finally {
    syncing.value = false
  }
}

watch(
  () => props.open,
  open => {
    if (!open) return
    password.value = ''
    rememberPassword.value = false
    credentialSaved.value = false
    errorMessage.value = ''
    serviceOnline.value = false
    void (async () => {
      await checkService()
      await checkCredential()
    })()
  },
)
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open && account"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        @click.self="close"
      >
        <section class="w-full max-w-xl overflow-hidden rounded-[1.75rem] border border-white/[0.09] bg-[#101012] shadow-2xl shadow-black/60">
          <header class="flex items-start justify-between gap-4 border-b border-white/[0.07] p-5 sm:p-6">
            <div>
              <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300/60">Freedom MT5 Sync</p>
              <h2 class="mt-2 text-xl font-semibold text-white">同步 {{ account.name }}</h2>
              <p class="mt-1 text-xs text-zinc-600">{{ account.brokerServer }} · {{ maskedLogin }}</p>
            </div>
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] text-zinc-500 transition hover:text-white"
              :disabled="syncing"
              aria-label="關閉"
              @click="close"
            >
              <AccountIcon name="close" :size="16" />
            </button>
          </header>

          <div class="space-y-5 p-5 sm:p-6">
            <div class="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div class="flex items-center gap-3">
                <span
                  class="h-2.5 w-2.5 rounded-full"
                  :class="checkingService ? 'bg-amber-300 animate-pulse' : serviceOnline ? 'bg-emerald-300' : 'bg-rose-300'"
                />
                <div>
                  <p class="text-sm font-medium text-zinc-300">本機 Sync Service</p>
                  <p class="mt-0.5 text-[11px]" :class="serviceOnline ? 'text-emerald-300/70' : 'text-zinc-600'">
                    {{ checkingService ? '偵測中…' : serviceOnline ? '已就緒' : '未啟動' }}
                  </p>
                </div>
              </div>
              <button
                v-if="!serviceOnline && !checkingService"
                type="button"
                class="rounded-lg border border-white/[0.08] px-3 py-2 text-[11px] text-zinc-500 transition hover:text-zinc-300"
                @click="checkService"
              >
                重新偵測
              </button>
            </div>

            <div v-if="!serviceOnline && !checkingService" class="rounded-2xl border border-amber-400/15 bg-amber-400/[0.04] p-4">
              <p class="text-xs font-medium text-amber-300">Freedom MT5 Sync Service 尚未運行</p>
              <p class="mt-1.5 text-[11px] leading-5 text-amber-100/45">
                專案已附 Windows Setup / Start；啟動後回到這裡重新偵測即可。MT5 Terminal 需安裝在同一台 Windows 電腦。
              </p>
            </div>

            <label class="block">
              <span class="text-sm font-medium text-zinc-300">Investor / Read-only Password</span>
              <input
                v-model="password"
                type="password"
                autocomplete="off"
                :disabled="syncing"
                :placeholder="credentialSaved ? 'Windows 已安全保存，可直接同步' : '輸入 Read-only Password'"
                class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-sky-400/35 disabled:opacity-60"
                @keydown.enter.prevent="runSync"
              />
              <span class="mt-2 block text-[11px] leading-5 text-zinc-700">
                密碼不會寫入 Freedom OS、Supabase 或 Data Vault。
              </span>
            </label>

            <div class="rounded-2xl border border-sky-400/10 bg-sky-400/[0.035] p-4">
              <div v-if="checkingCredential" class="text-xs text-zinc-600">正在檢查 Windows credential…</div>
              <div v-else-if="credentialSaved" class="flex items-center justify-between gap-4">
                <div>
                  <p class="text-xs font-medium text-emerald-300">Windows 已安全記住此帳戶</p>
                  <p class="mt-1 text-[11px] leading-5 text-zinc-600">Agent 可在多個 MT5 帳戶之間自動切換並背景同步。</p>
                </div>
                <button
                  type="button"
                  class="shrink-0 rounded-lg border border-white/[0.08] px-3 py-2 text-[11px] text-zinc-500 transition hover:text-rose-300"
                  :disabled="syncing"
                  @click="forgetCredential"
                >
                  忘記此帳戶
                </button>
              </div>
              <label v-else class="flex cursor-pointer items-start gap-3">
                <input
                  v-model="rememberPassword"
                  type="checkbox"
                  class="mt-0.5 h-4 w-4 accent-sky-300"
                  :disabled="syncing"
                />
                <span>
                  <span class="block text-xs font-medium text-zinc-300">Windows 安全記住 Read-only Password</span>
                  <span class="mt-1 block text-[11px] leading-5 text-zinc-600">
                    使用目前 Windows 使用者的 DPAPI 加密；只留在這台電腦。啟用後 Multi-Account Agent 才能自動輪流切換帳戶。
                  </span>
                </span>
              </label>
            </div>

            <div v-if="account.lastSyncedAt" class="rounded-xl border border-white/[0.055] bg-black/15 px-3.5 py-3 text-[11px] text-zinc-600">
              增量同步 · 從上次同步點繼續補抓，既有復盤內容不會被覆蓋。
            </div>

            <div v-if="errorMessage" class="rounded-xl border border-rose-400/15 bg-rose-400/[0.05] px-3.5 py-3 text-xs leading-5 text-rose-300">
              {{ errorMessage }}
            </div>

            <footer class="flex flex-col-reverse gap-2 border-t border-white/[0.07] pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                class="rounded-xl border border-white/[0.08] px-4 py-2.5 text-xs text-zinc-500 transition hover:text-zinc-300"
                :disabled="syncing"
                @click="close"
              >
                取消
              </button>
              <button
                type="button"
                :disabled="!canSync"
                class="rounded-xl bg-sky-300 px-5 py-2.5 text-xs font-semibold text-zinc-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
                @click="runSync"
              >
                {{ syncing ? '正在同步 MT5…' : account.lastSyncedAt ? '同步最新資料' : '連接並首次同步' }}
              </button>
            </footer>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
