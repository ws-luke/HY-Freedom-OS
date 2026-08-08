<script setup lang="ts">
import { reactive, watch } from 'vue'

import PlaybookSelect from '@/modules/trades/components/PlaybookSelect.vue'
import TradeScreenshotUploader from '@/modules/trades/components/TradeScreenshotUploader.vue'
import TradeSignalSelect from '@/modules/trades/components/TradeSignalSelect.vue'
import TradeTagEditor from '@/modules/trades/components/TradeTagEditor.vue'
import { formatTradePrice } from '@/services'
import { useSignalStore } from '@/stores/useSignalStore'

import type { TradeMistakeTag, TradeRecord, TradeScreenshot } from '@/types/trade'

type ScreenshotType = 'before' | 'after'

interface ScreenshotChangeData {
  type: ScreenshotType
  name: string
  dataUrl: string
}

interface ContextForm {
  signalId: string | null
  playbook: string
  reason: string
  beforeScreenshot: TradeScreenshot | null
  afterScreenshot: TradeScreenshot | null
  mistakeTags: TradeMistakeTag[]
  customMistakeTags: string[]
}

const props = defineProps<{
  open: boolean
  trade: TradeRecord | null
}>()

const emit = defineEmits<{
  close: []
  submit: [tradeId: string, updates: Partial<TradeRecord>]
}>()

const signalStore = useSignalStore()

const emptyForm = (): ContextForm => ({
  signalId: null,
  playbook: '',
  reason: '',
  beforeScreenshot: null,
  afterScreenshot: null,
  mistakeTags: [],
  customMistakeTags: [],
})

const form = reactive<ContextForm>(emptyForm())

const loadTrade = (): void => {
  if (!props.trade) {
    Object.assign(form, emptyForm())
    return
  }

  Object.assign(form, {
    signalId:
      props.trade.signalId ??
      signalStore.sortedSignals.find(signal => signal.name === props.trade?.signal)?.id ??
      null,
    playbook: props.trade.playbook,
    reason: props.trade.reason,
    beforeScreenshot: props.trade.beforeScreenshot ? { ...props.trade.beforeScreenshot } : null,
    afterScreenshot: props.trade.afterScreenshot ? { ...props.trade.afterScreenshot } : null,
    mistakeTags: [...props.trade.mistakeTags],
    customMistakeTags: [...props.trade.customMistakeTags],
  })
}

const handleScreenshotChange = (screenshot: ScreenshotChangeData): void => {
  const existingStoragePath = screenshot.type === 'before'
    ? form.beforeScreenshot?.storagePath
    : form.afterScreenshot?.storagePath
  const value = {
    name: screenshot.name,
    dataUrl: screenshot.dataUrl,
    storagePath: existingStoragePath ?? null,
  }
  if (screenshot.type === 'before') form.beforeScreenshot = value
  else form.afterScreenshot = value
}

const handleScreenshotRemove = (type: ScreenshotType): void => {
  if (type === 'before') form.beforeScreenshot = null
  else form.afterScreenshot = null
}

const saveContext = (): void => {
  if (!props.trade) return

  emit('submit', props.trade.id, {
    signalId: form.signalId,
    signal: signalStore.getSignalById(form.signalId)?.name ?? '',
    playbook: form.playbook.trim(),
    reason: form.reason.trim(),
    beforeScreenshot: form.beforeScreenshot,
    afterScreenshot: form.afterScreenshot,
    mistakeTags: [...new Set(form.mistakeTags)],
    customMistakeTags: [
      ...new Set(form.customMistakeTags.map(tag => tag.trim()).filter(Boolean)),
    ],
  })
}

watch(
  [() => props.open, () => props.trade],
  ([open]) => {
    if (open) loadTrade()
  },
  { immediate: true },
)
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
        @click.self="emit('close')"
      >
        <section class="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60">
          <header class="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-zinc-800 bg-zinc-950/95 p-6 backdrop-blur">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Review Context</p>
              <h2 class="mt-2 text-2xl font-semibold text-zinc-100">補齊 {{ trade.symbol }} 交易背景</h2>
              <p class="mt-1 text-sm text-zinc-500">MT5 數據保持原樣；這裡只補你的判讀、訊號與圖表紀錄。</p>
            </div>
            <button
              type="button"
              class="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 text-xl text-zinc-500 transition hover:text-zinc-200"
              aria-label="關閉"
              @click="emit('close')"
            >×</button>
          </header>

          <form class="space-y-6 p-6" @submit.prevent="saveContext">
            <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div class="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                <p class="text-[10px] uppercase tracking-wide text-zinc-600">來源</p>
                <p class="mt-2 text-sm font-semibold" :class="trade.dataSource === 'mt5' ? 'text-sky-300' : 'text-zinc-300'">
                  {{ trade.dataSource === 'mt5' ? 'MT5 SYNC' : 'MANUAL' }}
                </p>
              </div>
              <div class="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                <p class="text-[10px] uppercase tracking-wide text-zinc-600">方向</p>
                <p class="mt-2 text-sm font-semibold" :class="trade.direction === 'buy' ? 'text-emerald-300' : 'text-rose-300'">
                  {{ trade.direction === 'buy' ? '多單 BUY' : '空單 SELL' }}
                </p>
              </div>
              <div class="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                <p class="text-[10px] uppercase tracking-wide text-zinc-600">進場</p>
                <p class="mt-2 text-sm font-semibold text-zinc-300">{{ formatTradePrice(trade.entryPrice) }}</p>
              </div>
              <div class="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                <p class="text-[10px] uppercase tracking-wide text-zinc-600">離場</p>
                <p class="mt-2 text-sm font-semibold text-zinc-300">{{ formatTradePrice(trade.exitPrice) }}</p>
              </div>
              <div class="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                <p class="text-[10px] uppercase tracking-wide text-zinc-600">NET P/L</p>
                <p class="mt-2 text-sm font-semibold" :class="trade.profitLoss >= 0 ? 'text-emerald-300' : 'text-rose-300'">
                  {{ trade.profitLoss > 0 ? '+' : '' }}{{ trade.profitLoss.toFixed(2) }}
                </p>
              </div>
            </section>

            <section class="grid gap-5 xl:grid-cols-2">
              <div class="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-5">
                <TradeSignalSelect v-model="form.signalId" />
              </div>
              <div class="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-5">
                <PlaybookSelect v-model="form.playbook" :trade-direction="trade.direction" />
              </div>
            </section>

            <label class="block rounded-3xl border border-zinc-800 bg-zinc-900/50 p-5">
              <span class="text-lg font-semibold text-zinc-100">當時為什麼進場？</span>
              <span class="mt-1 block text-sm text-zinc-500">保留你當下真正看到的結構與理由，不用事後合理化結果。</span>
              <textarea
                v-model="form.reason"
                rows="5"
                placeholder="例如：1H 支撐區反應，15M 止跌，1M 出現 W 型後進場。"
                class="mt-4 w-full resize-y rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm leading-7 text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-sky-500/40"
              />
            </label>

            <section class="grid gap-5 xl:grid-cols-2">
              <TradeScreenshotUploader
                type="before"
                :image-url="form.beforeScreenshot?.dataUrl"
                :storage-path="form.beforeScreenshot?.storagePath"
                @change="handleScreenshotChange"
                @remove="handleScreenshotRemove"
              />
              <TradeScreenshotUploader
                type="after"
                :image-url="form.afterScreenshot?.dataUrl"
                :storage-path="form.afterScreenshot?.storagePath"
                @change="handleScreenshotChange"
                @remove="handleScreenshotRemove"
              />
            </section>

            <TradeTagEditor
              :model-value="form.mistakeTags"
              :custom-tags="form.customMistakeTags"
              @update:model-value="form.mistakeTags = $event"
              @update:custom-tags="form.customMistakeTags = $event"
            />

            <footer class="flex flex-col-reverse gap-3 border-t border-zinc-800 pt-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                class="rounded-xl border border-zinc-700 px-5 py-3 text-sm text-zinc-400 transition hover:text-zinc-200"
                @click="emit('close')"
              >取消</button>
              <button
                type="submit"
                class="rounded-xl bg-sky-300 px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-sky-200"
              >儲存復盤背景</button>
            </footer>
          </form>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
