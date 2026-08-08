<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue'

const failed = ref(false)
const message = ref('')

onErrorCaptured(error => {
  failed.value = true
  message.value = error instanceof Error ? error.message : 'Unknown application error'
  console.error('[Freedom OS] UI recovery boundary:', error)
  return false
})

const reload = (): void => window.location.reload()
</script>

<template>
  <slot v-if="!failed" />
  <main v-else class="grid min-h-screen place-items-center bg-zinc-950 px-5 text-zinc-100">
    <section class="w-full max-w-lg rounded-3xl border border-rose-400/15 bg-zinc-900/80 p-7 shadow-2xl shadow-black/30">
      <p class="text-xs font-semibold tracking-[0.18em] text-rose-300">SAFE RECOVERY</p>
      <h1 class="mt-3 text-2xl font-semibold">Freedom OS 畫面啟動失敗</h1>
      <p class="mt-3 text-sm leading-6 text-zinc-500">資料沒有因此被刪除。重新載入會重新建立畫面與 Cloud Session。</p>
      <p v-if="message" class="mt-4 max-h-24 overflow-auto rounded-xl bg-black/20 p-3 font-mono text-[10px] leading-5 text-zinc-600">{{ message }}</p>
      <button type="button" class="mt-6 rounded-xl bg-sky-300 px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-sky-200" @click="reload">重新載入 Freedom OS</button>
    </section>
  </main>
</template>
