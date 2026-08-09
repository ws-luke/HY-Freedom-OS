import { reactive } from 'vue'

import { applyBrokerSyncPayload, parseBrokerSyncPayload } from './broker-sync.service'
import { requestCloudAutoSync } from './cloud/cloud-auto-sync.service'
import { useAccountStore } from '@/stores/useAccountStore'

import type { TradingAccount } from '@/types/account'
import type { BrokerSyncImportResult } from '@/types/broker-sync'

const MT5_SYNC_BASE_URL = (
  import.meta.env.VITE_MT5_SYNC_URL || 'http://127.0.0.1:8765'
).replace(/\/$/, '')

export const MT5_SYNC_MIN_AGENT_VERSION = '1.6.2'

export interface Mt5AgentHealth {
  ok: boolean
  service: string
  version: string
  mt5ModuleVersion: string | null
  credentialProtection: string | null
  cloudBridge: string | null
  brokerEventLedger: string | null
  backgroundAutostart: boolean
  cloudPollSeconds: number | null
}

export interface Mt5AccountSyncRuntime {
  status: 'idle' | 'syncing' | 'success' | 'error'
  startedAt: string | null
  completedAt: string | null
  result: BrokerSyncImportResult | null
  error: string | null
}

export const mt5SyncRuntime = reactive<{
  agentOnline: boolean
  agentHealth: Mt5AgentHealth | null
  agentCheckedAt: string | null
  accountRuns: Record<string, Mt5AccountSyncRuntime>
}>({
  agentOnline: false,
  agentHealth: null,
  agentCheckedAt: null,
  accountRuns: {},
})

const versionParts = (value: string): number[] =>
  value.split('.').map(part => Number.parseInt(part, 10) || 0)

export const isMt5AgentCompatible = (version: string | null | undefined): boolean => {
  if (!version) return false
  const current = versionParts(version)
  const required = versionParts(MT5_SYNC_MIN_AGENT_VERSION)
  const length = Math.max(current.length, required.length)

  for (let index = 0; index < length; index += 1) {
    const currentPart = current[index] ?? 0
    const requiredPart = required[index] ?? 0
    if (currentPart > requiredPart) return true
    if (currentPart < requiredPart) return false
  }
  return true
}

const syncRuntimeFor = (accountId: string): Mt5AccountSyncRuntime => {
  const existing = mt5SyncRuntime.accountRuns[accountId]
  if (existing) return existing

  const created: Mt5AccountSyncRuntime = {
    status: 'idle',
    startedAt: null,
    completedAt: null,
    result: null,
    error: null,
  }
  mt5SyncRuntime.accountRuns[accountId] = created
  return created
}

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 2500,
): Promise<Response> => {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(input, { ...init, signal: controller.signal })
  }
  finally {
    window.clearTimeout(timeout)
  }
}

export const getMt5SyncHealth = async (): Promise<Mt5AgentHealth | null> => {
  try {
    const response = await fetchWithTimeout(`${MT5_SYNC_BASE_URL}/health`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json() as Partial<Mt5AgentHealth>
    if (data.ok !== true || typeof data.version !== 'string') throw new Error('Invalid health response')

    const health: Mt5AgentHealth = {
      ok: true,
      service: typeof data.service === 'string' ? data.service : 'Freedom MT5 Sync Service',
      version: data.version,
      mt5ModuleVersion: typeof data.mt5ModuleVersion === 'string' ? data.mt5ModuleVersion : null,
      credentialProtection: typeof data.credentialProtection === 'string' ? data.credentialProtection : null,
      cloudBridge: typeof data.cloudBridge === 'string' ? data.cloudBridge : null,
      brokerEventLedger: typeof data.brokerEventLedger === 'string' ? data.brokerEventLedger : null,
      backgroundAutostart: data.backgroundAutostart === true,
      cloudPollSeconds: typeof data.cloudPollSeconds === 'number' ? data.cloudPollSeconds : null,
    }
    mt5SyncRuntime.agentOnline = true
    mt5SyncRuntime.agentHealth = health
    mt5SyncRuntime.agentCheckedAt = new Date().toISOString()
    return health
  }
  catch {
    mt5SyncRuntime.agentOnline = false
    mt5SyncRuntime.agentHealth = null
    mt5SyncRuntime.agentCheckedAt = new Date().toISOString()
    return null
  }
}

export const checkMt5SyncService = async (): Promise<boolean> =>
  (await getMt5SyncHealth()) !== null

export const getMt5CredentialStatus = async (accountId: string): Promise<boolean> => {
  try {
    const response = await fetchWithTimeout(
      `${MT5_SYNC_BASE_URL}/credentials/${encodeURIComponent(accountId)}`,
    )
    if (!response.ok) return false
    const data = await response.json() as { saved?: boolean }
    return data.saved === true
  }
  catch {
    return false
  }
}

export const forgetMt5Credential = async (accountId: string): Promise<void> => {
  const response = await fetchWithTimeout(
    `${MT5_SYNC_BASE_URL}/credentials/${encodeURIComponent(accountId)}`,
    { method: 'DELETE' },
  )
  if (!response.ok) throw new Error(await readErrorMessage(response))
}

const readErrorMessage = async (response: Response): Promise<string> => {
  try {
    const body = await response.json() as { detail?: string }
    return body.detail || `MT5 Sync Service 回傳 ${response.status}`
  }
  catch {
    return `MT5 Sync Service 回傳 ${response.status}`
  }
}

export const syncMt5Account = async (
  account: TradingAccount,
  password: string | null,
  options: { background?: boolean, rememberPassword?: boolean, fullHistory?: boolean } = {},
): Promise<BrokerSyncImportResult> => {
  if (account.dataSource !== 'mt5') {
    throw new Error('此帳戶不是 MT5 Sync 帳戶。')
  }

  if (!account.brokerServer || !account.brokerLogin) {
    throw new Error('請先完成 MT5 Server 與 Login 設定。')
  }

  const accountStore = useAccountStore()
  const runtime = syncRuntimeFor(account.id)
  runtime.status = 'syncing'
  runtime.startedAt = new Date().toISOString()
  runtime.error = null
  accountStore.updateSyncState(account.id, { status: 'syncing', error: null })
  const requestTimeout = options.background ? 30_000 : 45_000

  try {
    const response = await fetchWithTimeout(
      `${MT5_SYNC_BASE_URL}/sync`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          login: account.brokerLogin,
          server: account.brokerServer,
          password: password?.trim() || undefined,
          rememberPassword: options.background ? false : options.rememberPassword === true,
          // A user-triggered sync is an integrity/backfill operation and scans
          // the complete broker history. Background cycles remain incremental;
          // Agent 1.6 adds a safe rolling overlap to prevent batch-close gaps.
          since: options.fullHistory === true || options.background !== true
            ? null
            : account.lastSyncedAt,
        }),
      },
      requestTimeout,
    )

    if (!response.ok) {
      throw new Error(await readErrorMessage(response))
    }

    const raw = await response.text()
    const payload = parseBrokerSyncPayload(raw)
    const result = applyBrokerSyncPayload(payload)
    runtime.status = 'success'
    runtime.completedAt = new Date().toISOString()
    runtime.result = result
    runtime.error = null
    requestCloudAutoSync(500)
    return result
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'MT5 同步失敗。'
    runtime.status = 'error'
    runtime.completedAt = new Date().toISOString()
    runtime.error = message
    accountStore.updateSyncState(account.id, {
      status: 'error',
      error: message,
    })
    throw error
  }
}
