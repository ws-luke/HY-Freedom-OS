<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  messages: string[]
  riskLevel?: number
}>()

const title = computed(() => {
  if ((props.riskLevel ?? 0) >= 5) {
    return '今日高風險提醒'
  }

  if ((props.riskLevel ?? 0) >= 4) {
    return '今日風險提醒'
  }

  return '今日交易建議'
})

const statusText = computed(() => {
  if ((props.riskLevel ?? 0) >= 5) {
    return '暫緩進場'
  }

  if ((props.riskLevel ?? 0) >= 4) {
    return '降低頻率'
  }

  return '正常觀察'
})

const statusClasses = computed(() => {
  if ((props.riskLevel ?? 0) >= 5) {
    return 'border-rose-500/25 bg-rose-500/10 text-rose-300'
  }

  if ((props.riskLevel ?? 0) >= 4) {
    return 'border-amber-500/25 bg-amber-500/10 text-amber-300'
  }

  return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
})
</script>

<template>
  <section
    class="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl shadow-black/10"
  >
    <div
      class="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-amber-500/10 blur-3xl"
    />

    <div class="relative">
      <header class="flex items-start justify-between gap-4">
        <div>
          <p class="text-xs font-medium tracking-[0.2em] text-amber-400">
            智慧提醒
          </p>

          <h2 class="mt-2 text-xl font-semibold text-zinc-100">
            {{ title }}
          </h2>

          <p class="mt-1 text-sm leading-6 text-zinc-500">
            根據今日事件與風險程度整理出的交易建議。
          </p>
        </div>

        <div
          class="rounded-full border px-3 py-1 text-xs font-medium"
          :class="statusClasses"
        >
          {{ statusText }}
        </div>
      </header>

      <div
        class="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5"
      >
        <p class="text-xs text-zinc-500">
          今日核心提醒
        </p>

        <p class="mt-3 text-2xl font-semibold leading-relaxed text-zinc-100">
          沒有必要在重大數據前搶先進場。
        </p>

        <p class="mt-3 text-sm leading-7 text-zinc-400">
          等待數據公布、波動恢復與市場結構重新確認後，再依照你的交易劇本判斷是否進場。
        </p>
      </div>

      <div
        v-if="messages.length"
        class="mt-5 space-y-3"
      >
        <article
          v-for="(message, index) in messages"
          :key="`${index}-${message}`"
          class="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"
        >
          <div
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-500/25 bg-amber-500/10 text-xs font-semibold text-amber-300"
          >
            {{ index + 1 }}
          </div>

          <p class="text-sm leading-6 text-zinc-300">
            {{ message }}
          </p>
        </article>
      </div>

      <div
        v-else
        class="mt-5 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 p-8 text-center"
      >
        <p class="text-sm text-zinc-500">
          目前沒有額外提醒。
        </p>
      </div>

      <div
        class="mt-5 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4"
      >
        <p class="text-sm font-medium text-emerald-300">
          建議執行順序
        </p>

        <p class="mt-2 text-sm leading-6 text-emerald-200/70">
          查看事件時間 → 避開禁止時段 → 等待波動穩定 → 重新確認支撐、壓力與低週期訊號。
        </p>
      </div>
    </div>
  </section>
</template>