<script setup lang="ts">
import { storeToRefs } from 'pinia'

import TradeDataTools from '@/modules/trades/components/TradeDataTools.vue'
import TradingRiskSettingsCard from '@/modules/trades/components/TradingRiskSettingsCard.vue'
import DataVaultCard from '../components/DataVaultCard.vue'
import CloudFoundationCard from '../components/CloudFoundationCard.vue'
import CloudAccountCard from '../components/CloudAccountCard.vue'
import CloudProductionHealthCard from '../components/CloudProductionHealthCard.vue'
import PwaInstallCard from '../components/PwaInstallCard.vue'
import ProductionRuntimeCard from '../components/ProductionRuntimeCard.vue'
import { useTradeStore } from '@/stores/useTradeStore'
import { useNotificationStore } from '@/stores/useNotificationStore'
import { useThemeStore } from '@/stores/useThemeStore'
import type { TradeRecord } from '@/types/trade'

const tradeStore = useTradeStore()
const themeStore = useThemeStore()

const {
  sortedTrades,
} = storeToRefs(tradeStore)

const importTradeData = (
  importedTrades: TradeRecord[],
): void => {
  const result =
    tradeStore.importTrades(importedTrades)

  window.alert(
    [
      '交易資料匯入完成。',
      `新增：${result.added} 筆`,
      `更新：${result.updated} 筆`,
      `目前總數：${result.total} 筆`,
    ].join('\n'),
  )
}

const resetTradeData = (): void => {
  const confirmed = window.confirm(
    [
      '確定要重設所有交易資料嗎？',
      '',
      '目前交易紀錄將被預設範例資料取代。',
      '建議先匯出 JSON 備份。',
    ].join('\n'),
  )

  if (!confirmed) {
    return
  }
const notificationStore = useNotificationStore()
tradeStore.resetTrades()

notificationStore.addNotification({
  type: 'warning',
  title: '交易資料已重設',
  message: '所有交易紀錄已恢復為預設範例資料。',
  route: '/trades',
})
}
</script>

<template>
  <div class="space-y-6 pb-10">
    <section
      class="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl shadow-black/10"
    >
      <div
        class="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl"
      />

      <div class="relative">
        <p
          class="text-xs font-medium tracking-[0.2em] text-violet-400"
        >
          SYSTEM SETTINGS
        </p>

        <h1
          class="mt-2 text-3xl font-bold text-zinc-100"
        >
          Settings v3 · 設定中心
        </h1>

        <p
          class="mt-2 max-w-3xl text-sm leading-7 text-zinc-400"
        >
          管理交易風控、資料備份與 Freedom OS 系統資訊。
        </p>
      </div>
    </section>

    <section
      class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6"
    >
      <header>
        <p
          class="text-xs font-medium tracking-[0.2em] text-amber-400"
        >
          APPEARANCE
        </p>

        <h2
          class="mt-2 text-xl font-semibold text-zinc-100"
        >
          顯示主題
        </h2>

        <p
          class="mt-1 text-sm leading-6 text-zinc-500"
        >
          選擇適合目前環境的介面。系統會自動記住你的選擇。
        </p>
      </header>

      <div class="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          class="hy-theme-choice"
          :class="{ 'hy-theme-choice-active': themeStore.theme === 'dark' }"
          :aria-pressed="themeStore.theme === 'dark'"
          @click="themeStore.setTheme('dark')"
        >
          <span class="hy-theme-preview hy-theme-preview-dark">
            <span />
            <span />
            <span />
          </span>

          <span>
            <strong>暗色模式</strong>
            <small>低光環境、長時間盯盤</small>
          </span>

          <span
            v-if="themeStore.theme === 'dark'"
            class="hy-theme-check"
          >✓</span>
        </button>

        <button
          type="button"
          class="hy-theme-choice"
          :class="{ 'hy-theme-choice-active': themeStore.theme === 'light' }"
          :aria-pressed="themeStore.theme === 'light'"
          @click="themeStore.setTheme('light')"
        >
          <span class="hy-theme-preview hy-theme-preview-light">
            <span />
            <span />
            <span />
          </span>

          <span>
            <strong>亮色模式</strong>
            <small>日間使用、清楚高對比</small>
          </span>

          <span
            v-if="themeStore.theme === 'light'"
            class="hy-theme-check"
          >✓</span>
        </button>
      </div>
    </section>

    <TradingRiskSettingsCard />

    <CloudFoundationCard />

    <CloudAccountCard />

    <CloudProductionHealthCard />

    <PwaInstallCard />

    <ProductionRuntimeCard />

    <DataVaultCard />

    <TradeDataTools
      :trades="sortedTrades"
      @import="importTradeData"
    />

    <section
      class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6"
    >
      <header>
        <p
          class="text-xs font-medium tracking-[0.2em] text-rose-400"
        >
          危險區域
        </p>

        <h2
          class="mt-2 text-xl font-semibold text-zinc-100"
        >
          重設交易資料
        </h2>

        <p
          class="mt-1 text-sm leading-6 text-zinc-500"
        >
          將目前交易紀錄恢復成系統預設範例資料。
        </p>
      </header>

      <div
        class="mt-6 flex flex-col gap-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p class="font-medium text-rose-300">
            重設所有交易紀錄
          </p>

          <p
            class="mt-1 text-sm leading-6 text-zinc-500"
          >
            此操作會覆蓋目前的交易資料，執行前請先匯出 JSON 備份。
          </p>
        </div>

        <button
          type="button"
          class="shrink-0 rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 py-3 text-sm font-medium text-rose-300 transition hover:border-rose-400/50 hover:bg-rose-500/15"
          @click="resetTradeData"
        >
          重設交易資料
        </button>
      </div>
    </section>

    <section
      class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6"
    >
      <header>
        <p
          class="text-xs font-medium tracking-[0.2em] text-sky-400"
        >
          SYSTEM
        </p>

        <h2
          class="mt-2 text-xl font-semibold text-zinc-100"
        >
          系統資訊
        </h2>
      </header>

      <div
        class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
        >
          <p class="text-xs text-zinc-500">
            系統名稱
          </p>

          <p class="mt-2 font-semibold text-zinc-200">
            HY Freedom OS
          </p>
        </div>

        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
        >
          <p class="text-xs text-zinc-500">
            版本
          </p>

          <p class="mt-2 font-semibold text-zinc-200">
            v1.0
          </p>
        </div>

        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
        >
          <p class="text-xs text-zinc-500">
            資料儲存
          </p>

          <p class="mt-2 font-semibold text-zinc-200">
            Browser Local Storage
          </p>
        </div>

        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
        >
          <p class="text-xs text-zinc-500">
            交易紀錄
          </p>

          <p class="mt-2 font-semibold text-zinc-200">
            {{ sortedTrades.length }} 筆
          </p>
        </div>
      </div>
    </section>
  </div>
</template>
