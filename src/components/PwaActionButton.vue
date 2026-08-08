<script setup lang="ts">
import { storeToRefs } from 'pinia'

import { usePwaStore } from '@/stores/usePwaStore'

const pwaStore = usePwaStore()
const { canInstall, updateAvailable } = storeToRefs(pwaStore)

const run = async (): Promise<void> => {
  if (updateAvailable.value) {
    pwaStore.applyUpdate()
    return
  }
  await pwaStore.install()
}
</script>

<template>
  <button
    v-if="canInstall || updateAvailable"
    type="button"
    class="hidden rounded-xl border border-sky-500/20 bg-sky-500/[0.06] px-3 py-2 text-xs font-medium text-sky-300 transition hover:bg-sky-500/10 sm:block"
    @click="run"
  >
    {{ updateAvailable ? '更新 App' : '安裝 App' }}
  </button>
</template>
