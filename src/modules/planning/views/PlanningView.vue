<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'

import PlanningCommandPanel from '../components/PlanningCommandPanel.vue'
import { useNotificationStore } from '@/stores/useNotificationStore'
import { useSignalStore } from '@/stores/useSignalStore'
import { useTradingPlanStore } from '@/stores/useTradingPlanStore'
import type {
  LegendDirection,
  LegendPhase,
  LegendSessionKey,
  LegendTimeframeKey,
} from '@/types/trading-plan'

const planStore = useTradingPlanStore()
const signalStore = useSignalStore()
const notificationStore = useNotificationStore()
const { plan, sortedPlans, completionPercent, isReadyToComplete } = storeToRefs(planStore)
const { selectableSignals } = storeToRefs(signalStore)
const historyOpen = ref(false)

const sessionKeys: LegendSessionKey[] = ['asia', 'europe', 'us']
const timeframes: Array<{ key: LegendTimeframeKey; label: string }> = [
  { key: 'm5', label: 'M5' },
  { key: 'm15m30', label: 'M15 / M30' },
  { key: 'h1', label: 'H1' },
  { key: 'h4', label: 'H4' },
  { key: 'd1', label: 'D' },
]
const directions: Array<{ value: LegendDirection; label: string }> = [
  { value: 'wait', label: '待確認' },
  { value: 'long', label: '多' },
  { value: 'short', label: '空' },
  { value: 'range', label: '整' },
]
const phases: Array<{ value: LegendPhase; label: string }> = [
  { value: 'wait', label: '待確認' },
  { value: 'drive', label: '驅動' },
  { value: 'pullback', label: '回調' },
  { value: 'transition', label: '轉換' },
]

const formattedDate = computed(() => new Intl.DateTimeFormat('zh-TW', {
  year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
}).format(new Date(`${plan.value.date}T12:00:00`)))
const isToday = computed(() => plan.value.date === new Date().toLocaleDateString('sv-SE'))
const signalOptions = computed(() => selectableSignals.value.map(signal => signal.name))

const directionTone = (direction: LegendDirection): string => ({
  long: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  short: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  range: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  wait: 'border-zinc-700 bg-zinc-950/60 text-zinc-500',
}[direction])

const phaseTone = (phase: LegendPhase): string => ({
  drive: 'text-sky-300', pullback: 'text-violet-300', transition: 'text-amber-300', wait: 'text-zinc-500',
}[phase])

const selectHistory = (date: string): void => {
  planStore.selectDate(date)
  historyOpen.value = false
}

const completePlan = (): void => {
  planStore.markCompleted()
  if (plan.value.completed) notificationStore.addNotification({
    type: 'success', title: '每日規劃已鎖定', message: `${plan.value.date} 的每日盤前規劃已保存。`,
  })
}

onMounted(planStore.ensureCurrentDay)
</script>

<template>
  <div class="space-y-5 pb-12">
    <section class="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-zinc-900/75 p-5 shadow-xl shadow-black/10 sm:p-6">
      <div class="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
      <div class="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p class="text-xs font-semibold tracking-[0.22em] text-amber-400">TRADE ELITE ACADEMY · LEGEND PLAN</p>
          <h1 class="mt-2 text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl">每日盤前規劃</h1>
          <p class="mt-2 max-w-3xl text-sm leading-7 text-zinc-400">由大週期到小週期，逐盤建立方向、驅回節奏、可能型態與時段演變證據。</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-300 transition hover:border-amber-500/30" @click="historyOpen = !historyOpen">歷史規劃 · {{ sortedPlans.length }}</button>
          <button v-if="!isToday" type="button" class="rounded-xl bg-amber-300 px-4 py-3 text-sm font-semibold text-zinc-950" @click="planStore.createToday">回到今日規劃</button>
        </div>
      </div>
    </section>

    <Transition enter-active-class="transition duration-200" enter-from-class="-translate-y-2 opacity-0" leave-active-class="transition duration-150" leave-to-class="-translate-y-2 opacity-0">
      <section v-if="historyOpen" class="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-5">
        <div class="flex items-center justify-between"><div><p class="text-xs font-semibold tracking-[0.18em] text-sky-400">DAILY ARCHIVE</p><h2 class="mt-1 text-lg font-semibold text-zinc-100">每日規劃紀錄</h2></div><button type="button" class="text-sm text-zinc-500" @click="historyOpen = false">關閉</button></div>
        <div class="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <button v-for="item in sortedPlans" :key="`${item.date}:${item.symbol}`" type="button" class="rounded-2xl border p-4 text-left transition" :class="item.date === plan.date ? 'border-amber-500/35 bg-amber-500/10' : 'border-zinc-800 bg-zinc-950/45 hover:border-zinc-700'" @click="selectHistory(item.date)">
            <div class="flex items-center justify-between gap-2"><p class="font-semibold text-zinc-200">{{ item.date }}</p><span class="rounded-full px-2 py-1 text-[9px]" :class="item.completed ? 'bg-emerald-500/10 text-emerald-300' : 'bg-zinc-800 text-zinc-500'">{{ item.completed ? '已鎖定' : '草稿' }}</span></div>
            <p class="mt-2 text-xs text-zinc-500">{{ item.symbol }} · {{ new Date(item.updatedAt).toLocaleString('zh-TW') }}</p>
          </button>
        </div>
      </section>
    </Transition>

    <section class="grid gap-3 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 md:grid-cols-[160px_150px_150px_minmax(0,1fr)_110px] md:items-end">
      <label><span class="text-xs font-medium text-zinc-500">規劃日期</span><input v-model="plan.date" type="date" :disabled="plan.completed" class="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950/60 px-3 py-3 text-sm text-zinc-200 disabled:opacity-60"></label>
      <label><span class="text-xs font-medium text-zinc-500">交易商品</span><input v-model.trim="plan.symbol" type="text" :disabled="plan.completed" class="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950/60 px-3 py-3 text-sm font-semibold uppercase text-zinc-200 disabled:opacity-60"></label>
      <label><span class="text-xs font-medium text-zinc-500">今日總方向</span><select v-model="plan.marketBias" :disabled="plan.completed" class="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950/60 px-3 py-3 text-sm text-zinc-200 disabled:opacity-60"><option value="wait">等待</option><option value="bullish">偏多</option><option value="bearish">偏空</option><option value="range">震盪</option></select></label>
      <label><span class="text-xs font-medium text-zinc-500">News · 今日重要消息</span><input v-model="plan.news" type="text" :disabled="plan.completed" placeholder="例如：20:30 CPI；數據前後禁止新倉" class="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950/60 px-3 py-3 text-sm text-zinc-200 placeholder:text-zinc-700 disabled:opacity-60"></label>
      <div class="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5"><p class="text-[10px] text-zinc-600">完成度</p><p class="mt-1 text-lg font-bold text-amber-300">{{ completionPercent }}%</p></div>
    </section>

    <PlanningCommandPanel />

    <section v-for="sessionKey in sessionKeys" :key="sessionKey" class="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/70 shadow-xl shadow-black/10">
      <header class="flex flex-col gap-3 border-b border-zinc-800 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-3"><span class="grid h-11 w-11 place-items-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-sm font-bold text-amber-300">{{ sessionKey === 'asia' ? '亞' : sessionKey === 'europe' ? '歐' : '美' }}</span><div><p class="text-lg font-semibold text-zinc-100">{{ plan.sessions[sessionKey].label }}</p><p class="text-xs text-zinc-500">XAU · {{ plan.sessions[sessionKey].hours }}</p></div></div>
        <span class="w-fit rounded-full border border-zinc-800 bg-zinc-950/50 px-3 py-1.5 text-[10px] font-semibold tracking-[0.14em] text-zinc-500">MULTI-TIMEFRAME MAP</span>
      </header>

      <div class="hidden overflow-x-auto lg:block">
        <table class="w-full min-w-[1050px] table-fixed border-collapse">
          <thead><tr><th class="w-44 border-b border-r border-zinc-800 p-3 text-left text-xs text-zinc-500">觀察項目</th><th v-for="timeframe in timeframes" :key="timeframe.key" class="border-b border-r border-zinc-800 p-3 text-sm font-semibold text-zinc-200 last:border-r-0">{{ timeframe.label }}</th></tr></thead>
          <tbody>
            <tr><th class="border-b border-r border-zinc-800 p-3 text-left text-xs font-medium text-zinc-400">多 / 空 / 整</th><td v-for="timeframe in timeframes" :key="timeframe.key" class="border-b border-r border-zinc-800 p-2 last:border-r-0"><select v-model="plan.sessions[sessionKey].timeframes[timeframe.key].direction" :disabled="plan.completed" class="w-full rounded-xl border px-3 py-2.5 text-xs font-semibold outline-none disabled:opacity-60" :class="directionTone(plan.sessions[sessionKey].timeframes[timeframe.key].direction)"><option v-for="item in directions" :key="item.value" :value="item.value">{{ item.label }}</option></select></td></tr>
            <tr><th class="border-b border-r border-zinc-800 p-3 text-left text-xs font-medium text-zinc-400">驅動 / 回調</th><td v-for="timeframe in timeframes" :key="timeframe.key" class="border-b border-r border-zinc-800 p-2 last:border-r-0"><select v-model="plan.sessions[sessionKey].timeframes[timeframe.key].phase" :disabled="plan.completed" class="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-xs font-medium outline-none disabled:opacity-60" :class="phaseTone(plan.sessions[sessionKey].timeframes[timeframe.key].phase)"><option v-for="item in phases" :key="item.value" :value="item.value">{{ item.label }}</option></select></td></tr>
            <tr><th class="border-r border-zinc-800 p-3 text-left text-xs font-medium text-zinc-400">可演變型態 & 浪位</th><td v-for="timeframe in timeframes" :key="timeframe.key" class="border-r border-zinc-800 p-2 last:border-r-0"><textarea v-model="plan.sessions[sessionKey].timeframes[timeframe.key].patternWave" :disabled="plan.completed" rows="3" placeholder="型態、浪位、關鍵價" class="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950/55 px-3 py-2 text-xs leading-5 text-zinc-300 outline-none placeholder:text-zinc-700 focus:border-amber-500/30 disabled:opacity-60" /></td></tr>
          </tbody>
        </table>
      </div>

      <div class="grid gap-3 p-4 lg:hidden">
        <article v-for="timeframe in timeframes" :key="timeframe.key" class="rounded-2xl border border-zinc-800 bg-zinc-950/45 p-4">
          <p class="font-semibold text-amber-300">{{ timeframe.label }}</p>
          <div class="mt-3 grid grid-cols-2 gap-2"><label><span class="text-[10px] text-zinc-600">方向</span><select v-model="plan.sessions[sessionKey].timeframes[timeframe.key].direction" :disabled="plan.completed" class="mt-1 w-full rounded-xl border px-3 py-2 text-xs font-semibold" :class="directionTone(plan.sessions[sessionKey].timeframes[timeframe.key].direction)"><option v-for="item in directions" :key="item.value" :value="item.value">{{ item.label }}</option></select></label><label><span class="text-[10px] text-zinc-600">節奏</span><select v-model="plan.sessions[sessionKey].timeframes[timeframe.key].phase" :disabled="plan.completed" class="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300"><option v-for="item in phases" :key="item.value" :value="item.value">{{ item.label }}</option></select></label></div>
          <textarea v-model="plan.sessions[sessionKey].timeframes[timeframe.key].patternWave" :disabled="plan.completed" rows="2" placeholder="可演變型態、浪位與關鍵價" class="mt-3 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs leading-5 text-zinc-300 placeholder:text-zinc-700" />
        </article>
      </div>

      <div class="grid gap-3 border-t border-zinc-800 p-5" :class="sessionKey === 'us' ? 'xl:grid-cols-3' : 'xl:grid-cols-1'">
        <label><span class="text-xs font-semibold text-sky-300">盤前評估</span><textarea v-model="plan.sessions[sessionKey].preSessionAssessment" :disabled="plan.completed" rows="4" :placeholder="sessionKey === 'asia' ? '開盤前：隔夜結構、今日劇本與失效條件' : `承接${sessionKey === 'europe' ? '亞洲盤' : '歐洲盤'}後，重新評估目前市場證據`" class="mt-2 w-full resize-y rounded-2xl border border-zinc-800 bg-zinc-950/55 px-4 py-3 text-sm leading-6 text-zinc-300 outline-none placeholder:text-zinc-700 focus:border-sky-500/30 disabled:opacity-60" /></label>
        <label v-if="sessionKey === 'us'"><span class="text-xs font-semibold text-emerald-300">亞洲盤實際發展</span><textarea v-model="plan.sessions.us.asiaDevelopment" :disabled="plan.completed" rows="4" placeholder="亞洲盤走法是否符合原定劇本？留下了什麼結構？" class="mt-2 w-full resize-y rounded-2xl border border-zinc-800 bg-zinc-950/55 px-4 py-3 text-sm leading-6 text-zinc-300 outline-none placeholder:text-zinc-700 disabled:opacity-60" /></label>
        <label v-if="sessionKey === 'us'"><span class="text-xs font-semibold text-violet-300">歐洲盤實際發展</span><textarea v-model="plan.sessions.us.europeDevelopment" :disabled="plan.completed" rows="4" placeholder="歐洲盤完成驅動或回調？美盤要延續還是反轉？" class="mt-2 w-full resize-y rounded-2xl border border-zinc-800 bg-zinc-950/55 px-4 py-3 text-sm leading-6 text-zinc-300 outline-none placeholder:text-zinc-700 disabled:opacity-60" /></label>
      </div>
    </section>

    <section class="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <div class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
        <p class="text-xs font-semibold tracking-[0.18em] text-amber-400">EXECUTION FILTER</p><h2 class="mt-2 text-lg font-semibold text-zinc-100">今日執行邊界</h2>
        <div class="mt-4 grid gap-4 md:grid-cols-2"><label><span class="text-xs text-zinc-500">允許交易條件</span><textarea v-model="plan.allowedConditions" :disabled="plan.completed" rows="4" placeholder="什麼條件全部成立才允許出手？" class="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950/55 px-4 py-3 text-sm text-zinc-300 placeholder:text-zinc-700" /></label><label><span class="text-xs text-zinc-500">禁止交易條件</span><textarea v-model="plan.prohibitedConditions" :disabled="plan.completed" rows="4" placeholder="數據、追價、區間中央、情緒狀態…" class="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950/55 px-4 py-3 text-sm text-zinc-300 placeholder:text-zinc-700" /></label></div>
        <div class="mt-4"><p class="text-xs text-zinc-500">只等待這些訊號</p><div class="mt-2 flex flex-wrap gap-2"><button v-for="signal in signalOptions" :key="signal" type="button" :disabled="plan.completed" class="rounded-full border px-3 py-2 text-xs transition" :class="plan.waitingSignals.includes(signal) ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-zinc-800 bg-zinc-950/50 text-zinc-500'" @click="planStore.toggleSignal(signal)">{{ signal }}</button></div></div>
      </div>
      <div class="space-y-4">
        <section class="rounded-3xl border border-violet-500/15 bg-violet-500/[0.04] p-5"><p class="text-xs font-semibold tracking-[0.18em] text-violet-300">觀自在菩薩</p><textarea v-model="plan.mindsetReminder" :disabled="plan.completed" rows="5" class="mt-3 w-full resize-y rounded-2xl border border-violet-500/15 bg-zinc-950/45 px-4 py-3 text-sm leading-7 text-zinc-300 outline-none disabled:opacity-60" /></section>
        <section class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"><div class="flex items-center justify-between"><div><p class="text-xs text-zinc-500">{{ formattedDate }}</p><h2 class="mt-1 font-semibold text-zinc-100">{{ plan.completed ? '規劃已鎖定' : '規劃草稿' }}</h2></div><span class="text-2xl font-bold text-amber-300">{{ completionPercent }}%</span></div><button v-if="!plan.completed" type="button" :disabled="!isReadyToComplete" class="mt-4 w-full rounded-2xl bg-amber-300 px-5 py-3 text-sm font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600" @click="completePlan">保存並鎖定每日規劃</button><button v-else type="button" class="mt-4 w-full rounded-2xl border border-zinc-700 px-5 py-3 text-sm text-zinc-400" @click="planStore.reopen">重新開啟編輯</button></section>
      </div>
    </section>
  </div>
</template>
