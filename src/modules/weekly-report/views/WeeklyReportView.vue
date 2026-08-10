<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import CloudMediaImage from '@/components/CloudMediaImage.vue'
import {
  listWeeklyReports,
  publishWeeklyReport,
  revokeWeeklyReport,
  weeklyReportShareUrl,
} from '@/services/weekly-report.service'
import { useConfirmDialogStore } from '@/stores/useConfirmDialogStore'
import { useNotificationStore } from '@/stores/useNotificationStore'
import { useTradeStore } from '@/stores/useTradeStore'
import { useTradeReviewStore } from '@/stores/useTradeReviewStore'
import type { WeeklyReportRecord, WeeklyReportSnapshot, WeeklyReportTrade } from '@/types/weekly-report'

const tradeStore = useTradeStore()
const { sortedTrades } = storeToRefs(tradeStore)
const reviewStore = useTradeReviewStore()
const confirmDialog = useConfirmDialogStore()
const notificationStore = useNotificationStore()
const notify = (type: 'success' | 'warning' | 'danger', title: string, message: string): void => {
  notificationStore.addNotification({ type, title, message, route: '/weekly-report' })
}

const localDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
const monday = new Date()
monday.setHours(0, 0, 0, 0)
monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
const sunday = new Date(monday)
sunday.setDate(sunday.getDate() + 6)

const weekStart = ref(localDate(monday))
const weekEnd = ref(localDate(sunday))
const account = ref('全部帳戶')
const summary = ref('')
const strengths = ref('')
const improvements = ref('')
const nextWeekGoal = ref('')
const expiryDays = ref('30')
const publishing = ref(false)
const loadingReports = ref(false)
const reports = ref<WeeklyReportRecord[]>([])

const accounts = computed(() => [
  '全部帳戶',
  ...new Set(sortedTrades.value.map(trade => trade.account).filter(Boolean)),
])

const trades = computed(() => sortedTrades.value.filter(trade =>
  trade.positionStatus === 'closed' &&
  trade.date >= weekStart.value &&
  trade.date <= weekEnd.value &&
  (account.value === '全部帳戶' || trade.account === account.value),
))

const statistics = computed(() => {
  const wins = trades.value.filter(trade => trade.result === 'win').length
  const losses = trades.value.filter(trade => trade.result === 'loss').length
  const breakeven = trades.value.length - wins - losses
  const grossProfitLoss = trades.value.reduce((total, trade) => total + trade.profitLoss, 0)
  const commission = trades.value.reduce((total, trade) => total + trade.commission, 0)
  const swap = trades.value.reduce((total, trade) => total + trade.swap, 0)
  const fee = trades.value.reduce((total, trade) => total + trade.fee, 0)
  return {
    totalTrades: trades.value.length,
    wins,
    losses,
    breakeven,
    winRate: trades.value.length ? wins / trades.value.length * 100 : 0,
    grossProfitLoss,
    commission,
    swap,
    fee,
    netProfitLoss: grossProfitLoss + commission + swap + fee,
  }
})

const reportTrades = computed<WeeklyReportTrade[]>(() => trades.value.map(trade => ({
  id: trade.id,
  date: trade.date,
  time: trade.time,
  symbol: trade.symbol,
  account: trade.account,
  direction: trade.direction,
  result: trade.result,
  entryPrice: trade.entryPrice,
  exitPrice: trade.exitPrice,
  lotSize: trade.lotSize,
  profitLoss: trade.profitLoss,
  commission: trade.commission,
  swap: trade.swap,
  fee: trade.fee,
  signal: trade.signal,
  playbook: trade.playbook,
  reason: trade.reason,
  beforeScreenshot: trade.beforeScreenshot,
  afterScreenshot: trade.afterScreenshot,
  review: (() => {
    const review = reviewStore.getReviewByTradeId(trade.id)
    return review ? {
      summary: review.summary,
      strengths: review.strengths,
      mistakes: review.mistakes,
      improvement: review.improvement,
      nextTradeRule: review.nextTradeRule,
      executionScore: review.executionScore,
      emotionalControl: review.emotionalControl,
      totalScore: review.totalScore,
    } : null
  })(),
})))

const money = (value: number): string => `${value >= 0 ? '+' : '-'}$${Math.abs(value).toFixed(2)}`

const refreshReports = async (): Promise<void> => {
  loadingReports.value = true
  try { reports.value = await listWeeklyReports() }
  catch (error) {
    notify('danger', '週報讀取失敗', error instanceof Error ? error.message : '請確認資料庫升級。')
  }
  finally { loadingReports.value = false }
}

const publish = async (): Promise<void> => {
  if (!trades.value.length) {
    notify('warning', '沒有可發布的交易', '請調整日期或帳戶範圍。')
    return
  }
  publishing.value = true
  try {
    const snapshot: WeeklyReportSnapshot = {
      version: 1,
      generatedAt: new Date().toISOString(),
      weekStart: weekStart.value,
      weekEnd: weekEnd.value,
      account: account.value,
      statistics: statistics.value,
      reflection: {
        summary: summary.value.trim(),
        strengths: strengths.value.trim(),
        improvements: improvements.value.trim(),
        nextWeekGoal: nextWeekGoal.value.trim(),
      },
      trades: reportTrades.value,
    }
    const days = Number(expiryDays.value)
    const expiresAt = days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null
    const report = await publishWeeklyReport(
      `${weekStart.value} ～ ${weekEnd.value} 每週交易報告`,
      snapshot,
      expiresAt,
    )
    await navigator.clipboard.writeText(weeklyReportShareUrl(report.shareToken))
    notify('success', '週報已發布', '公開連結已複製，可直接傳給院長。')
    await refreshReports()
  }
  catch (error) {
    notify('danger', '週報發布失敗', error instanceof Error ? error.message : '請稍後再試。')
  }
  finally { publishing.value = false }
}

const copyLink = async (report: WeeklyReportRecord): Promise<void> => {
  await navigator.clipboard.writeText(weeklyReportShareUrl(report.shareToken))
  notify('success', '已複製分享連結', '可直接貼給要查看週報的人。')
}

const revoke = async (report: WeeklyReportRecord): Promise<void> => {
  const confirmed = await confirmDialog.ask({
    title: '撤銷這份公開週報？',
    message: '原分享連結會立即失效，但你的交易與私人截圖不會被刪除。',
    confirmLabel: '確認撤銷',
    tone: 'danger',
  })
  if (!confirmed) return
  await revokeWeeklyReport(report.id)
  await refreshReports()
  notify('success', '分享已撤銷', '原連結已無法查看。')
}

onMounted(() => { void refreshReports() })
</script>

<template>
  <div class="space-y-6 pb-10">
    <section class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
      <p class="text-xs font-medium tracking-[0.2em] text-violet-400">WEEKLY REVIEW · PUBLIC SHARE</p>
      <h1 class="mt-2 text-3xl font-bold text-zinc-100">週報中心</h1>
      <p class="mt-2 text-sm leading-7 text-zinc-400">把一週交易、績效與前後截圖整理成只讀公開報告。</p>
    </section>

    <section class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-6">
      <div class="grid gap-4 md:grid-cols-3">
        <label class="text-sm text-zinc-400">開始日期<input v-model="weekStart" type="date" class="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-zinc-100"></label>
        <label class="text-sm text-zinc-400">結束日期<input v-model="weekEnd" type="date" class="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-zinc-100"></label>
        <label class="text-sm text-zinc-400">交易帳戶<select v-model="account" class="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-zinc-100"><option v-for="item in accounts" :key="item">{{ item }}</option></select></label>
      </div>

      <div class="mt-5 grid gap-3 sm:grid-cols-3">
        <div class="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"><p class="text-xs text-zinc-500">交易筆數</p><p class="mt-2 text-2xl font-semibold text-zinc-100">{{ statistics.totalTrades }}</p></div>
        <div class="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"><p class="text-xs text-zinc-500">勝率</p><p class="mt-2 text-2xl font-semibold text-sky-300">{{ statistics.winRate.toFixed(1) }}%</p></div>
        <div class="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"><p class="text-xs text-zinc-500">淨盈虧</p><p class="mt-2 text-2xl font-semibold" :class="statistics.netProfitLoss >= 0 ? 'text-emerald-300' : 'text-rose-300'">{{ money(statistics.netProfitLoss) }}</p></div>
      </div>

      <div class="mt-5 grid gap-4 md:grid-cols-2">
        <label class="text-sm text-zinc-400">本週總結<textarea v-model="summary" rows="4" class="mt-2 w-full rounded-2xl border border-zinc-700 bg-zinc-950 p-3 text-zinc-100" /></label>
        <label class="text-sm text-zinc-400">做得好的地方<textarea v-model="strengths" rows="4" class="mt-2 w-full rounded-2xl border border-zinc-700 bg-zinc-950 p-3 text-zinc-100" /></label>
        <label class="text-sm text-zinc-400">需要改善<textarea v-model="improvements" rows="4" class="mt-2 w-full rounded-2xl border border-zinc-700 bg-zinc-950 p-3 text-zinc-100" /></label>
        <label class="text-sm text-zinc-400">下週目標<textarea v-model="nextWeekGoal" rows="4" class="mt-2 w-full rounded-2xl border border-zinc-700 bg-zinc-950 p-3 text-zinc-100" /></label>
      </div>

      <div class="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label class="text-sm text-zinc-400">分享期限<select v-model="expiryDays" class="mt-2 block rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-zinc-100"><option value="7">7 天</option><option value="30">30 天</option><option value="90">90 天</option><option value="0">永久（直到手動撤銷）</option></select></label>
        <button type="button" :disabled="publishing || !trades.length" class="rounded-xl bg-violet-300 px-5 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-40" @click="publish">{{ publishing ? '正在建立安全連結…' : '建立並複製分享連結' }}</button>
      </div>
    </section>

    <section class="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/70">
      <header class="border-b border-zinc-800 p-5"><h2 class="text-lg font-semibold text-zinc-100">本週交易預覽</h2></header>
      <div v-if="!trades.length" class="p-10 text-center text-zinc-500">這個範圍沒有已平倉交易。</div>
      <article v-for="trade in trades" v-else :key="trade.id" class="border-b border-zinc-800 p-5 last:border-0">
        <div class="flex flex-wrap items-center justify-between gap-3"><div><strong class="text-zinc-100">{{ trade.symbol }} · {{ trade.direction === 'buy' ? '多單' : '空單' }}</strong><p class="mt-1 text-xs text-zinc-500">{{ trade.date }} {{ trade.time }} · {{ trade.account }}</p></div><strong :class="trade.profitLoss >= 0 ? 'text-emerald-300' : 'text-rose-300'">{{ money(trade.profitLoss) }}</strong></div>
        <div v-if="trade.beforeScreenshot || trade.afterScreenshot" class="mt-4 grid gap-3 sm:grid-cols-2">
          <div v-if="trade.beforeScreenshot" class="overflow-hidden rounded-2xl border border-zinc-800"><p class="px-3 py-2 text-xs text-zinc-500">交易前</p><CloudMediaImage :data-url="trade.beforeScreenshot.dataUrl" :storage-path="trade.beforeScreenshot.storagePath" class="aspect-video w-full object-cover" /></div>
          <div v-if="trade.afterScreenshot" class="overflow-hidden rounded-2xl border border-zinc-800"><p class="px-3 py-2 text-xs text-zinc-500">交易後</p><CloudMediaImage :data-url="trade.afterScreenshot.dataUrl" :storage-path="trade.afterScreenshot.storagePath" class="aspect-video w-full object-cover" /></div>
        </div>
        <div class="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
          <p class="text-xs font-semibold tracking-[0.14em] text-violet-400">此筆交易復盤</p>
          <template v-if="reviewStore.getReviewByTradeId(trade.id)">
            <p class="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{{ reviewStore.getReviewByTradeId(trade.id)?.summary || '尚未填寫總結' }}</p>
          </template>
          <p v-else class="mt-3 text-sm text-amber-300">尚未填寫復盤</p>
        </div>
      </article>
    </section>

    <section class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
      <h2 class="text-lg font-semibold text-zinc-100">已發布報告</h2>
      <p v-if="loadingReports" class="mt-4 text-sm text-zinc-500">讀取中…</p>
      <div v-else class="mt-4 space-y-2">
        <div v-for="report in reports" :key="report.id" class="flex flex-col gap-3 rounded-2xl border border-zinc-800 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p class="font-medium text-zinc-200">{{ report.title }}</p><p class="mt-1 text-xs" :class="report.isPublished ? 'text-emerald-400' : 'text-zinc-600'">{{ report.isPublished ? '分享中' : '已撤銷' }}</p></div>
          <div v-if="report.isPublished" class="flex gap-2"><button class="rounded-xl border border-zinc-700 px-3 py-2 text-sm text-sky-300" @click="copyLink(report)">複製連結</button><button class="rounded-xl border border-rose-400/20 px-3 py-2 text-sm text-rose-300" @click="revoke(report)">撤銷</button></div>
        </div>
        <p v-if="!reports.length" class="py-6 text-center text-sm text-zinc-500">尚未發布週報。</p>
      </div>
    </section>
  </div>
</template>
