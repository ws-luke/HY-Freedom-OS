import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import economicCalendarService from '@/services/economicCalendar.service'

import type {
  EconomicCalendarData,
  EconomicDataStatus,
  EconomicEvent,
  StoredEconomicCalendarState,
  TradingRestriction,
} from '@/types/economic-calendar'

const CACHE_KEY = 'hy-freedom-os:economic-calendar'
const CACHE_VERSION = 1 as const
const CACHE_MAX_AGE_MS = 72 * 60 * 60 * 1000
const LIVE_REFRESH_INTERVAL_MS = 5 * 60 * 1000

const majorEventPattern =
  /fomc|interest rate|powell|non.?farm|consumer price|\bcpi\b|core pce|pce price|gdp|unemployment rate/i

const getTaipeiDateKey = (date: Date): string => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(date)
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value]),
  )

  return `${parts.year}-${parts.month}-${parts.day}`
}

const getRestrictionWindow = (
  event: EconomicEvent,
): {
  startAt: Date
  endAt: Date
} => {
  const eventTime = new Date(event.scheduledAt)
  const isMajor = majorEventPattern.test(
    `${event.title} ${event.originalTitle}`,
  )
  const minutesBefore =
    event.impact >= 5
      ? isMajor ? 45 : 30
      : 15
  const minutesAfter =
    event.impact >= 5 ? 30 : 15

  return {
    startAt: new Date(
      eventTime.getTime() - minutesBefore * 60_000,
    ),
    endAt: new Date(
      eventTime.getTime() + minutesAfter * 60_000,
    ),
  }
}

const formatTaipeiTime = (date: Date): string =>
  new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date)

const readCache = (): EconomicCalendarData | null => {
  if (typeof window === 'undefined') return null

  const rawValue = window.localStorage.getItem(CACHE_KEY)
  if (!rawValue) return null

  try {
    const state = JSON.parse(rawValue) as Partial<
      StoredEconomicCalendarState
    >
    const data = state.data

    if (
      state.version !== CACHE_VERSION ||
      data?.provider !== 'TradingView' ||
      data.timezone !== 'Asia/Taipei' ||
      !Array.isArray(data.events) ||
      !data.fetchedAt
    ) {
      return null
    }

    const age = Date.now() - new Date(data.fetchedAt).getTime()

    if (!Number.isFinite(age) || age > CACHE_MAX_AGE_MS) {
      return null
    }

    return data
  }
  catch {
    return null
  }
}

const saveCache = (data: EconomicCalendarData): void => {
  if (typeof window === 'undefined') return

  const state: StoredEconomicCalendarState = {
    version: CACHE_VERSION,
    data,
  }

  window.localStorage.setItem(
    CACHE_KEY,
    JSON.stringify(state),
  )
}

export const useEconomicCalendarStore = defineStore(
  'economicCalendar',
  () => {
    const cachedData = readCache()
    const allEvents = ref<EconomicEvent[]>(
      cachedData?.events ?? [],
    )
    const fetchedAt = ref(cachedData?.fetchedAt ?? '')
    const loading = ref(false)
    const error = ref('')
    const dataStatus = ref<EconomicDataStatus>(
      cachedData ? 'cached' : 'unavailable',
    )
    const now = ref(new Date())

    const todayKey = computed(() =>
      getTaipeiDateKey(now.value),
    )

    const tomorrowKey = computed(() => {
      const tomorrow = new Date(now.value)
      tomorrow.setDate(tomorrow.getDate() + 1)
      return getTaipeiDateKey(tomorrow)
    })

    const todayEvents = computed(() =>
      allEvents.value.filter(
        event => event.localDate === todayKey.value,
      ),
    )

    const tomorrowEvents = computed(() =>
      allEvents.value.filter(
        event => event.localDate === tomorrowKey.value,
      ),
    )

    const events = computed(() =>
      todayEvents.value.filter(event => event.isGoldRelevant),
    )

    const highImpactEvents = computed(() =>
      events.value.filter(event => event.impact >= 5),
    )

    const upcomingRelevantEvents = computed(() =>
      allEvents.value.filter(
        event =>
          event.isGoldRelevant &&
          event.impact >= 3 &&
          new Date(event.scheduledAt).getTime() > now.value.getTime(),
      ),
    )

    const nextEvent = computed(() =>
      upcomingRelevantEvents.value[0] ?? null,
    )

    const activeRestrictionEvent = computed(() =>
      allEvents.value.find(event => {
        if (!event.isGoldRelevant || event.impact < 3) return false

        const window = getRestrictionWindow(event)
        const timestamp = now.value.getTime()

        return (
          timestamp >= window.startAt.getTime() &&
          timestamp <= window.endAt.getTime()
        )
      }) ?? null,
    )

    const restriction = computed<TradingRestriction>(() => {
      const event = activeRestrictionEvent.value ?? nextEvent.value

      if (!event) {
        return {
          eventId: null,
          eventTitle: '目前沒有待執行的新聞禁區',
          startAt: null,
          endAt: null,
          start: '—',
          end: '—',
          isActive: false,
          impact: null,
        }
      }

      const window = getRestrictionWindow(event)

      return {
        eventId: event.id,
        eventTitle: event.title,
        startAt: window.startAt.toISOString(),
        endAt: window.endAt.toISOString(),
        start: formatTaipeiTime(window.startAt),
        end: formatTaipeiTime(window.endAt),
        isActive: activeRestrictionEvent.value?.id === event.id,
        impact: event.impact,
      }
    })

    const riskLevel = computed(() => {
      if (activeRestrictionEvent.value?.impact === 5) return 5
      if (activeRestrictionEvent.value) return 4
      if (highImpactEvents.value.length > 0) return 4
      if (events.value.some(event => event.impact >= 3)) return 3
      return 1
    })

    const isHighRisk = computed(() => riskLevel.value >= 4)

    const guidance = computed(() => {
      if (dataStatus.value === 'unavailable') {
        return [
          '目前無法取得即時事件，請先不要把經濟日曆視為交易依據。',
        ]
      }

      if (restriction.value.isActive) {
        return [
          `目前位於「${restriction.value.eventTitle}」新聞禁區。`,
          `禁止新倉至台灣時間 ${restriction.value.end}，之後仍需等待點差與結構恢復。`,
          '低週期訊號在數據瞬間容易失真，不追第一段波動。',
        ]
      }

      if (nextEvent.value) {
        return [
          `下一個黃金相關事件：${nextEvent.value.title}，台灣時間 ${nextEvent.value.localDate} ${nextEvent.value.time}。`,
          `預計禁新倉區間為 ${restriction.value.start}－${restriction.value.end}。`,
          nextEvent.value.impact >= 5
            ? '高影響事件前先處理持倉風險，公布後等待市場重新形成結構。'
            : '中等影響事件仍可能擴大點差，進場前確認波動已正常。',
        ]
      }

      return [
        '目前資料範圍內沒有待公布的 USD 中高影響事件。',
        '仍需遵守固定風險與盤前規劃，不因新聞清淡而降低進場標準。',
      ]
    })

    const lastUpdatedLabel = computed(() => {
      if (!fetchedAt.value) return '尚未成功更新'

      return new Intl.DateTimeFormat('zh-TW', {
        timeZone: 'Asia/Taipei',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(new Date(fetchedAt.value))
    })

    const refreshClock = (): void => {
      now.value = new Date()
    }

    const load = async (
      force = false,
    ): Promise<void> => {
      if (loading.value) return

      const lastFetchTime = new Date(
        fetchedAt.value,
      ).getTime()
      const hasFreshLiveData =
        dataStatus.value === 'live' &&
        Number.isFinite(lastFetchTime) &&
        Date.now() - lastFetchTime < LIVE_REFRESH_INTERVAL_MS

      if (!force && hasFreshLiveData) {
        refreshClock()
        return
      }

      loading.value = true
      error.value = ''

      try {
        const data = await economicCalendarService.getCalendar()
        allEvents.value = data.events
        fetchedAt.value = data.fetchedAt
        dataStatus.value = 'live'
        saveCache(data)
      }
      catch (caughtError) {
        error.value =
          caughtError instanceof Error
            ? caughtError.message
            : '無法取得即時經濟日曆'

        if (allEvents.value.length > 0) {
          dataStatus.value = 'cached'
        }
        else {
          dataStatus.value = 'unavailable'
        }
      }
      finally {
        refreshClock()
        loading.value = false
      }
    }

    return {
      allEvents,
      dataStatus,
      error,
      events,
      fetchedAt,
      guidance,
      highImpactEvents,
      isHighRisk,
      lastUpdatedLabel,
      loading,
      nextEvent,
      now,
      restriction,
      riskLevel,
      todayEvents,
      todayKey,
      tomorrowEvents,
      tomorrowKey,
      load,
      refreshClock,
    }
  },
)
