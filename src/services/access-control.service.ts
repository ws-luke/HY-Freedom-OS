import { supabase } from '@/services/cloud/supabase.client'
import { getCloudSession } from '@/services/cloud/cloud-auth.service'
import type {
  AccessContext,
  AccessProfile,
  AccessUser,
  FeatureFlag,
  FeatureReleaseMode,
  FreedomRole,
} from '@/types/access-control'

interface AccessContextRow {
  user_id: string
  email: string | null
  display_name: string | null
  role: FreedomRole
  created_at: string
  last_sign_in_at: string | null
  features: Record<string, boolean> | null
}

interface FeatureFlagRow {
  feature_key: string
  label: string
  description: string
  release_mode: FeatureReleaseMode
  sort_order: number
  updated_at: string
}

interface AccessUserRow {
  user_id: string
  email: string | null
  display_name: string | null
  role: FreedomRole
  created_at: string
  last_sign_in_at: string | null
  selected_features: string[] | null
}

const profileFromRow = (row: AccessContextRow | AccessUserRow): AccessProfile => ({
  userId: row.user_id,
  email: row.email,
  displayName: row.display_name ?? '',
  role: row.role,
  createdAt: row.created_at,
  lastSignInAt: row.last_sign_in_at,
})

export const getAccessContext = async (): Promise<AccessContext | null> => {
  if (!supabase) return null
  const session = await getCloudSession()
  if (!session) return null

  const { data, error } = await supabase.rpc('freedom_access_context')
  if (error) throw error
  const row = (Array.isArray(data) ? data[0] : data) as AccessContextRow | undefined
  if (!row) return null

  return {
    profile: profileFromRow(row),
    features: row.features ?? {},
  }
}

export const listFeatureFlags = async (): Promise<FeatureFlag[]> => {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('feature_flags')
    .select('feature_key,label,description,release_mode,sort_order,updated_at')
    .order('sort_order')
  if (error) throw error

  return ((data ?? []) as FeatureFlagRow[]).map(row => ({
    key: row.feature_key,
    label: row.label,
    description: row.description,
    releaseMode: row.release_mode,
    sortOrder: row.sort_order,
    updatedAt: row.updated_at,
  }))
}

export const updateFeatureReleaseMode = async (
  featureKey: string,
  releaseMode: FeatureReleaseMode,
): Promise<void> => {
  if (!supabase) throw new Error('Freedom Cloud 尚未連線。')
  const { error } = await supabase
    .from('feature_flags')
    .update({ release_mode: releaseMode })
    .eq('feature_key', featureKey)
  if (error) throw error
}

export const listAccessUsers = async (): Promise<AccessUser[]> => {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('freedom_admin_list_users')
  if (error) throw error

  return ((data ?? []) as AccessUserRow[]).map(row => ({
    ...profileFromRow(row),
    selectedFeatures: row.selected_features ?? [],
  }))
}

export const updateUserRole = async (userId: string, role: FreedomRole): Promise<void> => {
  if (!supabase) throw new Error('Freedom Cloud 尚未連線。')
  const { error } = await supabase.rpc('freedom_admin_set_role', {
    target_user_id: userId,
    target_role: role,
  })
  if (error) throw error
}

export const setSelectedFeature = async (
  userId: string,
  featureKey: string,
  enabled: boolean,
): Promise<void> => {
  if (!supabase) throw new Error('Freedom Cloud 尚未連線。')
  const { error } = await supabase.rpc('freedom_admin_set_feature_access', {
    target_user_id: userId,
    target_feature_key: featureKey,
    enabled,
  })
  if (error) throw error
}
