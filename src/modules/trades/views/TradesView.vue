<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { computed, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import EditTradeModal from '../components/EditTradeModal.vue'
import NewTradeModal from '../components/NewTradeModal.vue'
import TradeAdvancedFilters from '../components/TradeAdvancedFilters.vue'
import TradeDetailModal from '../components/TradeDetailModal.vue'
import TradeDataTools from '../components/TradeDataTools.vue'
import TradeReviewModal from '../components/TradeReviewModal.vue'
import { useConfirmDialogStore } from '@/stores/useConfirmDialogStore'
import { useNotificationStore } from '@/stores/useNotificationStore'
import { useTradeReviewStore } from '@/stores/useTradeReviewStore'
import { useTradeStore } from '@/stores/useTradeStore'
import { formatTradePrice } from '@/services'

import type {
  AdvancedTradeFilters,
} from '../components/TradeAdvancedFilters.vue'

import type {
  NewTradeInput,
  TradeDirection,
  TradeMistakeTag,
  TradeRecord,
  TradeResult,
  TradeScreenshot,
} from '@/types/trade'

import type {
  TradeReviewResult,
} from '@/types/trade-review'

type ScreenshotType = 'before' | 'after'

const tradeStore = useTradeStore()
const tradeReviewStore = useTradeReviewStore()
const confirmDialog = useConfirmDialogStore()
const notificationStore = useNotificationStore()
const route = useRoute()

const {
  sortedTrades,
  accounts,
  statistics,
} = storeToRefs(tradeStore)

const isNewTradeModalOpen = ref(false)
const isDetailModalOpen = ref(false)
const isReviewModalOpen = ref(false)
const isEditModalOpen = ref(false)

const selectedTrade = ref<TradeRecord | null>(null)

const selectedExistingReview = computed(() =>
  selectedTrade.value
    ? tradeReviewStore.getReviewByTradeId(selectedTrade.value.id)
    : null,
)

const createDefaultFilters = (): AdvancedTradeFilters => ({
  keyword: '',
  account: 'all',
  result: 'all',
  direction: 'all',
  status: 'all',
  positionStatus: 'all',
  favoriteOnly: false,
  mistakeTag: 'all',
  screenshot: 'all',
  dateFrom: '',
  dateTo: '',
  minimumR: null,
  maximumR: null,
  sort: 'newest',
})

const filters = reactive<AdvancedTradeFilters>(
  createDefaultFilters(),
)

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

const matchesScreenshotFilter = (
  trade: TradeRecord,
): boolean => {
  const hasBefore =
    Boolean(trade.beforeScreenshot)

  const hasAfter =
    Boolean(trade.afterScreenshot)

  if (filters.screenshot === 'with-any') {
    return hasBefore || hasAfter
  }

  if (filters.screenshot === 'with-both') {
    return hasBefore && hasAfter
  }

  if (filters.screenshot === 'without') {
    return !hasBefore && !hasAfter
  }

  return true
}

const filteredTrades = computed(() => {
  const keyword = filters.keyword
    .trim()
    .toLowerCase()

  const results = sortedTrades.value.filter(
    trade => {
      const matchesKeyword =
        !keyword ||
        trade.symbol
          .toLowerCase()
          .includes(keyword) ||
        trade.playbook
          .toLowerCase()
          .includes(keyword) ||
        trade.signal
          .toLowerCase()
          .includes(keyword) ||
        trade.reason
          .toLowerCase()
          .includes(keyword) ||
        trade.account
          .toLowerCase()
          .includes(keyword) ||
        trade.mistakeTags.some(tag =>
          mistakeTagLabel(tag)
            .toLowerCase()
            .includes(keyword),
        ) ||
        trade.customMistakeTags.some(tag =>
          tag
            .toLowerCase()
            .includes(keyword),
        )

      const matchesAccount =
        filters.account === 'all' ||
        trade.account === filters.account

      const matchesResult =
        filters.result === 'all' ||
        trade.result === filters.result

      const matchesDirection =
        filters.direction === 'all' ||
        trade.direction === filters.direction

      const matchesStatus =
        filters.status === 'all' ||
        trade.status === filters.status

      const matchesPositionStatus =
        filters.positionStatus === 'all' ||
        trade.positionStatus === filters.positionStatus

      const matchesFavorite =
        !filters.favoriteOnly ||
        trade.isFavorite

      const matchesMistakeTag =
        filters.mistakeTag === 'all' ||
        trade.mistakeTags.includes(
          filters.mistakeTag,
        )

      const matchesDateFrom =
        !filters.dateFrom ||
        trade.date >= filters.dateFrom

      const matchesDateTo =
        !filters.dateTo ||
        trade.date <= filters.dateTo

      const matchesMinimumR =
        filters.minimumR === null ||
        trade.rMultiple >= filters.minimumR

      const matchesMaximumR =
        filters.maximumR === null ||
        trade.rMultiple <= filters.maximumR

      return (
        matchesKeyword &&
        matchesAccount &&
        matchesResult &&
        matchesDirection &&
        matchesStatus &&
        matchesPositionStatus &&
        matchesFavorite &&
        matchesMistakeTag &&
        matchesScreenshotFilter(trade) &&
        matchesDateFrom &&
        matchesDateTo &&
        matchesMinimumR &&
        matchesMaximumR
      )
    },
  )

  return [...results].sort((a, b) => {
    if (filters.sort === 'oldest') {
      return (
        getTradeTimestamp(a) -
        getTradeTimestamp(b)
      )
    }

    if (filters.sort === 'profit-high') {
      return b.profitLoss - a.profitLoss
    }

    if (filters.sort === 'profit-low') {
      return a.profitLoss - b.profitLoss
    }

    if (filters.sort === 'r-high') {
      return b.rMultiple - a.rMultiple
    }

    if (filters.sort === 'r-low') {
      return a.rMultiple - b.rMultiple
    }

    return (
      getTradeTimestamp(b) -
      getTradeTimestamp(a)
    )
  })
})

const filteredStatistics = computed(() => {
  const trades = filteredTrades.value
  const totalTrades = trades.length
  const closedTrades = trades.filter(
    trade => trade.positionStatus === 'closed',
  )
  const closedTradeCount = closedTrades.length
  const openTrades = totalTrades - closedTradeCount

  const winningTrades = closedTrades.filter(
    trade => trade.result === 'win',
  ).length

  const losingTrades = closedTrades.filter(
    trade => trade.result === 'loss',
  ).length

  const breakevenTrades = closedTrades.filter(
    trade => trade.result === 'breakeven',
  ).length

  const totalProfitLoss = closedTrades.reduce(
    (total, trade) =>
      total + trade.profitLoss,
    0,
  )

  const totalR = closedTrades.reduce(
    (total, trade) =>
      total + trade.rMultiple,
    0,
  )

  return {
    totalTrades,
    openTrades,
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

const formatMoney = (
  value: number,
): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)

const resultLabel = (
  result: TradeResult,
): string => {
  const labels: Record<TradeResult, string> = {
    win: '獲利',
    loss: '虧損',
    breakeven: '平手',
  }

  return labels[result]
}

const resultClasses = (
  result: TradeResult,
): string => {
  const classes: Record<TradeResult, string> = {
    win:
      'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    loss:
      'border-rose-500/25 bg-rose-500/10 text-rose-300',
    breakeven:
      'border-zinc-700 bg-zinc-800/70 text-zinc-300',
  }

  return classes[result]
}

const directionClasses = (
  direction: TradeDirection,
): string =>
  direction === 'buy'
    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
    : 'border-rose-500/25 bg-rose-500/10 text-rose-300'

const profitLossClasses = (
  value: number,
): string => {
  if (value > 0) {
    return 'text-emerald-300'
  }

  if (value < 0) {
    return 'text-rose-300'
  }

  return 'text-zinc-300'
}

const reviewStatusLabel = (
  trade: TradeRecord,
): string => {
  if (tradeReviewStore.hasReview(trade.id)) {
    return '已完成復盤'
  }

  if (trade.status === 'reviewing') {
    return '復盤中'
  }

  return '待復盤'
}

const reviewStatusClasses = (
  trade: TradeRecord,
): string => {
  if (tradeReviewStore.hasReview(trade.id)) {
    return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
  }

  if (trade.status === 'reviewing') {
    return 'border-sky-500/25 bg-sky-500/10 text-sky-300'
  }

  return 'border-amber-500/25 bg-amber-500/10 text-amber-300'
}

const positionStatusLabel = (trade: TradeRecord): string =>
  trade.positionStatus === 'open' ? '持倉中' : '已平倉'

const positionStatusClasses = (trade: TradeRecord): string =>
  trade.positionStatus === 'open'
    ? 'border-sky-500/25 bg-sky-500/10 text-sky-300'
    : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300'

const mistakeTagLabel = (
  tag: TradeMistakeTag,
): string => {
  const labels: Record<TradeMistakeTag, string> = {
    fomo: 'FOMO 追價',
    overtrade: '過度交易',
    'early-entry': '過早進場',
    'late-entry': '太晚進場',
    'early-exit': '過早離場',
    'late-exit': '太晚離場',
    'moved-stop': '移動停損',
    'oversized-risk': '風險過大',
    'ignored-trend': '忽略趨勢',
    'ignored-news': '忽略新聞',
    'revenge-trade': '報復交易',
    'no-confirmation': '沒有確認',
  }

  return labels[tag]
}

const updateFilters = (
  value: AdvancedTradeFilters,
): void => {
  Object.assign(filters, value)
}

const resetFilters = (): void => {
  Object.assign(
    filters,
    createDefaultFilters(),
  )
}

const openNewTradeModal = (): void => {
  isNewTradeModalOpen.value = true
}

const closeNewTradeModal = (): void => {
  isNewTradeModalOpen.value = false
}

const openTradeDetail = (
  trade: TradeRecord,
): void => {
  selectedTrade.value =
    tradeStore.getTradeById(trade.id)

  isDetailModalOpen.value = true
}

const closeTradeDetail = (): void => {
  isDetailModalOpen.value = false
  selectedTrade.value = null
}

const openEditTrade = (
  trade: TradeRecord,
): void => {
  selectedTrade.value =
    tradeStore.getTradeById(trade.id)

  isDetailModalOpen.value = false
  isEditModalOpen.value = true
}

const closeEditTrade = (): void => {
  isEditModalOpen.value = false
  selectedTrade.value = null
}

watch(
  () => route.query.manage,
  tradeId => {
    if (typeof tradeId !== 'string') return

    const trade = tradeStore.getTradeById(tradeId)
    if (!trade) return

    openEditTrade(trade)
  },
  { immediate: true },
)

const openTradeReview = (
  tradeId: string,
): void => {
  const trade =
    tradeStore.getTradeById(tradeId)

  if (!trade) {
    return
  }

  if (trade.positionStatus === 'open') {
    notificationStore.addNotification({
      type: 'warning',
      title: '交易仍在持倉中',
      message: '先填寫實際離場價格完成平倉，再進行復盤。',
      route: '/trades',
    })
    openEditTrade(trade)
    return
  }

  selectedTrade.value = trade

  if (
    trade.status === 'waiting-review' &&
    !tradeReviewStore.hasReview(tradeId)
  ) {
    tradeStore.markReviewing(tradeId)
  }

  selectedTrade.value =
    tradeStore.getTradeById(tradeId)

  isDetailModalOpen.value = false
  isEditModalOpen.value = false
  isReviewModalOpen.value = true
}

watch(
  () => route.query.review,
  tradeId => {
    if (typeof tradeId !== 'string') return

    const trade = tradeStore.getTradeById(tradeId)
    if (!trade || trade.positionStatus !== 'closed') return

    openTradeReview(trade.id)
  },
  { immediate: true },
)

const closeTradeReview = (): void => {
  isReviewModalOpen.value = false
  selectedTrade.value = null
}

const addTrade = (
  newTrade: NewTradeInput,
): void => {
  const createdTrade = tradeStore.addTrade(newTrade)

  if (createdTrade.positionStatus === 'open') {
    notificationStore.addNotification({
      type: 'info',
      title: '持倉已建立',
      message: `${createdTrade.symbol} ${createdTrade.direction === 'buy' ? '多單' : '空單'} · ${createdTrade.lotSize.toFixed(2)} lot · 等待離場`,
      route: '/trades',
    })
    return
  }

  const resultLabel =
    newTrade.profitLoss === null ||
    newTrade.profitLoss === 0
      ? '平手'
      : newTrade.profitLoss > 0
        ? '獲利'
        : '虧損'

  notificationStore.addNotification({
    type:
      newTrade.profitLoss === null ||
      newTrade.profitLoss === 0
        ? 'info'
        : newTrade.profitLoss > 0
          ? 'success'
          : 'warning',
    title: '交易已建立',
    message: `${newTrade.symbol} ${
      newTrade.direction === 'buy'
        ? '多單'
        : '空單'
    } · ${resultLabel}`,
    route: '/trades',
  })
}

const importTradeData = (
  importedTrades: TradeRecord[],
): void => {
  const result = tradeStore.importTrades(
    importedTrades,
  )

  notificationStore.addNotification({
    type: 'success',
    title: '交易資料匯入完成',
    message: [
      `新增 ${result.added} 筆`,
      `更新 ${result.updated} 筆`,
      `目前共 ${result.total} 筆`,
    ].join(' · '),
    route: '/trades',
  })
}

const updateTrade = (
  tradeId: string,
  updates: Partial<TradeRecord>,
): void => {
  const before = tradeStore.getTradeById(tradeId)
  const updated = tradeStore.updateTrade(
    tradeId,
    updates,
  )

  if (
    before?.positionStatus === 'open' &&
    updated?.positionStatus === 'closed'
  ) {
    notificationStore.addNotification({
      type: updated.profitLoss >= 0 ? 'success' : 'warning',
      title: '交易已平倉',
      message: `${updated.symbol} · ${updated.profitLoss > 0 ? '+' : ''}${formatMoney(updated.profitLoss)} · ${updated.rMultiple > 0 ? '+' : ''}${updated.rMultiple.toFixed(2)}R`,
      route: '/trades',
    })
  }

  selectedTrade.value =
    tradeStore.getTradeById(tradeId)
}

const removeTrade = async (
  tradeId: string,
  symbol: string,
): Promise<void> => {
  const confirmed = await confirmDialog.ask({
    title: `刪除 ${symbol} 交易？`,
    message: '交易紀錄與其關聯資料將被移除，此操作無法復原。',
    confirmLabel: '確認刪除',
    tone: 'danger',
  })

  if (!confirmed) {
    return
  }

  tradeStore.removeTrade(tradeId)
  tradeReviewStore.removeReviewByTradeId(
    tradeId,
  )

  if (selectedTrade.value?.id === tradeId) {
    isDetailModalOpen.value = false
    isReviewModalOpen.value = false
    isEditModalOpen.value = false
    selectedTrade.value = null
  }
}

const submitTradeReview = (
  review: TradeReviewResult,
): void => {
  const trade =
    tradeStore.getTradeById(
      review.tradeId,
    )

  const savedReview =
    tradeReviewStore.saveReview(review)

  tradeStore.markReviewCompleted(
    review.tradeId,
  )

  notificationStore.addNotification({
    type:
      savedReview.totalScore >= 80
        ? 'success'
        : savedReview.totalScore >= 60
          ? 'warning'
          : 'danger',
    title: '交易復盤已完成',
    message: `${trade?.symbol ?? '交易'} · 評分 ${savedReview.totalScore} 分`,
    route: '/ai-coach',
  })

  isReviewModalOpen.value = false
  selectedTrade.value = null
}

const refreshSelectedTrade = (
  tradeId: string,
): void => {
  selectedTrade.value =
    tradeStore.getTradeById(tradeId)
}

const updateTradeScreenshot = (
  tradeId: string,
  type: ScreenshotType,
  screenshot: TradeScreenshot,
): void => {
  if (type === 'before') {
    tradeStore.updateBeforeScreenshot(
      tradeId,
      screenshot,
    )
  }
  else {
    tradeStore.updateAfterScreenshot(
      tradeId,
      screenshot,
    )
  }

  refreshSelectedTrade(tradeId)
}

const removeTradeScreenshot = (
  tradeId: string,
  type: ScreenshotType,
): void => {
  if (type === 'before') {
    tradeStore.removeBeforeScreenshot(
      tradeId,
    )
  }
  else {
    tradeStore.removeAfterScreenshot(
      tradeId,
    )
  }

  refreshSelectedTrade(tradeId)
}

const updateTradeMistakeTags = (
  tradeId: string,
  mistakeTags: TradeMistakeTag[],
): void => {
  tradeStore.updateMistakeTags(
    tradeId,
    mistakeTags,
  )

  refreshSelectedTrade(tradeId)
}

const updateTradeCustomMistakeTags = (
  tradeId: string,
  customMistakeTags: string[],
): void => {
  tradeStore.updateCustomMistakeTags(
    tradeId,
    customMistakeTags,
  )

  refreshSelectedTrade(tradeId)
}

const toggleTradeFavorite = (
  tradeId: string,
): void => {
  tradeStore.toggleFavorite(tradeId)
  refreshSelectedTrade(tradeId)
}
</script>

<template>
  <div class="space-y-6 pb-10">
    <section
      class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl shadow-black/10"
    >
      <div
        class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"
      >
        <div>
          <h1 class="text-3xl font-bold text-zinc-100">
            交易紀錄
          </h1>

          <p
            class="mt-2 text-sm leading-6 text-zinc-400"
          >
            從建立持倉、實際平倉到交易復盤，完整追蹤每一筆交易生命週期。
          </p>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row">
          <RouterLink
            to="/trade-analytics"
            class="flex items-center justify-center rounded-2xl border border-sky-500/25 bg-sky-500/10 px-5 py-3 text-sm font-medium text-sky-300 transition hover:border-sky-400/40 hover:bg-sky-500/15"
          >
            查看交易分析
          </RouterLink>

          <button
            type="button"
            class="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-3 text-sm font-medium text-amber-300 transition hover:border-amber-400/50 hover:bg-amber-500/15"
            @click="openNewTradeModal"
          >
            ＋ 新增交易
          </button>
        </div>
      </div>
    </section>

    <div
      class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
      >
        <p class="text-sm text-zinc-500">
          篩選交易筆數
        </p>

        <p
          class="mt-3 text-3xl font-semibold text-zinc-100"
        >
          {{ filteredStatistics.totalTrades }}
        </p>

        <p class="mt-2 text-xs text-zinc-600">
          持倉中 {{ filteredStatistics.openTrades }} · 已平倉 {{ filteredStatistics.closedTrades }}
        </p>
      </section>

      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
      >
        <p class="text-sm text-zinc-500">
          篩選勝率
        </p>

        <p
          class="mt-3 text-3xl font-semibold text-emerald-300"
        >
          {{ filteredStatistics.winRate }}%
        </p>

        <p class="mt-2 text-xs text-zinc-600">
          獲利
          {{ filteredStatistics.winningTrades }}
          筆
        </p>
      </section>

      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
      >
        <p class="text-sm text-zinc-500">
          篩選平均 R
        </p>

        <p
          class="mt-3 text-3xl font-semibold"
          :class="
            profitLossClasses(
              filteredStatistics.averageR,
            )
          "
        >
          {{
            filteredStatistics.averageR.toFixed(
              2,
            )
          }}R
        </p>
      </section>

      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
      >
        <p class="text-sm text-zinc-500">
          篩選總盈虧
        </p>

        <p
          class="mt-3 text-3xl font-semibold"
          :class="
            profitLossClasses(
              filteredStatistics.totalProfitLoss,
            )
          "
        >
          {{
            filteredStatistics.totalProfitLoss >
            0
              ? '+'
              : ''
          }}
          {{
            formatMoney(
              filteredStatistics.totalProfitLoss,
            )
          }}
        </p>
      </section>
    </div>

    <TradeDataTools
      :trades="sortedTrades"
      @import="importTradeData"
    />

    <TradeAdvancedFilters
      :trades="sortedTrades"
      @import="importTradeData"
      :model-value="filters"
      :accounts="accounts"
      :filtered-count="filteredTrades.length"
      :total-count="sortedTrades.length"
      @update:model-value="updateFilters"
      @reset="resetFilters"
    />

    <section
      class="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/70 shadow-xl shadow-black/10"
    >
      <header class="border-b border-zinc-800 p-6">
        <h2 class="text-xl font-semibold text-zinc-100">
          交易列表
        </h2>

        <p class="mt-1 text-sm text-zinc-500">
          目前顯示
          {{ filteredTrades.length }}
          筆交易
        </p>
      </header>

      <div
        v-if="filteredTrades.length"
        class="divide-y divide-zinc-800"
      >
        <article
          v-for="trade in filteredTrades"
          :key="trade.id"
          class="p-5 transition hover:bg-zinc-800/30"
        >
          <div
            class="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between"
          >
            <div class="min-w-0 flex-1">
              <div
                class="flex flex-wrap items-center gap-2"
              >
                <h3
                  class="text-xl font-semibold text-zinc-100"
                >
                  {{ trade.symbol }}
                </h3>

                <span
                  class="rounded-full border px-2.5 py-1 text-xs font-medium"
                  :class="positionStatusClasses(trade)"
                >
                  {{ positionStatusLabel(trade) }}
                </span>

                <span
                  class="rounded-full border px-2.5 py-1 text-xs font-medium"
                  :class="trade.dataSource === 'mt5' ? 'border-sky-500/20 bg-sky-500/5 text-sky-300' : 'border-zinc-700 text-zinc-500'"
                >
                  {{ trade.dataSource === 'mt5' ? 'MT5 Sync' : 'Manual' }}
                </span>

                <span
                  class="rounded-full border px-2.5 py-1 text-xs font-medium"
                  :class="
                    directionClasses(
                      trade.direction,
                    )
                  "
                >
                  {{
                    trade.direction === 'buy'
                      ? '多單'
                      : '空單'
                  }}
                </span>

                <span
                  v-if="trade.positionStatus === 'closed'"
                  class="rounded-full border px-2.5 py-1 text-xs font-medium"
                  :class="
                    resultClasses(
                      trade.result,
                    )
                  "
                >
                  {{ resultLabel(trade.result) }}
                </span>

                <span
                  v-if="trade.positionStatus === 'closed'"
                  class="rounded-full border px-2.5 py-1 text-xs font-medium"
                  :class="
                    reviewStatusClasses(
                      trade,
                    )
                  "
                >
                  {{ reviewStatusLabel(trade) }}
                </span>

                <span
                  v-if="trade.isFavorite"
                  class="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300"
                >
                  ★ 收藏
                </span>
              </div>

              <p
                v-if="trade.playbook"
                class="mt-3 font-medium text-zinc-300"
              >
                {{ trade.playbook }}
              </p>

              <p v-else-if="trade.dataSource === 'mt5' && trade.positionStatus === 'closed'" class="mt-3 text-sm font-medium text-amber-300/80">
                等待補充 Signal / Playbook / 復盤
              </p>

              <span
                v-if="trade.signal"
                class="mt-2 inline-flex rounded-lg border border-sky-500/15 bg-sky-500/5 px-2.5 py-1 text-xs font-medium text-sky-300"
              >
                訊號 · {{ trade.signal }}
              </span>

              <p
                class="mt-2 max-w-3xl text-sm leading-6 text-zinc-500"
              >
                {{ trade.reason }}
              </p>

              <div
                v-if="
                  trade.mistakeTags.length ||
                  trade.customMistakeTags.length
                "
                class="mt-4 flex flex-wrap gap-2"
              >
                <span
                  v-for="tag in trade.mistakeTags"
                  :key="tag"
                  class="rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-300"
                >
                  {{ mistakeTagLabel(tag) }}
                </span>

                <span
                  v-for="tag in trade.customMistakeTags"
                  :key="tag"
                  class="rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-xs text-violet-300"
                >
                  {{ tag }}
                </span>
              </div>

              <div
                class="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-600"
              >
                <span>
                  {{ trade.date }}
                  {{ trade.time }}
                </span>

                <span>
                  {{ trade.account }}
                </span>

                <span>
                  風險
                  {{
                    formatMoney(
                      trade.riskAmount,
                    )
                  }}
                </span>

                <span>
                  手數
                  {{ trade.lotSize ? `${trade.lotSize.toFixed(2)} lot` : '—' }}
                </span>

                <span>
                  交易前截圖：
                  {{
                    trade.beforeScreenshot
                      ? '有'
                      : '無'
                  }}
                </span>

                <span>
                  交易後截圖：
                  {{
                    trade.afterScreenshot
                      ? '有'
                      : '無'
                  }}
                </span>
              </div>
            </div>

            <div
              class="grid gap-3 sm:grid-cols-2 xl:w-[430px]"
            >
              <div
                class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
              >
                <p class="text-xs text-zinc-500">
                  進場／離場
                </p>

                <p
                  class="mt-2 text-sm font-medium text-zinc-200"
                >
                  {{ formatTradePrice(trade.entryPrice) }}
                  →
                  {{ formatTradePrice(trade.exitPrice) }}
                </p>
              </div>

              <div
                class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
              >
                <p class="text-xs text-zinc-500">
                  停損／停利
                </p>

                <p
                  class="mt-2 text-sm font-medium text-zinc-200"
                >
                  {{ formatTradePrice(trade.stopLoss) }}
                  ／
                  {{ formatTradePrice(trade.takeProfit) }}
                </p>
              </div>

              <div
                class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
              >
                <p class="text-xs text-zinc-500">
                  報酬倍數
                </p>

                <p
                  class="mt-2 text-lg font-semibold"
                  :class="
                    profitLossClasses(
                      trade.rMultiple,
                    )
                  "
                >
                  <template v-if="trade.positionStatus === 'open'">
                    <span class="text-zinc-500">未結算</span>
                  </template>
                  <template v-else>
                  {{
                    trade.rMultiple > 0
                      ? '+'
                      : ''
                  }}
                  {{
                    trade.rMultiple.toFixed(2)
                  }}R
                  </template>
                </p>
              </div>

              <div
                class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
              >
                <p class="text-xs text-zinc-500">
                  交易盈虧
                </p>

                <p
                  class="mt-2 text-lg font-semibold"
                  :class="
                    profitLossClasses(
                      trade.profitLoss,
                    )
                  "
                >
                  <template v-if="trade.positionStatus === 'open'">
                    <span class="text-zinc-500">未結算</span>
                  </template>
                  <template v-else>
                  {{
                    trade.profitLoss > 0
                      ? '+'
                      : ''
                  }}
                  {{
                    formatMoney(
                      trade.profitLoss,
                    )
                  }}
                  </template>
                </p>
              </div>
            </div>
          </div>

          <div
            class="mt-5 flex flex-wrap justify-end gap-3"
          >
            <button
              type="button"
              class="rounded-xl border px-4 py-2 text-sm font-medium transition"
              :class="
                trade.isFavorite
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                  : 'border-zinc-700 text-zinc-400 hover:border-amber-500/30 hover:text-amber-300'
              "
              @click="
                toggleTradeFavorite(
                  trade.id,
                )
              "
            >
              {{
                trade.isFavorite
                  ? '★ 已收藏'
                  : '☆ 收藏'
              }}
            </button>

            <button
              type="button"
              class="rounded-xl border border-rose-500/20 px-4 py-2 text-sm text-rose-300 transition hover:border-rose-500/40 hover:bg-rose-500/10"
              @click="
                removeTrade(
                  trade.id,
                  trade.symbol,
                )
              "
            >
              刪除
            </button>

            <button
              type="button"
              class="rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-300 transition hover:border-sky-400/40 hover:bg-sky-500/15"
              @click="openEditTrade(trade)"
            >
                {{ trade.positionStatus === 'open' ? '平倉 / 更新' : '編輯' }}
            </button>

            <button
                type="button"
              class="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
              @click="openTradeDetail(trade)"
            >
              查看詳情
            </button>

            <button
              v-if="trade.positionStatus === 'closed'"
              type="button"
              class="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-300 transition hover:border-amber-400/40 hover:bg-amber-500/15"
              @click="
                openTradeReview(
                  trade.id,
                )
              "
            >
              {{
                tradeReviewStore.hasReview(
                  trade.id,
                )
                  ? '查看復盤'
                  : trade.status ===
                      'reviewing'
                    ? '繼續復盤'
                    : '開始復盤'
              }}
            </button>
          </div>
        </article>
      </div>

      <div
        v-else
        class="p-12 text-center"
      >
        <p class="text-zinc-400">
          沒有符合目前篩選條件的交易。
        </p>

        <button
          type="button"
          class="mt-4 text-sm font-medium text-amber-300"
          @click="resetFilters"
        >
          清除篩選條件
        </button>
      </div>
    </section>

    <NewTradeModal
      :open="isNewTradeModalOpen"
      @close="closeNewTradeModal"
      @submit="addTrade"
    />

    <TradeDetailModal
      :open="isDetailModalOpen"
      :trade="selectedTrade"
      @close="closeTradeDetail"
      @edit="openEditTrade"
      @remove="removeTrade"
      @start-review="openTradeReview"
      @update-screenshot="
        updateTradeScreenshot
      "
      @remove-screenshot="
        removeTradeScreenshot
      "
      @update-mistake-tags="
        updateTradeMistakeTags
      "
      @update-custom-mistake-tags="
        updateTradeCustomMistakeTags
      "
      @toggle-favorite="
        toggleTradeFavorite
      "
    />

    <EditTradeModal
      :open="isEditModalOpen"
      :trade="selectedTrade"
      @close="closeEditTrade"
      @submit="updateTrade"
    />

    <TradeReviewModal
      :open="isReviewModalOpen"
      :trade="selectedTrade"
      :existing-review="selectedExistingReview"
      @close="closeTradeReview"
      @update-trade="updateTrade"
      @submit="submitTradeReview"
    />
  </div>
</template>
