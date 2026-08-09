<script setup lang="ts">
import { computed, ref } from 'vue'

import {
  createFreedomBackup,
  getVaultSummary,
  parseFreedomBackup,
  restoreFreedomBackup,
} from '@/services/data-vault.service'
import { useConfirmDialogStore } from '@/stores/useConfirmDialogStore'
import type { FreedomDataBackup } from '@/services/data-vault.service'

const confirmDialog = useConfirmDialogStore()
const fileInput = ref<HTMLInputElement | null>(null)
const pendingBackup = ref<FreedomDataBackup | null>(null)
const errorMessage = ref('')
const successMessage = ref('')
const summary = ref(getVaultSummary())

const moduleLabels: Record<string, string> = {
  'hy-freedom-os:trades': '交易紀錄',
  'hy-freedom-os:trade-reviews': '交易復盤',
  'hy-freedom-os:account-ledger': '帳戶與資金流水',
  'hy-freedom-os:playbooks': 'Playbook 策略',
  'hy-freedom-os:signals': 'Signal Library',
  'hy-freedom-os:trading-plan': '盤前規劃',
  'hy-freedom-os:daily-missions': '每日任務',
  'hy-freedom-os:risk-settings': '交易風控設定',
  'hy-freedom-os:theme': '顯示主題',
}

const backupModules = computed(() =>
  pendingBackup.value
    ? Object.keys(pendingBackup.value.records).map(key => moduleLabels[key] ?? key)
    : [],
)

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const formatDate = (value: string): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date)
}

const createFileName = (): string => {
  const stamp = new Date().toISOString().slice(0, 16).replaceAll(/[-:T]/g, '')
  return `HY-Freedom-OS-Backup-${stamp}.json`
}

const exportAll = (): void => {
  errorMessage.value = ''
  successMessage.value = ''
  const backup = createFreedomBackup()
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = createFileName()
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  summary.value = getVaultSummary()
  successMessage.value = `完整備份已建立，共 ${Object.keys(backup.records).length} 個資料模組。`
}

const selectImport = (): void => {
  errorMessage.value = ''
  successMessage.value = ''
  pendingBackup.value = null
  fileInput.value?.click()
}

const handleFile = async (event: Event): Promise<void> => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  try {
    pendingBackup.value = parseFreedomBackup(await file.text())
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '無法讀取備份檔。'
  }
}

const confirmRestore = async (): Promise<void> => {
  const backup = pendingBackup.value
  if (!backup) return

  const confirmed = await confirmDialog.ask({
    title: '還原完整備份？',
    message: `將還原 ${formatDate(backup.exportedAt)} 的備份，目前 Freedom OS 資料會被這份備份取代。`,
    confirmLabel: '確認還原',
    tone: 'danger',
  })
  if (!confirmed) return

  try {
    restoreFreedomBackup(backup)
    window.location.reload()
  }
  catch {
    errorMessage.value = '還原失敗，系統已嘗試恢復還原前資料。請確認瀏覽器儲存空間。'
  }
}
</script>

<template>
  <section class="overflow-hidden rounded-3xl border border-emerald-500/15 bg-zinc-900/70 shadow-xl shadow-black/10">
    <header class="flex flex-col gap-4 border-b border-zinc-800 p-6 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <p class="text-xs font-medium tracking-[0.2em] text-emerald-400">FREEDOM DATA VAULT</p>
        <h2 class="mt-2 text-xl font-semibold text-zinc-100">完整系統備份</h2>
        <p class="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">一個檔案帶走交易、帳戶流水、復盤、策略、訊號、盤前規劃與風控設定。換瀏覽器或更新版本前都可以先備份。</p>
      </div>
      <div class="flex gap-3">
        <button type="button" class="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-400 transition hover:border-sky-500/30 hover:text-sky-300" @click="selectImport">還原備份</button>
        <button type="button" class="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/15" @click="exportAll">下載完整備份</button>
      </div>
    </header>

    <div class="grid gap-3 p-5 sm:grid-cols-3 sm:p-6">
      <div class="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"><p class="text-[10px] uppercase tracking-[0.12em] text-zinc-600">已偵測模組</p><p class="mt-2 text-2xl font-semibold text-zinc-100">{{ summary.modules }}</p></div>
      <div class="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"><p class="text-[10px] uppercase tracking-[0.12em] text-zinc-600">目前資料量</p><p class="mt-2 text-2xl font-semibold text-sky-300">{{ formatSize(summary.estimatedBytes) }}</p></div>
      <div class="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"><p class="text-[10px] uppercase tracking-[0.12em] text-zinc-600">備份格式</p><p class="mt-2 text-lg font-semibold text-emerald-300">Freedom Backup v1</p></div>
    </div>

    <div v-if="successMessage" class="mx-5 mb-5 rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-300 sm:mx-6 sm:mb-6">{{ successMessage }}</div>
    <div v-if="errorMessage" class="mx-5 mb-5 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-300 sm:mx-6 sm:mb-6">{{ errorMessage }}</div>

    <div v-if="pendingBackup" class="mx-5 mb-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 sm:mx-6 sm:mb-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="font-semibold text-amber-300">備份已通過格式驗證</p>
          <p class="mt-1 text-xs text-zinc-500">建立時間 {{ formatDate(pendingBackup.exportedAt) }} · {{ backupModules.length }} 個模組</p>
          <div class="mt-3 flex flex-wrap gap-1.5"><span v-for="module in backupModules" :key="module" class="rounded-lg bg-black/15 px-2 py-1 text-[10px] text-zinc-500">{{ module }}</span></div>
        </div>
        <div class="flex shrink-0 gap-2"><button type="button" class="rounded-xl border border-zinc-700 px-4 py-2 text-xs text-zinc-400" @click="pendingBackup = null">取消</button><button type="button" class="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-300" @click="confirmRestore">確認完整還原</button></div>
      </div>
    </div>

    <input ref="fileInput" type="file" accept="application/json,.json" class="hidden" @change="handleFile" />
  </section>
</template>
