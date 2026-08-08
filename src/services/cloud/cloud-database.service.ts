import { getCloudIdentity } from './cloud-auth.service'
import { cloudOperationError } from './cloud-error'
import { supabase } from './supabase.client'
import type { FreedomCloudTable } from '@/types/cloud'

export type CloudRow = Record<string, unknown>

const requireCloudContext = async () => {
  if (!supabase) {
    throw new Error('Freedom Cloud 尚未設定 Supabase 專案。')
  }

  const identity = await getCloudIdentity()
  if (!identity) {
    throw new Error('Freedom Cloud 尚未登入。')
  }

  return {
    client: supabase,
    identity,
  }
}

export const listUserRows = async <T extends CloudRow = CloudRow>(
  table: FreedomCloudTable,
): Promise<T[]> => {
  const { client, identity } = await requireCloudContext()
  const { data, error } = await client
    .from(table)
    .select('*')
    .eq('user_id', identity.userId)

  if (error) throw cloudOperationError(`讀取 ${table}`, error)
  return (data ?? []) as T[]
}

export const upsertUserRows = async <T extends CloudRow = CloudRow>(
  table: FreedomCloudTable,
  rows: T[],
  onConflict = 'user_id,local_id',
): Promise<void> => {
  if (!rows.length) return

  const { client, identity } = await requireCloudContext()
  const ownedRows = rows.map(row => ({
    ...row,
    user_id: identity.userId,
  }))

  const { error } = await client
    .from(table)
    .upsert(ownedRows, { onConflict })

  if (error) throw cloudOperationError(`寫入 ${table}`, error)
}

export const deleteUserRow = async (
  table: FreedomCloudTable,
  id: string,
): Promise<void> => {
  const { client, identity } = await requireCloudContext()
  const { error } = await client
    .from(table)
    .delete()
    .eq('id', id)
    .eq('user_id', identity.userId)

  if (error) throw cloudOperationError(`刪除 ${table}`, error)
}

export const deleteUserRowByLocalId = async (
  table: FreedomCloudTable,
  localId: string,
): Promise<void> => {
  const { client, identity } = await requireCloudContext()
  const { error } = await client
    .from(table)
    .delete()
    .eq('local_id', localId)
    .eq('user_id', identity.userId)

  if (error) throw cloudOperationError(`刪除 ${table}`, error)
}

export const cloudDatabaseService = {
  listUserRows,
  upsertUserRows,
  deleteUserRow,
  deleteUserRowByLocalId,
}
