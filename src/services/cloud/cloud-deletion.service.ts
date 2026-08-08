import { getCloudIdentity } from './cloud-auth.service'
import { deleteUserRowByLocalId, listUserRows, upsertUserRows } from './cloud-database.service'
import { removeTradeScreenshot } from './cloud-storage.service'
import type { FreedomCloudDeletableTable, FreedomCloudSyncRecord } from '@/types/cloud'

const QUEUE_STORAGE_KEY = 'hy-freedom-os:cloud-delete-queue'
const SYNC_STORAGE_KEY = 'hy-freedom-os:cloud-sync'

export interface CloudDeletionQueueItem {
  userId: string
  entity: FreedomCloudDeletableTable
  localId: string
  deletedAt: string
}

const readJson = <T>(key: string): T | null => {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  }
  catch {
    return null
  }
}

const readQueue = (): CloudDeletionQueueItem[] => {
  const value = readJson<unknown>(QUEUE_STORAGE_KEY)
  return Array.isArray(value) ? value as CloudDeletionQueueItem[] : []
}

const writeQueue = (queue: CloudDeletionQueueItem[]): void => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue))
}

export const queueCloudDeletion = (
  entity: FreedomCloudDeletableTable,
  localId: string,
): void => {
  if (!localId || typeof window === 'undefined') return

  const syncRecord = readJson<FreedomCloudSyncRecord>(SYNC_STORAGE_KEY)
  if (!syncRecord?.userId) return

  const next: CloudDeletionQueueItem = {
    userId: syncRecord.userId,
    entity,
    localId,
    deletedAt: new Date().toISOString(),
  }
  const queue = readQueue().filter(item => !(
    item.userId === next.userId &&
    item.entity === next.entity &&
    item.localId === next.localId
  ))
  queue.push(next)
  writeQueue(queue)
}

export const flushCloudDeletionQueue = async (): Promise<number> => {
  const identity = await getCloudIdentity()
  if (!identity) return 0

  const queue = readQueue()
  const mine = queue.filter(item => item.userId === identity.userId)
  if (mine.length === 0) return 0

  let completedCount = 0

  for (const item of mine) {
    const entityRows = await listUserRows<Record<string, unknown>>(item.entity)
    const cloudTarget = entityRows.find(row => row.local_id === item.localId)
    const cloudUpdatedAt = typeof cloudTarget?.updated_at === 'string'
      ? new Date(cloudTarget.updated_at).getTime()
      : 0
    const deletedAt = new Date(item.deletedAt).getTime()

    // A different device may have updated the row after this device queued an
    // offline deletion. In that case the newer Cloud edit wins and the stale
    // deletion is consumed without deleting the newer row.
    if (cloudUpdatedAt > deletedAt) {
      completedCount += 1
      continue
    }

    if (item.entity === 'trade_screenshots') {
      if (typeof cloudTarget?.storage_path === 'string') {
        await removeTradeScreenshot(cloudTarget.storage_path)
      }
    }

    if (item.entity === 'trades') {
      const trades = await listUserRows<Record<string, unknown>>('trades')
      const cloudTrade = trades.find(row => row.local_id === item.localId)
      if (typeof cloudTrade?.id === 'string') {
        const screenshots = await listUserRows<Record<string, unknown>>('trade_screenshots')
        for (const screenshot of screenshots.filter(row => row.trade_id === cloudTrade.id)) {
          if (typeof screenshot.storage_path === 'string') {
            await removeTradeScreenshot(screenshot.storage_path)
          }
        }
      }
    }

    if (item.entity === 'signals') {
      const signals = await listUserRows<Record<string, unknown>>('signals')
      const signal = signals.find(row => row.local_id === item.localId)
      if (typeof signal?.screenshot_path === 'string') {
        await removeTradeScreenshot(signal.screenshot_path)
      }
    }

    await upsertUserRows('sync_tombstones', [{
      entity: item.entity,
      local_id: item.localId,
      deleted_at: item.deletedAt,
    }], 'user_id,entity,local_id')
    await deleteUserRowByLocalId(item.entity, item.localId)
    completedCount += 1
  }

  const completed = new Set(mine.map(item => `${item.userId}:${item.entity}:${item.localId}`))
  writeQueue(queue.filter(item => !completed.has(`${item.userId}:${item.entity}:${item.localId}`)))
  return completedCount
}

export const getCloudDeletionQueueSize = (): number => readQueue().length

export const cloudDeletionService = {
  queue: queueCloudDeletion,
  flush: flushCloudDeletionQueue,
  pendingCount: getCloudDeletionQueueSize,
}
