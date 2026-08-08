<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import AccountIcon from './AccountIcon.vue'
import { useTradeStore } from '@/stores/useTradeStore'

import type { TradingAccount } from '@/types/account'

const props = defineProps<{ account: TradingAccount }>()

const emit = defineEmits<{
  configure: [account: TradingAccount]
  sync: [account: TradingAccount]
}>()

const tradeStore = useTradeStore()
const { trades } = storeToRefs(tradeStore)

const syncedTrades = computed(() =>
  trades.value.filter(trade =>
    trade.accountId === props.account.id && trade.dataSource === 'mt5',
  ),
)

const pendingReviewCount = computed(() =>
  syncedTrades.value.filter(trade =>
    trade.positionStatus === 'closed' && trade.status !== 'completed',
  ).length,
)

const syncStatus = computed(() => {
  if (props.account.dataSource !== 'mt5') {
    return { label: 'Manual', classes: 'border-zinc-700 bg-zinc-800/60 text-zinc-400' }
  }

  const values = {
    pending: { label: '尚未同步', classes: 'border-amber-400/20 bg-amber-400/[0.06] text-amber-300' },
    connected: { label: '已連線', classes: 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300' },
    syncing: { label: '同步中', classes: 'border-sky-400/20 bg-sky-400/[0.06] text-sky-300' },
    error: { label: '同步異常', classes: 'border-rose-400/20 bg-rose-400/[0.06] text-rose-300' },
    manual: { label: 'Manual', classes: 'border-zinc-700 bg-zinc-800/60 text-zinc-400' },
  }

  return values[props.account.syncStatus]
})

const lastSyncedLabel = computed(() => {
  if (!props.account.lastSyncedAt) return '尚未同步'
  const date = new Date(props.account.lastSyncedAt)
  if (Number.isNaN(date.getTime())) return props.account.lastSyncedAt

  return new Intl.DateTimeFormat('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
})

const brokerLoginLabel = computed(() => {
  const login = props.account.brokerLogin.trim()
  if (!login) return '未設定'
  if (login.length <= 4) return login
  return `•••• ${login.slice(-4)}`
})
</script>

<template>
  <section class="overflow-hidden rounded-[1.75rem] border border-sky-400/10 bg-[#111113] shadow-xl shadow-black/15">
    <header class="flex flex-col gap-4 border-b border-white/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-400/[0.08] text-sky-300">
          <AccountIcon name="activity" :size="18" />
        </div>
        <div>
          <p class="text-[10px] font-semibold uppercase tracking-[0.17em] text-sky-300/55">Broker Cloud Pipeline · Multi-Account</p>
          <h2 class="mt-1 text-base font-semibold text-zinc-100">MT5 多帳戶自動交易資料 · AUTO</h2>
        </div>
      </div>
      <span class="w-fit rounded-full border px-2.5 py-1 text-[10px] font-medium" :class="syncStatus.classes">
        {{ syncStatus.label }}
      </span>
    </header>

    <div v-if="account.dataSource === 'mt5'" class="p-5 sm:p-6">
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-xl border border-white/[0.06] bg-black/15 p-3.5">
          <p class="text-[10px] text-zinc-700">MT5 SERVER</p>
          <p class="mt-1.5 truncate text-sm font-medium text-zinc-300">{{ account.brokerServer || '未設定' }}</p>
        </div>
        <div class="rounded-xl border border-white/[0.06] bg-black/15 p-3.5">
          <p class="text-[10px] text-zinc-700">LOGIN</p>
          <p class="mt-1.5 truncate text-sm font-medium text-zinc-300">{{ brokerLoginLabel }}</p>
        </div>
        <div class="rounded-xl border border-white/[0.06] bg-black/15 p-3.5">
          <p class="text-[10px] text-zinc-700">同步交易</p>
          <p class="mt-1.5 text-sm font-semibold text-emerald-300">{{ syncedTrades.length }} 筆</p>
        </div>
        <div class="rounded-xl border border-white/[0.06] bg-black/15 p-3.5">
          <p class="text-[10px] text-zinc-700">待復盤</p>
          <p class="mt-1.5 text-sm font-semibold" :class="pendingReviewCount ? 'text-amber-300' : 'text-zinc-400'">{{ pendingReviewCount }} 筆</p>
        </div>
      </div>

      <div class="mt-4 flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-xs font-medium text-zinc-400">最後同步 · {{ lastSyncedLabel }}</p>
          <p class="mt-1 text-[11px] leading-5 text-zinc-700">
            每個帳戶配對一次並啟用 Windows 安全記住後，Agent 會自動輪流切換 FTMO／模擬／真倉並增量抓單；Position ID 會持續更新同一筆交易直到平倉。
          </p>
          <p v-if="account.syncError" class="mt-2 text-[11px] text-rose-300">{{ account.syncError }}</p>
        </div>
        <div class="flex shrink-0 gap-2">
          <button
            type="button"
            class="rounded-xl border border-white/[0.08] px-3.5 py-2.5 text-xs text-zinc-500 transition hover:text-zinc-300"
            @click="emit('configure', account)"
          >
            設定
          </button>
          <button
            type="button"
            class="rounded-xl bg-sky-300 px-4 py-2.5 text-xs font-semibold text-zinc-950 transition hover:bg-sky-200"
            @click="emit('sync', account)"
          >
            {{ account.lastSyncedAt ? '立即同步' : '連接 MT5' }}
          </button>
        </div>
      </div>
    </div>

    <div v-else class="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div>
        <p class="text-sm font-medium text-zinc-300">此帳戶目前使用手動紀錄</p>
        <p class="mt-1 text-xs leading-5 text-zinc-600">既有功能完全保留。若這是 MT5 帳戶，可切換為 MT5 Sync，之後由同步服務自動補交易。</p>
      </div>
      <button
        type="button"
        class="shrink-0 rounded-xl border border-white/[0.08] px-4 py-2.5 text-xs text-zinc-400 transition hover:border-sky-400/20 hover:text-sky-300"
        @click="emit('configure', account)"
      >
        設定資料來源
      </button>
    </div>
  </section>
</template>
