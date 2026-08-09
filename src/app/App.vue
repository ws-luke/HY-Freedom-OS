<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'

import AppErrorBoundary from '@/components/AppErrorBoundary.vue'
import AppToastHost from '@/components/AppToastHost.vue'
import { usePlaybookPerformanceSync } from '@/composables/usePlaybookPerformanceSync'
import { useTradingRiskSync } from '@/composables/useTradingRiskSync'
import { startBrokerAutoSync } from '@/services/broker-auto-sync.service'
import { startBrokerCloudBridge } from '@/services/broker-cloud-bridge.service'
import { startBrokerEventLedger } from '@/services/broker-event-ledger.service'
import { startBrokerReconciliation } from '@/services/broker-reconciliation.service'
import { startCloudAutoSync } from '@/services/cloud/cloud-auto-sync.service'

usePlaybookPerformanceSync()
useTradingRiskSync()

let stopCloudSync: (() => void) | null = null
let stopBrokerSync: (() => void) | null = null
let stopBrokerCloudBridge: (() => void) | null = null
let stopBrokerEventLedger: (() => void) | null = null
let stopBrokerReconciliation: (() => void) | null = null

onMounted(() => {
  stopCloudSync = startCloudAutoSync()
  stopBrokerCloudBridge = startBrokerCloudBridge()
  stopBrokerEventLedger = startBrokerEventLedger()
  stopBrokerReconciliation = startBrokerReconciliation()
  stopBrokerSync = startBrokerAutoSync()
})

onUnmounted(() => {
  stopBrokerSync?.()
  stopBrokerEventLedger?.()
  stopBrokerReconciliation?.()
  stopBrokerCloudBridge?.()
  stopCloudSync?.()
})
</script>

<template>
  <AppErrorBoundary>
    <RouterView />
    <AppToastHost />
  </AppErrorBoundary>
</template>
