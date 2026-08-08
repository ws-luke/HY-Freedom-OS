import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { queueCloudDeletion } from '@/services/cloud/cloud-deletion.service'
import {
  deriveTradePositionStatus,
  inferTradeExitReason,
} from '@/services/trade-lifecycle.service'

import type {
  NewTradeInput,
  TradeMistakeTag,
  TradeRecord,
  TradeResult,
  TradeScreenshot,
  TradeStatistics,
  TradeDataSource,
} from '@/types/trade'

const STORAGE_KEY = 'hy-freedom-os:trades'

const createMockTrades = (): TradeRecord[] => [
  {
    id: 'trade-001',
    date: '2026-08-01',
    time: '21:12',
    symbol: 'XAUUSD',
    direction: 'buy',
    result: 'win',
    status: 'waiting-review',
    positionStatus: 'closed',
    exitReason: 'take-profit',
    closedAt: '2026-08-01T21:12:00.000Z',
    signalId: 'signal-w',
    signal: 'W 型',
    accountId: null,
    account: 'FTMO 100K',
    dataSource: 'manual',
    externalId: null,
    brokerDealId: null,
    brokerPositionId: null,
    brokerOrderId: null,
    commission: 0,
    swap: 0,
    fee: 0,
    syncedAt: null,
    entryPrice: 3284.2,
    exitPrice: 3297.6,
    stopLoss: 3279.7,
    takeProfit: 3297.7,
    lotSize: 0.222,
    riskAmount: 100,
    profitLoss: 298,
    rMultiple: 2.98,
    playbook: 'W 型＋支撐反轉',
    reason:
      '價格回踩 1H 支撐區，15M 結構轉強，1M 出現 W 型確認。',
    beforeScreenshot: null,
    afterScreenshot: null,
    mistakeTags: [],
    customMistakeTags: [],
    isFavorite: true,
    createdAt: '2026-08-01T21:12:00.000Z',
    updatedAt: '2026-08-01T21:12:00.000Z',
  },
  {
    id: 'trade-002',
    date: '2026-07-31',
    time: '19:48',
    symbol: 'XAUUSD',
    direction: 'sell',
    result: 'loss',
    status: 'completed',
    positionStatus: 'closed',
    exitReason: 'stop-loss',
    closedAt: '2026-07-31T19:48:00.000Z',
    signalId: 'signal-m',
    signal: 'M 型',
    accountId: null,
    account: 'FTMO 100K',
    dataSource: 'manual',
    externalId: null,
    brokerDealId: null,
    brokerPositionId: null,
    brokerOrderId: null,
    commission: 0,
    swap: 0,
    fee: 0,
    syncedAt: null,
    entryPrice: 3310.4,
    exitPrice: 3315.1,
    stopLoss: 3315.1,
    takeProfit: 3296.3,
    lotSize: 0.213,
    riskAmount: 100,
    profitLoss: -100,
    rMultiple: -1,
    playbook: 'M 型＋壓力反轉',
    reason:
      '價格到達壓力區，但進場過早，尚未確認 15M 結構轉弱。',
    beforeScreenshot: null,
    afterScreenshot: null,
    mistakeTags: [
      'early-entry',
      'no-confirmation',
    ],
    customMistakeTags: [],
    isFavorite: false,
    createdAt: '2026-07-31T19:48:00.000Z',
    updatedAt: '2026-07-31T19:48:00.000Z',
  },
  {
    id: 'trade-003',
    date: '2026-07-30',
    time: '22:05',
    symbol: 'XAUUSD',
    direction: 'buy',
    result: 'breakeven',
    status: 'completed',
    positionStatus: 'closed',
    exitReason: 'manual',
    closedAt: '2026-07-30T22:05:00.000Z',
    signalId: null,
    signal: '突破回踩',
    accountId: null,
    account: 'Demo Practice',
    dataSource: 'manual',
    externalId: null,
    brokerDealId: null,
    brokerPositionId: null,
    brokerOrderId: null,
    commission: 0,
    swap: 0,
    fee: 0,
    syncedAt: null,
    entryPrice: 3268.8,
    exitPrice: 3268.9,
    stopLoss: 3263.8,
    takeProfit: 3283.8,
    lotSize: 0.2,
    riskAmount: 100,
    profitLoss: 2,
    rMultiple: 0.02,
    playbook: '突破回踩',
    reason:
      '突破後回踩成立，但後續動能不足，移動停損後接近平手離場。',
    beforeScreenshot: null,
    afterScreenshot: null,
    mistakeTags: [
      'early-exit',
    ],
    customMistakeTags: [
      '持倉信心不足',
    ],
    isFavorite: false,
    createdAt: '2026-07-30T22:05:00.000Z',
    updatedAt: '2026-07-30T22:05:00.000Z',
  },
]

const normalizeNumber = (
  value: unknown,
): number => {
  const numberValue = Number(value)

  return Number.isFinite(numberValue)
    ? numberValue
    : 0
}

const normalizeScreenshot = (
  value: unknown,
): TradeScreenshot | null => {
  if (
    typeof value !== 'object' ||
    value === null
  ) {
    return null
  }

  const screenshot =
    value as Partial<TradeScreenshot>

  if (
    typeof screenshot.name !== 'string' ||
    typeof screenshot.dataUrl !== 'string'
  ) {
    return null
  }

  return {
    name: screenshot.name,
    dataUrl: screenshot.dataUrl,
    storagePath:
      typeof screenshot.storagePath === 'string' && screenshot.storagePath.trim()
        ? screenshot.storagePath.trim()
        : null,
  }
}

const normalizeTrade = (
  trade: TradeRecord,
): TradeRecord => {
  const now = new Date().toISOString()
  const positionStatus = deriveTradePositionStatus(trade)
  const exitPrice = normalizeNumber(trade.exitPrice)
  const stopLoss = normalizeNumber(trade.stopLoss)
  const takeProfit = normalizeNumber(trade.takeProfit)
  const dataSource: TradeDataSource = trade.dataSource === 'mt5' ? 'mt5' : 'manual'

  return {
    id:
      typeof trade.id === 'string' &&
      trade.id.trim()
        ? trade.id
        : crypto.randomUUID(),

    date:
      typeof trade.date === 'string'
        ? trade.date
        : '',

    time:
      typeof trade.time === 'string'
        ? trade.time
        : '00:00',

    symbol:
      typeof trade.symbol === 'string'
        ? trade.symbol.trim().toUpperCase()
        : '',

    direction:
      trade.direction === 'sell'
        ? 'sell'
        : 'buy',

    result:
      trade.result === 'win' ||
      trade.result === 'loss' ||
      trade.result === 'breakeven'
        ? trade.result
        : 'breakeven',

    status:
      trade.status === 'waiting-review' ||
      trade.status === 'reviewing' ||
      trade.status === 'completed'
        ? trade.status
        : 'waiting-review',

    positionStatus,

    exitReason:
      positionStatus === 'closed'
        ? trade.exitReason === 'take-profit' ||
          trade.exitReason === 'stop-loss' ||
          trade.exitReason === 'manual'
          ? trade.exitReason
          : inferTradeExitReason(exitPrice, stopLoss, takeProfit)
        : null,

    closedAt:
      positionStatus === 'closed'
        ? typeof trade.closedAt === 'string' && trade.closedAt
          ? trade.closedAt
          : typeof trade.updatedAt === 'string' && trade.updatedAt
            ? trade.updatedAt
            : typeof trade.createdAt === 'string' && trade.createdAt
              ? trade.createdAt
              : now
        : null,

    signalId:
      typeof trade.signalId === 'string' && trade.signalId.trim()
        ? trade.signalId.trim()
        : null,

    signal:
      typeof trade.signal === 'string'
        ? trade.signal.trim()
        : '',

    accountId:
      typeof trade.accountId === 'string' &&
      trade.accountId.trim()
        ? trade.accountId.trim()
        : null,

    account:
      typeof trade.account === 'string'
        ? trade.account.trim()
        : '',

    dataSource,
    externalId:
      typeof trade.externalId === 'string' && trade.externalId.trim()
        ? trade.externalId.trim()
        : null,
    brokerDealId:
      typeof trade.brokerDealId === 'string' && trade.brokerDealId.trim()
        ? trade.brokerDealId.trim()
        : null,
    brokerPositionId:
      typeof trade.brokerPositionId === 'string' && trade.brokerPositionId.trim()
        ? trade.brokerPositionId.trim()
        : null,
    brokerOrderId:
      typeof trade.brokerOrderId === 'string' && trade.brokerOrderId.trim()
        ? trade.brokerOrderId.trim()
        : null,
    commission: normalizeNumber(trade.commission),
    swap: normalizeNumber(trade.swap),
    fee: normalizeNumber(trade.fee),
    syncedAt:
      typeof trade.syncedAt === 'string' && trade.syncedAt
        ? trade.syncedAt
        : null,

    entryPrice:
      normalizeNumber(trade.entryPrice),

    exitPrice,

    stopLoss,

    takeProfit,

    lotSize:
      normalizeNumber(trade.lotSize),

    riskAmount:
      normalizeNumber(trade.riskAmount),

    profitLoss:
      normalizeNumber(trade.profitLoss),

    rMultiple:
      normalizeNumber(trade.rMultiple),

    playbook:
      typeof trade.playbook === 'string'
        ? trade.playbook.trim()
        : '',

    reason:
      typeof trade.reason === 'string'
        ? trade.reason.trim()
        : '',

    beforeScreenshot:
      normalizeScreenshot(
        trade.beforeScreenshot,
      ),

    afterScreenshot:
      normalizeScreenshot(
        trade.afterScreenshot,
      ),

    mistakeTags:
      Array.isArray(trade.mistakeTags)
        ? [...new Set(trade.mistakeTags)]
        : [],

    customMistakeTags:
      Array.isArray(
        trade.customMistakeTags,
      )
        ? [
            ...new Set(
              trade.customMistakeTags
                .filter(
                  tag =>
                    typeof tag === 'string',
                )
                .map(tag => tag.trim())
                .filter(Boolean),
            ),
          ]
        : [],

    isFavorite:
      Boolean(trade.isFavorite),

    createdAt:
      typeof trade.createdAt === 'string' &&
      trade.createdAt
        ? trade.createdAt
        : now,

    updatedAt:
      typeof trade.updatedAt === 'string' &&
      trade.updatedAt
        ? trade.updatedAt
        : now,
  }
}

const readStoredTrades =
  (): TradeRecord[] | null => {
    if (typeof window === 'undefined') {
      return null
    }

    const rawValue =
      window.localStorage.getItem(
        STORAGE_KEY,
      )

    if (!rawValue) {
      return null
    }

    try {
      const parsedValue =
        JSON.parse(rawValue) as unknown

      if (!Array.isArray(parsedValue)) {
        return null
      }

      return parsedValue.map(item =>
        normalizeTrade(
          item as TradeRecord,
        ),
      )
    }
    catch {
      return null
    }
  }

const getTradeTimestamp = (
  trade: TradeRecord,
): number => {
  const normalizedDate =
    trade.date.replaceAll('/', '-')

  const timestamp = new Date(
    `${normalizedDate}T${trade.time || '00:00'}:00`,
  ).getTime()

  return Number.isNaN(timestamp)
    ? 0
    : timestamp
}

export const useTradeStore = defineStore(
  'trades',
  () => {
    const storedTrades =
      readStoredTrades()

    const trades = ref<TradeRecord[]>(
      storedTrades ??
        createMockTrades(),
    )

    const sortedTrades = computed(() =>
      [...trades.value].sort(
        (a, b) =>
          getTradeTimestamp(b) -
          getTradeTimestamp(a),
      ),
    )

    const favoriteTrades = computed(() =>
      sortedTrades.value.filter(
        trade => trade.isFavorite,
      ),
    )

    const openTrades = computed(() =>
      sortedTrades.value.filter(trade => trade.positionStatus === 'open'),
    )

    const closedTrades = computed(() =>
      sortedTrades.value.filter(trade => trade.positionStatus === 'closed'),
    )

    const sortedClosedTrades = closedTrades

    const accounts = computed(() =>
      Array.from(
        new Set(
          trades.value
            .map(trade =>
              trade.account.trim(),
            )
            .filter(Boolean),
        ),
      ),
    )

    const statistics =
      computed<TradeStatistics>(() => {
        const totalTrades =
          trades.value.length

        const settledTrades = trades.value.filter(
          trade => trade.positionStatus === 'closed',
        )

        const closedTradeCount = settledTrades.length
        const openTradeCount = totalTrades - closedTradeCount

        const winningTrades =
          settledTrades.filter(
            trade =>
              trade.result === 'win',
          ).length

        const losingTrades =
          settledTrades.filter(
            trade =>
              trade.result === 'loss',
          ).length

        const breakevenTrades =
          settledTrades.filter(
            trade =>
              trade.result ===
              'breakeven',
          ).length

        const totalProfitLoss =
          settledTrades.reduce(
            (total, trade) =>
              total +
              trade.profitLoss,
            0,
          )

        const totalR =
          settledTrades.reduce(
            (total, trade) =>
              total +
              trade.rMultiple,
            0,
          )

        return {
          totalTrades,
          openTrades: openTradeCount,
          closedTrades: closedTradeCount,
          winningTrades,
          losingTrades,
          breakevenTrades,

          winRate:
            closedTradeCount > 0
              ? Math.round(
                  (
                    winningTrades /
                    closedTradeCount
                  ) * 100,
                )
              : 0,

          totalProfitLoss,

          averageR:
            closedTradeCount > 0
              ? Number(
                  (
                    totalR /
                    closedTradeCount
                  ).toFixed(2),
                )
              : 0,
        }
      })

    const pendingReviewTrades =
      computed(() =>
        sortedTrades.value.filter(
          trade =>
            trade.positionStatus === 'closed' &&
            (trade.status ===
              'waiting-review' ||
            trade.status ===
              'reviewing'),
        ).sort((a, b) => {
          const aTime = Date.parse(a.closedAt ?? a.updatedAt) || 0
          const bTime = Date.parse(b.closedAt ?? b.updatedAt) || 0
          return bTime - aTime
        }),
      )

    const mistakeTagCounts =
      computed(() => {
        const counts = new Map<
          TradeMistakeTag,
          number
        >()

        trades.value.forEach(trade => {
          trade.mistakeTags.forEach(
            tag => {
              counts.set(
                tag,
                (counts.get(tag) ??
                  0) + 1,
              )
            },
          )
        })

        return counts
      })

    const save = (): void => {
      if (typeof window === 'undefined') {
        return
      }

      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(
            trades.value,
          ),
        )
      }
      catch (error) {
        console.error(
          '儲存交易紀錄失敗：',
          error,
        )
      }
    }

    const getTradeById = (
      tradeId: string,
    ): TradeRecord | null => {
      return (
        trades.value.find(
          trade =>
            trade.id === tradeId,
        ) ?? null
      )
    }

    const addTrade = (
      input: NewTradeInput,
    ): TradeRecord => {
      const now =
        new Date().toISOString()

      const trade = normalizeTrade({
        id: crypto.randomUUID(),
        date: input.date,
        time: input.time,
        symbol: input.symbol,
        direction: input.direction,
        result: input.result,
        status: 'waiting-review',
        positionStatus: input.exitPrice !== null && input.exitPrice > 0 ? 'closed' : 'open',
        exitReason: inferTradeExitReason(input.exitPrice, input.stopLoss, input.takeProfit),
        closedAt: input.exitPrice !== null && input.exitPrice > 0 ? now : null,
        signalId: input.signalId ?? null,
        signal: input.signal ?? '',
        accountId: input.accountId ?? null,
        account: input.account,
        dataSource: input.dataSource ?? 'manual',
        externalId: input.externalId ?? null,
        brokerDealId: input.brokerDealId ?? null,
        brokerPositionId: input.brokerPositionId ?? null,
        brokerOrderId: input.brokerOrderId ?? null,
        commission: input.commission ?? 0,
        swap: input.swap ?? 0,
        fee: input.fee ?? 0,
        syncedAt: input.syncedAt ?? null,
        entryPrice:
          input.entryPrice ?? 0,
        exitPrice:
          input.exitPrice ?? 0,
        stopLoss:
          input.stopLoss ?? 0,
        takeProfit:
          input.takeProfit ?? 0,
        lotSize:
          input.lotSize ?? 0,
        riskAmount:
          input.riskAmount ?? 0,
        profitLoss:
          input.profitLoss ?? 0,
        rMultiple:
          input.rMultiple,
        playbook:
          input.playbook,
        reason:
          input.reason,
        beforeScreenshot:
          input.beforeScreenshot ??
          null,
        afterScreenshot:
          input.afterScreenshot ??
          null,
        mistakeTags:
          input.mistakeTags ?? [],
        customMistakeTags:
          input.customMistakeTags ??
          [],
        isFavorite:
          input.isFavorite ?? false,
        createdAt: now,
        updatedAt: now,
      })

      trades.value.unshift(trade)

      return trade
    }

    const updateTrade = (
      tradeId: string,
      updates: Partial<TradeRecord>,
    ): TradeRecord | null => {
      const trade =
        getTradeById(tradeId)

      if (!trade) {
        return null
      }

      if (
        Object.prototype.hasOwnProperty.call(updates, 'beforeScreenshot') &&
        trade.beforeScreenshot &&
        updates.beforeScreenshot === null
      ) {
        queueCloudDeletion('trade_screenshots', `${tradeId}:before`)
      }

      if (
        Object.prototype.hasOwnProperty.call(updates, 'afterScreenshot') &&
        trade.afterScreenshot &&
        updates.afterScreenshot === null
      ) {
        queueCloudDeletion('trade_screenshots', `${tradeId}:after`)
      }

      const updatedTrade =
        normalizeTrade({
          ...trade,
          ...updates,
          id: trade.id,
          createdAt:
            trade.createdAt,
          updatedAt:
            new Date().toISOString(),
        })

      const tradeIndex =
        trades.value.findIndex(
          item =>
            item.id === tradeId,
        )

      if (tradeIndex >= 0) {
        trades.value[tradeIndex] =
          updatedTrade
      }

      return updatedTrade
    }

    const updateBeforeScreenshot = (
      tradeId: string,
      screenshot:
        | TradeScreenshot
        | null,
    ): void => {
      updateTrade(tradeId, {
        beforeScreenshot:
          screenshot,
      })
    }

    const updateAfterScreenshot = (
      tradeId: string,
      screenshot:
        | TradeScreenshot
        | null,
    ): void => {
      updateTrade(tradeId, {
        afterScreenshot:
          screenshot,
      })
    }

    const removeBeforeScreenshot = (
      tradeId: string,
    ): void => {
      queueCloudDeletion('trade_screenshots', `${tradeId}:before`)
      updateBeforeScreenshot(
        tradeId,
        null,
      )
    }

    const removeAfterScreenshot = (
      tradeId: string,
    ): void => {
      queueCloudDeletion('trade_screenshots', `${tradeId}:after`)
      updateAfterScreenshot(
        tradeId,
        null,
      )
    }

    const updateMistakeTags = (
      tradeId: string,
      mistakeTags:
        TradeMistakeTag[],
    ): void => {
      updateTrade(tradeId, {
        mistakeTags: [
          ...new Set(
            mistakeTags,
          ),
        ],
      })
    }

    const updateCustomMistakeTags = (
      tradeId: string,
      customMistakeTags:
        string[],
    ): void => {
      updateTrade(tradeId, {
        customMistakeTags: [
          ...new Set(
            customMistakeTags
              .map(tag =>
                tag.trim(),
              )
              .filter(Boolean),
          ),
        ],
      })
    }

    const updateAllMistakeTags = (
      tradeId: string,
      mistakeTags:
        TradeMistakeTag[],
      customMistakeTags:
        string[],
    ): void => {
      updateTrade(tradeId, {
        mistakeTags: [
          ...new Set(
            mistakeTags,
          ),
        ],

        customMistakeTags: [
          ...new Set(
            customMistakeTags
              .map(tag =>
                tag.trim(),
              )
              .filter(Boolean),
          ),
        ],
      })
    }

    const toggleFavorite = (
      tradeId: string,
    ): void => {
      const trade =
        getTradeById(tradeId)

      if (!trade) {
        return
      }

      updateTrade(tradeId, {
        isFavorite:
          !trade.isFavorite,
      })
    }

    const setFavorite = (
      tradeId: string,
      isFavorite: boolean,
    ): void => {
      updateTrade(tradeId, {
        isFavorite,
      })
    }

    const removeTrade = (
      tradeId: string,
    ): void => {
      queueCloudDeletion('trades', tradeId)
      trades.value =
        trades.value.filter(
          trade =>
            trade.id !== tradeId,
        )
    }

    const setTradeResult = (
      tradeId: string,
      result: TradeResult,
    ): void => {
      updateTrade(tradeId, {
        result,
      })
    }

    const markWaitingReview = (
      tradeId: string,
    ): void => {
      updateTrade(tradeId, {
        status:
          'waiting-review',
      })
    }

    const markReviewing = (
      tradeId: string,
    ): void => {
      updateTrade(tradeId, {
        status: 'reviewing',
      })
    }

    const markReviewCompleted = (
      tradeId: string,
    ): void => {
      updateTrade(tradeId, {
        status: 'completed',
      })
    }

    const importTrades = (
      importedTrades:
        TradeRecord[],
    ): {
      added: number
      updated: number
      total: number
    } => {
      let added = 0
      let updated = 0

      const tradeMap = new Map<
        string,
        TradeRecord
      >()

      trades.value.forEach(trade => {
        tradeMap.set(
          trade.id,
          normalizeTrade(trade),
        )
      })

      importedTrades.forEach(
        importedTrade => {
          const normalizedTrade =
            normalizeTrade(
              importedTrade,
            )

          if (
            tradeMap.has(
              normalizedTrade.id,
            )
          ) {
            updated += 1
          }
          else {
            added += 1
          }

          tradeMap.set(
            normalizedTrade.id,
            normalizedTrade,
          )
        },
      )

      trades.value = [
        ...tradeMap.values(),
      ].sort(
        (a, b) =>
          getTradeTimestamp(b) -
          getTradeTimestamp(a),
      )

      save()

      return {
        added,
        updated,
        total:
          trades.value.length,
      }
    }

    const upsertSyncedTrade = (
      incoming: TradeRecord,
    ): { trade: TradeRecord; created: boolean } => {
      const normalized = normalizeTrade(incoming)
      const externalId = normalized.externalId
      const existing = externalId
        ? trades.value.find(trade =>
            trade.dataSource === normalized.dataSource &&
            trade.accountId === normalized.accountId &&
            trade.externalId === externalId,
          )
        : null

      if (!existing) {
        trades.value.unshift(normalized)
        return { trade: normalized, created: true }
      }

      const updated = normalizeTrade({
        ...existing,
        ...normalized,
        id: existing.id,
        signalId: existing.signalId,
        signal: existing.signal,
        playbook: existing.playbook,
        reason: existing.reason,
        beforeScreenshot: existing.beforeScreenshot,
        afterScreenshot: existing.afterScreenshot,
        mistakeTags: existing.mistakeTags,
        customMistakeTags: existing.customMistakeTags,
        isFavorite: existing.isFavorite,
        status: existing.status,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      })
      const index = trades.value.findIndex(trade => trade.id === existing.id)
      trades.value[index] = updated
      return { trade: updated, created: false }
    }

    const replaceAllTrades = (
      replacementTrades:
        TradeRecord[],
    ): void => {
      trades.value =
        replacementTrades.map(
          normalizeTrade,
        )

      save()
    }

    const resetTrades = (): void => {
      trades.value =
        createMockTrades()

      save()
    }

    watch(
      trades,
      save,
      {
        deep: true,
      },
    )

    return {
      trades,
      sortedTrades,
      openTrades,
      closedTrades,
      sortedClosedTrades,
      favoriteTrades,
      accounts,
      statistics,
      pendingReviewTrades,
      mistakeTagCounts,

      getTradeById,
      addTrade,
      updateTrade,
      updateBeforeScreenshot,
      updateAfterScreenshot,
      removeBeforeScreenshot,
      removeAfterScreenshot,
      updateMistakeTags,
      updateCustomMistakeTags,
      updateAllMistakeTags,
      toggleFavorite,
      setFavorite,
      removeTrade,
      setTradeResult,
      markWaitingReview,
      markReviewing,
      markReviewCompleted,

      importTrades,
      upsertSyncedTrade,
      replaceAllTrades,
      resetTrades,
    }
  },
)
