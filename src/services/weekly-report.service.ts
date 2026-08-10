import { getCloudIdentity } from './cloud/cloud-auth.service'
import { cloudOperationError } from './cloud/cloud-error'
import { supabase } from './cloud/supabase.client'
import type {
  PublicWeeklyReport,
  WeeklyReportRecord,
  WeeklyReportSnapshot,
} from '@/types/weekly-report'

const requireClient = () => {
  if (!supabase) throw new Error('Freedom Cloud 尚未設定。')
  return supabase
}

const toRecord = (row: Record<string, unknown>): WeeklyReportRecord => ({
  id: String(row.id),
  weekStart: String(row.week_start),
  weekEnd: String(row.week_end),
  title: String(row.title),
  shareToken: String(row.share_token),
  isPublished: Boolean(row.is_published),
  expiresAt: typeof row.expires_at === 'string' ? row.expires_at : null,
  publishedAt: String(row.published_at),
  snapshot: row.snapshot as WeeklyReportSnapshot,
})

export const listWeeklyReports = async (): Promise<WeeklyReportRecord[]> => {
  const client = requireClient()
  const identity = await getCloudIdentity()
  if (!identity) throw new Error('請先登入 Freedom Cloud。')

  const { data, error } = await client
    .from('weekly_reports')
    .select('*')
    .eq('user_id', identity.userId)
    .order('week_start', { ascending: false })

  if (error) throw cloudOperationError('讀取每週報告', error)
  return (data ?? []).map(row => toRecord(row as Record<string, unknown>))
}

export const publishWeeklyReport = async (
  title: string,
  snapshot: WeeklyReportSnapshot,
  expiresAt: string | null,
): Promise<WeeklyReportRecord> => {
  const client = requireClient()
  const identity = await getCloudIdentity()
  if (!identity) throw new Error('請先登入 Freedom Cloud。')

  const reportId = crypto.randomUUID()
  const shareToken = crypto.randomUUID()
  const publishedAt = new Date().toISOString()
  const { data, error } = await client
    .from('weekly_reports')
    .insert({
      id: reportId,
      user_id: identity.userId,
      week_start: snapshot.weekStart,
      week_end: snapshot.weekEnd,
      title,
      share_token: shareToken,
      is_published: true,
      expires_at: expiresAt,
      published_at: publishedAt,
      snapshot,
    })
    .select('*')
    .single()

  if (error) throw cloudOperationError('發布每週報告', error)

  const paths = [...new Set(snapshot.trades.flatMap(trade => [
    trade.beforeScreenshot?.storagePath,
    trade.afterScreenshot?.storagePath,
  ]).filter((path): path is string => Boolean(path)))]

  if (paths.length) {
    const { error: assetError } = await client
      .from('weekly_report_assets')
      .insert(paths.map(storagePath => ({
        report_id: reportId,
        user_id: identity.userId,
        storage_path: storagePath,
      })))
    if (assetError) {
      await client.from('weekly_reports').delete().eq('id', reportId)
      throw cloudOperationError('建立週報截圖權限', assetError)
    }
  }

  return toRecord(data as Record<string, unknown>)
}

export const revokeWeeklyReport = async (reportId: string): Promise<void> => {
  const client = requireClient()
  const identity = await getCloudIdentity()
  if (!identity) throw new Error('請先登入 Freedom Cloud。')
  const { error } = await client
    .from('weekly_reports')
    .update({ is_published: false, updated_at: new Date().toISOString() })
    .eq('id', reportId)
    .eq('user_id', identity.userId)
  if (error) throw cloudOperationError('撤銷每週報告', error)
}

export const getPublicWeeklyReport = async (token: string): Promise<PublicWeeklyReport | null> => {
  const client = requireClient()
  const { data, error } = await client.rpc('get_public_weekly_report', { p_token: token })
  if (error) throw cloudOperationError('讀取公開週報', error)
  return data && typeof data === 'object' ? data as PublicWeeklyReport : null
}

export const weeklyReportShareUrl = (token: string): string =>
  `${window.location.origin}/share/weekly/${encodeURIComponent(token)}`
