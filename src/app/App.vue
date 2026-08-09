<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'

import AppErrorBoundary from '@/components/AppErrorBoundary.vue'
import AppConfirmHost from '@/components/AppConfirmHost.vue'
import AppToastHost from '@/components/AppToastHost.vue'
import { usePlaybookPerformanceSync } from '@/composables/usePlaybookPerformanceSync'
import { useTradingRiskSync } from '@/composables/useTradingRiskSync'
import { startBrokerAutoSync } from '@/services/broker-auto-sync.service'
import { startBrokerCloudBridge } from '@/services/broker-cloud-bridge.service'
import { startBrokerEventLedger } from '@/services/broker-event-ledger.service'
import { startBrokerReconciliation } from '@/services/broker-reconciliation.service'
import {
  getCloudSession,
  onCloudAuthStateChange,
} from '@/services/cloud/cloud-auth.service'
import { startCloudAutoSync } from '@/services/cloud/cloud-auto-sync.service'
import { isCloudAuthRequired } from '@/services/runtime-mode.service'

usePlaybookPerformanceSync()
useTradingRiskSync()

let stopCloudSync: (() => void) | null = null
let stopBrokerSync: (() => void) | null = null
let stopBrokerCloudBridge: (() => void) | null = null
let stopBrokerEventLedger: (() => void) | null = null
let stopBrokerReconciliation: (() => void) | null = null
let unsubscribeAuth: (() => void) | null = null

const servicesRunning = (): boolean => Boolean(
  stopCloudSync ||
  stopBrokerCloudBridge ||
  stopBrokerEventLedger ||
  stopBrokerReconciliation ||
  stopBrokerSync,
)

const startBackgroundServices = (): void => {
  if (servicesRunning()) return
  stopCloudSync = startCloudAutoSync()
  stopBrokerCloudBridge = startBrokerCloudBridge()
  stopBrokerEventLedger = startBrokerEventLedger()
  stopBrokerReconciliation = startBrokerReconciliation()
  stopBrokerSync = startBrokerAutoSync()
}

const stopBackgroundServices = (): void => {
  stopBrokerSync?.()
  stopBrokerEventLedger?.()
  stopBrokerReconciliation?.()
  stopBrokerCloudBridge?.()
  stopCloudSync?.()

  stopBrokerSync = null
  stopBrokerEventLedger = null
  stopBrokerReconciliation = null
  stopBrokerCloudBridge = null
  stopCloudSync = null
}

onMounted(async () => {
  if (!isCloudAuthRequired()) {
    startBackgroundServices()
    return
  }

  try {
    const session = await getCloudSession()
    if (session) startBackgroundServices()
  }
  catch {
    stopBackgroundServices()
  }

  unsubscribeAuth = onCloudAuthStateChange((_event, session) => {
    if (session) startBackgroundServices()
    else stopBackgroundServices()
  })
})

onUnmounted(() => {
  unsubscribeAuth?.()
  stopBackgroundServices()
})
</script>

<template>
  <AppErrorBoundary>
    <RouterView />
    <AppConfirmHost />
    <AppToastHost />
  </AppErrorBoundary>
</template>
