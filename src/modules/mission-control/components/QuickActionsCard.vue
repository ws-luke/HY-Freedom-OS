<script setup lang="ts">
import { RouterLink } from 'vue-router'

interface QuickAction {
  title: string
  description: string
  route: string
  icon: string
  classes: string
}

const actions: QuickAction[] = [
  {
    title: '盤前規劃',
    description: '確認趨勢、支撐壓力與今日交易方向。',
    route: '/planning',
    icon: '01',
    classes:
      'border-amber-500/20 bg-amber-500/5 text-amber-300 hover:border-amber-500/40 hover:bg-amber-500/10',
  },
  {
    title: '新增交易',
    description: '記錄進場、停損、盈虧與使用策略。',
    route: '/trades',
    icon: '02',
    classes:
      'border-emerald-500/20 bg-emerald-500/5 text-emerald-300 hover:border-emerald-500/40 hover:bg-emerald-500/10',
  },
  {
    title: '交易風控',
    description: '查看今日交易限制、剩餘額度與停止原因。',
    route: '/trading-risk',
    icon: '03',
    classes:
      'border-rose-500/20 bg-rose-500/5 text-rose-300 hover:border-rose-500/40 hover:bg-rose-500/10',
  },
  {
    title: '交易分析',
    description: '查看月份、時段、策略與帳戶績效。',
    route: '/trade-analytics',
    icon: '04',
    classes:
      'border-sky-500/20 bg-sky-500/5 text-sky-300 hover:border-sky-500/40 hover:bg-sky-500/10',
  },
  {
    title: '交易復盤',
    description: '檢查紀律、錯誤與下一次改善方式。',
    route: '/review',
    icon: '05',
    classes:
      'border-cyan-500/20 bg-cyan-500/5 text-cyan-300 hover:border-cyan-500/40 hover:bg-cyan-500/10',
  },
  {
    title: '交易策略庫',
    description: '查看進場條件、禁止條件與策略表現。',
    route: '/playbook',
    icon: '06',
    classes:
      'border-violet-500/20 bg-violet-500/5 text-violet-300 hover:border-violet-500/40 hover:bg-violet-500/10',
  },
  {
    title: '經濟日曆',
    description: '確認重大數據與禁止建立新倉時段。',
    route: '/economic-calendar',
    icon: '07',
    classes:
      'border-orange-500/20 bg-orange-500/5 text-orange-300 hover:border-orange-500/40 hover:bg-orange-500/10',
  },
  {
    title: 'AI 教練',
    description: '查看紀律弱點與目前最重要的改善方向。',
    route: '/ai-coach',
    icon: '08',
    classes:
      'border-fuchsia-500/20 bg-fuchsia-500/5 text-fuchsia-300 hover:border-fuchsia-500/40 hover:bg-fuchsia-500/10',
  },
]
</script>

<template>
  <section
    class="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-xl shadow-black/10"
  >
    <div
      class="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-sky-500/10 blur-3xl"
    />

    <div class="relative">
      <header>
        <p
          class="text-xs font-medium tracking-[0.2em] text-sky-400"
        >
          快速操作
        </p>

        <h2
          class="mt-2 text-xl font-semibold text-zinc-100"
        >
          常用功能
        </h2>

        <p
          class="mt-1 text-sm leading-6 text-zinc-500"
        >
          直接前往今天最常使用的交易工作流程。
        </p>
      </header>

      <div
        class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <RouterLink
          v-for="action in actions"
          :key="action.route"
          :to="action.route"
          class="group rounded-2xl border p-5 transition duration-200"
          :class="action.classes"
        >
          <div
            class="flex items-start justify-between gap-4"
          >
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-current/20 bg-black/10 text-xs font-semibold"
            >
              {{ action.icon }}
            </div>

            <span
              class="text-lg opacity-40 transition group-hover:translate-x-1 group-hover:opacity-100"
            >
              →
            </span>
          </div>

          <h3
            class="mt-5 font-semibold text-zinc-100"
          >
            {{ action.title }}
          </h3>

          <p
            class="mt-2 text-sm leading-6 text-zinc-500"
          >
            {{ action.description }}
          </p>
        </RouterLink>
      </div>
    </div>
  </section>
</template>