import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

import type {
  LegendDirection,
  LegendPhase,
  LegendSessionKey,
  LegendSessionPlan,
  LegendTimeframeKey,
  MarketBias,
  TradingPlan,
  TradingPlanHistoryState,
} from '@/types/trading-plan'

const STORAGE_KEY = 'hy-freedom-os:trading-plan'
const HISTORY_STORAGE_KEY = 'hy-freedom-os:trading-plan-history'
const TIMEFRAMES: LegendTimeframeKey[] = ['m5', 'm15m30', 'h1', 'h4', 'd1']

export const getLocalDateKey = (): string => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const createSession = (key: LegendSessionKey, label: string, hours: string): LegendSessionPlan => ({
  key,
  label,
  hours,
  timeframes: Object.fromEntries(TIMEFRAMES.map(timeframe => [timeframe, {
    direction: 'wait' as LegendDirection,
    phase: 'wait' as LegendPhase,
    patternWave: '',
  }])) as Record<LegendTimeframeKey, LegendSessionPlan['timeframes'][LegendTimeframeKey]>,
  preSessionAssessment: '',
  asiaDevelopment: '',
  europeDevelopment: '',
})

export const createDefaultPlan = (date = getLocalDateKey()): TradingPlan => ({
  date,
  symbol: 'XAUUSD',
  marketBias: 'wait',
  h4Trend: '',
  h1Trend: '',
  m15Structure: '',
  supportZones: '',
  resistanceZones: '',
  allowedConditions: '',
  prohibitedConditions: '',
  waitingSignals: [],
  focusRule: '',
  maxTrades: 2,
  maxRiskPercent: 1,
  notes: '',
  completed: false,
  updatedAt: new Date().toISOString(),
  news: '',
  sessions: {
    asia: createSession('asia', '亞洲盤', '09:00-14:00'),
    europe: createSession('europe', '歐洲盤', '15:00-19:00'),
    us: createSession('us', '美國盤', '20:00-02:00'),
  },
  mindsetReminder: '觀自在菩薩：看見市場，也看見自己的念頭；只執行計畫，不預測結果。',
  version: 3,
})

export const normalizeTradingPlan = (value: Partial<TradingPlan>, fallbackDate = getLocalDateKey()): TradingPlan => {
  const base = createDefaultPlan(typeof value.date === 'string' ? value.date : fallbackDate)
  const sessions = { ...base.sessions }

  ;(['asia', 'europe', 'us'] as LegendSessionKey[]).forEach(key => {
    const source = value.sessions?.[key]
    if (!source) return
    sessions[key] = {
      ...sessions[key],
      ...source,
      timeframes: { ...sessions[key].timeframes },
    }
    TIMEFRAMES.forEach(timeframe => {
      sessions[key].timeframes[timeframe] = {
        ...sessions[key].timeframes[timeframe],
        ...source.timeframes?.[timeframe],
      }
    })
  })

  return {
    ...base,
    ...value,
    sessions,
    waitingSignals: Array.isArray(value.waitingSignals)
      ? value.waitingSignals.filter((item): item is string => typeof item === 'string')
      : [],
    version: 3,
  }
}

const readJson = <T>(key: string): T | null => {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(key)
  if (!raw) return null
  try { return JSON.parse(raw) as T }
  catch { return null }
}

const readHistory = (): TradingPlan[] => {
  const state = readJson<TradingPlanHistoryState>(HISTORY_STORAGE_KEY)
  const plans = Array.isArray(state?.plans) ? state.plans.map(item => normalizeTradingPlan(item)) : []
  const legacy = readJson<Partial<TradingPlan>>(STORAGE_KEY)
  if (legacy?.date && !plans.some(item => item.date === legacy.date && item.symbol === (legacy.symbol || 'XAUUSD'))) {
    plans.push(normalizeTradingPlan(legacy))
  }
  return plans
}

export const useTradingPlanStore = defineStore('trading-plan', () => {
  const initialHistory = readHistory()
  const today = getLocalDateKey()
  const initialPlan = initialHistory.find(item => item.date === today) ?? createDefaultPlan(today)
  const plan = ref<TradingPlan>(normalizeTradingPlan(initialPlan))
  const plans = ref<TradingPlan[]>(initialHistory)

  const completionFields = computed(() => {
    const sessionFields = Object.values(plan.value.sessions).flatMap(session => [
      Boolean(session.preSessionAssessment.trim()),
      ...Object.values(session.timeframes).map(timeframe =>
        timeframe.direction !== 'wait' || timeframe.phase !== 'wait' || Boolean(timeframe.patternWave.trim()),
      ),
    ])
    return [Boolean(plan.value.news.trim()), ...sessionFields, Boolean(plan.value.focusRule.trim())]
  })

  const completionPercent = computed(() => {
    const completed = completionFields.value.filter(Boolean).length
    return Math.round((completed / completionFields.value.length) * 100)
  })

  const isReadyToComplete = computed(() =>
    Object.values(plan.value.sessions).every(session =>
      session.preSessionAssessment.trim() &&
      Object.values(session.timeframes).some(timeframe => timeframe.direction !== 'wait'),
    ),
  )

  const sortedPlans = computed(() => [...plans.value].sort((a, b) =>
    b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt),
  ))

  const persist = (): void => {
    if (typeof window === 'undefined') return
    plan.value.updatedAt = new Date().toISOString()
    const index = plans.value.findIndex(item => item.date === plan.value.date && item.symbol === plan.value.symbol)
    const snapshot = JSON.parse(JSON.stringify(plan.value)) as TradingPlan
    if (index >= 0) plans.value[index] = snapshot
    else plans.value.push(snapshot)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan.value))
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify({
      plans: plans.value,
      updatedAt: plan.value.updatedAt,
    } satisfies TradingPlanHistoryState))
  }

  const selectDate = (date: string): void => {
    const existing = plans.value.find(item => item.date === date && item.symbol === plan.value.symbol)
    plan.value = normalizeTradingPlan(existing ?? createDefaultPlan(date), date)
  }

  const createToday = (): void => selectDate(getLocalDateKey())
  const setBias = (bias: MarketBias): void => { plan.value.marketBias = bias }
  const toggleSignal = (signal: string): void => {
    const index = plan.value.waitingSignals.indexOf(signal)
    if (index >= 0) plan.value.waitingSignals.splice(index, 1)
    else plan.value.waitingSignals.push(signal)
  }
  const markCompleted = (): void => { if (isReadyToComplete.value) plan.value.completed = true }
  const reopen = (): void => { plan.value.completed = false }
  const resetToday = (): void => { plan.value = createDefaultPlan(plan.value.date) }
  const ensureCurrentDay = (): void => { if (!plan.value.date) createToday() }

  watch(plan, persist, { deep: true })

  return {
    plan,
    plans,
    sortedPlans,
    completionPercent,
    isReadyToComplete,
    setBias,
    toggleSignal,
    markCompleted,
    reopen,
    resetToday,
    ensureCurrentDay,
    selectDate,
    createToday,
  }
})
