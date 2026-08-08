import {
  computed,
  watch,
  type ComputedRef,
} from 'vue'
import { storeToRefs } from 'pinia'

import { useTradeStore } from '@/stores/useTradeStore'
import {
  useTradingRiskStore,
  type TodayTradingSummary,
} from '@/stores/useTradingRiskStore'

import type {
  TradeRecord,
} from '@/types/trade'

const getLocalDateKey = (
  date: Date,
): string => {
  const year = date.getFullYear()

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0')

  const day = String(
    date.getDate(),
  ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const normalizeTradeDate = (
  value: string,
): string => {
  return value
    .trim()
    .replaceAll('/', '-')
}

const getTradeTimestamp = (
  trade: TradeRecord,
): number => {
  const date = normalizeTradeDate(
    trade.date,
  )

  const timestamp = new Date(
    `${date}T${trade.time || '00:00'}:00`,
  ).getTime()

  return Number.isNaN(timestamp)
    ? 0
    : timestamp
}

const calculateConsecutiveLosses = (
  trades: TradeRecord[],
): number => {
  const newestFirst = [...trades].sort(
    (a, b) =>
      getTradeTimestamp(b) -
      getTradeTimestamp(a),
  )

  let count = 0

  for (const trade of newestFirst) {
    if (trade.result === 'loss') {
      count += 1
      continue
    }

    break
  }

  return count
}

export const useTradingRiskSync = (): {
  todayTrades: ComputedRef<TradeRecord[]>
  todaySummary: ComputedRef<TodayTradingSummary>
} => {
  const tradeStore = useTradeStore()
  const tradingRiskStore =
    useTradingRiskStore()

  const {
    trades,
  } = storeToRefs(tradeStore)

  const todayKey = computed(() =>
    getLocalDateKey(new Date()),
  )

  const todayTrades = computed(() => {
    return trades.value
      .filter(
        trade =>
          normalizeTradeDate(
            trade.date,
          ) === todayKey.value,
      )
      .sort(
        (a, b) =>
          getTradeTimestamp(a) -
          getTradeTimestamp(b),
      )
  })

  const todaySummary =
    computed<TodayTradingSummary>(() => {
      const currentTrades =
        todayTrades.value
      const settledTrades = currentTrades.filter(
        trade => trade.positionStatus === 'closed',
      )

      const wins =
        settledTrades.filter(
          trade =>
            trade.result === 'win',
        ).length

      const losses =
        settledTrades.filter(
          trade =>
            trade.result === 'loss',
        ).length

      const breakeven =
        settledTrades.filter(
          trade =>
            trade.result ===
            'breakeven',
        ).length

      const totalPnL =
        settledTrades.reduce(
          (total, trade) =>
            total +
            trade.profitLoss,
          0,
        )

      const maxRiskUsed =
        currentTrades.length > 0
          ? Math.max(
              ...currentTrades.map(
                trade =>
                  trade.riskAmount,
              ),
            )
          : 0

      return {
        trades:
          currentTrades.length,
        wins,
        losses,
        breakeven,
        totalPnL: Number(
          totalPnL.toFixed(2),
        ),
        consecutiveLosses:
          calculateConsecutiveLosses(
            settledTrades,
          ),
        maxRiskUsed: Number(
          maxRiskUsed.toFixed(2),
        ),
      }
    })

  watch(
    todaySummary,
    summary => {
      tradingRiskStore.updateTodaySummary(
        summary,
      )
    },
    {
      immediate: true,
      deep: true,
    },
  )

  return {
    todayTrades,
    todaySummary,
  }
}
