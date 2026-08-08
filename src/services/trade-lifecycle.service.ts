import type {
  TradeExitReason,
  TradePositionStatus,
  TradeRecord,
} from '@/types/trade'

const EXIT_PRICE_TOLERANCE = 0.02

const isPositiveNumber = (value: unknown): boolean => {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) && numberValue > 0
}

export const inferTradeExitReason = (
  exitPrice: number | null | undefined,
  stopLoss: number | null | undefined,
  takeProfit: number | null | undefined,
): TradeExitReason | null => {
  if (!isPositiveNumber(exitPrice)) return null

  if (
    isPositiveNumber(takeProfit) &&
    Math.abs(Number(exitPrice) - Number(takeProfit)) <= EXIT_PRICE_TOLERANCE
  ) {
    return 'take-profit'
  }

  if (
    isPositiveNumber(stopLoss) &&
    Math.abs(Number(exitPrice) - Number(stopLoss)) <= EXIT_PRICE_TOLERANCE
  ) {
    return 'stop-loss'
  }

  return 'manual'
}

export const deriveTradePositionStatus = (
  trade: Partial<TradeRecord>,
): TradePositionStatus => {
  if (trade.positionStatus === 'open' || trade.positionStatus === 'closed') {
    return trade.positionStatus
  }

  return isPositiveNumber(trade.exitPrice) ||
    Number(trade.profitLoss) !== 0 ||
    trade.status === 'completed'
    ? 'closed'
    : 'open'
}
