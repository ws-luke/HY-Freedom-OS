<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { getCloudIdentity } from '@/services/cloud/cloud-auth.service'
import { getCloudRuntime } from '@/services/cloud/supabase.client'
import { isCloudAuthRequired, isProductionRuntime, isSecureRuntime } from '@/services/runtime-mode.service'

type ProbeState = 'idle' | 'checking' | 'healthy' | 'error'

const runtime = getCloudRuntime()
const probe = ref<ProbeState>('idle')
const cloudSignedIn = ref(false)
const production = isProductionRuntime()
const secure = isSecureRuntime()
const authGate = isCloudAuthRequired()
const overallHealthy = computed(() =>
  (!production || probe.value === 'healthy') && secure && runtime.configured && (!authGate || cloudSignedIn.value),
)

onMounted(async () => {
  try { cloudSignedIn.value = Boolean(await getCloudIdentity()) }
  catch { cloudSignedIn.value = false }

  if (!production) {
    probe.value = 'healthy'
    return
  }

  probe.value = 'checking'
  try {
    const response = await fetch('/healthz', { cache: 'no-store' })
    const payload = await response.json() as { status?: string; service?: string }
    probe.value = response.ok && payload.status === 'ok' && payload.service === 'freedom-os' ? 'healthy' : 'error'
  }
  catch { probe.value = 'error' }
})
</script>

<template>
  <section class="overflow-hidden rounded-3xl border border-sky-500/15 bg-zinc-900/70 shadow-xl shadow-black/10">
    <header class="flex flex-col gap-4 border-b border-zinc-800 p-6 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p class="text-xs font-medium tracking-[0.2em] text-sky-400">PRODUCTION RUNTIME</p>
        <h2 class="mt-2 text-xl font-semibold text-zinc-100">Launch Guard</h2>
        <p class="mt-2 text-sm leading-6 text-zinc-500">正式環境入口、HTTPS、Cloud Auth 與 Web Service 自我檢查。</p>
      </div>
      <span class="rounded-full border px-3 py-1.5 text-[10px] font-semibold tracking-[0.12em]" :class="overallHealthy ? 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300' : 'border-amber-400/20 bg-amber-400/[0.06] text-amber-300'">{{ overallHealthy ? 'READY' : 'CHECK' }}</span>
    </header>
    <div class="grid gap-2 p-5 sm:grid-cols-2 lg:grid-cols-4 sm:p-6">
      <div v-for="item in [
        ['Runtime', production ? 'PRODUCTION' : 'LOCAL DEV', true],
        ['Secure Context', secure ? 'HTTPS READY' : 'HTTP', secure],
        ['Freedom Cloud', runtime.configured ? (cloudSignedIn ? 'SIGNED IN' : 'AUTH READY') : 'NOT SET', runtime.configured],
        ['Web Service', probe === 'checking' ? 'CHECKING' : probe === 'healthy' ? 'HEALTHY' : 'UNAVAILABLE', probe === 'healthy'],
      ]" :key="String(item[0])" class="rounded-2xl border border-white/[0.055] bg-black/15 p-4">
        <p class="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600">{{ item[0] }}</p>
        <p class="mt-2 text-sm font-semibold" :class="item[2] ? 'text-emerald-300' : 'text-amber-300'">{{ item[1] }}</p>
      </div>
    </div>
  </section>
</template>
