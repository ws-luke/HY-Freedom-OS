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

const notifyImport = (
  accountName: string,
  result: Awaited<ReturnType<typeof syncMt5Account>>,
): void => {
  if (
    result.addedTrades === 0 &&
    result.tradesReadyForReview === 0 &&
    result.addedCashflows === 0
  ) return

  const pieces: string[] = []
  if (result.openedTradesDetected > 0) pieces.push(`新持倉 ${result.openedTradesDetected}`)
  if (result.tradesReadyForReview > 0) pieces.push(`待復盤 ${result.tradesReadyForReview}`)
  if (result.addedCashflows > 0) pieces.push(`資金流水 ${result.addedCashflows}`)

  useNotificationStore().addNotification({
    type: result.tradesReadyForReview > 0 ? 'warning' : 'success',
    title: `MT5 自動同步 · ${accountName}`,
    message: pieces.join(' · ') || `新增 ${result.addedTrades} 筆交易`,
    route: result.tradesReadyForReview > 0 ? '/review' : '/accounts',
  })
}

const run = async (): Promise<void> => {
  if (running || navigator.onLine === false || document.visibilityState === 'hidden') return
  const accounts = eligibleAccounts()
  if (accounts.length === 0) return

  running = true
  try {
    const health = await getMt5SyncHealth()
    if (!health || !isMt5AgentCompatible(health.version)) return

    for (const account of accounts) {
      try {
        if (account.syncStatus === 'error') {
          const now = Date.now()
          const previousAttempt = recoveryAttemptAt.get(account.id) ?? 0
          if (now - previousAttempt < ERROR_RETRY_COOLDOWN_MS) continue

          recoveryAttemptAt.set(account.id, now)
          if (!(await getMt5CredentialStatus(account.id))) continue
        }

        const result = await syncMt5Account(account, null, { background: true })
        recoveryAttemptAt.delete(account.id)
        notifyImport(account.name, result)
      }
      catch {
        // The account contains the actionable error and pauses automatic retry
        // until the user manually reconnects it.
      }
    }
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
  document.removeEventListener('visibilitychange', handleVisible)
  window.removeEventListener('online', handleOnline)
}

export const brokerAutoSyncService = {
  start: startBrokerAutoSync,
  stop: stopBrokerAutoSync,
}
