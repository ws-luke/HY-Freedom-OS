<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'

import AppErrorBoundary from '@/components/AppErrorBoundary.vue'
import { usePlaybookPerformanceSync } from '@/composables/usePlaybookPerformanceSync'
import { useTradingRiskSync } from '@/composables/useTradingRiskSync'
import { startBrokerAutoSync } from '@/services/broker-auto-sync.service'
import { startBrokerCloudBridge } from '@/services/broker-cloud-bridge.service'
import { startCloudAutoSync } from '@/services/cloud/cloud-auto-sync.service'

usePlaybookPerformanceSync()
useTradingRiskSync()

let stopCloudSync: (() => void) | null = null
let stopBrokerSync: (() => void) | null = null
let stopBrokerCloudBridge: (() => void) | null = null

onMounted(() => {
  stopCloudSync = startCloudAutoSync()
  stopBrokerCloudBridge = startBrokerCloudBridge()
  stopBrokerSync = startBrokerAutoSync()
})

onUnmounted(() => {
  stopBrokerSync?.()
  stopBrokerCloudBridge?.()
  stopCloudSync?.()
})
</script>

<template>
  <AppErrorBoundary>
    <RouterView />
  </AppErrorBoundary>
</template>
