<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import NotificationCenter from '@/components/NotificationCenter.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'

const route = useRoute()

const pageTitleMap: Record<string, string> = {
  'mission-control': '任務總控台',
  planning: '盤前規劃',
  'economic-calendar': '經濟日曆',
  trades: '交易紀錄',
  'trade-analytics': '交易分析',
  'trading-risk': '交易風控',
  playbook: '交易策略庫',
  review: '復盤與檢討',
  'ai-coach': 'AI 教練',
  accounts: '帳戶管理',
  investment: '資金管理',
  tools: '工具箱',
  settings: '設定中心',
}

const pageTitle = computed(() => {
  const routeName = String(route.name ?? '')

  return (
    pageTitleMap[routeName] ??
    'HY 自由交易系統'
  )
})

const formattedDate = computed(() =>
  new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).format(new Date()),
)
</script>

<template>
  <header
    class="hy-topbar sticky top-0 z-30 border-b backdrop-blur-xl"
  >
    <div
      class="mx-auto flex h-16 w-full max-w-[1800px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
    >
      <div class="min-w-0">
        <p class="text-xs text-zinc-500">
          HY 自由交易系統
        </p>

        <h1
          class="mt-0.5 truncate text-base font-semibold text-zinc-100"
        >
          {{ pageTitle }}
        </h1>
      </div>

      <div
        class="flex shrink-0 items-center gap-3"
      >
        <div
          class="hidden rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-400 sm:block"
        >
          {{ formattedDate }}
        </div>

        <ThemeToggle />

        <NotificationCenter />
      </div>
    </div>
  </header>
</template>
