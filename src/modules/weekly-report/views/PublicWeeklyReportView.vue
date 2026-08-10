<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import PublicReportImage from '@/components/PublicReportImage.vue'
import { getPublicWeeklyReport } from '@/services/weekly-report.service'
import type { PublicWeeklyReport } from '@/types/weekly-report'

const route = useRoute()
const report = ref<PublicWeeklyReport | null>(null)
const loading = ref(true)
const failed = ref(false)
const money = (value: number): string => `${value >= 0 ? '+' : '-'}$${Math.abs(value).toFixed(2)}`

onMounted(async () => {
  try {
    const token = typeof route.params.token === 'string' ? route.params.token : ''
    report.value = token ? await getPublicWeeklyReport(token) : null
    failed.value = !report.value
  } catch { failed.value = true }
  finally { loading.value = false }
})
</script>

<template>
  <main class="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100 sm:px-6">
    <div class="mx-auto max-w-6xl">
      <div v-if="loading" class="py-32 text-center text-zinc-500">正在載入 Freedom OS 週報…</div>
      <section v-else-if="failed || !report" class="mx-auto mt-24 max-w-xl rounded-3xl border border-rose-400/20 bg-zinc-900 p-8 text-center"><h1 class="text-2xl font-semibold">這份週報無法查看</h1><p class="mt-3 text-zinc-400">分享可能已撤銷、到期或連結不正確。</p></section>
      <template v-else>
        <header class="rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-500/10 to-sky-500/5 p-6 sm:p-9">
          <p class="text-xs tracking-[0.22em] text-violet-300">FREEDOM OS · WEEKLY TRADING REPORT</p>
          <h1 class="mt-3 text-3xl font-bold sm:text-4xl">{{ report.title }}</h1>
          <p class="mt-3 text-sm text-zinc-400">{{ report.snapshot.account }} · 發布於 {{ new Date(report.publishedAt).toLocaleString('zh-TW') }}</p>
        </header>

        <section class="mt-5 grid gap-3 sm:grid-cols-3">
          <div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"><p class="text-xs text-zinc-500">交易筆數</p><p class="mt-2 text-3xl font-semibold">{{ report.snapshot.statistics.totalTrades }}</p></div>
          <div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"><p class="text-xs text-zinc-500">勝率</p><p class="mt-2 text-3xl font-semibold text-sky-300">{{ report.snapshot.statistics.winRate.toFixed(1) }}%</p></div>
          <div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"><p class="text-xs text-zinc-500">淨盈虧</p><p class="mt-2 text-3xl font-semibold" :class="report.snapshot.statistics.netProfitLoss >= 0 ? 'text-emerald-300' : 'text-rose-300'">{{ money(report.snapshot.statistics.netProfitLoss) }}</p></div>
        </section>

        <section class="mt-5 grid gap-3 md:grid-cols-2">
          <div v-for="item in [{ title: '本週總結', value: report.snapshot.reflection.summary }, { title: '做得好的地方', value: report.snapshot.reflection.strengths }, { title: '需要改善', value: report.snapshot.reflection.improvements }, { title: '下週目標', value: report.snapshot.reflection.nextWeekGoal }]" :key="item.title" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"><h2 class="font-semibold">{{ item.title }}</h2><p class="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-400">{{ item.value || '未填寫' }}</p></div>
        </section>

        <section class="mt-5 space-y-4">
          <article v-for="trade in report.snapshot.trades" :key="trade.id" class="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900">
            <div class="flex flex-wrap items-center justify-between gap-3 p-5"><div><h2 class="text-lg font-semibold">{{ trade.symbol }} · {{ trade.direction === 'buy' ? '多單' : '空單' }}</h2><p class="mt-1 text-xs text-zinc-500">{{ trade.date }} {{ trade.time }} · {{ trade.account }} · {{ trade.playbook || trade.signal || '未標記策略' }}</p></div><strong :class="trade.profitLoss >= 0 ? 'text-emerald-300' : 'text-rose-300'">{{ money(trade.profitLoss) }}</strong></div>
            <div class="grid border-t border-zinc-800 sm:grid-cols-2"><div v-if="trade.beforeScreenshot" class="border-b border-zinc-800 sm:border-b-0 sm:border-r"><p class="px-4 py-3 text-xs text-zinc-500">交易前</p><PublicReportImage :data-url="trade.beforeScreenshot.dataUrl" :storage-path="trade.beforeScreenshot.storagePath" alt="交易前截圖" /></div><div v-if="trade.afterScreenshot"><p class="px-4 py-3 text-xs text-zinc-500">交易後</p><PublicReportImage :data-url="trade.afterScreenshot.dataUrl" :storage-path="trade.afterScreenshot.storagePath" alt="交易後截圖" /></div><p v-if="!trade.beforeScreenshot && !trade.afterScreenshot" class="col-span-2 p-5 text-sm text-zinc-600">此筆交易沒有附加截圖。</p></div>
            <section class="border-t border-zinc-800 p-5">
              <p class="text-xs font-semibold tracking-[0.14em] text-violet-400">此筆交易復盤</p>
              <div v-if="trade.review" class="mt-4 grid gap-3 md:grid-cols-2">
                <div class="rounded-2xl bg-zinc-950/50 p-4 md:col-span-2"><p class="text-xs text-zinc-500">復盤總結</p><p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{{ trade.review.summary || '未填寫' }}</p></div>
                <div class="rounded-2xl bg-zinc-950/50 p-4"><p class="text-xs text-zinc-500">做得好的地方</p><p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{{ trade.review.strengths || '未填寫' }}</p></div>
                <div class="rounded-2xl bg-zinc-950/50 p-4"><p class="text-xs text-zinc-500">錯誤與問題</p><p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{{ trade.review.mistakes || '未填寫' }}</p></div>
                <div class="rounded-2xl bg-zinc-950/50 p-4"><p class="text-xs text-zinc-500">改善方式</p><p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{{ trade.review.improvement || '未填寫' }}</p></div>
                <div class="rounded-2xl bg-zinc-950/50 p-4"><p class="text-xs text-zinc-500">下次交易規則</p><p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{{ trade.review.nextTradeRule || '未填寫' }}</p></div>
              </div>
              <p v-else class="mt-3 text-sm text-amber-300">此筆交易尚未填寫復盤。</p>
            </section>
          </article>
        </section>
        <footer class="py-10 text-center text-xs text-zinc-600">此報告由 Freedom OS 產生 · 公開連結僅提供檢視</footer>
      </template>
    </div>
  </main>
</template>
