import { getCloudIdentity } from './cloud-auth.service'
import { cloudOperationError } from './cloud-error'
import { supabase } from './supabase.client'

export const TRADE_SCREENSHOT_BUCKET = 'trade-screenshots' as const
const MEDIA_CACHE_NAME = 'freedom-os-private-media-v2'

const safeFileName = (name: string): string =>
  name
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'screenshot.png'

const safePathSegment = (value: string): string =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item'

const requireStorageContext = async () => {
  if (!supabase) throw new Error('Freedom Cloud 尚未設定 Supabase 專案。')
  const identity = await getCloudIdentity()
  if (!identity) throw new Error('Freedom Cloud 尚未登入。')
  return { client: supabase, identity }
}

const mediaCacheRequest = (path: string): Request =>
  new Request(`https://freedom-os.local/__private_media__/${encodeURIComponent(path)}`)

const cacheMediaBlob = async (path: string, blob: Blob): Promise<void> => {
  if (typeof caches === 'undefined') return
  try {
    const cache = await caches.open(MEDIA_CACHE_NAME)
    await cache.put(
      mediaCacheRequest(path),
      new Response(blob, { headers: { 'Content-Type': blob.type || 'application/octet-stream' } }),
    )
  }
  catch {
    // Cache Storage is best-effort only. Supabase remains the durable source.
  }
}

const readCachedMediaBlob = async (path: string): Promise<Blob | null> => {
  if (typeof caches === 'undefined') return null
  try {
    const cache = await caches.open(MEDIA_CACHE_NAME)
    const response = await cache.match(mediaCacheRequest(path))
    return response ? await response.blob() : null
  }
  catch {
    return null
  }
}

const removeCachedMedia = async (path: string): Promise<void> => {
  if (typeof caches === 'undefined') return
  try {
    const cache = await caches.open(MEDIA_CACHE_NAME)
    await cache.delete(mediaCacheRequest(path))
  }
  catch {
    // Best-effort cache cleanup.
  }
}

export const buildTradeScreenshotPath = (
  userId: string,
  tradeId: string,
  fileName: string,
): string => `${userId}/${tradeId}/${crypto.randomUUID()}-${safeFileName(fileName)}`

export const uploadCloudDataUrl = async (
  scope: 'trades' | 'signals',
  localId: string,
  fileName: string,
  dataUrl: string,
  existingPath?: string | null,
): Promise<string> => {
  const { client, identity } = await requireStorageContext()
  const reusablePath = existingPath?.startsWith(`${identity.userId}/`)
    ? existingPath
    : null
  const path = reusablePath ?? `${identity.userId}/${scope}/${safePathSegment(localId)}/${safeFileName(fileName)}`
  const response = await fetch(dataUrl)

  if (!response.ok) {
    throw new Error('無法讀取本機截圖資料。')
  }

  const blob = await response.blob()
  const { error } = await client.storage
    .from(TRADE_SCREENSHOT_BUCKET)
    .upload(path, blob, {
      cacheControl: '3600',
      upsert: true,
      contentType: blob.type || undefined,
    })

  if (error) throw cloudOperationError('上傳 Cloud 截圖', error)
  await cacheMediaBlob(path, blob)
  return path
}

export const uploadTradeScreenshot = async (
  tradeId: string,
  file: File,
): Promise<string> => {
  const { client, identity } = await requireStorageContext()
  const path = buildTradeScreenshotPath(identity.userId, tradeId, file.name)
  const { error } = await client.storage
    .from(TRADE_SCREENSHOT_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    })

  if (error) throw cloudOperationError('上傳交易截圖', error)
  await cacheMediaBlob(path, file)
  return path
}

export const resolveCloudMediaUrl = async (path: string): Promise<string> => {
  const { client, identity } = await requireStorageContext()
  if (!path.startsWith(`${identity.userId}/`)) {
    throw new Error('無法讀取不屬於目前使用者的檔案。')
  }

  const cached = await readCachedMediaBlob(path)
  if (cached) return URL.createObjectURL(cached)

  const { data, error } = await client.storage
    .from(TRADE_SCREENSHOT_BUCKET)
    .download(path)

  if (error) throw cloudOperationError('下載 Cloud 截圖', error)
  await cacheMediaBlob(path, data)
  return URL.createObjectURL(data)
}

export const createTradeScreenshotUrl = async (
  path: string,
  expiresIn = 3600,
): Promise<string> => {
  const { client } = await requireStorageContext()
  const { data, error } = await client.storage
    .from(TRADE_SCREENSHOT_BUCKET)
    .createSignedUrl(path, expiresIn)

  if (error) throw cloudOperationError('建立截圖讀取連結', error)
  return data.signedUrl
}

export const downloadCloudDataUrl = async (path: string): Promise<string> => {
  const { client, identity } = await requireStorageContext()

  if (!path.startsWith(`${identity.userId}/`)) {
    throw new Error('無法讀取不屬於目前使用者的檔案。')
  }

  const { data, error } = await client.storage
    .from(TRADE_SCREENSHOT_BUCKET)
    .download(path)

  if (error) throw cloudOperationError('下載 Cloud 截圖', error)

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Cloud 截圖下載失敗。'))
    reader.readAsDataURL(data)
  })
}

export const removeTradeScreenshot = async (path: string): Promise<void> => {
  const { client, identity } = await requireStorageContext()
  if (!path.startsWith(`${identity.userId}/`)) {
    throw new Error('無法刪除不屬於目前使用者的檔案。')
  }

  const { error } = await client.storage
    .from(TRADE_SCREENSHOT_BUCKET)
    .remove([path])

  if (error) throw cloudOperationError('刪除 Cloud 截圖', error)
  await removeCachedMedia(path)
}

export const cloudStorageService = {
  uploadTradeScreenshot,
  uploadCloudDataUrl,
  downloadCloudDataUrl,
  createTradeScreenshotUrl,
  resolveCloudMediaUrl,
  removeTradeScreenshot,
}
