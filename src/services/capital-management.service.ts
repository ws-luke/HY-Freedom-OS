import {
  calculateAccountBalanceHealth,
  summarizeAccountCashflow,
} from '@/services/account-ledger.service'
import type {
  AccountBalanceHealth,
  AccountCashflowSummary,
} from '@/services/account-ledger.service'
import type {
  AccountTransaction,
  TradingAccount,
} from '@/types/account'
import type { TradeRecord } from '@/types/trade'

export type CapitalRiskLevel =
  | 'healthy'
  | 'warning'
  | 'danger'

export interface CapitalRiskSettings {
  maxDailyLoss: number
  maxRiskPerTrade: number
}

export interface CapitalAccountSnapshot {
  account: TradingAccount
  health: AccountBalanceHealth
  todayProfitLoss: number
  monthProfitLoss: number
  maxDrawdownAmount: number | null
  remainingDrawdown: number | null
  dailyLossLimitAmount: number | null
  remainingDailyLoss: number | null
  dailyLossUsagePercent: number
  profitTargetAmount: number | null
  currentProfitAmount: number
  targetProgressPercent: number | null
  allocationPercent: number
  riskLevel: CapitalRiskLevel
}

export interface MonthlyPerformancePoint {
  key: string
  label: string
  profitLoss: number
  trades: number
  averageR: number
}

export interface CapitalAllocation {
  type: 'live' | 'prop' | 'demo'
  label: string
  balance: number
  equity: number
  percent: number
  count: number
}

export interface CapitalDashboard {
  accountCount: number
  trackedBalance: number
  trackedEquity: number
  liveBalance: number
  liveEquity: number
  propBalance: number
  propEquity: number
  demoBalance: number
  demoEquity: number
  todayProfitLoss: number
  monthProfitLoss: number
  cashflow: AccountCashflowSummary
  dailyRiskLimit: number
  remainingDailyRisk: number
  dailyRiskUsagePercent: number
  maxRiskPerTrade: number
  riskLevel: CapitalRiskLevel
  snapshots: CapitalAccountSnapshot[]
  allocations: CapitalAllocation[]
  monthlyPerformance: MonthlyPerformancePoint[]
}

const round = (value: number): number =>
  Number(value.toFixed(2))

const isManagedAccount = (
  account: TradingAccount,
): boolean =>
  account.status === 'active' ||
  account.status === 'paused' ||
  account.status === 'passed'

const matchesAccount = (
  trade: TradeRecord,
  account: TradingAccount,
): boolean =>
  trade.accountId === account.id ||
  (!trade.accountId &&
    trade.account.trim().toLowerCase() ===
      account.name.trim().toLowerCase())

const getRiskLevel = (
  drawdownUsage: number,
  dailyUsage: number,
): CapitalRiskLevel => {
  const usage = Math.max(drawdownUsage, dailyUsage)

  if (usage >= 85) return 'danger'
  if (usage >= 60) return 'warning'
  return 'healthy'
}

const getDateKey = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const getRecentMonthlyPerformance = (
  trades: TradeRecord[],
  months = 6,
  referenceDate = new Date(),
): MonthlyPerformancePoint[] => {
  const result: MonthlyPerformancePoint[] = []

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() - offset,
      1,
    )
    const key = getDateKey(date).slice(0, 7)
    const monthTrades = trades.filter(
      trade => trade.positionStatus === 'closed' && trade.date.startsWith(key),
    )
    const totalR = monthTrades.reduce(
      (sum, trade) => sum + trade.rMultiple,
      0,
    )

    result.push({
      key,
      label: `${date.getMonth() + 1}月`,
      profitLoss: round(
        monthTrades.reduce(
          (sum, trade) => sum + trade.profitLoss,
          0,
        ),
      ),
      trades: monthTrades.length,
      averageR:
        monthTrades.length > 0
          ? round(totalR / monthTrades.length)
          : 0,
    })
  }

  return result
}

export const buildCapitalDashboard = (
  accounts: TradingAccount[],
  transactions: AccountTransaction[],
  trades: TradeRecord[],
  riskSettings: CapitalRiskSettings,
  now = new Date(),
): CapitalDashboard => {
  const managedAccounts = accounts.filter(isManagedAccount)
  const today = getDateKey(now)
  const month = today.slice(0, 7)
  const managedIds = new Set(
    managedAccounts.map(account => account.id),
  )
  const managedNames = new Set(
    managedAccounts.map(account =>
      account.name.trim().toLowerCase(),
    ),
  )
  const managedTrades = trades.filter(trade =>
    (trade.accountId && managedIds.has(trade.accountId)) ||
    (!trade.accountId &&
      managedNames.has(trade.account.trim().toLowerCase())),
  )
  const settledManagedTrades = managedTrades.filter(
    trade => trade.positionStatus === 'closed',
  )
  const managedTransactions = transactions.filter(transaction =>
    managedIds.has(transaction.accountId),
  )
  const trackedBalance = managedAccounts.reduce(
    (sum, account) => sum + account.balance,
    0,
  )
  const trackedEquity = managedAccounts.reduce(
    (sum, account) => sum + account.equity,
    0,
  )
  const todayProfitLoss = settledManagedTrades
    .filter(trade => trade.date === today)
    .reduce((sum, trade) => sum + trade.profitLoss, 0)
  const monthProfitLoss = settledManagedTrades
    .filter(trade => trade.date.startsWith(month))
    .reduce((sum, trade) => sum + trade.profitLoss, 0)

  const byType = (
    type: TradingAccount['type'],
    field: 'balance' | 'equity',
  ): number =>
    managedAccounts
      .filter(account => account.type === type)
      .reduce((sum, account) => sum + account[field], 0)

  const snapshots = managedAccounts
    .map<CapitalAccountSnapshot>(account => {
      const accountTrades = settledManagedTrades.filter(trade =>
        matchesAccount(trade, account),
      )
      const accountTodayProfitLoss = accountTrades
        .filter(trade => trade.date === today)
        .reduce((sum, trade) => sum + trade.profitLoss, 0)
      const accountMonthProfitLoss = accountTrades
        .filter(trade => trade.date.startsWith(month))
        .reduce((sum, trade) => sum + trade.profitLoss, 0)
      const health = calculateAccountBalanceHealth(account)
      const maxDrawdownAmount =
        account.maxDrawdownPercent !== null &&
        account.maxDrawdownPercent > 0
          ? account.startingBalance *
            (account.maxDrawdownPercent / 100)
          : null
      const drawdownFloor =
        maxDrawdownAmount === null
          ? null
          : account.startingBalance - maxDrawdownAmount
      const remainingDrawdown =
        drawdownFloor === null
          ? null
          : Math.max(0, account.equity - drawdownFloor)
      const dailyLossLimitAmount =
        account.maxDailyLossPercent !== null &&
        account.maxDailyLossPercent > 0
          ? account.startingBalance *
            (account.maxDailyLossPercent / 100)
          : null
      const dailyLossUsed = Math.abs(
        Math.min(0, accountTodayProfitLoss),
      )
      const remainingDailyLoss =
        dailyLossLimitAmount === null
          ? null
          : Math.max(0, dailyLossLimitAmount - dailyLossUsed)
      const dailyLossUsagePercent =
        dailyLossLimitAmount && dailyLossLimitAmount > 0
          ? Math.min(
              100,
              (dailyLossUsed / dailyLossLimitAmount) * 100,
            )
          : 0
      const profitTargetAmount =
        account.profitTargetPercent !== null &&
        account.profitTargetPercent > 0
          ? account.startingBalance *
            (account.profitTargetPercent / 100)
          : null
      const currentProfitAmount = Math.max(
        0,
        account.balance - account.startingBalance,
      )
      const targetProgressPercent =
        profitTargetAmount && profitTargetAmount > 0
          ? Math.min(
              100,
              (currentProfitAmount / profitTargetAmount) * 100,
            )
          : null

      return {
        account,
        health,
        todayProfitLoss: round(accountTodayProfitLoss),
        monthProfitLoss: round(accountMonthProfitLoss),
        maxDrawdownAmount:
          maxDrawdownAmount === null
            ? null
            : round(maxDrawdownAmount),
        remainingDrawdown:
          remainingDrawdown === null
            ? null
            : round(remainingDrawdown),
        dailyLossLimitAmount:
          dailyLossLimitAmount === null
            ? null
            : round(dailyLossLimitAmount),
        remainingDailyLoss:
          remainingDailyLoss === null
            ? null
            : round(remainingDailyLoss),
        dailyLossUsagePercent: round(dailyLossUsagePercent),
        profitTargetAmount:
          profitTargetAmount === null
            ? null
            : round(profitTargetAmount),
        currentProfitAmount: round(currentProfitAmount),
        targetProgressPercent:
          targetProgressPercent === null
            ? null
            : round(targetProgressPercent),
        allocationPercent:
          trackedBalance > 0
            ? round((account.balance / trackedBalance) * 100)
            : 0,
        riskLevel: getRiskLevel(
          health.drawdownUsagePercent,
          dailyLossUsagePercent,
        ),
      }
    })
    .sort((a, b) => {
      const riskOrder: Record<CapitalRiskLevel, number> = {
        danger: 0,
        warning: 1,
        healthy: 2,
      }
      return (
        riskOrder[a.riskLevel] - riskOrder[b.riskLevel] ||
        b.account.equity - a.account.equity
      )
    })

  const allocationMeta: Array<{
    type: CapitalAllocation['type']
    label: string
  }> = [
    { type: 'prop', label: 'Prop Firm' },
    { type: 'live', label: '自有真倉' },
    { type: 'demo', label: '模擬資金' },
  ]
  const allocations = allocationMeta.map(item => {
    const typeAccounts = managedAccounts.filter(
      account => account.type === item.type,
    )
    const balance = typeAccounts.reduce(
      (sum, account) => sum + account.balance,
      0,
    )
    const equity = typeAccounts.reduce(
      (sum, account) => sum + account.equity,
      0,
    )

    return {
      ...item,
      balance: round(balance),
      equity: round(equity),
      percent:
        trackedBalance > 0
          ? round((balance / trackedBalance) * 100)
          : 0,
      count: typeAccounts.length,
    }
  })

  const dailyRiskLimit = Math.abs(riskSettings.maxDailyLoss)
  const dailyLossUsed = Math.abs(Math.min(0, todayProfitLoss))
  const remainingDailyRisk = Math.max(
    0,
    dailyRiskLimit - dailyLossUsed,
  )
  const dailyRiskUsagePercent =
    dailyRiskLimit > 0
      ? Math.min(100, (dailyLossUsed / dailyRiskLimit) * 100)
      : 0
  const highestAccountRisk = snapshots.reduce(
    (highest, snapshot) =>
      snapshot.riskLevel === 'danger'
        ? 'danger'
        : snapshot.riskLevel === 'warning' && highest === 'healthy'
          ? 'warning'
          : highest,
    'healthy' as CapitalRiskLevel,
  )
  const globalRiskLevel =
    dailyRiskUsagePercent >= 85
      ? 'danger'
      : dailyRiskUsagePercent >= 60
        ? 'warning'
        : 'healthy'

  const riskLevel: CapitalRiskLevel =
    globalRiskLevel === 'danger' || highestAccountRisk === 'danger'
      ? 'danger'
      : globalRiskLevel === 'warning' || highestAccountRisk === 'warning'
        ? 'warning'
        : 'healthy'

  return {
    accountCount: managedAccounts.length,
    trackedBalance: round(trackedBalance),
    trackedEquity: round(trackedEquity),
    liveBalance: round(byType('live', 'balance')),
    liveEquity: round(byType('live', 'equity')),
    propBalance: round(byType('prop', 'balance')),
    propEquity: round(byType('prop', 'equity')),
    demoBalance: round(byType('demo', 'balance')),
    demoEquity: round(byType('demo', 'equity')),
    todayProfitLoss: round(todayProfitLoss),
    monthProfitLoss: round(monthProfitLoss),
    cashflow: summarizeAccountCashflow(managedTransactions),
    dailyRiskLimit: round(dailyRiskLimit),
    remainingDailyRisk: round(remainingDailyRisk),
    dailyRiskUsagePercent: round(dailyRiskUsagePercent),
    maxRiskPerTrade: round(Math.abs(riskSettings.maxRiskPerTrade)),
    riskLevel,
    snapshots,
    allocations,
    monthlyPerformance: getRecentMonthlyPerformance(
      trades,
      6,
      now,
    ),
  }
}

export const capitalManagementService = {
  buildDashboard: buildCapitalDashboard,
  getRecentMonthlyPerformance,
}
