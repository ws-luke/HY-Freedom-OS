<script setup lang="ts">
import { computed, ref } from 'vue'

import type {
  TradeRecord,
} from '@/types/trade'

interface TradeBackupFile {
  version: number
  exportedAt: string
  trades: TradeRecord[]
}

const props = defineProps<{
  trades: TradeRecord[]
}>()

const emit = defineEmits<{
  import: [trades: TradeRecord[]]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const errorMessage = ref('')
const successMessage = ref('')

const tradeCount = computed(
  () => props.trades.length,
)

const createFileName = (
  extension: 'json' | 'csv',
): string => {
  const now = new Date()

  const year = now.getFullYear()
  const month = String(
    now.getMonth() + 1,
  ).padStart(2, '0')
  const day = String(
    now.getDate(),
  ).padStart(2, '0')
  const hour = String(
    now.getHours(),
  ).padStart(2, '0')
  const minute = String(
    now.getMinutes(),
  ).padStart(2, '0')

  return `hy-trades-${year}${month}${day}-${hour}${minute}.${extension}`
}

const downloadFile = (
  content: string,
  fileName: string,
  mimeType: string,
): void => {
  const blob = new Blob(
    [content],
    {
      type: mimeType,
    },
  )

  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')

  link.href = url
  link.download = fileName

  document.body.appendChild(link)
  link.click()
  link.remove()

  URL.revokeObjectURL(url)
}

const clearMessages = (): void => {
  errorMessage.value = ''
  successMessage.value = ''
}

const exportJson = (): void => {
  clearMessages()

  const backup: TradeBackupFile = {
    version: 2,
    exportedAt:
      new Date().toISOString(),
    trades: props.trades,
  }

  downloadFile(
    JSON.stringify(
      backup,
      null,
      2,
    ),
    createFileName('json'),
    'application/json;charset=utf-8',
  )

  successMessage.value =
    `已匯出 ${tradeCount.value} 筆交易備份。`
}

const escapeCsvValue = (
  value: unknown,
): string => {
  if (
    value === null ||
    value === undefined
  ) {
    return ''
  }

  const text =
    typeof value === 'string'
      ? value
      : JSON.stringify(value)

  return `"${text.replaceAll('"', '""')}"`
}

const exportCsv = (): void => {
  clearMessages()

  const headers = [
    'id',
    'date',
    'time',
    'symbol',
    'direction',
    'result',
    'status',
    'positionStatus',
    'exitReason',
    'closedAt',
    'signalId',
    'signal',
    'account',
    'entryPrice',
    'exitPrice',
    'stopLoss',
    'takeProfit',
    'lotSize',
    'riskAmount',
    'profitLoss',
    'rMultiple',
    'playbook',
    'reason',
    'mistakeTags',
    'customMistakeTags',
    'isFavorite',
    'beforeScreenshotName',
    'afterScreenshotName',
    'createdAt',
    'updatedAt',
  ]

  const rows = props.trades.map(
    trade => [
      trade.id,
      trade.date,
      trade.time,
      trade.symbol,
      trade.direction,
      trade.result,
      trade.status,
      trade.positionStatus,
      trade.exitReason,
      trade.closedAt,
      trade.signalId,
      trade.signal,
      trade.account,
      trade.entryPrice,
      trade.exitPrice,
      trade.stopLoss,
      trade.takeProfit,
      trade.lotSize,
      trade.riskAmount,
      trade.profitLoss,
      trade.rMultiple,
      trade.playbook,
      trade.reason,
      trade.mistakeTags.join('|'),
      trade.customMistakeTags.join('|'),
      trade.isFavorite,
      trade.beforeScreenshot?.name ?? '',
      trade.afterScreenshot?.name ?? '',
      trade.createdAt,
      trade.updatedAt,
    ],
  )

  const csvContent = [
    headers
      .map(escapeCsvValue)
      .join(','),
    ...rows.map(row =>
      row
        .map(escapeCsvValue)
        .join(','),
    ),
  ].join('\n')

  downloadFile(
    `\uFEFF${csvContent}`,
    createFileName('csv'),
    'text/csv;charset=utf-8',
  )

  successMessage.value =
    `已匯出 ${tradeCount.value} 筆 CSV 資料。`
}

const openImportFilePicker = (): void => {
  clearMessages()
  fileInput.value?.click()
}

const isValidTrade = (
  value: unknown,
): value is TradeRecord => {
  if (
    typeof value !== 'object' ||
    value === null
  ) {
    return false
  }

  const trade =
    value as Partial<TradeRecord>

  return Boolean(
    typeof trade.id === 'string' &&
      typeof trade.date === 'string' &&
      typeof trade.time === 'string' &&
      typeof trade.symbol === 'string' &&
      (
        trade.direction === 'buy' ||
        trade.direction === 'sell'
      ) &&
      (
        trade.result === 'win' ||
        trade.result === 'loss' ||
        trade.result === 'breakeven'
      ) &&
      (
        trade.status ===
          'waiting-review' ||
        trade.status === 'reviewing' ||
        trade.status === 'completed'
      ) &&
      typeof trade.account === 'string' &&
      typeof trade.playbook === 'string' &&
      typeof trade.reason === 'string',
  )
}

const normalizeImportedTrade = (
  trade: TradeRecord,
): TradeRecord => {
  const now =
    new Date().toISOString()

  return {
    ...trade,
    symbol:
      trade.symbol
        .trim()
        .toUpperCase(),
    account:
      trade.account.trim(),
    playbook:
      trade.playbook.trim(),
    reason:
      trade.reason.trim(),
    entryPrice:
      Number(trade.entryPrice) || 0,
    exitPrice:
      Number(trade.exitPrice) || 0,
    stopLoss:
      Number(trade.stopLoss) || 0,
    takeProfit:
      Number(trade.takeProfit) || 0,
    lotSize:
      Number(trade.lotSize) || 0,
    riskAmount:
      Number(trade.riskAmount) || 0,
    profitLoss:
      Number(trade.profitLoss) || 0,
    rMultiple:
      Number(trade.rMultiple) || 0,
    beforeScreenshot:
      trade.beforeScreenshot ?? null,
    afterScreenshot:
      trade.afterScreenshot ?? null,
    mistakeTags:
      Array.isArray(
        trade.mistakeTags,
      )
        ? trade.mistakeTags
        : [],
    customMistakeTags:
      Array.isArray(
        trade.customMistakeTags,
      )
        ? trade.customMistakeTags
            .map(tag => tag.trim())
            .filter(Boolean)
        : [],
    isFavorite:
      Boolean(trade.isFavorite),
    createdAt:
      trade.createdAt || now,
    updatedAt:
      trade.updatedAt || now,
  }
}

const extractTrades = (
  value: unknown,
): TradeRecord[] => {
  if (Array.isArray(value)) {
    return value.filter(isValidTrade)
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'trades' in value
  ) {
    const backup =
      value as Partial<TradeBackupFile>

    if (Array.isArray(backup.trades)) {
      return backup.trades.filter(
        isValidTrade,
      )
    }
  }

  return []
}

const handleImportFile = (
  event: Event,
): void => {
  clearMessages()

  const input =
    event.target as HTMLInputElement

  const file =
    input.files?.[0]

  if (!file) {
    return
  }

  if (
    file.type !== 'application/json' &&
    !file.name
      .toLowerCase()
      .endsWith('.json')
  ) {
    errorMessage.value =
      '目前只支援匯入 JSON 備份檔。'

    input.value = ''
    return
  }

  const reader = new FileReader()

  reader.onload = () => {
    try {
      if (
        typeof reader.result !== 'string'
      ) {
        throw new Error(
          '檔案內容格式錯誤。',
        )
      }

      const parsed =
        JSON.parse(reader.result)

      const importedTrades =
        extractTrades(parsed).map(
          normalizeImportedTrade,
        )

      if (
        importedTrades.length === 0
      ) {
        throw new Error(
          '備份檔中找不到有效的交易資料。',
        )
      }

      const confirmed =
        window.confirm(
          `即將匯入 ${importedTrades.length} 筆交易。\n\n相同 ID 的交易會由後續資料覆蓋，確定繼續嗎？`,
        )

      if (!confirmed) {
        return
      }

      emit(
        'import',
        importedTrades,
      )

      successMessage.value =
        `已成功讀取 ${importedTrades.length} 筆交易。`
    }
    catch (error) {
      errorMessage.value =
        error instanceof Error
          ? error.message
          : '匯入交易備份失敗。'
    }
    finally {
      input.value = ''
    }
  }

  reader.onerror = () => {
    errorMessage.value =
      '讀取備份檔失敗。'

    input.value = ''
  }

  reader.readAsText(file)
}
</script>

<template>
  <section
    class="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl shadow-black/10"
  >
    <div
      class="pointer-events-none absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl"
    />

    <div class="relative">
      <header
        class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
      >
        <div>
          <p
            class="text-xs font-medium tracking-[0.2em] text-violet-400"
          >
            資料管理
          </p>

          <h2
            class="mt-2 text-xl font-semibold text-zinc-100"
          >
            交易備份與匯出
          </h2>

          <p
            class="mt-1 max-w-3xl text-sm leading-6 text-zinc-500"
          >
            將交易紀錄下載成完整 JSON 備份或 CSV 表格，也可以從 JSON 備份恢復資料。
          </p>
        </div>

        <div
          class="rounded-full border border-zinc-700 bg-zinc-950/60 px-4 py-2 text-sm text-zinc-400"
        >
          {{ tradeCount }} 筆交易
        </div>
      </header>

      <div
        class="mt-6 grid gap-4 md:grid-cols-3"
      >
        <button
          type="button"
          class="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-left transition hover:border-emerald-500/40 hover:bg-emerald-500/10"
          @click="exportJson"
        >
          <p
            class="font-semibold text-emerald-300"
          >
            匯出完整 JSON
          </p>

          <p
            class="mt-2 text-sm leading-6 text-zinc-500"
          >
            保留交易、截圖、錯誤標籤、收藏與復盤狀態，適合完整備份。
          </p>
        </button>

        <button
          type="button"
          class="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5 text-left transition hover:border-sky-500/40 hover:bg-sky-500/10"
          @click="exportCsv"
        >
          <p
            class="font-semibold text-sky-300"
          >
            匯出 CSV
          </p>

          <p
            class="mt-2 text-sm leading-6 text-zinc-500"
          >
            下載可用 Excel 或試算表開啟的交易統計資料。
          </p>
        </button>

        <button
          type="button"
          class="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5 text-left transition hover:border-violet-500/40 hover:bg-violet-500/10"
          @click="openImportFilePicker"
        >
          <p
            class="font-semibold text-violet-300"
          >
            匯入 JSON 備份
          </p>

          <p
            class="mt-2 text-sm leading-6 text-zinc-500"
          >
            從之前匯出的 JSON 檔案恢復或合併交易紀錄。
          </p>
        </button>
      </div>

      <input
        ref="fileInput"
        type="file"
        accept="application/json,.json"
        class="hidden"
        @change="handleImportFile"
      />

      <div
        v-if="successMessage"
        class="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4"
      >
        <p class="text-sm text-emerald-300">
          {{ successMessage }}
        </p>
      </div>

      <div
        v-if="errorMessage"
        class="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4"
      >
        <p class="text-sm text-rose-300">
          {{ errorMessage }}
        </p>
      </div>

      <div
        class="mt-5 rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4"
      >
        <p class="text-sm leading-6 text-amber-200/70">
          JSON 備份可能包含圖表截圖，因此檔案容量可能較大。CSV 不會包含圖片內容，只會保留截圖檔名。
        </p>
      </div>
    </div>
  </section>
</template>
