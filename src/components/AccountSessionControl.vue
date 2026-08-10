<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppConfirmDialog from '@/components/AppConfirmDialog.vue'
import {
  getCloudIdentity,
  onCloudAuthStateChange,
  signOutCloud,
} from '@/services/cloud/cloud-auth.service'
import type { FreedomCloudIdentity } from '@/types/cloud'
import { useNotificationStore } from '@/stores/useNotificationStore'

withDefaults(defineProps<{ variant?: 'sidebar' | 'mobile' }>(), {
  variant: 'sidebar',
})

const router = useRouter()
const notificationStore = useNotificationStore()
const identity = ref<FreedomCloudIdentity | null>(null)
const loggingOut = ref(false)
const confirmOpen = ref(false)
let unsubscribe: (() => void) | null = null

const logout = async (): Promise<void> => {
  if (loggingOut.value) return
  loggingOut.value = true

  try {
    await signOutCloud()
    identity.value = null
    confirmOpen.value = false
    notificationStore.addNotification({
      type: 'success',
      title: '已安全登出',
      message: 'Freedom Account 已登出，本機與雲端交易資料均完整保留。',
    })
    await router.replace({ name: 'login' })
    // A full navigation guarantees every protected component is destroyed and
    // no stale trading screen remains painted while Supabase finishes clearing
    // its persisted session on slower browsers.
    if (router.currentRoute.value.name !== 'login') {
      window.location.replace('/login')
    }
  }
  catch {
    notificationStore.addNotification({
      type: 'danger',
      title: '登出失敗',
      message: '目前無法結束登入狀態，請稍後再試。',
    })
  }
  finally {
    loggingOut.value = false
  }
}

onMounted(async () => {
  try { identity.value = await getCloudIdentity() }
  catch { identity.value = null }

  unsubscribe = onCloudAuthStateChange((_event, session) => {
    identity.value = session?.user
      ? { userId: session.user.id, email: session.user.email ?? null }
      : null
  })
})

onUnmounted(() => unsubscribe?.())
</script>

<template>
  <div v-if="identity" :class="variant === 'mobile' ? 'mt-3 border-t border-zinc-800 pt-3' : ''">
    <div :class="variant === 'mobile' ? 'rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4' : 'rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4'">
      <div class="flex min-w-0 items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="text-[10px] font-semibold tracking-[0.14em] text-emerald-400">已安全登入</p>
          <p class="mt-1 truncate text-xs text-zinc-400" :title="identity.email ?? ''">{{ identity.email ?? 'Freedom Account' }}</p>
        </div>
        <button
          type="button"
          :disabled="loggingOut"
          class="shrink-0 rounded-xl border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-400 transition hover:border-rose-400/30 hover:bg-rose-400/[0.06] hover:text-rose-300 disabled:cursor-wait disabled:opacity-50"
          @click="confirmOpen = true"
        >
          {{ loggingOut ? '登出中…' : '登出' }}
        </button>
      </div>
    </div>
    <AppConfirmDialog
      :open="confirmOpen"
      title="確認登出 Freedom OS？"
      message="登出後需要重新輸入帳號密碼；所有交易紀錄、復盤與 MT5 同步資料都會完整保留。"
      confirm-label="確認登出"
      :busy="loggingOut"
      tone="danger"
      @cancel="confirmOpen = false"
      @confirm="logout"
    />
  </div>
</template>
