<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'

import { usePlaybookPerformanceSync } from '@/composables/usePlaybookPerformanceSync'
import { useTradingRiskSync } from '@/composables/useTradingRiskSync'
import { startBrokerAutoSync } from '@/services/broker-auto-sync.service'
import { startCloudAutoSync } from '@/services/cloud/cloud-auto-sync.service'

usePlaybookPerformanceSync()
useTradingRiskSync()

let stopCloudSync: (() => void) | null = null
let stopBrokerSync: (() => void) | null = null

onMounted(() => {
  stopCloudSync = startCloudAutoSync()
  stopBrokerSync = startBrokerAutoSync()
})

onUnmounted(() => {
  stopBrokerSync?.()
  stopCloudSync?.()
})
</script>

<template>
  <RouterView />
</template>
