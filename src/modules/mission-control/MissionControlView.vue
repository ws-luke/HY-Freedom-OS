<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import DailyExecutionBoard from './components/DailyExecutionBoard.vue'
import ActivePositionsPanel from './components/ActivePositionsPanel.vue'
import MissionCommandHero from './components/MissionCommandHero.vue'
import MissionContextGrid from './components/MissionContextGrid.vue'
import MissionControlIcon from './components/MissionControlIcon.vue'
import TradingPulsePanel from './components/TradingPulsePanel.vue'
import { useMissionControlDashboard } from './composables/useMissionControlDashboard'

type QuickActionIcon =
  | 'plan'
  | 'journal'
  | 'shield'
  | 'chart'
  | 'review'
  | 'coach'

interface QuickAction {
  label: string
  route: string
  icon: QuickActionIcon
  classes: string
}

const dashboard = useMissionControlDashboard()

const {
  accountSummary,
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
  greeting,
  highImpactEvents,
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
} = dashboard

const riskLabel = computed(() => {
  if (risk.value.level === 'blocked') return '已鎖定'
  if (risk.value.level === 'warning') return '接近限制'
  return '限制內'
})

const quickActions: QuickAction[] = [
  {
    label: '盤前規劃',
    route: '/planning',
    icon: 'plan',
    classes:
      'hover:border-amber-400/20 hover:bg-amber-400/[0.05] hover:text-amber-300',
  },
  {
    label: '交易紀錄',
    route: '/trades',
    icon: 'journal',
    classes:
      'hover:border-emerald-400/20 hover:bg-emerald-400/[0.05] hover:text-emerald-300',
  },
  {
    label: '交易風控',
    route: '/trading-risk',
    icon: 'shield',
    classes:
      'hover:border-rose-400/20 hover:bg-rose-400/[0.05] hover:text-rose-300',
  },
  {
    label: '交易分析',
    route: '/trade-analytics',
    icon: 'chart',
    classes:
      'hover:border-sky-400/20 hover:bg-sky-400/[0.05] hover:text-sky-300',
  },
  {
    label: '復盤中心',
    route: '/review',
    icon: 'review',
    classes:
      'hover:border-cyan-400/20 hover:bg-cyan-400/[0.05] hover:text-cyan-300',
  },
  {
    label: 'AI 教練',
    route: '/ai-coach',
    icon: 'coach',
    classes:
      'hover:border-violet-400/20 hover:bg-violet-400/[0.05] hover:text-violet-300',
  },
]
</script>

<template>
  <div class="relative pb-12">
    <div
      class="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[560px] bg-[radial-gradient(circle_at_50%_-10%,rgba(245,158,11,0.07),transparent_58%)]"
    />

    <div class="space-y-4 sm:space-y-5">
      <MissionCommandHero
        :command-state="commandState"
        :next-action="nextAction"
        :readiness-score="readinessScore"
        :greeting="greeting"
        :formatted-date="formattedDate"
        :formatted-time="formattedTime"
        :mission-progress="missionProgress"
        :plan-progress="planProgress"
        :risk-label="riskLabel"
        :pending-reviews="pendingReviewTrades.length"
        :open-positions="openTrades.length"
      />

      <nav
        aria-label="Mission Control 快速操作"
        class="grid grid-cols-3 gap-2 rounded-[1.4rem] border border-white/[0.07] bg-[#101012]/90 p-2 shadow-lg shadow-black/10 backdrop-blur sm:grid-cols-6"
      >
        <RouterLink
          v-for="action in quickActions"
          :key="action.route"
          :to="action.route"
          class="flex min-h-16 flex-col items-center justify-center gap-2 rounded-xl border border-transparent px-2 py-2.5 text-[11px] font-medium text-zinc-500 transition sm:min-h-14 sm:flex-row sm:text-xs"
          :class="action.classes"
        >
          <MissionControlIcon :name="action.icon" :size="17" />
          {{ action.label }}
        </RouterLink>
      </nav>

      <DailyExecutionBoard
        :missions="sortedMissions"
        :completed-count="completedCount"
        :total-count="totalCount"
        :progress="missionProgress"
        :plan="plan"
        :plan-progress="planProgress"
        :plan-bias-label="planBiasLabel"
        :plan-bias-tone="planBiasTone"
        :next-event="nextEvent"
        :event-countdown="eventCountdown"
        :high-impact-count="highImpactEvents.length"
        :restriction-start="restriction.start"
        :restriction-end="restriction.end"
        :restriction-active="restrictionActive"
        :loading-events="economicLoading"
        @toggle="dailyMissionStore.toggleMission"
        @add="dailyMissionStore.addMission"
        @update="dailyMissionStore.updateMission"
        @remove="dailyMissionStore.removeMission"
        @reset="dailyMissionStore.resetToday"
      />

      <ActivePositionsPanel :positions="openTrades" />

      <TradingPulsePanel
        :risk="risk"
        :settings="riskSettings"
        :today-summary="todaySummary"
        :statistics="statistics"
        :recent-performance="recentPerformance"
        :recent-trades="recentTrades"
        :best-playbook="bestPlaybook"
      />

      <MissionContextGrid
        :watchlist="watchlist"
        :pending-reviews="pendingReviewTrades"
        :review-score="reviewScore"
        :coach-insight="coachInsight"
        :top-mistake="topMistake"
        :account-summary="accountSummary"
      />

      <footer
        class="flex flex-col gap-3 px-1 pt-2 text-[11px] text-zinc-700 sm:flex-row sm:items-center sm:justify-between"
      >
        <p>
          Mission Control 只負責下一個正確決策；完整資料保留在各功能模組。
        </p>
        <div class="flex items-center gap-3">
          <span>市場風險 {{ economicRiskLevel }}/5</span>
          <span class="h-3 w-px bg-zinc-800" />
          <span>{{ highImpactEvents.length }} 個高影響事件</span>
        </div>
      </footer>
    </div>
  </div>
</template>
