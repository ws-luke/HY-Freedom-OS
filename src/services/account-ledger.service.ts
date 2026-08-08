import type {
  AccountTransaction,
  AccountTransactionDirection,
  AccountTransactionType,
  TradingAccount,
} from '@/types/account'
import type { TradeRecord } from '@/types/trade'

export interface AccountCashflowSummary {
  deposits: number
  withdrawals: number
  payouts: number
  fees: number
  refunds: number
  adjustmentsIn: number
  adjustmentsOut: number
  totalIn: number
  totalOut: number
  netFlow: number
  count: number
}

export interface AccountTradePerformance {
  totalTrades: number
  wins: number
  losses: number
  breakeven: number
  winRate: number
  totalProfitLoss: number
  averageR: number
}

export interface AccountBalanceHealth {
  profitLoss: number
  returnPercent: number
  equityDifference: number
  drawdownPercent: number
  drawdownUsagePercent: number
}

export const transactionTypeLabels: Record<
  AccountTransactionType,
  string
> = {
  deposit: '入金',
  withdrawal: '出金',
  payout: '分潤出金',
  'challenge-fee': '挑戰費',
  refund: '退款',
  'platform-fee': '手續費',
  adjustment: '餘額調整',
}

export const defaultTransactionDirection: Record<
  Exclude<AccountTransactionType, 'adjustment'>,
  AccountTransactionDirection
> = {
  deposit: 'in',
  withdrawal: 'out',
  payout: 'out',
  'challenge-fee': 'out',
  refund: 'in',
  'platform-fee': 'out',
}

const toFixedNumber = (
  value: number,
  digits = 2,
): number => Number(value.toFixed(digits))

export const summarizeAccountCashflow = (
  transactions: AccountTransaction[],
): AccountCashflowSummary => {
  const summary: AccountCashflowSummary = {
    deposits: 0,
    withdrawals: 0,
    payouts: 0,
    fees: 0,
    refunds: 0,
    adjustmentsIn: 0,
    adjustmentsOut: 0,
    totalIn: 0,
    totalOut: 0,
    netFlow: 0,
    count: transactions.length,
  }

  transactions.forEach(transaction => {
    const amount = Math.abs(transaction.amount)

    if (transaction.type === 'deposit') {
      summary.deposits += amount
    }
    else if (transaction.type === 'withdrawal') {
      summary.withdrawals += amount
    }
    else if (transaction.type === 'payout') {
      summary.payouts += amount
    }
    else if (
      transaction.type === 'challenge-fee' ||
      transaction.type === 'platform-fee'
    ) {
      summary.fees += amount
    }
    else if (transaction.type === 'refund') {
      summary.refunds += amount
    }
    else if (transaction.direction === 'in') {
      summary.adjustmentsIn += amount
    }
    else {
      summary.adjustmentsOut += amount
    }

    if (transaction.direction === 'in') {
      summary.totalIn += amount
    }
    else {
      summary.totalOut += amount
    }
  })

  summary.deposits = toFixedNumber(summary.deposits)
  summary.withdrawals = toFixedNumber(summary.withdrawals)
  summary.payouts = toFixedNumber(summary.payouts)
  summary.fees = toFixedNumber(summary.fees)
  summary.refunds = toFixedNumber(summary.refunds)
  summary.adjustmentsIn = toFixedNumber(
    summary.adjustmentsIn,
  )
  summary.adjustmentsOut = toFixedNumber(
    summary.adjustmentsOut,
  )
  summary.totalIn = toFixedNumber(summary.totalIn)
  summary.totalOut = toFixedNumber(summary.totalOut)
  summary.netFlow = toFixedNumber(
    summary.totalIn - summary.totalOut,
  )

  return summary
}

export const calculateAccountTradePerformance = (
  account: TradingAccount,
  trades: TradeRecord[],
): AccountTradePerformance => {
  const accountTrades = trades.filter(
    trade =>
      trade.positionStatus === 'closed' &&
      (trade.accountId === account.id ||
        (!trade.accountId &&
          trade.account.trim().toLowerCase() ===
            account.name.trim().toLowerCase())),
  )
  const totalTrades = accountTrades.length
  const wins = accountTrades.filter(
    trade => trade.result === 'win',
  ).length
  const losses = accountTrades.filter(
    trade => trade.result === 'loss',
  ).length
  const breakeven = accountTrades.filter(
    trade => trade.result === 'breakeven',
  ).length
  const totalProfitLoss = accountTrades.reduce(
    (total, trade) => total + trade.profitLoss,
    0,
  )
  const totalR = accountTrades.reduce(
    (total, trade) => total + trade.rMultiple,
    0,
  )

  return {
    totalTrades,
    wins,
    losses,
    breakeven,
    winRate:
      totalTrades > 0
        ? Math.round((wins / totalTrades) * 100)
        : 0,
    totalProfitLoss: toFixedNumber(totalProfitLoss),
    averageR:
      totalTrades > 0
        ? toFixedNumber(totalR / totalTrades)
        : 0,
  }
}

export const calculateAccountBalanceHealth = (
  account: TradingAccount,
): AccountBalanceHealth => {
  const startingBalance = Math.max(
    0,
    account.startingBalance,
  )
  const profitLoss = account.balance - startingBalance
  const returnPercent =
    startingBalance > 0
      ? (profitLoss / startingBalance) * 100
      : 0
  const drawdown = Math.max(
    0,
    startingBalance - account.equity,
  )
  const drawdownPercent =
    startingBalance > 0
      ? (drawdown / startingBalance) * 100
      : 0
  const drawdownLimit =
    account.maxDrawdownPercent ?? 0
  const drawdownUsagePercent =
    drawdownLimit > 0
      ? Math.min(
          100,
          (drawdownPercent / drawdownLimit) * 100,
        )
      : 0

  return {
    profitLoss: toFixedNumber(profitLoss),
    returnPercent: toFixedNumber(returnPercent),
    equityDifference: toFixedNumber(
      account.equity - account.balance,
    ),
    drawdownPercent: toFixedNumber(drawdownPercent),
    drawdownUsagePercent: toFixedNumber(
      drawdownUsagePercent,
    ),
  }
}

export const accountLedgerService = {
  summarizeCashflow: summarizeAccountCashflow,
  calculateTradePerformance:
    calculateAccountTradePerformance,
  calculateBalanceHealth:
    calculateAccountBalanceHealth,
}
