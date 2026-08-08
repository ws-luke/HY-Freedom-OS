import type { StoredAccountLedgerState } from '@/types/account'
import type { SignalRecord } from '@/types/signal'
import type { StoredTradeReview } from '@/types/trade-review'
import type { TradeRecord } from '@/types/trade'

const KEYS = {
  accounts: 'hy-freedom-os:account-ledger',
  signals: 'hy-freedom-os:signals',
  trades: 'hy-freedom-os:trades',
  reviews: 'hy-freedom-os:trade-reviews',
} as const

export interface FreedomLocalIntegritySummary {
  healthy: boolean
  issues: string[]
  records: number
  checkedAt: string
}

const read = <T>(key: string, issues: string[]): T | null => {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  }
  catch {
    issues.push(`${key} 的 Local Cache JSON 無法解析`)
    return null
  }
}

const findDuplicateIds = (label: string, rows: Array<{ id: string }>, issues: string[]): void => {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  rows.forEach(row => {
    if (!row.id) return
    if (seen.has(row.id)) duplicates.add(row.id)
    seen.add(row.id)
  })
  if (duplicates.size) issues.push(`${label} 有 ${duplicates.size} 筆重複 ID`)
}

export const inspectFreedomLocalIntegrity = (): FreedomLocalIntegritySummary => {
  const issues: string[] = []
  const ledger = read<StoredAccountLedgerState>(KEYS.accounts, issues)
  const signalValue = read<unknown>(KEYS.signals, issues)
  const tradeValue = read<unknown>(KEYS.trades, issues)
  const reviewValue = read<unknown>(KEYS.reviews, issues)
  const signals = Array.isArray(signalValue) ? signalValue as SignalRecord[] : []
  const trades = Array.isArray(tradeValue) ? tradeValue as TradeRecord[] : []
  const reviews = Array.isArray(reviewValue) ? reviewValue as StoredTradeReview[] : []
  const accounts = Array.isArray(ledger?.accounts) ? ledger.accounts : []
  const transactions = Array.isArray(ledger?.transactions) ? ledger.transactions : []

  if (signalValue !== null && !Array.isArray(signalValue)) issues.push('訊號快取格式異常')
  if (tradeValue !== null && !Array.isArray(tradeValue)) issues.push('交易快取格式異常')
  if (reviewValue !== null && !Array.isArray(reviewValue)) issues.push('復盤快取格式異常')

  findDuplicateIds('帳戶', accounts, issues)
  findDuplicateIds('帳戶流水', transactions, issues)
  findDuplicateIds('訊號', signals, issues)
  findDuplicateIds('交易', trades, issues)
  findDuplicateIds('復盤', reviews, issues)

  const accountIds = new Set(accounts.map(account => account.id))
  const orphanTransactions = transactions.filter(transaction => !accountIds.has(transaction.accountId)).length
  if (orphanTransactions) issues.push(`${orphanTransactions} 筆帳戶流水找不到所屬帳戶`)

  const tradeIds = new Set(trades.map(trade => trade.id))
  const orphanReviews = reviews.filter(review => !tradeIds.has(review.tradeId)).length
  if (orphanReviews) issues.push(`${orphanReviews} 筆復盤找不到對應交易`)

  const invalidScreenshots = trades.reduce((count, trade) => {
    const screenshots = [trade.beforeScreenshot, trade.afterScreenshot].filter(Boolean)
    return count + screenshots.filter(screenshot => screenshot && !screenshot.dataUrl && !screenshot.storagePath).length
  }, 0)
  if (invalidScreenshots) issues.push(`${invalidScreenshots} 張截圖缺少 Local 或 Cloud 來源`)

  return {
    healthy: issues.length === 0,
    issues,
    records: accounts.length + transactions.length + signals.length + trades.length + reviews.length,
    checkedAt: new Date().toISOString(),
  }
}

export const cloudIntegrityService = {
  inspectLocal: inspectFreedomLocalIntegrity,
}
