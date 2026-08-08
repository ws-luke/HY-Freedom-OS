<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

import { getCloudRuntime } from '@/services/cloud/supabase.client'
import {
  getCloudIdentity,
  onCloudAuthStateChange,
} from '@/services/cloud/cloud-auth.service'

const runtime = getCloudRuntime()
const checking = ref(false)
const cloudEmail = ref<string | null>(null)
let unsubscribeAuth: (() => void) | null = null

const modeLabel = computed(() => {
  if (!runtime.configured) return 'LOCAL SAFE MODE'
  if (cloudEmail.value) return 'CLOUD SIGNED IN'
  return 'CLOUD READY'
})

const modeClasses = computed(() => {
  if (!runtime.configured) {
    return 'border-amber-400/20 bg-amber-400/[0.06] text-amber-300'
  }

  return cloudEmail.value
    ? 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300'
    : 'border-sky-400/20 bg-sky-400/[0.06] text-sky-300'
})

const refreshIdentity = async (): Promise<void> => {
  if (!runtime.configured) return
  checking.value = true

  try {
    cloudEmail.value = (await getCloudIdentity())?.email ?? null
  }
  catch {
    cloudEmail.value = null
  }
  finally {
    checking.value = false
  }
}

onMounted(() => {
  void refreshIdentity()

  unsubscribeAuth = onCloudAuthStateChange((_event, session) => {
    cloudEmail.value = session?.user.email ?? null
  })
})

onUnmounted(() => unsubscribeAuth?.())
</script>

<template>
  <section class="overflow-hidden rounded-3xl border border-sky-500/15 bg-zinc-900/70 shadow-xl shadow-black/10">
    <header class="border-b border-zinc-800 p-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p class="text-xs font-medium tracking-[0.2em] text-sky-400">FREEDOM CLOUD</p>
          <h2 class="mt-2 text-xl font-semibold text-zinc-100">Supabase / PostgreSQL Foundation</h2>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            Freedom OS 雲端底層已固定為 PostgreSQL；未連接雲端時，現有本機資料仍照常運作。
          </p>
        </div>

        <span class="shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-semibold tracking-[0.12em]" :class="modeClasses">
          {{ checking ? 'CHECKING…' : modeLabel }}
        </span>
      </div>
    </header>

    <div class="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4 sm:p-6">
      <article class="rounded-2xl border border-white/[0.06] bg-black/15 p-4">
        <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">Database</p>
        <p class="mt-2 font-semibold text-zinc-200">PostgreSQL</p>
        <p class="mt-1 text-xs text-zinc-600">Relational core schema</p>
      </article>

      <article class="rounded-2xl border border-white/[0.06] bg-black/15 p-4">
        <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">Security</p>
        <p class="mt-2 font-semibold text-emerald-300">RLS Ready</p>
        <p class="mt-1 text-xs text-zinc-600">User-owned rows only</p>
      </article>

      <article class="rounded-2xl border border-white/[0.06] bg-black/15 p-4">
        <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">Screenshot</p>
        <p class="mt-2 font-semibold text-violet-300">Private Storage</p>
        <p class="mt-1 text-xs text-zinc-600">Per-user folder policy</p>
      </article>

      <article class="rounded-2xl border border-white/[0.06] bg-black/15 p-4">
        <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-700">Client</p>
        <p class="mt-2 font-semibold" :class="runtime.configured ? 'text-sky-300' : 'text-amber-300'">
          {{ runtime.configured ? '已設定' : '尚未設定' }}
        </p>
        <p class="mt-1 truncate text-xs text-zinc-600">{{ runtime.projectHost ?? 'Local fallback active' }}</p>
      </article>
    </div>

    <div class="border-t border-white/[0.06] px-5 py-4 text-xs leading-6 text-zinc-600 sm:px-6">
      <template v-if="cloudEmail">
        已識別雲端使用者 <span class="text-zinc-300">{{ cloudEmail }}</span>。後續同步會以 User ID 隔離所有帳戶、交易、復盤與截圖。
      </template>
      <template v-else-if="runtime.configured">
        Supabase client 已就緒；現有資料仍保留在 Local，不會在尚未登入時自動上傳。
      </template>
      <template v-else>
        目前繼續使用 Local Storage。Supabase 環境變數尚未設定也不影響 MT5、交易、復盤與帳戶管理。
      </template>
    </div>
  </section>
</template>
