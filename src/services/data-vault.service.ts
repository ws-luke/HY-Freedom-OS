export const FREEDOM_DATA_KEYS = [
  'hy-freedom-os:trades',
  'hy-freedom-os:trade-reviews',
  'hy-freedom-os:account-ledger',
  'hy-freedom-os:playbooks',
  'hy-freedom-os:signals',
  'hy-freedom-os:trading-plan',
  'hy-freedom-os:daily-missions',
  'hy-freedom-os:risk-settings',
  'hy-freedom-os:theme',
  'hy-freedom-os:font-size',
] as const

export interface FreedomDataBackup {
  app: 'HY Freedom OS'
  schemaVersion: 1
  exportedAt: string
  records: Record<string, string>
}

export interface VaultSummary {
  modules: number
  estimatedBytes: number
  keys: string[]
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const createFreedomBackup = (): FreedomDataBackup => {
  const records: Record<string, string> = {}

  if (typeof window !== 'undefined') {
    FREEDOM_DATA_KEYS.forEach(key => {
      const value = window.localStorage.getItem(key)
      if (value !== null) records[key] = value
    })
  }

  return {
    app: 'HY Freedom OS',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    records,
  }
}

export const parseFreedomBackup = (raw: string): FreedomDataBackup => {
  const parsed = JSON.parse(raw) as unknown

  if (!isObject(parsed) || parsed.app !== 'HY Freedom OS' || parsed.schemaVersion !== 1) {
    throw new Error('這不是有效的 HY Freedom OS 完整備份檔。')
  }

  if (typeof parsed.exportedAt !== 'string' || !isObject(parsed.records)) {
    throw new Error('備份檔結構不完整。')
  }

  const records: Record<string, string> = {}
  const allowed = new Set<string>(FREEDOM_DATA_KEYS)

  Object.entries(parsed.records).forEach(([key, value]) => {
    if (allowed.has(key) && typeof value === 'string') records[key] = value
  })

  if (Object.keys(records).length === 0) {
    throw new Error('備份檔中沒有可還原的 Freedom OS 資料。')
  }

  return {
    app: 'HY Freedom OS',
    schemaVersion: 1,
    exportedAt: parsed.exportedAt,
    records,
  }
}

const applyRecords = (records: Record<string, string>): void => {
  FREEDOM_DATA_KEYS.forEach(key => window.localStorage.removeItem(key))
  Object.entries(records).forEach(([key, value]) => window.localStorage.setItem(key, value))
}

export const restoreFreedomBackup = (backup: FreedomDataBackup): void => {
  if (typeof window === 'undefined') return

  const rollback = createFreedomBackup()

  try {
    applyRecords(backup.records)
  }
  catch (error) {
    try {
      applyRecords(rollback.records)
    }
    catch {
      // Preserve the original restore error if the browser storage itself is unavailable.
    }

    throw error
  }
}

export const getVaultSummary = (): VaultSummary => {
  const backup = createFreedomBackup()
  const values = Object.values(backup.records)

  return {
    modules: values.length,
    estimatedBytes: values.reduce((total, value) => total + value.length * 2, 0),
    keys: Object.keys(backup.records),
  }
}
