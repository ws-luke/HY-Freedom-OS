<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'

import CloudMediaImage from '@/components/CloudMediaImage.vue'
import { optimizeScreenshotFile } from '@/services/screenshot-optimization.service'
import { useConfirmDialogStore } from '@/stores/useConfirmDialogStore'
import { useSignalStore } from '@/stores/useSignalStore'
import { useTradeStore } from '@/stores/useTradeStore'
import type { SignalDirection, SignalInput, SignalRecord, SignalStatus } from '@/types/signal'

const confirmDialog = useConfirmDialogStore()
const signalStore = useSignalStore()
const tradeStore = useTradeStore()
const { sortedSignals } = storeToRefs(signalStore)
const { sortedClosedTrades } = storeToRefs(tradeStore)

const isEditorOpen = ref(false)
const editingId = ref<string | null>(null)
const ruleDraft = ref('')
const imageError = ref('')

const emptyForm = (): SignalInput => ({
  name: '',
  description: '',
  direction: 'both',
  status: 'testing',
  timeframe: '1M / 5M',
  confirmationRules: [],
  screenshot: null,
})

const form = reactive<SignalInput>(emptyForm())

const activeCount = computed(() => sortedSignals.value.filter(signal => signal.status === 'active').length)

const performance = (signal: SignalRecord) => {
  const trades = sortedClosedTrades.value.filter(
    trade => trade.signalId === signal.id || (!trade.signalId && trade.signal === signal.name),
  )
  const wins = trades.filter(trade => trade.result === 'win').length
  const totalR = trades.reduce((sum, trade) => sum + trade.rMultiple, 0)

  return {
    trades: trades.length,
    winRate: trades.length ? Math.round((wins / trades.length) * 100) : 0,
    averageR: trades.length ? Number((totalR / trades.length).toFixed(2)) : 0,
  }
}

const directionLabel = (direction: SignalDirection): string => ({
  buy: '多單',
  sell: '空單',
  both: '雙向',
}[direction])

const statusLabel = (status: SignalStatus): string => ({
  active: '正式使用',
  testing: '測試中',
  paused: '已暫停',
}[status])

const openCreate = (): void => {
  editingId.value = null
  Object.assign(form, emptyForm())
  ruleDraft.value = ''
  imageError.value = ''
  isEditorOpen.value = true
}

const openEdit = (signal: SignalRecord): void => {
  editingId.value = signal.id
  Object.assign(form, {
    name: signal.name,
    description: signal.description,
    direction: signal.direction,
    status: signal.status,
    timeframe: signal.timeframe,
    confirmationRules: [...signal.confirmationRules],
    screenshot: signal.screenshot ? { ...signal.screenshot } : null,
  })
  ruleDraft.value = ''
  imageError.value = ''
  isEditorOpen.value = true
}

const addRule = (): void => {
  const rule = ruleDraft.value.trim()
  if (!rule || form.confirmationRules.includes(rule)) return
  form.confirmationRules.push(rule)
  ruleDraft.value = ''
}

const removeRule = (index: number): void => {
  form.confirmationRules.splice(index, 1)
}

const handleImage = (event: Event): void => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  imageError.value = ''
  if (!file) return

  if (!file.type.startsWith('image/')) {
    imageError.value = '只能上傳圖片檔。'
    return
  }

  if (file.size > 2_500_000) {
    imageError.value = '圖例請控制在 2.5 MB 以內。'
    return
  }

  void optimizeScreenshotFile(file).then(optimized => {
    form.screenshot = {
      name: optimized.name,
      dataUrl: optimized.dataUrl,
      storagePath: form.screenshot?.storagePath ?? null,
    }
  }).catch(() => {
    imageError.value = '圖例讀取或最佳化失敗。'
  })
}

const saveSignal = (): void => {
  if (!form.name.trim() || !form.description.trim()) return

  const input: SignalInput = {
    ...form,
    name: form.name.trim(),
    description: form.description.trim(),
    timeframe: form.timeframe.trim(),
    confirmationRules: form.confirmationRules.map(rule => rule.trim()).filter(Boolean),
  }

  if (editingId.value) signalStore.updateSignal(editingId.value, input)
  else signalStore.addSignal(input)

  isEditorOpen.value = false
}

const removeSignal = async (signal: SignalRecord): Promise<void> => {
  const confirmed = await confirmDialog.ask({
    title: `刪除「${signal.name}」訊號？`,
    message: '訊號會從資料庫移除；舊交易紀錄中的訊號名稱仍會保留。',
    confirmLabel: '確認刪除',
    tone: 'danger',
  })
  if (!confirmed) return
  signalStore.removeSignal(signal.id)
}
</script>

<template>
  <section class="overflow-hidden rounded-3xl border border-sky-500/15 bg-zinc-900/70 shadow-xl shadow-black/10">
    <header class="flex flex-col gap-4 border-b border-zinc-800 p-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p class="text-xs font-medium tracking-[0.2em] text-sky-400">SIGNAL LIBRARY</p>
        <h2 class="mt-2 text-xl font-semibold text-zinc-100">進場訊號資料庫</h2>
        <p class="mt-1 text-sm leading-6 text-zinc-500">訊號是「為什麼現在按下進場」；可自行新增、編輯、刪除確認條件與圖例。</p>
      </div>
      <div class="flex items-center gap-3">
        <span class="rounded-full border border-zinc-700 bg-zinc-950/60 px-3 py-1.5 text-xs text-zinc-500">
          {{ sortedSignals.length }} 個訊號 · {{ activeCount }} 個啟用
        </span>
        <button
          type="button"
          class="rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-2.5 text-sm font-medium text-sky-300 transition hover:bg-sky-500/15"
          @click="openCreate"
        >
          ＋ 新增訊號
        </button>
      </div>
    </header>

    <div class="grid gap-3 p-5 md:grid-cols-2 2xl:grid-cols-3 sm:p-6">
      <article
        v-for="signal in sortedSignals"
        :key="signal.id"
        class="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/45"
      >
        <div v-if="signal.screenshot" class="aspect-[16/7] overflow-hidden border-b border-zinc-800 bg-black/20">
          <CloudMediaImage
            :data-url="signal.screenshot.dataUrl"
            :storage-path="signal.screenshot.storagePath"
            :alt="`${signal.name} 圖例`"
            class="h-full w-full object-cover"
          />
        </div>
        <div class="p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="font-semibold text-zinc-100">{{ signal.name }}</h3>
                <span class="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400">{{ directionLabel(signal.direction) }}</span>
              </div>
              <p class="mt-1 text-[10px] text-zinc-600">{{ signal.timeframe }} · {{ statusLabel(signal.status) }}</p>
            </div>
            <span class="h-2 w-2 rounded-full" :class="signal.status === 'active' ? 'bg-emerald-400' : signal.status === 'testing' ? 'bg-amber-400' : 'bg-zinc-600'" />
          </div>

          <p class="mt-3 text-sm leading-6 text-zinc-400">{{ signal.description }}</p>

          <div class="mt-3 grid grid-cols-3 gap-2">
            <div class="rounded-xl bg-white/[0.025] p-2.5">
              <p class="text-[9px] text-zinc-700">樣本</p>
              <p class="mt-1 text-xs font-semibold text-zinc-400">{{ performance(signal).trades }}</p>
            </div>
            <div class="rounded-xl bg-white/[0.025] p-2.5">
              <p class="text-[9px] text-zinc-700">勝率</p>
              <p class="mt-1 text-xs font-semibold text-emerald-300">{{ performance(signal).winRate }}%</p>
            </div>
            <div class="rounded-xl bg-white/[0.025] p-2.5">
              <p class="text-[9px] text-zinc-700">平均 R</p>
              <p class="mt-1 text-xs font-semibold text-amber-300">{{ performance(signal).averageR.toFixed(2) }}R</p>
            </div>
          </div>

          <div v-if="signal.confirmationRules.length" class="mt-3 flex flex-wrap gap-1.5">
            <span
              v-for="rule in signal.confirmationRules.slice(0, 3)"
              :key="rule"
              class="rounded-lg bg-white/[0.04] px-2 py-1 text-[10px] text-zinc-500"
            >
              {{ rule }}
            </span>
          </div>

          <div class="mt-4 flex justify-end gap-2 border-t border-zinc-800 pt-3">
            <button type="button" class="px-3 py-1.5 text-xs text-zinc-500 transition hover:text-sky-300" @click="openEdit(signal)">編輯</button>
            <button type="button" class="px-3 py-1.5 text-xs text-zinc-600 transition hover:text-rose-300" @click="removeSignal(signal)">刪除</button>
          </div>
        </div>
      </article>
    </div>
  </section>

  <Teleport to="body">
    <div
      v-if="isEditorOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      @click.self="isEditorOpen = false"
    >
      <form
        class="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl"
        @submit.prevent="saveSignal"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-medium tracking-[0.18em] text-sky-400">SIGNAL EDITOR</p>
            <h2 class="mt-2 text-2xl font-semibold text-zinc-100">{{ editingId ? '編輯進場訊號' : '新增進場訊號' }}</h2>
          </div>
          <button type="button" class="text-2xl text-zinc-600 hover:text-zinc-300" @click="isEditorOpen = false">×</button>
        </div>

        <div class="mt-6 grid gap-4 sm:grid-cols-2">
          <label>
            <span class="text-sm text-zinc-300">訊號名稱</span>
            <input v-model="form.name" required placeholder="例如：W 型" class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none focus:border-sky-500/40" />
          </label>
          <label>
            <span class="text-sm text-zinc-300">使用週期</span>
            <input v-model="form.timeframe" placeholder="1M / 5M" class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none focus:border-sky-500/40" />
          </label>
          <label>
            <span class="text-sm text-zinc-300">方向</span>
            <select v-model="form.direction" class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none">
              <option value="buy">多單</option><option value="sell">空單</option><option value="both">雙向</option>
            </select>
          </label>
          <label>
            <span class="text-sm text-zinc-300">狀態</span>
            <select v-model="form.status" class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none">
              <option value="active">正式使用</option><option value="testing">測試中</option><option value="paused">暫停</option>
            </select>
          </label>
        </div>

        <label class="mt-4 block">
          <span class="text-sm text-zinc-300">訊號說明</span>
          <textarea v-model="form.description" required rows="3" class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm leading-6 text-zinc-100 outline-none focus:border-sky-500/40" />
        </label>

        <section class="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p class="text-sm font-medium text-zinc-300">確認條件</p>
          <div class="mt-3 flex gap-2">
            <input v-model="ruleDraft" placeholder="輸入一條確認規則" class="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none" @keydown.enter.prevent="addRule" />
            <button type="button" class="rounded-xl border border-sky-500/20 px-4 text-sm text-sky-300" @click="addRule">加入</button>
          </div>
          <div class="mt-3 space-y-2">
            <div v-for="(rule, index) in form.confirmationRules" :key="`${index}-${rule}`" class="flex items-center justify-between gap-3 rounded-xl bg-black/15 px-3 py-2 text-xs text-zinc-400">
              <span>{{ index + 1 }}. {{ rule }}</span>
              <button type="button" class="text-zinc-600 hover:text-rose-300" @click="removeRule(index)">移除</button>
            </div>
          </div>
        </section>

        <section class="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-sm font-medium text-zinc-300">訊號圖例</p>
              <p class="mt-1 text-xs text-zinc-600">上傳你自己的 TradingView 範例圖，之後可直接對照。</p>
            </div>
            <label class="cursor-pointer rounded-xl border border-zinc-700 px-4 py-2 text-xs text-zinc-400 hover:border-sky-500/30 hover:text-sky-300">
              選擇圖片
              <input type="file" accept="image/*" class="hidden" @change="handleImage" />
            </label>
          </div>
          <p v-if="imageError" class="mt-2 text-xs text-rose-300">{{ imageError }}</p>
          <div v-if="form.screenshot" class="mt-3 overflow-hidden rounded-xl border border-zinc-800">
            <CloudMediaImage
              :data-url="form.screenshot.dataUrl"
              :storage-path="form.screenshot.storagePath"
              :alt="form.screenshot.name"
              class="max-h-64 w-full object-contain bg-black/20"
            />
            <div class="flex items-center justify-between gap-3 px-3 py-2 text-xs text-zinc-600">
              <span class="truncate">{{ form.screenshot.name }}</span>
              <button type="button" class="text-rose-300" @click="form.screenshot = null">移除</button>
            </div>
          </div>
        </section>

        <footer class="mt-6 flex justify-end gap-3 border-t border-zinc-800 pt-5">
          <button type="button" class="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm text-zinc-400" @click="isEditorOpen = false">取消</button>
          <button type="submit" class="rounded-xl border border-sky-500/25 bg-sky-500/10 px-5 py-2.5 text-sm font-medium text-sky-300">{{ editingId ? '儲存修改' : '建立訊號' }}</button>
        </footer>
      </form>
    </div>
  </Teleport>
</template>
