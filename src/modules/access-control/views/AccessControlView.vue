<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import {
  listAccessUsers,
  listFeatureFlags,
  setSelectedFeature,
  updateFeatureReleaseMode,
  updateUserRole,
} from '@/services/access-control.service'
import { useAccessControlStore } from '@/stores/useAccessControlStore'
import { useNotificationStore } from '@/stores/useNotificationStore'
import type { AccessUser, FeatureFlag, FeatureReleaseMode, FreedomRole } from '@/types/access-control'

const accessStore = useAccessControlStore()
const notificationStore = useNotificationStore()
const users = ref<AccessUser[]>([])
const flags = ref<FeatureFlag[]>([])
const loading = ref(true)
const busyKey = ref('')

const errorText = (error: unknown, fallback: string): string => {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  return fallback
}

const releaseOptions: Array<{ value: FeatureReleaseMode; label: string }> = [
  { value: 'admin', label: '僅管理員' },
  { value: 'selected', label: '指定測試者' },
  { value: 'everyone', label: '所有使用者' },
  { value: 'disabled', label: '完全停用' },
]

const regularUsers = computed(() => users.value.filter(user => user.role === 'user'))
const formatDate = (value: string | null): string => value
  ? new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '尚未登入'

const loadData = async (): Promise<void> => {
  loading.value = true
  try {
    ;[flags.value, users.value] = await Promise.all([listFeatureFlags(), listAccessUsers()])
  }
  catch (error) {
    notificationStore.addNotification({
      type: 'danger',
      title: '權限資料載入失敗',
      message: errorText(error, '請確認 Access Control 資料庫升級已完成。'),
    })
  }
  finally {
    loading.value = false
  }
}

const changeMode = async (flag: FeatureFlag, mode: FeatureReleaseMode): Promise<void> => {
  busyKey.value = `flag:${flag.key}`
  try {
    await updateFeatureReleaseMode(flag.key, mode)
    flag.releaseMode = mode
    await accessStore.load(true)
    notificationStore.addNotification({ type: 'success', title: '功能權限已更新', message: `${flag.label}的開放範圍已變更。` })
  }
  catch (error) {
    notificationStore.addNotification({ type: 'danger', title: '更新失敗', message: errorText(error, '請稍後再試。') })
  }
  finally { busyKey.value = '' }
}

const changeRole = async (user: AccessUser, role: FreedomRole): Promise<void> => {
  busyKey.value = `role:${user.userId}`
  try {
    await updateUserRole(user.userId, role)
    user.role = role
    notificationStore.addNotification({ type: 'success', title: '使用者角色已更新', message: `${user.email ?? '使用者'}目前為${role === 'admin' ? '管理員' : '一般使用者'}。` })
  }
  catch (error) {
    notificationStore.addNotification({ type: 'danger', title: '角色更新失敗', message: errorText(error, '請稍後再試。') })
  }
  finally { busyKey.value = '' }
}

const toggleSelectedAccess = async (user: AccessUser, flag: FeatureFlag, enabled: boolean): Promise<void> => {
  busyKey.value = `access:${user.userId}:${flag.key}`
  try {
    await setSelectedFeature(user.userId, flag.key, enabled)
    user.selectedFeatures = enabled
      ? [...new Set([...user.selectedFeatures, flag.key])]
      : user.selectedFeatures.filter(key => key !== flag.key)
  }
  catch (error) {
    notificationStore.addNotification({ type: 'danger', title: '測試權限更新失敗', message: errorText(error, '請稍後再試。') })
  }
  finally { busyKey.value = '' }
}

onMounted(loadData)
</script>

<template>
  <div class="space-y-6 pb-10">
    <section class="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-zinc-900/80 p-6 shadow-xl shadow-black/10">
      <div class="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />
      <div class="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs font-semibold tracking-[0.2em] text-violet-400">FREEDOM ACCESS CONTROL V1</p>
          <h1 class="mt-2 text-3xl font-bold text-zinc-100">權限與功能發布中心</h1>
          <p class="mt-2 max-w-3xl text-sm leading-7 text-zinc-400">你可以先獨自測試新功能，再指定朋友測試，確認穩定後才對所有使用者開放。</p>
        </div>
        <span class="w-fit rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300">ADMIN CONTROLLED</span>
      </div>
    </section>

    <section class="grid gap-4 sm:grid-cols-3">
      <div class="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5"><p class="text-xs text-zinc-500">總使用者</p><p class="mt-2 text-2xl font-bold text-zinc-100">{{ users.length }}</p></div>
      <div class="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5"><p class="text-xs text-zinc-500">一般使用者</p><p class="mt-2 text-2xl font-bold text-sky-300">{{ regularUsers.length }}</p></div>
      <div class="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5"><p class="text-xs text-zinc-500">受控功能</p><p class="mt-2 text-2xl font-bold text-violet-300">{{ flags.length }}</p></div>
    </section>

    <section class="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/70">
      <header class="border-b border-zinc-800 p-6">
        <p class="text-xs font-semibold tracking-[0.18em] text-amber-400">FEATURE RELEASE</p>
        <h2 class="mt-2 text-xl font-semibold text-zinc-100">功能開放範圍</h2>
      </header>
      <div v-if="loading" class="p-8 text-sm text-zinc-500">正在載入權限設定…</div>
      <div v-else class="divide-y divide-zinc-800">
        <article v-for="flag in flags" :key="flag.key" class="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
          <div><h3 class="font-semibold text-zinc-100">{{ flag.label }}</h3><p class="mt-1 text-sm leading-6 text-zinc-500">{{ flag.description }}</p></div>
          <select :value="flag.releaseMode" :disabled="busyKey === `flag:${flag.key}`" class="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-200 outline-none focus:border-violet-500" @change="changeMode(flag, ($event.target as HTMLSelectElement).value as FeatureReleaseMode)">
            <option v-for="option in releaseOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </article>
      </div>
    </section>

    <section class="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/70">
      <header class="border-b border-zinc-800 p-6">
        <p class="text-xs font-semibold tracking-[0.18em] text-sky-400">USER MANAGEMENT</p>
        <h2 class="mt-2 text-xl font-semibold text-zinc-100">使用者與測試資格</h2>
        <p class="mt-1 text-sm text-zinc-500">只有設定為「指定測試者」的功能會使用下方個別權限。</p>
      </header>
      <div v-if="!loading && users.length === 0" class="p-8 text-sm text-zinc-500">目前沒有可管理的使用者。</div>
      <div class="divide-y divide-zinc-800">
        <article v-for="user in users" :key="user.userId" class="p-5">
          <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2"><h3 class="truncate font-semibold text-zinc-100">{{ user.email ?? '未設定 Email' }}</h3><span class="rounded-full px-2.5 py-1 text-[10px] font-semibold" :class="user.role === 'admin' ? 'bg-violet-500/15 text-violet-300' : 'bg-sky-500/10 text-sky-300'">{{ user.role === 'admin' ? '管理員' : '一般使用者' }}</span></div>
              <p class="mt-1 text-xs text-zinc-500">最近登入：{{ formatDate(user.lastSignInAt) }}</p>
            </div>
            <select :value="user.role" :disabled="user.userId === accessStore.context?.profile.userId || busyKey === `role:${user.userId}`" class="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-200 disabled:opacity-50" @change="changeRole(user, ($event.target as HTMLSelectElement).value as FreedomRole)">
              <option value="user">一般使用者</option><option value="admin">管理員</option>
            </select>
          </div>
          <div v-if="user.role === 'user'" class="mt-4 flex flex-wrap gap-2">
            <label v-for="flag in flags.filter(item => item.releaseMode === 'selected')" :key="flag.key" class="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-xs text-zinc-400">
              <input type="checkbox" :checked="user.selectedFeatures.includes(flag.key)" :disabled="busyKey === `access:${user.userId}:${flag.key}`" class="accent-violet-500" @change="toggleSelectedAccess(user, flag, ($event.target as HTMLInputElement).checked)">
              {{ flag.label }}
            </label>
            <span v-if="!flags.some(item => item.releaseMode === 'selected')" class="text-xs text-zinc-600">目前沒有設定為「指定測試者」的功能。</span>
          </div>
        </article>
      </div>
    </section>

    <section class="rounded-3xl border border-emerald-500/15 bg-emerald-500/[0.04] p-6">
      <h2 class="font-semibold text-emerald-300">資料隔離已由 Supabase RLS 保護</h2>
      <p class="mt-2 text-sm leading-7 text-zinc-500">一般使用者只能讀寫自己的帳戶、交易、復盤與截圖。管理員身分不會自動開放其他人的交易內容，避免管理功能意外接觸私人交易資料。</p>
    </section>
  </div>
</template>
