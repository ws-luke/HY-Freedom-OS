import type { TradingAccount } from '@/types/account'
import type { TradeRecord } from '@/types/trade'

export interface AccountPerformanceCurvePoint {
  index: number
  date: string
  balance: number
  profitLoss: number
}

export interface AccountPerformanceSnapshot {
  totalTrades: number
  wins: number
  losses: number
  breakeven: number
  winRate: number
  netProfit: number
  grossProfit: number
  grossLoss: number
  profitFactor: number | null
  averageR: number
  expectancy: number
  averageWin: number
  averageLoss: number
  bestTrade: number
  worstTrade: number
  maxDrawdown: number
  maxDrawdownPercent: number
  maxConsecutiveLosses: number
  curve: AccountPerformanceCurvePoint[]
}

const round = (value: number, digits = 2): number =>
  Number(value.toFixed(digits))

const tradeTimestamp = (trade: TradeRecord): number => {
  const source = trade.closedAt || `${trade.date}T${trade.time || '00:00'}`
  const timestamp = new Date(source).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

export const getAccountClosedTrades = (
  account: TradingAccount,
  trades: TradeRecord[],
): TradeRecord[] => {
  const normalizedName = account.name.trim().toLowerCase()

  return trades
    .filter(trade =>
      trade.positionStatus === 'closed' &&
      (
        trade.accountId === account.id ||
        (!trade.accountId && trade.account.trim().toLowerCase() === normalizedName)
      ),
    )
    .sort((a, b) => tradeTimestamp(a) - tradeTimestamp(b))
}

export const buildAccountPerformance = (
  account: TradingAccount,
  trades: TradeRecord[],
): AccountPerformanceSnapshot => {
  const closedTrades = getAccountClosedTrades(account, trades)
  const wins = closedTrades.filter(trade => trade.profitLoss > 0)
  const losses = closedTrades.filter(trade => trade.profitLoss < 0)
  const breakeven = closedTrades.length - wins.length - losses.length
  const grossProfit = wins.reduce((total, trade) => total + trade.profitLoss, 0)
  const grossLoss = Math.abs(losses.reduce((total, trade) => total + trade.profitLoss, 0))
  const netProfit = closedTrades.reduce((total, trade) => total + trade.profitLoss, 0)
  const totalR = closedTrades.reduce((total, trade) => total + trade.rMultiple, 0)

  const startingBalance = Math.max(0, account.startingBalance)
  let runningBalance = startingBalance
  let peakBalance = startingBalance
  let maxDrawdown = 0
  let maxDrawdownPercent = 0
  let lossStreak = 0
  let maxConsecutiveLosses = 0

  const curve: AccountPerformanceCurvePoint[] = [
    {
      index: 0,
      date: closedTrades[0]?.date ?? '',
      balance: startingBalance,
      profitLoss: 0,
    },
  ]

  closedTrades.forEach((trade, index) => {
    runningBalance += trade.profitLoss
    peakBalance = Math.max(peakBalance, runningBalance)

    const drawdown = Math.max(0, peakBalance - runningBalance)
    const drawdownPercent = peakBalance > 0
      ? (drawdown / peakBalance) * 100
      : 0

    maxDrawdown = Math.max(maxDrawdown, drawdown)
    maxDrawdownPercent = Math.max(maxDrawdownPercent, drawdownPercent)

    if (trade.profitLoss < 0) {
      lossStreak += 1
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, lossStreak)
    }
    else {
      lossStreak = 0
    }

    curve.push({
      index: index + 1,
      date: trade.date,
      balance: round(runningBalance),
      profitLoss: round(trade.profitLoss),
    })
  })

  return {
    totalTrades: closedTrades.length,
    wins: wins.length,
    losses: losses.length,
    breakeven,
    winRate: closedTrades.length
      ? round((wins.length / closedTrades.length) * 100, 1)
      : 0,
    netProfit: round(netProfit),
    grossProfit: round(grossProfit),
    grossLoss: round(grossLoss),
    profitFactor: grossLoss > 0
      ? round(grossProfit / grossLoss)
      : null,
    averageR: closedTrades.length ? round(totalR / closedTrades.length) : 0,
    expectancy: closedTrades.length ? round(netProfit / closedTrades.length) : 0,
    averageWin: wins.length ? round(grossProfit / wins.length) : 0,
    averageLoss: losses.length ? round(grossLoss / losses.length) : 0,
    bestTrade: closedTrades.length
      ? round(Math.max(...closedTrades.map(trade => trade.profitLoss)))
      : 0,
    worstTrade: closedTrades.length
      ? round(Math.min(...closedTrades.map(trade => trade.profitLoss)))
      : 0,
    maxDrawdown: round(maxDrawdown),
    maxDrawdownPercent: round(maxDrawdownPercent),
    maxConsecutiveLosses,
    curve,
  }
}

export const accountPerformanceService = {
  build: buildAccountPerformance,
  getClosedTrades: getAccountClosedTrades,
}
