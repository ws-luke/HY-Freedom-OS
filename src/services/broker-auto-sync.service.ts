import {
  getMt5CredentialStatus,
  getMt5SyncHealth,
  isMt5AgentCompatible,
  syncMt5Account,
} from './mt5-sync-client.service'
import { useAccountStore } from '@/stores/useAccountStore'
import { useNotificationStore } from '@/stores/useNotificationStore'

const POLL_INTERVAL_MS = 20_000
const ERROR_RETRY_COOLDOWN_MS = 60_000

let started = false
let timer: number | null = null
let running = false
let initialCycleNotified = false
const recoveryAttemptAt = new Map<string, number>()

const eligibleAccounts = () => {
  const accountStore = useAccountStore()
  return accountStore.accounts.filter(account =>
    account.dataSource === 'mt5' &&
    account.status !== 'closed' &&
    (account.syncStatus === 'connected' || account.syncStatus === 'error') &&
    Boolean(account.lastSyncedAt) &&
    Boolean(account.brokerLogin) &&
    Boolean(account.brokerServer),
  )
}

const notifyInitialCycle = (
  summary: {
    succeeded: number
    failed: number
    addedTrades: number
    tradesReadyForReview: number
    addedCashflows: number
  },
): void => {
  if (initialCycleNotified) return
  initialCycleNotified = true

  const pieces = [
    `帳戶 ${summary.succeeded} 個`,
    `新交易 ${summary.addedTrades} 筆`,
    `待復盤 ${summary.tradesReadyForReview} 筆`,
    `資金流水 ${summary.addedCashflows} 筆`,
  ]

  if (summary.failed > 0) pieces.push(`失敗 ${summary.failed} 個`)

  useNotificationStore().addNotification({
    type: summary.failed > 0
      ? 'warning'
      : summary.tradesReadyForReview > 0
        ? 'warning'
        : 'success',
    title: summary.failed > 0
      ? '登入後同步完成 · 部分帳戶需檢查'
      : '登入後 MT5 同步完成',
    message: pieces.join(' · '),
    route: summary.tradesReadyForReview > 0 ? '/review' : '/accounts',
  })
}

const notifyInitialFailure = (message: string): void => {
  if (initialCycleNotified) return
  initialCycleNotified = true
  useNotificationStore().addNotification({
    type: 'danger',
    title: '登入後 MT5 同步未完成',
    message,
    route: '/accounts',
  })
}

const run = async (): Promise<void> => {
  if (running || navigator.onLine === false || document.visibilityState === 'hidden') return
  const accounts = eligibleAccounts()
  if (accounts.length === 0) return

  running = true
  try {
    const health = await getMt5SyncHealth()
    if (!health) {
      notifyInitialFailure('Freedom MT5 Agent 目前沒有回應；背景服務恢復後會自動繼續同步。')
      return
    }
    if (!isMt5AgentCompatible(health.version)) {
      notifyInitialFailure(`Freedom MT5 Agent 版本 ${health.version} 過舊，請更新後再同步。`)
      return
    }

    const summary = {
      succeeded: 0,
      failed: 0,
      addedTrades: 0,
      tradesReadyForReview: 0,
      addedCashflows: 0,
    }

    for (const account of accounts) {
      try {
        if (account.syncStatus === 'error') {
          const now = Date.now()
          const previousAttempt = recoveryAttemptAt.get(account.id) ?? 0
          if (now - previousAttempt < ERROR_RETRY_COOLDOWN_MS) continue

          recoveryAttemptAt.set(account.id, now)
          if (!(await getMt5CredentialStatus(account.id))) {
            summary.failed += 1
            continue
          }
        }

        const result = await syncMt5Account(account, null, { background: true })
        recoveryAttemptAt.delete(account.id)
        summary.succeeded += 1
        summary.addedTrades += result.addedTrades
        summary.tradesReadyForReview += result.tradesReadyForReview
        summary.addedCashflows += result.addedCashflows
      }
      catch {
        summary.failed += 1
        // The account contains the actionable error and pauses automatic retry
        // until the user manually reconnects it.
      }
    }

    notifyInitialCycle(summary)
  }
  finally {
    running = false
  }
}

const handleVisible = (): void => {
  if (document.visibilityState === 'visible') void run()
}

const handleOnline = (): void => { void run() }

export const startBrokerAutoSync = (): (() => void) => {
  if (started || typeof window === 'undefined') return stopBrokerAutoSync
  started = true
  timer = window.setInterval(() => { void run() }, POLL_INTERVAL_MS)
  document.addEventListener('visibilitychange', handleVisible)
  window.addEventListener('online', handleOnline)
  window.setTimeout(() => { void run() }, 2500)
  return stopBrokerAutoSync
}

export const stopBrokerAutoSync = (): void => {
  if (!started || typeof window === 'undefined') return
  started = false
  if (timer !== null) window.clearInterval(timer)
  timer = null
  running = false
  initialCycleNotified = false
  recoveryAttemptAt.clear()
  document.removeEventListener('visibilitychange', handleVisible)
  window.removeEventListener('online', handleOnline)
}

export const brokerAutoSyncService = {
  start: startBrokerAutoSync,
  stop: stopBrokerAutoSync,
}
