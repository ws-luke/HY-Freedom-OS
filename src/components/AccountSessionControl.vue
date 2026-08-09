<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  getCloudIdentity,
  onCloudAuthStateChange,
  signOutCloud,
} from '@/services/cloud/cloud-auth.service'
import type { FreedomCloudIdentity } from '@/types/cloud'

withDefaults(defineProps<{ variant?: 'sidebar' | 'mobile' }>(), {
  variant: 'sidebar',
})

const router = useRouter()
const identity = ref<FreedomCloudIdentity | null>(null)
const loggingOut = ref(false)
const errorMessage = ref('')
let unsubscribe: (() => void) | null = null

const logout = async (): Promise<void> => {
  if (loggingOut.value) return
  loggingOut.value = true
  errorMessage.value = ''

  try {
    await signOutCloud()
    identity.value = null
    await router.replace({ name: 'login' })
  }
  catch {
    errorMessage.value = '登出失敗，請稍後再試。'
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
          @click="logout"
        >
          {{ loggingOut ? '登出中…' : '登出' }}
        </button>
      </div>
      <p v-if="errorMessage" class="mt-2 text-[11px] text-rose-300">{{ errorMessage }}</p>
    </div>
  </div>
</template>
