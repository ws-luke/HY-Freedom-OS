import type { TradeDirection } from '@/types/trade'

export interface TradeCalculationInput {
  symbol: string
  direction: TradeDirection
  entryPrice: number | null
  exitPrice: number | null
  stopLoss: number | null
  takeProfit: number | null
  lotSize: number | null
}

export interface TradeCalculationResult {
  supported: boolean
  contractSize: number | null
  riskAmount: number | null
  targetProfitLoss: number | null
  actualProfitLoss: number | null
  plannedRMultiple: number | null
  actualRMultiple: number | null
  stopLossValid: boolean
  takeProfitValid: boolean
}

export interface PositionSizingResult {
  supported: boolean
  validStop: boolean
  contractSize: number | null
  stopDistance: number | null
  rawLotSize: number | null
  lotSize: number | null
  actualRiskAmount: number | null
  pnlPerDollarMove: number | null
}

const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100

const roundR = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100

const normalizeSymbol = (symbol: string): string =>
  symbol.trim().toUpperCase().replaceAll('/', '')

export const getContractSize = (
  symbol: string,
): number | null => {
  const normalized = normalizeSymbol(symbol)

  // Standard spot-gold contract: 1.00 lot = 100 troy ounces.
  // Broker suffixes such as XAUUSD.a are intentionally supported.
  if (normalized.startsWith('XAUUSD')) {
    return 100
  }

  return null
}

const calculatePricePnl = (
  direction: TradeDirection,
  entryPrice: number,
  targetPrice: number,
  lotSize: number,
  contractSize: number,
): number => {
  const directionFactor = direction === 'buy' ? 1 : -1

  return roundMoney(
    (targetPrice - entryPrice) *
      directionFactor *
      lotSize *
      contractSize,
  )
}

export const calculateTradeMetrics = (
  input: TradeCalculationInput,
): TradeCalculationResult => {
  const contractSize = getContractSize(input.symbol)
  const entryPrice = input.entryPrice
  const lotSize = input.lotSize

  const baseReady =
    contractSize !== null &&
    entryPrice !== null &&
    Number.isFinite(entryPrice) &&
    entryPrice > 0 &&
    lotSize !== null &&
    Number.isFinite(lotSize) &&
    lotSize > 0

  if (!baseReady || contractSize === null || entryPrice === null || lotSize === null) {
    return {
      supported: contractSize !== null,
      contractSize,
      riskAmount: null,
      targetProfitLoss: null,
      actualProfitLoss: null,
      plannedRMultiple: null,
      actualRMultiple: null,
      stopLossValid: false,
      takeProfitValid: false,
    }
  }

  const stopLossValid =
    input.stopLoss !== null &&
    input.stopLoss > 0 &&
    (input.direction === 'buy'
      ? input.stopLoss < entryPrice
      : input.stopLoss > entryPrice)

  const takeProfitValid =
    input.takeProfit !== null &&
    input.takeProfit > 0 &&
    (input.direction === 'buy'
      ? input.takeProfit > entryPrice
      : input.takeProfit < entryPrice)

  const stopPnl =
    stopLossValid && input.stopLoss !== null
      ? calculatePricePnl(
          input.direction,
          entryPrice,
          input.stopLoss,
          lotSize,
          contractSize,
        )
      : null

  const riskAmount =
    stopPnl === null ? null : roundMoney(Math.abs(stopPnl))

  const targetProfitLoss =
    takeProfitValid && input.takeProfit !== null
      ? calculatePricePnl(
          input.direction,
          entryPrice,
          input.takeProfit,
          lotSize,
          contractSize,
        )
      : null

  const actualProfitLoss =
    input.exitPrice !== null && input.exitPrice > 0
      ? calculatePricePnl(
          input.direction,
          entryPrice,
          input.exitPrice,
          lotSize,
          contractSize,
        )
      : null

  return {
    supported: true,
    contractSize,
    riskAmount,
    targetProfitLoss,
    actualProfitLoss,
    plannedRMultiple:
      riskAmount && targetProfitLoss !== null
        ? roundR(targetProfitLoss / riskAmount)
        : null,
    actualRMultiple:
      riskAmount && actualProfitLoss !== null
        ? roundR(actualProfitLoss / riskAmount)
        : null,
    stopLossValid,
    takeProfitValid,
  }
}

export const calculatePositionSize = (
  symbol: string,
  direction: TradeDirection,
  entryPrice: number | null,
  stopLoss: number | null,
  riskAmount: number | null,
  lotStep = 0.01,
): PositionSizingResult => {
  const contractSize = getContractSize(symbol)
  const validNumbers =
    entryPrice !== null &&
    stopLoss !== null &&
    riskAmount !== null &&
    entryPrice > 0 &&
    stopLoss > 0 &&
    riskAmount > 0
  const validStop = Boolean(
    validNumbers &&
    (direction === 'buy'
      ? stopLoss! < entryPrice!
      : stopLoss! > entryPrice!),
  )

  if (
    contractSize === null ||
    !validNumbers ||
    !validStop ||
    entryPrice === null ||
    stopLoss === null ||
    riskAmount === null
  ) {
    return {
      supported: contractSize !== null,
      validStop,
      contractSize,
      stopDistance: null,
      rawLotSize: null,
      lotSize: null,
      actualRiskAmount: null,
      pnlPerDollarMove: null,
    }
  }

  const stopDistance = Math.abs(entryPrice - stopLoss)
  const rawLotSize =
    riskAmount / (stopDistance * contractSize)
  const safeStep = lotStep > 0 ? lotStep : 0.01
  const steppedLotSize =
    Math.floor((rawLotSize + 1e-10) / safeStep) * safeStep
  const lotSize =
    steppedLotSize >= safeStep
      ? Number(steppedLotSize.toFixed(4))
      : null
  const actualRiskAmount =
    lotSize === null
      ? null
      : roundMoney(stopDistance * contractSize * lotSize)

  return {
    supported: true,
    validStop: true,
    contractSize,
    stopDistance: roundMoney(stopDistance),
    rawLotSize: Number(rawLotSize.toFixed(4)),
    lotSize,
    actualRiskAmount,
    pnlPerDollarMove:
      lotSize === null
        ? null
        : roundMoney(contractSize * lotSize),
  }
}
