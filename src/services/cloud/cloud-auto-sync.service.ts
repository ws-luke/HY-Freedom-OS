import { getCloudIdentity, onCloudAuthStateChange } from './cloud-auth.service'
import { synchronizeFreedomCloud } from './cloud-sync.service'
import { useAccountStore } from '@/stores/useAccountStore'
import { useDailyMissionStore } from '@/stores/useDailyMissionStore'
import { usePlaybookStore } from '@/stores/usePlaybookStore'
import { useSignalStore } from '@/stores/useSignalStore'
import { useThemeStore } from '@/stores/useThemeStore'
import { useTradeReviewStore } from '@/stores/useTradeReviewStore'
import { useTradeStore } from '@/stores/useTradeStore'
import { useTradingPlanStore } from '@/stores/useTradingPlanStore'
import { useTradingRiskStore } from '@/stores/useTradingRiskStore'
import type { StoredAccountLedgerState } from '@/types/account'
import type { StoredMissionState } from '@/types/mission'
import type { PlaybookRecord } from '@/types/playbook'
import type { SignalRecord } from '@/types/signal'
import type { StoredTradeReview } from '@/types/trade-review'
import type { TradeRecord } from '@/types/trade'
import type { TradingPlan } from '@/types/trading-plan'
import type { FreedomCloudSyncRuntimeStatus, FreedomCloudSyncSummary } from '@/types/cloud'

const WATCHED_KEYS = [
  'hy-freedom-os:account-ledger',
  'hy-freedom-os:signals',
  'hy-freedom-os:playbooks',
  'hy-freedom-os:trades',
  'hy-freedom-os:trade-reviews',
  'hy-freedom-os:trading-plan',
  'hy-freedom-os:daily-missions',
  'hy-freedom-os:risk-settings',
  'hy-freedom-os:theme',
] as const

const RUNTIME_STORAGE_KEY = 'hy-freedom-os:cloud-sync-runtime'
const RUNTIME_EVENT = 'freedom-cloud-sync-runtime'
const RETRY_DELAYS = [5_000, 15_000, 30_000, 60_000, 120_000, 300_000] as const

const readJson = <T>(key: string): T | null => {
  const raw = window.localStorage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  }
  catch {
    return null
  }
}

const fingerprint = (): string =>
  WATCHED_KEYS.map(key => `${key}:${window.localStorage.getItem(key) ?? ''}`).join('|')

const applyLocalCacheToStores = (): void => {
  const ledger = readJson<StoredAccountLedgerState>('hy-freedom-os:account-ledger')
  if (ledger) {
    useAccountStore().$patch({
      accounts: ledger.accounts,
      transactions: ledger.transactions,
    })
  }

  const trades = readJson<TradeRecord[]>('hy-freedom-os:trades')
  if (Array.isArray(trades)) useTradeStore().$patch({ trades })

  const signals = readJson<SignalRecord[]>('hy-freedom-os:signals')
  if (Array.isArray(signals)) useSignalStore().$patch({ signals })

  const playbooks = readJson<PlaybookRecord[]>('hy-freedom-os:playbooks')
  if (Array.isArray(playbooks)) usePlaybookStore().$patch({ playbooks })

  const reviews = readJson<StoredTradeReview[]>('hy-freedom-os:trade-reviews')
  if (Array.isArray(reviews)) useTradeReviewStore().$patch({ reviews })

  const plan = readJson<TradingPlan>('hy-freedom-os:trading-plan')
  if (plan) useTradingPlanStore().$patch({ plan })

  const missionState = readJson<StoredMissionState>('hy-freedom-os:daily-missions')
  if (missionState) {
    useDailyMissionStore().$patch({
      today: missionState.date,
      missions: missionState.missions,
    })
  }

  const risk = readJson<Record<string, number>>('hy-freedom-os:risk-settings')
  if (risk) useTradingRiskStore().$patch({ settings: risk })

  const theme = window.localStorage.getItem('hy-freedom-os:theme')
  if (theme === 'dark' || theme === 'light') useThemeStore().setTheme(theme)
}

let started = false
let currentFingerprint = ''
let detectTimer: number | null = null
let heartbeatTimer: number | null = null
let scheduledTimer: number | null = null
let unsubscribeAuth: (() => void) | null = null
let activeRun: Promise<FreedomCloudSyncSummary | null> | null = null

const initialRuntime = (): FreedomCloudSyncRuntimeStatus => ({
  state: typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'idle',
  online: typeof navigator === 'undefined' || navigator.onLine !== false,
  pending: false,
  retryAttempt: 0,
  nextRetryAt: null,
  lastStartedAt: null,
  lastCompletedAt: null,
  lastError: null,
})

const readRuntime = (): FreedomCloudSyncRuntimeStatus => {
  if (typeof window === 'undefined') return initialRuntime()
  const raw = window.localStorage.getItem(RUNTIME_STORAGE_KEY)
  if (!raw) return initialRuntime()
  try {
    return { ...initialRuntime(), ...(JSON.parse(raw) as Partial<FreedomCloudSyncRuntimeStatus>) }
  }
  catch {
    return initialRuntime()
  }
}

let runtime = readRuntime()

const publishRuntime = (updates: Partial<FreedomCloudSyncRuntimeStatus>): void => {
  runtime = { ...runtime, ...updates }
  if (typeof window === 'undefined') return
  window.localStorage.setItem(RUNTIME_STORAGE_KEY, JSON.stringify(runtime))
  window.dispatchEvent(new CustomEvent(RUNTIME_EVENT, { detail: { ...runtime } }))
}

export const getCloudSyncRuntimeStatus = (): FreedomCloudSyncRuntimeStatus => ({ ...runtime })

const canSync = (): boolean =>
  typeof navigator === 'undefined' || navigator.onLine !== false

const runOnce = async (): Promise<FreedomCloudSyncSummary | null> => {
  if (!canSync()) {
    publishRuntime({ state: 'offline', online: false, pending: true, nextRetryAt: null })
    return null
  }

  const identity = await getCloudIdentity()
  if (!identity) {
    publishRuntime({ state: 'idle', online: true, nextRetryAt: null })
    return null
  }

  publishRuntime({
    state: 'syncing',
    online: true,
    pending: true,
    lastStartedAt: new Date().toISOString(),
    nextRetryAt: null,
  })

  try {
    const summary = await synchronizeFreedomCloud()
    applyLocalCacheToStores()
    currentFingerprint = fingerprint()
    publishRuntime({
      state: 'synced',
      online: true,
      pending: false,
      retryAttempt: 0,
      nextRetryAt: null,
      lastCompletedAt: summary.syncedAt,
      lastError: null,
    })
    window.dispatchEvent(new CustomEvent('freedom-cloud-synced'))
    return summary
  }
  catch (error) {
    const retryAttempt = runtime.retryAttempt + 1
    const retryDelay = RETRY_DELAYS[Math.min(retryAttempt - 1, RETRY_DELAYS.length - 1)] ?? 300_000
    const nextRetryAt = new Date(Date.now() + retryDelay).toISOString()
    const message = error instanceof Error ? error.message : 'Freedom Cloud 同步失敗。'

    publishRuntime({
      state: 'error',
      online: true,
      pending: true,
      retryAttempt,
      nextRetryAt,
      lastError: message,
    })
    schedule(retryDelay)
    console.warn('Freedom Cloud background sync will retry:', error)
    throw error
  }
}

const run = (): Promise<FreedomCloudSyncSummary | null> => {
  if (activeRun) return activeRun
  activeRun = runOnce().finally(() => { activeRun = null })
  return activeRun
}

const schedule = (delay = 2500): void => {
  if (!started || !canSync()) return
  if (scheduledTimer !== null) window.clearTimeout(scheduledTimer)
  scheduledTimer = window.setTimeout(() => {
    scheduledTimer = null
    void run().catch(() => undefined)
  }, delay)
}

export const requestCloudAutoSync = (delay = 1200): void => {
  publishRuntime({ pending: true })
  schedule(delay)
}

export const syncCloudNow = async (): Promise<FreedomCloudSyncSummary | null> => {
  if (scheduledTimer !== null) {
    window.clearTimeout(scheduledTimer)
    scheduledTimer = null
  }
  publishRuntime({ pending: true })
  return run()
}

const detectLocalChanges = (): void => {
  const next = fingerprint()
  if (next === currentFingerprint) return
  currentFingerprint = next
  publishRuntime({ pending: true, state: canSync() ? 'idle' : 'offline', online: canSync() })
  schedule()
}

const handleVisibility = (): void => {
  if (document.visibilityState === 'visible') schedule(1200)
}

const handleOnline = (): void => {
  publishRuntime({ state: 'idle', online: true, nextRetryAt: null })
  schedule(500)
}

const handleOffline = (): void => {
  publishRuntime({ state: 'offline', online: false, pending: true, nextRetryAt: null })
}

export const startCloudAutoSync = (): (() => void) => {
  if (started || typeof window === 'undefined') return stopCloudAutoSync
  started = true
  currentFingerprint = fingerprint()

  detectTimer = window.setInterval(detectLocalChanges, 4000)
  heartbeatTimer = window.setInterval(() => schedule(0), 5 * 60 * 1000)
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  document.addEventListener('visibilitychange', handleVisibility)

  unsubscribeAuth = onCloudAuthStateChange((_event, session) => {
    if (session?.user) schedule(1200)
  })

  schedule(1800)
  return stopCloudAutoSync
}

export const stopCloudAutoSync = (): void => {
  if (!started || typeof window === 'undefined') return
  started = false
  if (detectTimer !== null) window.clearInterval(detectTimer)
  if (heartbeatTimer !== null) window.clearInterval(heartbeatTimer)
  if (scheduledTimer !== null) window.clearTimeout(scheduledTimer)
  detectTimer = null
  heartbeatTimer = null
  scheduledTimer = null
  unsubscribeAuth?.()
  unsubscribeAuth = null
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
  document.removeEventListener('visibilitychange', handleVisibility)
}

export const cloudAutoSyncService = {
  start: startCloudAutoSync,
  stop: stopCloudAutoSync,
  request: requestCloudAutoSync,
  syncNow: syncCloudNow,
  getStatus: getCloudSyncRuntimeStatus,
}
