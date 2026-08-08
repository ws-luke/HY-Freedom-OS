import { reactive } from 'vue'

import { applyBrokerSyncPayload, parseBrokerSyncPayload } from './broker-sync.service'
import { requestCloudAutoSync } from './cloud/cloud-auto-sync.service'
import { isSupabaseConfigured, supabase } from './cloud/supabase.client'

const POLL_INTERVAL_MS = 15_000
const LOCAL_AGENT_URL = (import.meta.env.VITE_MT5_SYNC_URL || 'http://127.0.0.1:8765').replace(/\/$/, '')

interface BrokerBridgeRow {
  id: string
  account_id: string
  agent_id: string
  agent_version: string
  status: 'idle' | 'syncing' | 'ready' | 'error'
  payload: unknown | null
  payload_cursor: string | null
  acked_cursor: string | null
  last_error: string | null
  agent_last_seen: string | null
  local_account_id?: string
  last_sync_started_at?: string | null
  last_sync_completed_at?: string | null
  last_success_at?: string | null
  next_retry_at?: string | null
  consecutive_failures?: number
  autostart_enabled?: boolean
  updated_at: string
}

export interface BrokerBridgeAccountRuntime {
  accountId: string
  status: BrokerBridgeRow['status']
  lastSuccessAt: string | null
  lastHeartbeatAt: string | null
  nextRetryAt: string | null
  consecutiveFailures: number
  lastError: string | null
  pending: boolean
  autostartEnabled: boolean
}

export interface CloudBridgeAgentStatus {
  paired: boolean
  userEmail: string | null
  agentId: string | null
  lastCycleAt: string | null
  lastError: string | null
}

export const brokerCloudBridgeRuntime = reactive({
  available: false,
  reliabilityUpgradeRequired: false,
  running: false,
  lastCheckedAt: null as string | null,
  lastImportedAt: null as string | null,
  lastError: null as string | null,
  readyCount: 0,
  agentLastSeen: null as string | null,
  agentVersion: null as string | null,
  autostartEnabled: false,
  accountStates: {} as Record<string, BrokerBridgeAccountRuntime>,
})

export const BROKER_AGENT_STALE_MS = 90_000

export const isBrokerAgentHeartbeatStale = (value: string | null): boolean => {
  if (!value) return true
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) || Date.now() - timestamp > BROKER_AGENT_STALE_MS
}

let started = false
let timer: number | null = null
let activeRun: Promise<void> | null = null

const readAgentError = async (response: Response): Promise<string> => {
  try {
    const body = await response.json() as { detail?: string }
    return body.detail || `Freedom MT5 Agent 回傳 ${response.status}`
  }
  catch {
    return `Freedom MT5 Agent 回傳 ${response.status}`
  }
}

const localAgentFetch = async (path: string, init: RequestInit = {}): Promise<Response> => {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 8_000)
  try {
    return await fetch(`${LOCAL_AGENT_URL}${path}`, { ...init, signal: controller.signal })
  }
  finally {
    window.clearTimeout(timeout)
  }
}

export const getCloudBridgeAgentStatus = async (): Promise<CloudBridgeAgentStatus | null> => {
  try {
    const response = await localAgentFetch('/cloud/status')
    if (!response.ok) return null
    const value = await response.json() as Partial<CloudBridgeAgentStatus>
    return {
      paired: value.paired === true,
      userEmail: typeof value.userEmail === 'string' ? value.userEmail : null,
      agentId: typeof value.agentId === 'string' ? value.agentId : null,
      lastCycleAt: typeof value.lastCycleAt === 'string' ? value.lastCycleAt : null,
      lastError: typeof value.lastError === 'string' ? value.lastError : null,
    }
  }
  catch {
    return null
  }
}

export const pairCloudBridgeAgent = async (email: string, password: string): Promise<CloudBridgeAgentStatus> => {
  const response = await localAgentFetch('/cloud/pair', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password }),
  })
  if (!response.ok) throw new Error(await readAgentError(response))
  const status = await response.json() as CloudBridgeAgentStatus
  return status
}

export const unpairCloudBridgeAgent = async (): Promise<void> => {
  const response = await localAgentFetch('/cloud/pair', { method: 'DELETE' })
  if (!response.ok) throw new Error(await readAgentError(response))
}

const importReadyPayloads = async (): Promise<void> => {
  if (!supabase || !isSupabaseConfigured || navigator.onLine === false) return
  if (activeRun) return activeRun

  activeRun = (async () => {
    brokerCloudBridgeRuntime.running = true
    try {
      const v2 = await supabase
        .from('broker_sync_channels')
        .select('id,account_id,agent_id,agent_version,status,payload,payload_cursor,acked_cursor,last_error,agent_last_seen,local_account_id,last_sync_started_at,last_sync_completed_at,last_success_at,next_retry_at,consecutive_failures,autostart_enabled,updated_at')
        .order('updated_at', { ascending: false })

      brokerCloudBridgeRuntime.lastCheckedAt = new Date().toISOString()
      let data = v2.data
      let error = v2.error
      let reliabilityV2 = !error

      if (error?.code === '42703') {
        const legacy = await supabase
          .from('broker_sync_channels')
          .select('id,account_id,agent_id,agent_version,status,payload,payload_cursor,acked_cursor,last_error,agent_last_seen,updated_at')
          .order('updated_at', { ascending: false })
        data = legacy.data as typeof data
        error = legacy.error
        reliabilityV2 = false
      }

      if (error) {
        // 42P01 means the optional bridge migration has not been installed yet.
        brokerCloudBridgeRuntime.available = error.code !== '42P01'
        brokerCloudBridgeRuntime.lastError = error.code === '42P01' ? null : error.message
        return
      }

      brokerCloudBridgeRuntime.available = true
      brokerCloudBridgeRuntime.reliabilityUpgradeRequired = !reliabilityV2
      brokerCloudBridgeRuntime.lastError = null
      const rows = (data ?? []) as BrokerBridgeRow[]
      brokerCloudBridgeRuntime.readyCount = rows.filter(row =>
        row.status === 'ready' && Boolean(row.payload_cursor) && row.payload_cursor !== row.acked_cursor,
      ).length

      const newestAgent = rows.find(row => row.agent_last_seen)
      brokerCloudBridgeRuntime.agentLastSeen = newestAgent?.agent_last_seen ?? null
      brokerCloudBridgeRuntime.agentVersion = newestAgent?.agent_version || null
      brokerCloudBridgeRuntime.autostartEnabled = rows.some(row => row.autostart_enabled === true)
      brokerCloudBridgeRuntime.accountStates = Object.fromEntries(
        rows
          .map(row => {
            const payloadAccountId = row.payload && typeof row.payload === 'object' && 'accountId' in row.payload
              ? String((row.payload as { accountId?: unknown }).accountId ?? '')
              : ''
            const accountId = row.local_account_id || payloadAccountId
            if (!accountId) return null
            return [accountId, {
              accountId,
              status: row.status,
              lastSuccessAt: row.last_success_at ?? null,
              lastHeartbeatAt: row.agent_last_seen,
              nextRetryAt: row.next_retry_at ?? null,
              consecutiveFailures: row.consecutive_failures ?? 0,
              lastError: row.last_error,
              pending: Boolean(row.payload_cursor) && row.payload_cursor !== row.acked_cursor,
              autostartEnabled: row.autostart_enabled === true,
            } satisfies BrokerBridgeAccountRuntime] as const
          })
          .filter((entry): entry is readonly [string, BrokerBridgeAccountRuntime] => entry !== null),
      )

      for (const row of rows) {
        if (!row.payload || !row.payload_cursor || row.payload_cursor === row.acked_cursor) continue

        try {
          const payload = parseBrokerSyncPayload(JSON.stringify(row.payload))
          applyBrokerSyncPayload(payload)

          const { error: ackError } = await supabase
            .from('broker_sync_channels')
            .update({
              acked_cursor: row.payload_cursor,
              status: 'idle',
              last_error: null,
            })
            .eq('id', row.id)
            .eq('payload_cursor', row.payload_cursor)

          if (ackError) throw ackError
          brokerCloudBridgeRuntime.lastImportedAt = new Date().toISOString()
          requestCloudAutoSync(500)
        }
        catch (error) {
          brokerCloudBridgeRuntime.lastError = error instanceof Error ? error.message : 'Broker Cloud Bridge 匯入失敗。'
        }
      }
    }
    finally {
      brokerCloudBridgeRuntime.running = false
      activeRun = null
    }
  })()

  return activeRun
}

const handleOnline = (): void => { void importReadyPayloads() }
const handleVisible = (): void => {
  if (document.visibilityState === 'visible') void importReadyPayloads()
}

export const startBrokerCloudBridge = (): (() => void) => {
  if (started || typeof window === 'undefined') return stopBrokerCloudBridge
  started = true
  timer = window.setInterval(() => { void importReadyPayloads() }, POLL_INTERVAL_MS)
  window.addEventListener('online', handleOnline)
  document.addEventListener('visibilitychange', handleVisible)
  window.setTimeout(() => { void importReadyPayloads() }, 1800)
  return stopBrokerCloudBridge
}

export const stopBrokerCloudBridge = (): void => {
  if (!started || typeof window === 'undefined') return
  started = false
  if (timer !== null) window.clearInterval(timer)
  timer = null
  window.removeEventListener('online', handleOnline)
  document.removeEventListener('visibilitychange', handleVisible)
}

export const refreshBrokerCloudBridge = importReadyPayloads
