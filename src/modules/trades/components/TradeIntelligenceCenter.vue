<script setup lang="ts">
import { computed } from 'vue'

import type { TradeRecord } from '@/types/trade'
import type { StoredTradeReview } from '@/types/trade-review'

const props = defineProps<{
  trades: TradeRecord[]
  reviews: StoredTradeReview[]
}>()

interface Performance {
  trades: number
  wins: number
  winRate: number
  averageR: number
  totalR: number
  totalProfitLoss: number
}

interface EdgeRow extends Performance {
  key: string
  label: string
  detail: string
}

interface DisciplineRow {
  key: keyof Pick<StoredTradeReview, 'followedPlan' | 'followedPlaybook' | 'respectedRisk' | 'waitedForConfirmation' | 'avoidedNewsRisk'>
  label: string
  yes: Performance
  no: Performance
  deltaR: number
}

const reviewMap = computed(() => new Map(props.reviews.map(review => [review.tradeId, review])))

const reviewedTrades = computed(() =>
  props.trades.filter(trade => reviewMap.value.has(trade.id)),
)

const performance = (trades: TradeRecord[]): Performance => {
  const totalR = trades.reduce((sum, trade) => sum + trade.rMultiple, 0)
  const wins = trades.filter(trade => trade.result === 'win').length

  return {
    trades: trades.length,
    wins,
    winRate: trades.length ? Math.round((wins / trades.length) * 100) : 0,
    averageR: trades.length ? Number((totalR / trades.length).toFixed(2)) : 0,
    totalR: Number(totalR.toFixed(2)),
    totalProfitLoss: Number(trades.reduce((sum, trade) => sum + trade.profitLoss, 0).toFixed(2)),
  }
}

const getSession = (trade: TradeRecord): string => {
  const hour = Number.parseInt(trade.time.slice(0, 2), 10)
  if (!Number.isFinite(hour)) return '時段未知'
  if (hour >= 7 && hour < 14) return '亞洲盤'
  if (hour >= 14 && hour < 20) return '倫敦盤'
  if (hour >= 20 || hour < 2) return '紐約盤'
  return '盤後 / 清晨'
}

const edgeMatrix = computed<EdgeRow[]>(() => {
  const groups = new Map<string, { label: string; detail: string; trades: TradeRecord[] }>()

  props.trades.forEach(trade => {
    const signal = trade.signal.trim()
    const playbook = trade.playbook.trim()
    if (!signal && !playbook) return

    const session = getSession(trade)
    const label = [signal || '未標註訊號', playbook || '未分類策略'].join(' · ')
    const key = `${signal || '-'}|${playbook || '-'}|${session}`
    const group = groups.get(key) ?? { label, detail: session, trades: [] }
    group.trades.push(trade)
    groups.set(key, group)
  })

  return [...groups.entries()]
    .map(([key, group]) => ({ key, label: group.label, detail: group.detail, ...performance(group.trades) }))
    .sort((a, b) => {
      const tierA = a.trades >= 20 ? 3 : a.trades >= 5 ? 2 : 1
      const tierB = b.trades >= 20 ? 3 : b.trades >= 5 ? 2 : 1
      return tierB - tierA || b.averageR - a.averageR || b.trades - a.trades
    })
    .slice(0, 8)
})

const disciplineDefinitions: Array<{ key: DisciplineRow['key']; label: string }> = [
  { key: 'followedPlan', label: '遵守交易計畫' },
  { key: 'followedPlaybook', label: '遵守 Playbook' },
  { key: 'respectedRisk', label: '遵守風險規則' },
  { key: 'waitedForConfirmation', label: '等待進場確認' },
  { key: 'avoidedNewsRisk', label: '避開新聞風險' },
]

const disciplineRows = computed<DisciplineRow[]>(() =>
  disciplineDefinitions.map(definition => {
    const yesTrades: TradeRecord[] = []
    const noTrades: TradeRecord[] = []

    props.trades.forEach(trade => {
      const review = reviewMap.value.get(trade.id)
      if (!review) return
      if (review[definition.key] === true) yesTrades.push(trade)
      if (review[definition.key] === false) noTrades.push(trade)
    })

    const yes = performance(yesTrades)
    const no = performance(noTrades)
    return {
      ...definition,
      yes,
      no,
      deltaR: Number((yes.averageR - no.averageR).toFixed(2)),
    }
  }),
)

const reviewCoverage = computed(() =>
  props.trades.length ? Math.round((reviewedTrades.value.length / props.trades.length) * 100) : 0,
)

const disciplineScore = computed(() => {
  let passed = 0
  let answered = 0
  props.reviews.forEach(review => {
    disciplineDefinitions.forEach(({ key }) => {
      if (review[key] === null) return
      answered += 1
      if (review[key] === true) passed += 1
    })
  })
  return answered ? Math.round((passed / answered) * 100) : 0
})

const mt5Coverage = computed(() =>
  props.trades.length
    ? Math.round((props.trades.filter(trade => trade.dataSource === 'mt5').length / props.trades.length) * 100)
    : 0,
)

const contextCoverage = computed(() => {
  if (!props.trades.length) return 0
  const complete = props.trades.filter(trade =>
    Boolean((trade.signalId || trade.signal.trim()) && trade.playbook.trim() && trade.reason.trim()),
  ).length
  return Math.round((complete / props.trades.length) * 100)
})

const evidenceCoverage = computed(() => {
  if (!props.trades.length) return 0
  const complete = props.trades.filter(trade => trade.beforeScreenshot && trade.afterScreenshot).length
  return Math.round((complete / props.trades.length) * 100)
})

const overall = computed(() => performance(props.trades))

const bestInsight = computed(() => {
  const comparable = disciplineRows.value
    .filter(row => row.yes.trades >= 2 && row.no.trades >= 2)
    .sort((a, b) => Math.abs(b.deltaR) - Math.abs(a.deltaR))[0]

  if (comparable) {
    const direction = comparable.deltaR >= 0 ? '多' : '少'
    return `${comparable.label}時，平均每筆${direction} ${Math.abs(comparable.deltaR).toFixed(2)}R；目前兩側各至少 2 筆，持續累積後可信度會更高。`
  }
  if (!props.trades.length) return '目前篩選條件沒有已平倉交易。'
  if (reviewCoverage.value < 50) return '完成更多交易復盤後，這裡會開始量化「紀律」對績效的真實影響。'
  return '紀律對照樣本仍不足，先維持一致的復盤標準，不急著從少量交易下結論。'
})

const sampleLabel = (count: number) => count >= 20 ? '較可靠' : count >= 5 ? '可觀察' : '建立中'
const valueClass = (value: number) => value > 0 ? 'text-emerald-300' : value < 0 ? 'text-rose-300' : 'text-zinc-400'
</script>

<template>
  <section class="overflow-hidden rounded-3xl border border-violet-500/15 bg-zinc-900/70 shadow-xl shadow-black/10">
    <header class="border-b border-zinc-800 p-6">
      <p class="text-xs font-medium tracking-[0.2em] text-violet-400">EDGE INTELLIGENCE</p>
      <div class="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 class="text-xl font-semibold text-zinc-100">交易優勢與紀律 Intelligence</h2>
          <p class="mt-1 text-sm leading-6 text-zinc-500">把績效與完成的復盤連起來，找出「什麼做法真的有用」，而不是只看勝率。</p>
        </div>
        <p class="max-w-xl text-sm leading-6 text-violet-200/80">{{ bestInsight }}</p>
      </div>
    </header>

    <div class="grid gap-px bg-zinc-800 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <div class="bg-zinc-900 p-5">
        <p class="text-[10px] uppercase tracking-[0.14em] text-zinc-600">Filtered trades</p>
        <p class="mt-2 text-2xl font-semibold text-zinc-100">{{ overall.trades }}</p>
        <p class="mt-1 text-xs text-zinc-500">平均 <span :class="valueClass(overall.averageR)">{{ overall.averageR.toFixed(2) }}R</span></p>
      </div>
      <div class="bg-zinc-900 p-5">
        <p class="text-[10px] uppercase tracking-[0.14em] text-zinc-600">Review coverage</p>
        <p class="mt-2 text-2xl font-semibold" :class="reviewCoverage >= 80 ? 'text-emerald-300' : 'text-amber-300'">{{ reviewCoverage }}%</p>
        <p class="mt-1 text-xs text-zinc-500">{{ reviewedTrades.length }} / {{ overall.trades }} 筆已完成復盤</p>
      </div>
      <div class="bg-zinc-900 p-5">
        <p class="text-[10px] uppercase tracking-[0.14em] text-zinc-600">Discipline</p>
        <p class="mt-2 text-2xl font-semibold text-sky-300">{{ disciplineScore }}%</p>
        <p class="mt-1 text-xs text-zinc-500">已回答紀律規則的遵守率</p>
      </div>
      <div class="bg-zinc-900 p-5">
        <p class="text-[10px] uppercase tracking-[0.14em] text-zinc-600">MT5 coverage</p>
        <p class="mt-2 text-2xl font-semibold text-violet-300">{{ mt5Coverage }}%</p>
        <p class="mt-1 text-xs text-zinc-500">自動同步交易占目前樣本</p>
      </div>
      <div class="bg-zinc-900 p-5">
        <p class="text-[10px] uppercase tracking-[0.14em] text-zinc-600">Context quality</p>
        <p class="mt-2 text-2xl font-semibold" :class="contextCoverage >= 80 ? 'text-emerald-300' : 'text-amber-300'">{{ contextCoverage }}%</p>
        <p class="mt-1 text-xs text-zinc-500">Signal + Playbook + 理由完整</p>
      </div>
      <div class="bg-zinc-900 p-5">
        <p class="text-[10px] uppercase tracking-[0.14em] text-zinc-600">Visual evidence</p>
        <p class="mt-2 text-2xl font-semibold" :class="evidenceCoverage >= 80 ? 'text-emerald-300' : 'text-violet-300'">{{ evidenceCoverage }}%</p>
        <p class="mt-1 text-xs text-zinc-500">進場前 + 離場後截圖完整</p>
      </div>
    </div>

    <div class="grid gap-6 p-5 sm:p-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div>
        <div class="mb-4 flex items-end justify-between gap-4">
          <div>
            <h3 class="font-semibold text-zinc-100">Edge Matrix</h3>
            <p class="mt-1 text-xs text-zinc-500">Signal × Playbook × 交易時段，優先顯示樣本較成熟且平均 R 較佳的組合。</p>
          </div>
        </div>

        <div v-if="edgeMatrix.length" class="space-y-2">
          <div v-for="row in edgeMatrix" :key="row.key" class="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/45 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center">
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-zinc-200">{{ row.label }}</p>
              <p class="mt-1 text-xs text-zinc-600">{{ row.detail }} · {{ row.trades }} 筆 · {{ sampleLabel(row.trades) }}</p>
            </div>
            <div class="text-left sm:text-right">
              <p class="text-[10px] uppercase text-zinc-600">Win</p>
              <p class="text-sm text-zinc-300">{{ row.winRate }}%</p>
            </div>
            <div class="text-left sm:text-right">
              <p class="text-[10px] uppercase text-zinc-600">Avg R</p>
              <p class="text-sm font-semibold" :class="valueClass(row.averageR)">{{ row.averageR.toFixed(2) }}R</p>
            </div>
            <div class="text-left sm:text-right">
              <p class="text-[10px] uppercase text-zinc-600">Total R</p>
              <p class="text-sm" :class="valueClass(row.totalR)">{{ row.totalR.toFixed(2) }}R</p>
            </div>
          </div>
        </div>
        <div v-else class="rounded-2xl border border-dashed border-zinc-800 p-6 text-center text-sm text-zinc-600">替交易補上 Signal 或 Playbook 後，會開始建立組合 Edge。</div>
      </div>

      <div>
        <h3 class="font-semibold text-zinc-100">紀律值多少 R？</h3>
        <p class="mt-1 text-xs text-zinc-500">同一批已復盤交易，比較「有做到」與「沒做到」的平均 R。小樣本只作提示。</p>

        <div class="mt-4 space-y-2">
          <div v-for="row in disciplineRows" :key="row.key" class="rounded-2xl border border-zinc-800 bg-zinc-950/45 p-4">
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm font-medium text-zinc-200">{{ row.label }}</p>
              <p class="text-sm font-semibold" :class="valueClass(row.deltaR)">{{ row.deltaR >= 0 ? '+' : '' }}{{ row.deltaR.toFixed(2) }}R 差距</p>
            </div>
            <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div class="rounded-xl bg-emerald-500/5 px-3 py-2 text-zinc-500">有做到 <span class="ml-1 text-emerald-300">{{ row.yes.averageR.toFixed(2) }}R</span> · {{ row.yes.trades }} 筆</div>
              <div class="rounded-xl bg-rose-500/5 px-3 py-2 text-zinc-500">沒做到 <span class="ml-1 text-rose-300">{{ row.no.averageR.toFixed(2) }}R</span> · {{ row.no.trades }} 筆</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
