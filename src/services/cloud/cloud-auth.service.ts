import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'

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

export const signUpWithPassword = async (
  email: string,
  password: string,
): Promise<User | null> => {
  const client = requireClient()
  const { data, error } = await client.auth.signUp({ email, password })
  if (error) throw error
  return data.user
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
  signUpWithPassword,
  signInWithPassword,
  signOut: signOutCloud,
  onAuthStateChange: onCloudAuthStateChange,
}
