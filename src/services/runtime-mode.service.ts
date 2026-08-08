import { isSupabaseConfigured } from '@/services/cloud/supabase.client'

export const isProductionRuntime = (): boolean => import.meta.env.PROD

export const isCloudAuthRequired = (): boolean =>
  isProductionRuntime() && isSupabaseConfigured

export const isSecureRuntime = (): boolean => {
  if (typeof window === 'undefined') return false
  return window.isSecureContext || window.location.hostname === 'localhost'
}
