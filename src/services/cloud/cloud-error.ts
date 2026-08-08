interface SupabaseLikeError {
  message?: unknown
  details?: unknown
  hint?: unknown
  code?: unknown
  statusCode?: unknown
}

const clean = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : ''

export const describeCloudError = (error: unknown): string => {
  if (error instanceof Error) return error.message

  if (error && typeof error === 'object') {
    const value = error as SupabaseLikeError
    const message = clean(value.message)
    const details = clean(value.details)
    const hint = clean(value.hint)
    const code = clean(value.code) || clean(value.statusCode)
    const parts = [message, details, hint].filter(Boolean)

    if (parts.length > 0) {
      return `${parts.join(' · ')}${code ? ` [${code}]` : ''}`
    }
  }

  return '未知 Cloud 錯誤'
}

export const cloudOperationError = (
  scope: string,
  error: unknown,
): Error => new Error(`${scope}：${describeCloudError(error)}`)
