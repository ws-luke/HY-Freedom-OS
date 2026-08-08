import { createClient } from '@supabase/supabase-js'

import type { FreedomCloudRuntime } from '@/types/cloud'

// Freedom OS production cloud project. These are browser-safe public client
// credentials; authorization is enforced by Supabase Auth + PostgreSQL RLS.
// Environment variables remain the highest priority so staging/self-hosted
// deployments can point at a different project without changing source code.
const FREEDOM_CLOUD_URL = 'https://nyicsabadgpzpgudatin.supabase.co'
const FREEDOM_CLOUD_PUBLISHABLE_KEY = 'sb_publishable_ZPSCOxPfXOy2g2Qa6P6Hew_33_V3lCT'

const supabaseUrl = (
  import.meta.env.VITE_SUPABASE_URL || FREEDOM_CLOUD_URL
).trim()
const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  FREEDOM_CLOUD_PUBLISHABLE_KEY
).trim()

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabasePublishableKey,
)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

const getProjectHost = (): string | null => {
  if (!isSupabaseConfigured) return null

  try {
    return new URL(supabaseUrl).host
  }
  catch {
    return null
  }
}

export const getCloudRuntime = (): FreedomCloudRuntime => ({
  configured: isSupabaseConfigured,
  mode: isSupabaseConfigured ? 'cloud-ready' : 'local',
  projectHost: getProjectHost(),
  storageBucket: 'trade-screenshots',
})
