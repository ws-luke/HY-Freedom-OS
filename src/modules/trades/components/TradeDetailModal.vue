<script setup lang="ts">
import { computed } from 'vue'
import { formatTradePrice } from '@/services'

import TradeScreenshotUploader from './TradeScreenshotUploader.vue'
import TradeTagEditor from './TradeTagEditor.vue'
import type {
  TradeDirection,
  TradeMistakeTag,
  TradeRecord,
  TradeResult,
  TradeScreenshot,
  TradeStatus,
  TradeExitReason,
} from '@/types/trade'

type ScreenshotType = 'before' | 'after'

interface ScreenshotChangeData {
  type: ScreenshotType
  name: string
  dataUrl: string
}

const props = defineProps<{
  open: boolean
  trade: TradeRecord | null
}>()

const emit = defineEmits<{
  close: []
  edit: [trade: TradeRecord]
  remove: [tradeId: string, symbol: string]
  startReview: [tradeId: string]
  updateScreenshot: [
    tradeId: string,
    type: ScreenshotType,
    screenshot: TradeScreenshot,
  ]
  removeScreenshot: [
    tradeId: string,
    type: ScreenshotType,
  ]
  updateMistakeTags: [
    tradeId: string,
    mistakeTags: TradeMistakeTag[],
  ]
  updateCustomMistakeTags: [
    tradeId: string,
    customMistakeTags: string[],
  ]
  toggleFavorite: [tradeId: string]
}>()

const formatMoney = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

const directionLabel = (
  direction: TradeDirection,
): string => {
  return direction === 'buy' ? '多單' : '空單'
}

const directionClasses = (
  direction: TradeDirection,
): string => {
  return direction === 'buy'
    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
    : 'border-rose-500/25 bg-rose-500/10 text-rose-300'
}

const resultLabel = (
  result: TradeResult,
): string => {
  const labels: Record<TradeResult, string> = {
    win: '獲利',
    loss: '虧損',
    breakeven: '平手',
  }

  return labels[result]
}

const resultClasses = (
  result: TradeResult,
): string => {
  const classes: Record<TradeResult, string> = {
    win: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    loss: 'border-rose-500/25 bg-rose-500/10 text-rose-300',
    breakeven:
      'border-zinc-700 bg-zinc-800/70 text-zinc-300',
  }

  return classes[result]
}

const statusLabel = (
  status: TradeStatus,
): string => {
  const labels: Record<TradeStatus, string> = {
    'waiting-review': '待復盤',
    reviewing: '復盤中',
    completed: '已完成復盤',
  }

  return labels[status]
}

const statusClasses = (
  status: TradeStatus,
): string => {
  const classes: Record<TradeStatus, string> = {
    'waiting-review':
      'border-amber-500/25 bg-amber-500/10 text-amber-300',
    reviewing:
      'border-sky-500/25 bg-sky-500/10 text-sky-300',
    completed:
      'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  }

  return classes[status]
}

const positionStatusLabel = computed(() =>
  props.trade?.positionStatus === 'open' ? '持倉中' : '已平倉',
)

const positionStatusClasses = computed(() =>
  props.trade?.positionStatus === 'open'
    ? 'border-sky-500/25 bg-sky-500/10 text-sky-300'
    : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300',
)

const exitReasonLabel = (reason: TradeExitReason | null): string => {
  if (reason === 'take-profit') return '停利出場'
  if (reason === 'stop-loss') return '停損出場'
  if (reason === 'manual') return '手動出場'
  return '—'
}

const profitLossClasses = computed(() => {
  if (!props.trade) {
    return 'text-zinc-300'
  }

  if (props.trade.profitLoss > 0) {
    return 'text-emerald-300'
  }

  if (props.trade.profitLoss < 0) {
    return 'text-rose-300'
  }

  return 'text-zinc-300'
})

const rMultipleClasses = computed(() => {
  if (!props.trade) {
    return 'text-zinc-300'
  }

  if (props.trade.rMultiple > 0) {
    return 'text-emerald-300'
  }

  if (props.trade.rMultiple < 0) {
    return 'text-rose-300'
  }

  return 'text-zinc-300'
})

const closeModal = (): void => {
  emit('close')
}

const requestRemove = (): void => {
  if (!props.trade) {
    return
  }

  emit(
    'remove',
    props.trade.id,
    props.trade.symbol,
  )
}

const requestEdit = (): void => {
  if (!props.trade) {
    return
  }

  emit('edit', props.trade)
}

const requestReview = (): void => {
  if (!props.trade || props.trade.positionStatus === 'open') {
    return
  }

  emit('startReview', props.trade.id)
}

const requestToggleFavorite = (): void => {
  if (!props.trade) {
    return
  }

  emit('toggleFavorite', props.trade.id)
}

const handleScreenshotChange = (
  screenshot: ScreenshotChangeData,
): void => {
  if (!props.trade) {
    return
  }

  const existing = screenshot.type === 'before'
    ? props.trade.beforeScreenshot
    : props.trade.afterScreenshot

  emit(
    'updateScreenshot',
    props.trade.id,
    screenshot.type,
    {
      name: screenshot.name,
      dataUrl: screenshot.dataUrl,
      storagePath: existing?.storagePath ?? null,
    },
  )
}

const handleScreenshotRemove = (
  type: ScreenshotType,
): void => {
  if (!props.trade) {
    return
  }

  emit(
    'removeScreenshot',
    props.trade.id,
    type,
  )
}

const handleMistakeTagsChange = (
  mistakeTags: TradeMistakeTag[],
): void => {
  if (!props.trade) {
    return
  }

  emit(
    'updateMistakeTags',
    props.trade.id,
    mistakeTags,
  )
}

const handleCustomMistakeTagsChange = (
  customMistakeTags: string[],
): void => {
  if (!props.trade) {
    return
  }

  emit(
    'updateCustomMistakeTags',
    props.trade.id,
    customMistakeTags,
  )
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open && trade"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        @click.self="closeModal"
      >
        <section
          class="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60"
        >
          <header
            class="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-zinc-800 bg-zinc-950/95 p-6 backdrop-blur"
          >
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-2xl font-semibold text-zinc-100">
                  {{ trade.symbol }}
                </h2>

                <span
                  class="rounded-full border px-2.5 py-1 text-xs font-medium"
                  :class="directionClasses(trade.direction)"
                >
                  {{ directionLabel(trade.direction) }}
                </span>

                <span
                  class="rounded-full border px-2.5 py-1 text-xs font-medium"
                  :class="positionStatusClasses"
                >
                  {{ positionStatusLabel }}
                </span>

                <span
                  class="rounded-full border px-2.5 py-1 text-xs font-medium"
                  :class="trade.dataSource === 'mt5' ? 'border-sky-500/20 bg-sky-500/5 text-sky-300' : 'border-zinc-700 text-zinc-500'"
                >
                  {{ trade.dataSource === 'mt5' ? 'MT5 Sync' : 'Manual' }}
                </span>

                <span
                  v-if="trade.positionStatus === 'closed'"
                  class="rounded-full border px-2.5 py-1 text-xs font-medium"
                  :class="resultClasses(trade.result)"
                >
                  {{ resultLabel(trade.result) }}
                </span>

                <span
                  v-if="trade.positionStatus === 'closed'"
                  class="rounded-full border px-2.5 py-1 text-xs font-medium"
                  :class="statusClasses(trade.status)"
                >
                  {{ statusLabel(trade.status) }}
                </span>

                <span
                  v-if="trade.isFavorite"
                  class="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300"
                >
                  ★ 收藏交易
                </span>
              </div>

              <p class="mt-2 text-sm text-zinc-500">
                {{ trade.date }} {{ trade.time }}
                · {{ trade.account }}
              </p>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                class="flex h-10 items-center justify-center rounded-xl border px-4 text-sm font-medium transition"
                :class="
                  trade.isFavorite
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                    : 'border-zinc-800 text-zinc-500 hover:border-amber-500/30 hover:text-amber-300'
                "
                @click="requestToggleFavorite"
              >
                {{ trade.isFavorite ? '★ 已收藏' : '☆ 收藏' }}
              </button>

              <button
                type="button"
                class="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 text-xl text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-200"
                aria-label="關閉視窗"
                @click="closeModal"
              >
                ×
              </button>
            </div>
          </header>

          <div class="space-y-6 p-6">
            <section
              class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
              <div
                class="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"
              >
                <p class="text-xs text-zinc-500">
                  交易盈虧
                </p>

                <p
                  class="mt-2 text-2xl font-semibold"
                  :class="profitLossClasses"
                >
                  <template v-if="trade.positionStatus === 'open'">未結算</template>
                  <template v-else>
                    {{ trade.profitLoss > 0 ? '+' : '' }}{{ formatMoney(trade.profitLoss) }}
                  </template>
                </p>
              </div>

              <div
                class="rounded-2xl border border-sky-500/15 bg-sky-500/5 p-4"
              >
                <p class="text-xs text-sky-300/70">進場訊號</p>
                <p class="mt-2 text-lg font-semibold text-sky-300">{{ trade.signal || '未指定' }}</p>
              </div>

              <div
                class="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"
              >
                <p class="text-xs text-zinc-500">
                  報酬倍數
                </p>

                <p
                  class="mt-2 text-2xl font-semibold"
                  :class="rMultipleClasses"
                >
                  <template v-if="trade.positionStatus === 'open'">未結算</template>
                  <template v-else>
                    {{ trade.rMultiple > 0 ? '+' : '' }}{{ trade.rMultiple.toFixed(2) }}R
                  </template>
                </p>
              </div>

              <div
                class="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"
              >
                <p class="text-xs text-zinc-500">
                  風險金額
                </p>

                <p class="mt-2 text-2xl font-semibold text-zinc-100">
                  {{ formatMoney(trade.riskAmount) }}
                </p>
              </div>

              <div
                class="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"
              >
                <p class="text-xs text-zinc-500">
                  使用策略
                </p>

                <p class="mt-2 text-lg font-semibold text-amber-300">
                  {{ trade.playbook }}
                </p>
              </div>
            </section>

            <section
              v-if="trade.dataSource === 'mt5'"
              class="rounded-3xl border border-sky-500/15 bg-sky-500/5 p-5"
            >
              <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.14em] text-sky-300/70">MT5 SOURCE OF TRUTH</p>
                  <h3 class="mt-1.5 text-lg font-semibold text-zinc-100">Broker 同步資料</h3>
                  <p class="mt-1 text-xs leading-5 text-zinc-500">價格、手數與盈虧由 MT5 同步維護；Freedom OS 保留 Signal、截圖與復盤內容。</p>
                </div>
                <span class="rounded-full border border-sky-500/15 px-2.5 py-1 text-[10px] text-sky-300">
                  {{ trade.syncedAt ? '已同步' : '等待同步' }}
                </span>
              </div>
              <div class="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <div class="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                  <p class="text-[10px] text-zinc-600">POSITION ID</p>
                  <p class="mt-1 truncate text-xs text-zinc-300">{{ trade.brokerPositionId || '—' }}</p>
                </div>
                <div class="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                  <p class="text-[10px] text-zinc-600">DEAL ID</p>
                  <p class="mt-1 truncate text-xs text-zinc-300">{{ trade.brokerDealId || '—' }}</p>
                </div>
                <div class="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                  <p class="text-[10px] text-zinc-600">COMMISSION</p>
                  <p class="mt-1 text-xs text-zinc-300">{{ formatMoney(trade.commission) }}</p>
                </div>
                <div class="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                  <p class="text-[10px] text-zinc-600">SWAP / FEE</p>
                  <p class="mt-1 text-xs text-zinc-300">{{ formatMoney(trade.swap + trade.fee) }}</p>
                </div>
              </div>
            </section>

            <section
              class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
            >
              <h3 class="text-lg font-semibold text-zinc-100">
                價格資料
              </h3>

              <div
                class="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
              >
                <div
                  class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
                >
                  <p class="text-xs text-zinc-500">
                    進場價格
                  </p>

                  <p class="mt-2 text-lg font-semibold text-zinc-200">
                    {{ formatTradePrice(trade.entryPrice) }}
                  </p>
                </div>

                <div
                  class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
                >
                  <p class="text-xs text-zinc-500">
                    手數（倉位）
                  </p>

                  <p class="mt-2 text-lg font-semibold text-zinc-200">
                    {{ trade.lotSize ? `${trade.lotSize.toFixed(2)} lot` : '—' }}
                  </p>
                </div>

                <div
                  class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
                >
                  <p class="text-xs text-zinc-500">
                    離場價格
                  </p>

                  <p class="mt-2 text-lg font-semibold text-zinc-200">
                    {{ formatTradePrice(trade.exitPrice) }}
                  </p>

                  <p v-if="trade.positionStatus === 'closed'" class="mt-1 text-xs text-zinc-600">
                    {{ exitReasonLabel(trade.exitReason) }}
                  </p>
                </div>

                <div
                  class="rounded-2xl border border-rose-500/15 bg-rose-500/5 p-4"
                >
                  <p class="text-xs text-rose-300/70">
                    停損價格
                  </p>

                  <p class="mt-2 text-lg font-semibold text-rose-300">
                    {{ formatTradePrice(trade.stopLoss) }}
                  </p>
                </div>

                <div
                  class="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4"
                >
                  <p class="text-xs text-emerald-300/70">
                    停利價格
                  </p>

                  <p class="mt-2 text-lg font-semibold text-emerald-300">
                    {{ formatTradePrice(trade.takeProfit) }}
                  </p>
                </div>
              </div>
            </section>

            <section
              class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
            >
              <h3 class="text-lg font-semibold text-zinc-100">
                進場理由
              </h3>

              <p
                class="mt-4 whitespace-pre-wrap text-sm leading-7 text-zinc-300"
              >
                {{ trade.reason }}
              </p>
            </section>

            <TradeTagEditor
              :model-value="trade.mistakeTags"
              :custom-tags="trade.customMistakeTags"
              @update:model-value="handleMistakeTagsChange"
              @update:custom-tags="handleCustomMistakeTagsChange"
            />

            <section>
              <div>
                <h3 class="text-lg font-semibold text-zinc-100">
                  交易圖表
                </h3>

                <p class="mt-1 text-sm leading-6 text-zinc-500">
                  可在交易詳情中新增、更換或移除圖表截圖。
                </p>
              </div>

              <div class="mt-5 grid gap-5 xl:grid-cols-2">
                <TradeScreenshotUploader
                  type="before"
                  :image-url="
                    trade.beforeScreenshot?.dataUrl
                  "
                  :storage-path="trade.beforeScreenshot?.storagePath"
                  @change="handleScreenshotChange"
                  @remove="handleScreenshotRemove"
                />

                <TradeScreenshotUploader
                  type="after"
                  :image-url="
                    trade.afterScreenshot?.dataUrl
                  "
                  :storage-path="trade.afterScreenshot?.storagePath"
                  @change="handleScreenshotChange"
                  @remove="handleScreenshotRemove"
                />
              </div>
            </section>

            <section
              class="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-5"
            >
              <h3 class="font-semibold text-amber-300">
                復盤提醒
              </h3>

              <p
                class="mt-2 text-sm leading-7 text-amber-200/70"
              >
                請比較交易前後截圖與錯誤標籤，確認這筆交易是否存在追價、提前進場、沒有確認或違反風險規則。
              </p>
            </section>

            <footer
              class="flex flex-col-reverse gap-3 border-t border-zinc-800 pt-6 sm:flex-row sm:justify-between"
            >
              <button
                v-if="trade.dataSource !== 'mt5'"
                type="button"
                class="rounded-xl border border-rose-500/20 px-5 py-3 text-sm font-medium text-rose-300 transition hover:border-rose-500/40 hover:bg-rose-500/10"
                @click="requestRemove"
              >
                刪除交易
              </button>

              <div class="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  class="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-medium text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
                  @click="closeModal"
                >
                  關閉
                </button>
                <button
                  v-if="trade.dataSource !== 'mt5'"
                  type="button"
                  class="rounded-xl border border-sky-500/25 bg-sky-500/10 px-5 py-3 text-sm font-medium text-sky-300 transition hover:border-sky-400/40 hover:bg-sky-500/15"
                  @click="requestEdit"
                >
                  {{ trade.positionStatus === 'open' ? '平倉 / 更新持倉' : '編輯交易' }}
                </button>
                <button
                  v-if="trade.positionStatus === 'closed'"
                  type="button"
                  class="rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-3 text-sm font-medium text-amber-300 transition hover:border-amber-400/50 hover:bg-amber-500/15"
                  @click="requestReview"
                >
                  {{
                    trade.status === 'waiting-review'
                      ? '開始復盤'
                      : trade.status === 'reviewing'
                        ? '繼續復盤'
                        : '查看復盤'
                  }}
                </button>
              </div>
            </footer>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
