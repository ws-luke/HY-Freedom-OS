import type { TradeMistakeTag, TradeRecord } from '@/types/trade'
import type { StoredTradeReview } from '@/types/trade-review'

export type IntelligenceConfidence = 'building' | 'observe' | 'reliable'

export interface IntelligencePerformance {
  trades: number
  wins: number
  winRate: number
  averageR: number
  totalR: number
  profitLoss: number
}

export interface SetupIntelligence extends IntelligencePerformance {
  key: string
  signal: string
  playbook: string
  confidence: IntelligenceConfidence
}

export interface MistakeIntelligence {
  key: string
  label: string
  affected: IntelligencePerformance
  without: IntelligencePerformance
  deltaR: number
  estimatedRCost: number
  confidence: IntelligenceConfidence
}

export interface DisciplineIntelligence {
  key: keyof Pick<
    StoredTradeReview,
    | 'followedPlan'
    | 'followedPlaybook'
    | 'respectedRisk'
    | 'waitedForConfirmation'
    | 'avoidedNewsRisk'
  >
  label: string
  followed: IntelligencePerformance
  violated: IntelligencePerformance
  deltaR: number
}

export interface ProcessOutcomeIntelligence {
  goodProcessWin: number
  goodProcessLoss: number
  badProcessWin: number
  badProcessLoss: number
  reviewedTrades: number
}

export interface TradeIntelligenceSnapshot {
  overall: IntelligencePerformance
  reviewedTrades: number
  reviewCoverage: number
  bestSetup: SetupIntelligence | null
  weakestSetup: SetupIntelligence | null
  setups: SetupIntelligence[]
  mistakes: MistakeIntelligence[]
  mostExpensiveMistake: MistakeIntelligence | null
  disciplines: DisciplineIntelligence[]
  strongestDisciplineEdge: DisciplineIntelligence | null
  processOutcomes: ProcessOutcomeIntelligence
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

const confidenceFor = (trades: number): IntelligenceConfidence => {
  if (trades >= 20) return 'reliable'
  if (trades >= 5) return 'observe'
  return 'building'
}

const round = (value: number, digits = 2): number =>
  Number(value.toFixed(digits))

const performance = (trades: TradeRecord[]): IntelligencePerformance => {
  const wins = trades.filter(trade => trade.result === 'win').length
  const totalR = trades.reduce((sum, trade) => sum + trade.rMultiple, 0)

  return {
    trades: trades.length,
    wins,
    winRate: trades.length ? Math.round((wins / trades.length) * 100) : 0,
    averageR: trades.length ? round(totalR / trades.length) : 0,
    totalR: round(totalR),
    profitLoss: round(trades.reduce((sum, trade) => sum + trade.profitLoss, 0)),
  }
}

const buildSetups = (trades: TradeRecord[]): SetupIntelligence[] => {
  const groups = new Map<string, TradeRecord[]>()

  trades.forEach(trade => {
    const signal = trade.signal.trim()
    const playbook = trade.playbook.trim()
    if (!signal || !playbook) return

    const key = `${signal}::${playbook}`
    const group = groups.get(key) ?? []
    group.push(trade)
    groups.set(key, group)
  })

  return [...groups.entries()].map(([key, group]) => {
    const [signal = '', playbook = ''] = key.split('::')
    return {
      key,
      signal,
      playbook,
      ...performance(group),
      confidence: confidenceFor(group.length),
    }
  })
}

const setupRank = (a: SetupIntelligence, b: SetupIntelligence): number => {
  const tier = (item: SetupIntelligence): number =>
    item.confidence === 'reliable' ? 3 : item.confidence === 'observe' ? 2 : 1
  return tier(b) - tier(a) || b.averageR - a.averageR || b.totalR - a.totalR
}

const buildMistakes = (trades: TradeRecord[]): MistakeIntelligence[] => {
  const keys = new Set<string>()
  trades.forEach(trade => {
    trade.mistakeTags.forEach(tag => keys.add(tag))
    trade.customMistakeTags.forEach(tag => {
      const normalized = tag.trim()
      if (normalized) keys.add(`custom:${normalized}`)
    })
  })

  return [...keys].map(key => {
    const custom = key.startsWith('custom:')
    const raw = custom ? key.slice(7) : key
    const hasMistake = (trade: TradeRecord): boolean =>
      custom
        ? trade.customMistakeTags.some(tag => tag.trim() === raw)
        : trade.mistakeTags.includes(raw as TradeMistakeTag)

    const affectedTrades = trades.filter(hasMistake)
    const withoutTrades = trades.filter(trade => !hasMistake(trade))
    const affected = performance(affectedTrades)
    const without = performance(withoutTrades)
    const deltaR = round(affected.averageR - without.averageR)

    return {
      key,
      label: custom ? raw : mistakeLabels[raw as TradeMistakeTag] ?? raw,
      affected,
      without,
      deltaR,
      estimatedRCost: round(Math.min(0, deltaR) * affected.trades),
      confidence: confidenceFor(affected.trades),
    }
  }).sort((a, b) => a.deltaR - b.deltaR || b.affected.trades - a.affected.trades)
}

const disciplineDefinitions: Array<{
  key: DisciplineIntelligence['key']
  label: string
}> = [
  { key: 'followedPlan', label: '遵守盤前計畫' },
  { key: 'followedPlaybook', label: '遵守 Playbook' },
  { key: 'respectedRisk', label: '遵守風險限制' },
  { key: 'waitedForConfirmation', label: '等待確認訊號' },
  { key: 'avoidedNewsRisk', label: '避開重大數據' },
]

export const buildTradeIntelligence = (
  trades: TradeRecord[],
  reviews: StoredTradeReview[],
): TradeIntelligenceSnapshot => {
  const closedTrades = trades.filter(trade => trade.positionStatus === 'closed')
  const tradeById = new Map(closedTrades.map(trade => [trade.id, trade]))
  const reviewByTradeId = new Map(reviews.map(review => [review.tradeId, review]))
  const reviewed = closedTrades.filter(trade => reviewByTradeId.has(trade.id))
  const setups = buildSetups(closedTrades).sort(setupRank)
  const positiveSetups = setups.filter(setup => setup.averageR > 0)
  const negativeSetups = setups.filter(setup => setup.averageR < 0)
  const mistakes = buildMistakes(closedTrades)

  const disciplines = disciplineDefinitions.map(definition => {
    const followedTrades: TradeRecord[] = []
    const violatedTrades: TradeRecord[] = []

    reviews.forEach(review => {
      const trade = tradeById.get(review.tradeId)
      if (!trade) return
      if (review[definition.key] === true) followedTrades.push(trade)
      if (review[definition.key] === false) violatedTrades.push(trade)
    })

    const followed = performance(followedTrades)
    const violated = performance(violatedTrades)
    return {
      ...definition,
      followed,
      violated,
      deltaR: round(followed.averageR - violated.averageR),
    }
  })

  const comparableDisciplines = disciplines
    .filter(item => item.followed.trades >= 2 && item.violated.trades >= 2)
    .sort((a, b) => b.deltaR - a.deltaR)

  const processOutcomes: ProcessOutcomeIntelligence = {
    goodProcessWin: 0,
    goodProcessLoss: 0,
    badProcessWin: 0,
    badProcessLoss: 0,
    reviewedTrades: reviewed.length,
  }

  reviewed.forEach(trade => {
    const review = reviewByTradeId.get(trade.id)
    if (!review) return
    const goodProcess = review.totalScore >= 75
    const profitable = trade.profitLoss > 0
    if (goodProcess && profitable) processOutcomes.goodProcessWin += 1
    else if (goodProcess) processOutcomes.goodProcessLoss += 1
    else if (profitable) processOutcomes.badProcessWin += 1
    else processOutcomes.badProcessLoss += 1
  })

  return {
    overall: performance(closedTrades),
    reviewedTrades: reviewed.length,
    reviewCoverage: closedTrades.length
      ? Math.round((reviewed.length / closedTrades.length) * 100)
      : 0,
    bestSetup: positiveSetups[0] ?? null,
    weakestSetup: [...negativeSetups].sort((a, b) => {
      const tierA = a.confidence === 'reliable' ? 3 : a.confidence === 'observe' ? 2 : 1
      const tierB = b.confidence === 'reliable' ? 3 : b.confidence === 'observe' ? 2 : 1
      return tierB - tierA || a.averageR - b.averageR
    })[0] ?? null,
    setups,
    mistakes,
    mostExpensiveMistake: mistakes.find(item => item.deltaR < 0) ?? null,
    disciplines,
    strongestDisciplineEdge: comparableDisciplines[0] ?? null,
    processOutcomes,
  }
}

export const intelligenceConfidenceLabel = (confidence: IntelligenceConfidence): string => {
  if (confidence === 'reliable') return '較可靠'
  if (confidence === 'observe') return '可觀察'
  return '樣本建立中'
}
