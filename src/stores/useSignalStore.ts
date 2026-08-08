import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { queueCloudDeletion } from '@/services/cloud/cloud-deletion.service'

import type { SignalInput, SignalRecord } from '@/types/signal'

const STORAGE_KEY = 'hy-freedom-os:signals'

const now = '2026-08-01T00:00:00.000Z'

const createDefaultSignals = (): SignalRecord[] => [
  {
    id: 'signal-w',
    name: 'W 型',
    description: '支撐區出現雙底／W 結構，等待頸線突破或回踩確認。',
    direction: 'buy',
    status: 'active',
    timeframe: '1M / 5M',
    confirmationRules: ['低點不再延伸', 'W 結構完成', '突破頸線或回踩確認'],
    screenshot: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'signal-m',
    name: 'M 型',
    description: '壓力區出現雙頂／M 結構，等待頸線跌破或回踩確認。',
    direction: 'sell',
    status: 'active',
    timeframe: '1M / 5M',
    confirmationRules: ['高點不再延伸', 'M 結構完成', '跌破頸線或回踩確認'],
    screenshot: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'signal-gap',
    name: '夾縫',
    description: '短線位移後留下的結構空間，回測後出現拒絕再順勢執行。',
    direction: 'both',
    status: 'active',
    timeframe: '1M / 5M',
    confirmationRules: ['高週期方向明確', '夾縫尚未失效', '回測出現拒絕'],
    screenshot: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'signal-sumei',
    name: '蘇美',
    description: '自訂蘇美進場訊號；可依你的實際判讀補上確認規則與圖例。',
    direction: 'both',
    status: 'testing',
    timeframe: '1M / 5M',
    confirmationRules: ['等待完整訊號', '確認位置符合盤前關鍵區'],
    screenshot: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'signal-break-retest',
    name: '突破回踩',
    description: '關鍵結構有效突破後，等待原結構位置回踩確認。',
    direction: 'both',
    status: 'active',
    timeframe: '1M / 5M / 15M',
    confirmationRules: ['實體突破關鍵結構', '沒有立即收回', '回踩後重新順勢'],
    screenshot: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'signal-liquidity-sweep',
    name: '流動性掃蕩',
    description: '價格掃過前高／前低或關鍵流動性後快速收回，等待低週期結構確認再執行。',
    direction: 'both',
    status: 'testing',
    timeframe: '1M / 5M',
    confirmationRules: ['掃過明確流動性位置', '價格快速收回', '低週期結構出現反向確認'],
    screenshot: null,
    createdAt: now,
    updatedAt: now,
  },
]

const normalizeSignal = (signal: SignalRecord): SignalRecord => ({
  ...signal,
  name: typeof signal.name === 'string' ? signal.name.trim() : '',
  description: typeof signal.description === 'string' ? signal.description.trim() : '',
  direction:
    signal.direction === 'buy' || signal.direction === 'sell' || signal.direction === 'both'
      ? signal.direction
      : 'both',
  status:
    signal.status === 'active' || signal.status === 'testing' || signal.status === 'paused'
      ? signal.status
      : 'testing',
  timeframe: typeof signal.timeframe === 'string' ? signal.timeframe.trim() : '',
  confirmationRules: Array.isArray(signal.confirmationRules)
    ? signal.confirmationRules.filter(rule => typeof rule === 'string').map(rule => rule.trim()).filter(Boolean)
    : [],
  screenshot:
    signal.screenshot &&
    typeof signal.screenshot.name === 'string' &&
    typeof signal.screenshot.dataUrl === 'string'
      ? signal.screenshot
      : null,
})

const readStoredSignals = (): SignalRecord[] | null => {
  if (typeof window === 'undefined') return null

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as SignalRecord[]
    return Array.isArray(parsed) ? parsed.map(normalizeSignal) : null
  }
  catch {
    return null
  }
}

export const useSignalStore = defineStore('signals', () => {
  const signals = ref<SignalRecord[]>(readStoredSignals() ?? createDefaultSignals())

  const sortedSignals = computed(() =>
    [...signals.value].sort((a, b) => {
      const order = { active: 0, testing: 1, paused: 2 }
      return order[a.status] - order[b.status] || a.name.localeCompare(b.name, 'zh-TW')
    }),
  )

  const selectableSignals = computed(() =>
    sortedSignals.value.filter(signal => signal.status !== 'paused'),
  )

  const getSignalById = (id: string | null | undefined): SignalRecord | null =>
    id ? signals.value.find(signal => signal.id === id) ?? null : null

  const addSignal = (input: SignalInput): SignalRecord => {
    const timestamp = new Date().toISOString()
    const signal = normalizeSignal({
      ...input,
      id: crypto.randomUUID(),
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    signals.value.unshift(signal)
    return signal
  }

  const updateSignal = (id: string, input: SignalInput): void => {
    const signal = getSignalById(id)
    if (!signal) return

    Object.assign(signal, normalizeSignal({
      ...signal,
      ...input,
      updatedAt: new Date().toISOString(),
    }))
  }

  const removeSignal = (id: string): void => {
    queueCloudDeletion('signals', id)
    signals.value = signals.value.filter(signal => signal.id !== id)
  }

  const resetSignals = (): void => {
    signals.value = createDefaultSignals()
  }

  watch(
    signals,
    value => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
      }
    },
    { deep: true },
  )

  return {
    signals,
    sortedSignals,
    selectableSignals,
    getSignalById,
    addSignal,
    updateSignal,
    removeSignal,
    resetSignals,
  }
})
