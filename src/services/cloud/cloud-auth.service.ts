import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

import { supabase } from './supabase.client'
import type { FreedomCloudIdentity } from '@/types/cloud'

const requireClient = () => {
  if (!supabase) {
    throw new Error('Freedom Cloud 尚未設定 Supabase 專案。')
  }

  return supabase
}

export const getCloudSession = async (): Promise<Session | null> => {
  if (!supabase) return null

  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export const getCloudIdentity = async (): Promise<FreedomCloudIdentity | null> => {
  const session = await getCloudSession()
  if (!session?.user) return null

  return {
    userId: session.user.id,
    email: session.user.email ?? null,
  }
}

export const signInWithPassword = async (
  email: string,
  password: string,
): Promise<Session | null> => {
  const client = requireClient()
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.session
}

export const requestPasswordReset = async (email: string): Promise<void> => {
  const client = requireClient()
  const redirectTo = `${window.location.origin}/login?mode=reset`
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) throw error
}

export const updateCloudPassword = async (password: string): Promise<void> => {
  const client = requireClient()
  const { error } = await client.auth.updateUser({ password })
  if (error) throw error
}

export const signOutCloud = async (): Promise<void> => {
  const client = requireClient()
  const { error } = await client.auth.signOut()
  if (error) throw error
}

export const onCloudAuthStateChange = (
  callback: (event: AuthChangeEvent, session: Session | null) => void,
): (() => void) => {
  if (!supabase) return () => undefined

  const { data } = supabase.auth.onAuthStateChange(callback)
  return () => data.subscription.unsubscribe()
}

export const cloudAuthService = {
  getSession: getCloudSession,
  getIdentity: getCloudIdentity,
  signInWithPassword,
  requestPasswordReset,
  updateCloudPassword,
  signOut: signOutCloud,
  onAuthStateChange: onCloudAuthStateChange,
}
