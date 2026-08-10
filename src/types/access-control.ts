export type FreedomRole = 'admin' | 'user'

export type FeatureReleaseMode = 'disabled' | 'admin' | 'selected' | 'everyone'

export interface AccessProfile {
  userId: string
  email: string | null
  displayName: string
  role: FreedomRole
  createdAt: string
  lastSignInAt: string | null
}

export interface FeatureFlag {
  key: string
  label: string
  description: string
  releaseMode: FeatureReleaseMode
  sortOrder: number
  updatedAt: string
}

export interface AccessContext {
  profile: AccessProfile
  features: Record<string, boolean>
}

export interface AccessUser extends AccessProfile {
  selectedFeatures: string[]
}
