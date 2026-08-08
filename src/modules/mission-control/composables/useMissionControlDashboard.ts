import {
  computed,
  onMounted,
  onUnmounted,
  ref,
} from 'vue'
import { storeToRefs } from 'pinia'

import { watchlistService } from '@/services'
import { useAccountStore } from '@/stores/useAccountStore'
import { useDailyMissionStore } from '@/stores/useDailyMissionStore'
import { useEconomicCalendarStore } from '@/stores/useEconomicCalendarStore'
import { useTradeReviewStore } from '@/stores/useTradeReviewStore'
import { useTradeStore } from '@/stores/useTradeStore'
import { useTradingPlanStore } from '@/stores/useTradingPlanStore'
import { useTradingRiskStore } from '@/stores/useTradingRiskStore'

import type { TradeMistakeTag, TradeRecord } from '@/types/trade'

export type DashboardTone =
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'sky'
  | 'violet'
  | 'zinc'

export interface DashboardAction {
  label: string
  description: string
  route: string
  tone: DashboardTone
}

export interface CommandState {
  label: string
  title: string
  description: string
  tone: DashboardTone
  canObserve: boolean
}

const mistakeLabels: Record<TradeMistakeTag, string> = {
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

const getTradeTimestamp = (
  trade: TradeRecord,
): number => {
  const date = trade.date.replaceAll('/', '-')
  const timestamp = new Date(
    `${date}T${trade.time || '00:00'}:00`,
  ).getTime()

  return Number.isNaN(timestamp) ? 0 : timestamp
}

export const useMissionControlDashboard = () => {
  const accountStore = useAccountStore()
  const dailyMissionStore = useDailyMissionStore()
  const economicCalendarStore = useEconomicCalendarStore()
  const tradeReviewStore = useTradeReviewStore()
  const tradeStore = useTradeStore()
  const tradingPlanStore = useTradingPlanStore()
  const tradingRiskStore = useTradingRiskStore()

  const {
    allCompleted,
    completedCount,
    progressPercent: missionProgress,
    sortedMissions,
    totalCount,
  } = storeToRefs(dailyMissionStore)

  const {
    highImpactEvents,
    loading: economicLoading,
    nextEvent: economicNextEvent,
    restriction,
    riskLevel: economicRiskLevel,
  } = storeToRefs(economicCalendarStore)

  const {
    averageScore: reviewScore,
  } = storeToRefs(tradeReviewStore)

  const {
    openTrades,
    pendingReviewTrades,
    sortedClosedTrades: sortedTrades,
    statistics,
  } = storeToRefs(tradeStore)

  const {
    activeAccounts,
    sortedAccounts: accounts,
  } = storeToRefs(accountStore)

  const {
    completionPercent: planProgress,
    plan,
  } = storeToRefs(tradingPlanStore)

  const {
    risk,
    settings: riskSettings,
    todaySummary,
  } = storeToRefs(tradingRiskStore)

  const currentTime = ref(new Date())
  const watchlist = watchlistService.getAll()

  let clockTimer: number | undefined

  const formattedDate = computed(() =>
    new Intl.DateTimeFormat('zh-TW', {
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    }).format(currentTime.value),
  )

  const formattedTime = computed(() =>
    new Intl.DateTimeFormat('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(currentTime.value),
  )

  const greeting = computed(() => {
    const hour = currentTime.value.getHours()

    if (hour < 5) return '夜深了'
    if (hour < 12) return '早安'
    if (hour < 18) return '午安'
    return '晚安'
  })

  const restrictionActive = computed(() => {
    if (
      !restriction.value.startAt ||
      !restriction.value.endAt
    ) {
      return false
    }

    const start = new Date(
      restriction.value.startAt,
    ).getTime()
    const end = new Date(
      restriction.value.endAt,
    ).getTime()
    const now = currentTime.value.getTime()

    return (
      now >= start &&
      now <= end
    )
  })

  const nextEvent = computed(() => economicNextEvent.value)

  const minutesToNextEvent = computed(() => {
    if (!nextEvent.value) return null

    return Math.max(
      0,
      Math.ceil(
        (
          new Date(nextEvent.value.scheduledAt).getTime() -
          currentTime.value.getTime()
        ) /
          60_000,
      ),
    )
  })

  const eventCountdown = computed(() => {
    const minutes = minutesToNextEvent.value

    if (minutes === null) return '今日事件已結束'
    if (minutes === 0) return '事件即將公布'
    if (minutes < 60) return `${minutes} 分鐘後`

    const hours = Math.floor(minutes / 60)
    const remainder = minutes % 60

    return remainder > 0
      ? `${hours} 小時 ${remainder} 分後`
      : `${hours} 小時後`
  })

  const readinessScore = computed(() => {
    const missionScore = missionProgress.value * 0.35
    const planScore = planProgress.value * 0.35
    const riskScore = risk.value.canTrade ? 20 : 0
    const eventScore = restrictionActive.value ? 0 : 10

    return Math.round(
      missionScore + planScore + riskScore + eventScore,
    )
  })

  const commandState = computed<CommandState>(() => {
    if (!risk.value.canTrade) {
      return {
        label: 'STOP · 風控鎖定',
        title: risk.value.stopReason || '今天停止交易',
        description:
          '風控限制已觸發。停止建立新倉，把注意力轉回紀錄與復盤。',
        tone: 'rose',
        canObserve: false,
      }
    }

    if (restrictionActive.value) {
      return {
        label: 'PAUSE · 新聞禁區',
        title: '目前禁止建立新倉',
        description: `等待 ${restriction.value.end} 後波動穩定，再重新確認結構與訊號。`,
        tone: 'rose',
        canObserve: false,
      }
    }

    if (!allCompleted.value || planProgress.value < 100) {
      return {
        label: 'PREP · 準備中',
        title: '先完成計畫，再打開交易視角',
        description:
          '高週期方向、關鍵區域與允許條件尚未全部確認，現在的任務不是找進場。',
        tone: 'amber',
        canObserve: false,
      }
    }

    if (economicRiskLevel.value >= 4) {
      return {
        label: 'SELECTIVE · 高標準',
        title: '允許觀察，只做完整機會',
        description:
          '今天有高影響事件。降低頻率，等價格到位、結構完成、訊號確認才執行。',
        tone: 'amber',
        canObserve: true,
      }
    }

    return {
      label: 'READY · 允許觀察',
      title: '準備完成，耐心等待 A 級機會',
      description:
        '保持固定風險。沒有符合計畫就不進場，錯過也比做錯更好。',
      tone: 'emerald',
      canObserve: true,
    }
  })

  const nextAction = computed<DashboardAction>(() => {
    if (!risk.value.canTrade) {
      return {
        label: '查看停止原因',
        description: '確認今日風控限制',
        route: '/trading-risk',
        tone: 'rose',
      }
    }

    if (restrictionActive.value) {
      return {
        label: '查看新聞時段',
        description: '目前位於禁止交易區間',
        route: '/economic-calendar',
        tone: 'rose',
      }
    }

    if (planProgress.value < 100) {
      return {
        label: '完成盤前規劃',
        description: `規劃完成度 ${planProgress.value}%`,
        route: '/planning',
        tone: 'amber',
      }
    }

    if (!allCompleted.value) {
      return {
        label: '完成今日任務',
        description: `尚有 ${totalCount.value - completedCount.value} 項`,
        route: '/#daily-execution',
        tone: 'amber',
      }
    }

    if (openTrades.value.length > 0) {
      const totalRisk = openTrades.value.reduce(
        (sum, trade) => sum + trade.riskAmount,
        0,
      )

      return {
        label: '管理目前持倉',
        description: `${openTrades.value.length} 筆持倉 · 初始風險 ${formatMoney(totalRisk)}`,
        route: '/trades',
        tone: 'sky',
      }
    }

    if (pendingReviewTrades.value.length > 0) {
      return {
        label: '先完成待復盤',
        description: `${pendingReviewTrades.value.length} 筆尚未完成`,
        route: '/review',
        tone: 'sky',
      }
    }

    return {
      label: '記錄新的交易',
      description: '進場後立即留下完整資料',
      route: '/trades',
      tone: 'emerald',
    }
  })

  const planBiasLabel = computed(() => ({
    bullish: '偏多',
    bearish: '偏空',
    range: '區間',
    wait: '等待',
  }[plan.value.marketBias]))

  const planBiasTone = computed<DashboardTone>(() => ({
    bullish: 'emerald',
    bearish: 'rose',
    range: 'sky',
    wait: 'zinc',
  }[plan.value.marketBias] as DashboardTone))

  const recentTrades = computed(() =>
    sortedTrades.value.slice(0, 4),
  )

  const recentTenTrades = computed(() =>
    sortedTrades.value.slice(0, 10),
  )

  const recentPerformance = computed(() => {
    const trades = recentTenTrades.value
    const wins = trades.filter(
      trade => trade.result === 'win',
    ).length
    const totalR = trades.reduce(
      (sum, trade) => sum + trade.rMultiple,
      0,
    )
    const profitLoss = trades.reduce(
      (sum, trade) => sum + trade.profitLoss,
      0,
    )

    return {
      trades: trades.length,
      winRate:
        trades.length > 0
          ? Math.round((wins / trades.length) * 100)
          : 0,
      averageR:
        trades.length > 0
          ? Number((totalR / trades.length).toFixed(2))
          : 0,
      profitLoss: Number(profitLoss.toFixed(2)),
    }
  })

  const bestPlaybook = computed(() => {
    const results = new Map<
      string,
      { count: number; totalR: number }
    >()

    sortedTrades.value.forEach(trade => {
      const name = trade.playbook.trim() || '未分類策略'
      const current = results.get(name) ?? {
        count: 0,
        totalR: 0,
      }

      current.count += 1
      current.totalR += trade.rMultiple
      results.set(name, current)
    })

    return [...results.entries()]
      .map(([name, value]) => ({
        name,
        count: value.count,
        averageR: Number(
          (value.totalR / value.count).toFixed(2),
        ),
      }))
      .sort((a, b) =>
        b.averageR !== a.averageR
          ? b.averageR - a.averageR
          : b.count - a.count,
      )[0] ?? null
  })

  const topMistake = computed(() => {
    const counts = new Map<string, number>()

    sortedTrades.value.forEach(trade => {
      trade.mistakeTags.forEach(tag => {
        const label = mistakeLabels[tag]
        counts.set(label, (counts.get(label) ?? 0) + 1)
      })

      trade.customMistakeTags.forEach(tag => {
        const label = tag.trim()
        if (!label) return
        counts.set(label, (counts.get(label) ?? 0) + 1)
      })
    })

    const [result] = [...counts.entries()].sort(
      (a, b) => b[1] - a[1],
    )

    return result
      ? { label: result[0], count: result[1] }
      : null
  })

  const coachInsight = computed(() => {
    if (!risk.value.canTrade) {
      return '今天的目標已從「找交易」切換成「保護資金」。停止下單就是正確執行。'
    }

    if (planProgress.value < 100) {
      return '先把允許進場與禁止進場條件寫清楚。模糊的計畫，會在低週期變成衝動。'
    }

    if (openTrades.value.length > 0) {
      return `目前有 ${openTrades.value.length} 筆持倉。現在最重要的不是找新機會，而是照原定 SL / TP 管理，不臨時放大風險。`
    }

    if (topMistake.value && topMistake.value.count >= 2) {
      return `目前最常出現的是「${topMistake.value.label}」。下一筆交易只專注避免這一個錯誤。`
    }

    if (pendingReviewTrades.value.length > 0) {
      return `還有 ${pendingReviewTrades.value.length} 筆待復盤。先把舊交易轉成規則，再尋找新機會。`
    }

    return '系統目前沒有明顯警訊。維持固定風險，等待價格進入計畫區域。'
  })

  const accountSummary = computed(() => {
    const primaryCurrency =
      activeAccounts.value.find(
        account => account.currency === 'USD',
      )?.currency ??
      activeAccounts.value[0]?.currency ??
      'USD'
    const representedAccounts = activeAccounts.value.filter(
      account => account.currency === primaryCurrency,
    )
    const representedIds = new Set(
      representedAccounts.map(account => account.id),
    )
    const representedNames = new Set(
      representedAccounts.map(account =>
        account.name.trim().toLowerCase(),
      ),
    )
    const date = currentTime.value
    const currentDate = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-')
    const dailyProfitLoss = sortedTrades.value
      .filter(trade => {
        const tradeDate = trade.date.replaceAll('/', '-')
        const belongsToAccount =
          (trade.accountId && representedIds.has(trade.accountId)) ||
          (!trade.accountId && representedNames.has(
            trade.account.trim().toLowerCase(),
          ))

        return tradeDate === currentDate && belongsToAccount
      })
      .reduce(
        (total, trade) => total + trade.profitLoss,
        0,
      )
    const healthy =
      activeAccounts.value.length > 0 &&
      activeAccounts.value.every(account => {
        const drawdownLimit = account.maxDrawdownPercent

        if (
          drawdownLimit === null ||
          account.startingBalance <= 0
        ) {
          return account.equity >= 0
        }

        const minimumEquity =
          account.startingBalance *
          (1 - drawdownLimit / 100)

        return account.equity >= minimumEquity
      })

    return {
      active: activeAccounts.value.length,
      currency: primaryCurrency,
      representedAccounts: representedAccounts.length,
      mixedCurrencies:
        representedAccounts.length !== activeAccounts.value.length,
      equity: representedAccounts.reduce(
        (sum, account) => sum + account.equity,
        0,
      ),
      dailyProfitLoss,
      healthy,
    }
  })

  const formatMoney = (value: number): string =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value)

  onMounted(() => {
    dailyMissionStore.ensureCurrentDay()
    tradingPlanStore.ensureCurrentDay()

    economicCalendarStore.refreshClock()
    void economicCalendarStore.load()

    clockTimer = window.setInterval(() => {
      currentTime.value = new Date()
      economicCalendarStore.refreshClock()
      dailyMissionStore.ensureCurrentDay()
      tradingPlanStore.ensureCurrentDay()
    }, 30_000)
  })

  onUnmounted(() => {
    if (clockTimer !== undefined) {
      window.clearInterval(clockTimer)
    }
  })

  return {
    accountSummary,
    accounts,
    allCompleted,
    bestPlaybook,
    coachInsight,
    commandState,
    completedCount,
    dailyMissionStore,
    economicLoading,
    economicRiskLevel,
    eventCountdown,
    formattedDate,
    formattedTime,
    formatMoney,
    greeting,
    highImpactEvents,
    minutesToNextEvent,
    missionProgress,
    nextAction,
    nextEvent,
    openTrades,
    pendingReviewTrades,
    plan,
    planBiasLabel,
    planBiasTone,
    planProgress,
    readinessScore,
    recentPerformance,
    recentTrades,
    restriction,
    restrictionActive,
    reviewScore,
    risk,
    riskSettings,
    sortedMissions,
    statistics,
    todaySummary,
    topMistake,
    totalCount,
    watchlist,
  }
}
