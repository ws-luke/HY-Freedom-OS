<script setup lang="ts">
import { storeToRefs } from 'pinia'

import { usePwaStore } from '@/stores/usePwaStore'

const pwaStore = usePwaStore()
const { online, installed, serviceWorkerReady, updateAvailable, isIos, canInstall } = storeToRefs(pwaStore)

const install = async (): Promise<void> => {
  await pwaStore.install()
}
</script>

<template>
  <section class="overflow-hidden rounded-3xl border border-sky-500/15 bg-zinc-900/70 shadow-xl shadow-black/10">
    <header class="flex flex-col gap-4 border-b border-zinc-800 p-6 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <p class="text-xs font-medium tracking-[0.2em] text-sky-400">INSTALLABLE WEB APP</p>
        <h2 class="mt-2 text-xl font-semibold text-zinc-100">Freedom OS PWA</h2>
        <p class="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">可安裝到桌面或手機主畫面。App Shell 可離線啟動；交易與 Cloud API 不會被離線快取偽裝成即時資料。</p>
      </div>
      <span class="shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-semibold" :class="installed ? 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300' : 'border-sky-500/20 bg-sky-500/[0.06] text-sky-300'">
        {{ installed ? 'INSTALLED' : 'PWA READY' }}
      </span>
    </header>

    <div class="grid gap-px bg-zinc-800 sm:grid-cols-3">
      <div class="bg-zinc-900 p-5">
        <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-600">Network</p>
        <p class="mt-2 font-semibold" :class="online ? 'text-emerald-300' : 'text-amber-300'">{{ online ? 'Online' : 'Offline mode' }}</p>
      </div>
      <div class="bg-zinc-900 p-5">
        <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-600">App shell</p>
        <p class="mt-2 font-semibold" :class="serviceWorkerReady ? 'text-emerald-300' : 'text-zinc-400'">{{ serviceWorkerReady ? 'Offline ready' : 'Production build' }}</p>
      </div>
      <div class="bg-zinc-900 p-5">
        <p class="text-[10px] uppercase tracking-[0.12em] text-zinc-600">Platform</p>
        <p class="mt-2 font-semibold text-sky-300">{{ isIos ? 'iPhone / iPad' : 'Web / Desktop' }}</p>
      </div>
    </div>

    <div class="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p v-if="installed" class="text-sm font-medium text-emerald-300">Freedom OS 已以 App 模式執行。</p>
        <p v-else-if="isIos" class="text-sm leading-6 text-zinc-400">iOS 使用 Safari 的「分享 → 加入主畫面」即可安裝；資料仍使用同一個 Freedom Cloud 帳號。</p>
        <p v-else-if="canInstall" class="text-sm leading-6 text-zinc-400">目前瀏覽器已允許安裝 Freedom OS。</p>
        <p v-else class="text-sm leading-6 text-zinc-500">正式部署到 HTTPS 後，支援的瀏覽器會自動提供安裝入口。</p>
      </div>

      <div class="flex shrink-0 gap-2">
        <button v-if="updateAvailable" type="button" class="rounded-xl border border-violet-500/20 bg-violet-500/[0.07] px-4 py-2.5 text-xs font-medium text-violet-300" @click="pwaStore.applyUpdate()">套用新版</button>
        <button v-if="canInstall" type="button" class="rounded-xl bg-sky-300 px-4 py-2.5 text-xs font-semibold text-zinc-950 transition hover:bg-sky-200" @click="install">安裝 Freedom OS</button>
      </div>
    </div>
  </section>
</template>
