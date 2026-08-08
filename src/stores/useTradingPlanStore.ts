import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

import type { MarketBias, TradingPlan } from '@/types/trading-plan'

const STORAGE_KEY = 'hy-freedom-os:trading-plan'

const getLocalDateKey = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const createDefaultPlan = (): TradingPlan => ({
  date: getLocalDateKey(),
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
})

const readStoredPlan = (): TradingPlan | null => {
  if (typeof window === 'undefined') return null

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as TradingPlan
    if (parsed.date !== getLocalDateKey()) return null

    return {
      ...createDefaultPlan(),
      ...parsed,
      focusRule:
        typeof parsed.focusRule === 'string'
          ? parsed.focusRule
          : '',
      waitingSignals: Array.isArray(parsed.waitingSignals)
        ? parsed.waitingSignals.filter(signal => typeof signal === 'string')
        : [],
    }
  } catch {
    return null
  }
}

export const useTradingPlanStore = defineStore('trading-plan', () => {
  const plan = ref<TradingPlan>(readStoredPlan() ?? createDefaultPlan())

  const completionFields = computed(() => [
    Boolean(plan.value.h4Trend.trim()),
    Boolean(plan.value.h1Trend.trim()),
    Boolean(plan.value.m15Structure.trim()),
    Boolean(plan.value.supportZones.trim()),
    Boolean(plan.value.resistanceZones.trim()),
    Boolean(plan.value.allowedConditions.trim()),
    Boolean(plan.value.prohibitedConditions.trim()),
    plan.value.waitingSignals.length > 0,
  ])

  const completionPercent = computed(() => {
    const completed = completionFields.value.filter(Boolean).length
    return Math.round((completed / completionFields.value.length) * 100)
  })

  const isReadyToComplete = computed(
    () => completionPercent.value === 100,
  )

  const save = (): void => {
    if (typeof window === 'undefined') return

    plan.value.updatedAt = new Date().toISOString()
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(plan.value),
    )
  }

  const setBias = (bias: MarketBias): void => {
    plan.value.marketBias = bias
  }

  const toggleSignal = (signal: string): void => {
    const index = plan.value.waitingSignals.indexOf(signal)

    if (index >= 0) {
      plan.value.waitingSignals.splice(index, 1)
    } else {
      plan.value.waitingSignals.push(signal)
    }
  }

  const markCompleted = (): void => {
    if (!isReadyToComplete.value) return
    plan.value.completed = true
  }

  const reopen = (): void => {
    plan.value.completed = false
  }

  const resetToday = (): void => {
    plan.value = createDefaultPlan()
  }

  const ensureCurrentDay = (): void => {
    if (plan.value.date !== getLocalDateKey()) {
      plan.value = createDefaultPlan()
    }
  }

  watch(plan, save, { deep: true })

  return {
    plan,
    completionPercent,
    isReadyToComplete,
    setBias,
    toggleSignal,
    markCompleted,
    reopen,
    resetToday,
    ensureCurrentDay,
  }
})
