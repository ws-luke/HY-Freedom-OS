import type {
  TodayTradingSummary,
  TradingRiskSettings,
} from '@/stores/useTradingRiskStore'

export type TradingRiskLevel =
  | 'safe'
  | 'warning'
  | 'blocked'

export interface TradingRiskEvaluation {
  level: TradingRiskLevel

  canTrade: boolean
  stopReason: string

  tradeLimitReached: boolean
  dailyLossReached: boolean
  consecutiveLossReached: boolean
  riskExceeded: boolean

  remainingTrades: number
  remainingLossCapacity: number
  remainingConsecutiveLosses: number

  tradeUsageRate: number
  lossUsageRate: number
  consecutiveLossUsageRate: number
  riskUsageRate: number
}

const clampPercentage = (
  value: number,
): number => {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(
    100,
    Math.max(
      0,
      Math.round(value),
    ),
  )
}

const calculateUsageRate = (
  current: number,
  maximum: number,
): number => {
  if (
    !Number.isFinite(maximum) ||
    maximum <= 0
  ) {
    return 100
  }

  return clampPercentage(
    (current / maximum) * 100,
  )
}

const getStopReason = (
  tradeLimitReached: boolean,
  dailyLossReached: boolean,
  consecutiveLossReached: boolean,
  riskExceeded: boolean,
): string => {
  if (tradeLimitReached) {
    return '今日交易次數已達上限'
  }

  if (dailyLossReached) {
    return '今日虧損已達停損限制'
  }

  if (consecutiveLossReached) {
    return '連續虧損次數過多'
  }

  if (riskExceeded) {
    return '單筆風險超過限制'
  }

  return ''
}

export const evaluateTradingRisk = (
  settings: TradingRiskSettings,
  summary: TodayTradingSummary,
): TradingRiskEvaluation => {
  const maximumDailyLoss = Math.abs(
    settings.maxDailyLoss,
  )

  const currentLoss = Math.max(
    0,
    -summary.totalPnL,
  )

  const tradeLimitReached =
    summary.trades >=
    settings.maxTradesPerDay

  const dailyLossReached =
    summary.totalPnL <=
    settings.maxDailyLoss

  const consecutiveLossReached =
    summary.consecutiveLosses >=
    settings.maxConsecutiveLosses

  const riskExceeded =
    summary.maxRiskUsed >
    settings.maxRiskPerTrade

  const canTrade = !(
    tradeLimitReached ||
    dailyLossReached ||
    consecutiveLossReached ||
    riskExceeded
  )

  const remainingTrades = Math.max(
    0,
    settings.maxTradesPerDay -
      summary.trades,
  )

  const remainingLossCapacity = Math.max(
    0,
    maximumDailyLoss -
      currentLoss,
  )

  const remainingConsecutiveLosses =
    Math.max(
      0,
      settings.maxConsecutiveLosses -
        summary.consecutiveLosses,
    )

  const tradeUsageRate =
    calculateUsageRate(
      summary.trades,
      settings.maxTradesPerDay,
    )

  const lossUsageRate =
    calculateUsageRate(
      currentLoss,
      maximumDailyLoss,
    )

  const consecutiveLossUsageRate =
    calculateUsageRate(
      summary.consecutiveLosses,
      settings.maxConsecutiveLosses,
    )

  const riskUsageRate =
    calculateUsageRate(
      summary.maxRiskUsed,
      settings.maxRiskPerTrade,
    )

  const warning =
    !canTrade
      ? false
      : tradeUsageRate >= 70 ||
        lossUsageRate >= 70 ||
        consecutiveLossUsageRate >= 50 ||
        riskUsageRate >= 80

  return {
    level: !canTrade
      ? 'blocked'
      : warning
        ? 'warning'
        : 'safe',

    canTrade,

    stopReason: getStopReason(
      tradeLimitReached,
      dailyLossReached,
      consecutiveLossReached,
      riskExceeded,
    ),

    tradeLimitReached,
    dailyLossReached,
    consecutiveLossReached,
    riskExceeded,

    remainingTrades,
    remainingLossCapacity,
    remainingConsecutiveLosses,

    tradeUsageRate,
    lossUsageRate,
    consecutiveLossUsageRate,
    riskUsageRate,
  }
}

export const tradingRiskService = {
  evaluate: evaluateTradingRisk,
}