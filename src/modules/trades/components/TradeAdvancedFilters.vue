<script setup lang="ts">
import { computed } from 'vue'

import type {
  TradeDirection,
  TradeMistakeTag,
  TradePositionStatus,
  TradeResult,
  TradeStatus,
} from '@/types/trade'

export type TradeSortOption =
  | 'newest'
  | 'oldest'
  | 'profit-high'
  | 'profit-low'
  | 'r-high'
  | 'r-low'

export type ScreenshotFilter =
  | 'all'
  | 'with-any'
  | 'with-both'
  | 'without'

export interface AdvancedTradeFilters {
  keyword: string
  account: string
  result: 'all' | TradeResult
  direction: 'all' | TradeDirection
  status: 'all' | TradeStatus
  positionStatus: 'all' | TradePositionStatus
  favoriteOnly: boolean
  mistakeTag: 'all' | TradeMistakeTag
  screenshot: ScreenshotFilter
  dateFrom: string
  dateTo: string
  minimumR: number | null
  maximumR: number | null
  sort: TradeSortOption
}

const props = defineProps<{
  modelValue: AdvancedTradeFilters
  accounts: string[]
  filteredCount: number
  totalCount: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: AdvancedTradeFilters]
  reset: []
}>()

interface MistakeOption {
  value: TradeMistakeTag
  label: string
}

const mistakeOptions: MistakeOption[] = [
  {
    value: 'fomo',
    label: 'FOMO 追價',
  },
  {
    value: 'overtrade',
    label: '過度交易',
  },
  {
    value: 'early-entry',
    label: '過早進場',
  },
  {
    value: 'late-entry',
    label: '太晚進場',
  },
  {
    value: 'early-exit',
    label: '過早離場',
  },
  {
    value: 'late-exit',
    label: '太晚離場',
  },
  {
    value: 'moved-stop',
    label: '移動停損',
  },
  {
    value: 'oversized-risk',
    label: '風險過大',
  },
  {
    value: 'ignored-trend',
    label: '忽略趨勢',
  },
  {
    value: 'ignored-news',
    label: '忽略新聞',
  },
  {
    value: 'revenge-trade',
    label: '報復交易',
  },
  {
    value: 'no-confirmation',
    label: '沒有確認',
  },
]

const hasActiveFilters = computed(() => {
  const filters = props.modelValue

  return Boolean(
    filters.keyword.trim() ||
      filters.account !== 'all' ||
      filters.result !== 'all' ||
      filters.direction !== 'all' ||
      filters.status !== 'all' ||
      filters.positionStatus !== 'all' ||
      filters.favoriteOnly ||
      filters.mistakeTag !== 'all' ||
      filters.screenshot !== 'all' ||
      filters.dateFrom ||
      filters.dateTo ||
      filters.minimumR !== null ||
      filters.maximumR !== null ||
      filters.sort !== 'newest',
  )
})

const updateFilter = <Key extends keyof AdvancedTradeFilters>(
  key: Key,
  value: AdvancedTradeFilters[Key],
): void => {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value,
  })
}

const handleTextInput = (
  key: 'keyword' | 'dateFrom' | 'dateTo',
  event: Event,
): void => {
  const target = event.target as HTMLInputElement

  updateFilter(key, target.value)
}

const handleSelect = (
  key:
    | 'account'
    | 'result'
    | 'direction'
    | 'status'
    | 'positionStatus'
    | 'mistakeTag'
    | 'screenshot'
    | 'sort',
  event: Event,
): void => {
  const target = event.target as HTMLSelectElement

  updateFilter(
    key,
    target.value as AdvancedTradeFilters[typeof key],
  )
}

const handleNumberInput = (
  key: 'minimumR' | 'maximumR',
  event: Event,
): void => {
  const target = event.target as HTMLInputElement

  updateFilter(
    key,
    target.value === ''
      ? null
      : Number(target.value),
  )
}

const toggleFavorite = (): void => {
  updateFilter(
    'favoriteOnly',
    !props.modelValue.favoriteOnly,
  )
}

const requestReset = (): void => {
  emit('reset')
}
</script>

<template>
  <section
    class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-xl shadow-black/10"
  >
    <header
      class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
    >
      <div>
        <p
          class="text-xs font-medium tracking-[0.2em] text-sky-400"
        >
          交易搜尋
        </p>

        <h2
          class="mt-2 text-xl font-semibold text-zinc-100"
        >
          篩選與排序
        </h2>

        <p
          class="mt-1 text-sm leading-6 text-zinc-500"
        >
          依日期、方向、結果、錯誤標籤、截圖與報酬倍數快速尋找交易。
        </p>
      </div>

      <div
        class="flex flex-wrap items-center gap-3"
      >
        <span
          class="rounded-full border border-zinc-700 bg-zinc-950/60 px-3 py-1.5 text-xs text-zinc-400"
        >
          顯示 {{ filteredCount }}／{{ totalCount }} 筆
        </span>

        <button
          v-if="hasActiveFilters"
          type="button"
          class="rounded-xl border border-rose-500/20 px-4 py-2 text-sm text-rose-300 transition hover:border-rose-500/40 hover:bg-rose-500/10"
          @click="requestReset"
        >
          清除全部篩選
        </button>
      </div>
    </header>

    <div
      class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
    >
      <label class="xl:col-span-2">
        <span
          class="text-sm font-medium text-zinc-300"
        >
          關鍵字
        </span>

        <input
          :value="modelValue.keyword"
          type="search"
          placeholder="搜尋商品、策略、帳戶、理由或自訂標籤"
          class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-sky-500/40"
          @input="handleTextInput('keyword', $event)"
        />
      </label>

      <label>
        <span
          class="text-sm font-medium text-zinc-300"
        >
          交易帳戶
        </span>

        <select
          :value="modelValue.account"
          class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-300 outline-none transition focus:border-sky-500/40"
          @change="handleSelect('account', $event)"
        >
          <option value="all">
            全部帳戶
          </option>

          <option
            v-for="account in accounts"
            :key="account"
            :value="account"
          >
            {{ account }}
          </option>
        </select>
      </label>

      <label>
        <span
          class="text-sm font-medium text-zinc-300"
        >
          排序方式
        </span>

        <select
          :value="modelValue.sort"
          class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-300 outline-none transition focus:border-sky-500/40"
          @change="handleSelect('sort', $event)"
        >
          <option value="newest">
            最新交易優先
          </option>

          <option value="oldest">
            最舊交易優先
          </option>

          <option value="profit-high">
            盈利由高到低
          </option>

          <option value="profit-low">
            盈利由低到高
          </option>

          <option value="r-high">
            R 倍數由高到低
          </option>

          <option value="r-low">
            R 倍數由低到高
          </option>
        </select>
      </label>
    </div>

    <div
      class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
    >
      <label>
        <span class="text-sm font-medium text-zinc-300">
          持倉狀態
        </span>

        <select
          :value="modelValue.positionStatus"
          class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-300 outline-none transition focus:border-sky-500/40"
          @change="handleSelect('positionStatus', $event)"
        >
          <option value="all">全部持倉狀態</option>
          <option value="open">持倉中</option>
          <option value="closed">已平倉</option>
        </select>
      </label>

      <label>
        <span
          class="text-sm font-medium text-zinc-300"
        >
          交易結果
        </span>

        <select
          :value="modelValue.result"
          class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-300 outline-none transition focus:border-sky-500/40"
          @change="handleSelect('result', $event)"
        >
          <option value="all">
            全部結果
          </option>

          <option value="win">
            獲利
          </option>

          <option value="loss">
            虧損
          </option>

          <option value="breakeven">
            平手
          </option>
        </select>
      </label>

      <label>
        <span
          class="text-sm font-medium text-zinc-300"
        >
          交易方向
        </span>

        <select
          :value="modelValue.direction"
          class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-300 outline-none transition focus:border-sky-500/40"
          @change="handleSelect('direction', $event)"
        >
          <option value="all">
            全部方向
          </option>

          <option value="buy">
            多單
          </option>

          <option value="sell">
            空單
          </option>
        </select>
      </label>

      <label>
        <span
          class="text-sm font-medium text-zinc-300"
        >
          復盤狀態
        </span>

        <select
          :value="modelValue.status"
          class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-300 outline-none transition focus:border-sky-500/40"
          @change="handleSelect('status', $event)"
        >
          <option value="all">
            全部狀態
          </option>

          <option value="waiting-review">
            待復盤
          </option>

          <option value="reviewing">
            復盤中
          </option>

          <option value="completed">
            已完成復盤
          </option>
        </select>
      </label>

      <label>
        <span
          class="text-sm font-medium text-zinc-300"
        >
          圖表截圖
        </span>

        <select
          :value="modelValue.screenshot"
          class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-300 outline-none transition focus:border-sky-500/40"
          @change="handleSelect('screenshot', $event)"
        >
          <option value="all">
            全部交易
          </option>

          <option value="with-any">
            至少有一張截圖
          </option>

          <option value="with-both">
            交易前後都有截圖
          </option>

          <option value="without">
            沒有任何截圖
          </option>
        </select>
      </label>
    </div>

    <div
      class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <label>
        <span
          class="text-sm font-medium text-zinc-300"
        >
          錯誤標籤
        </span>

        <select
          :value="modelValue.mistakeTag"
          class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-300 outline-none transition focus:border-sky-500/40"
          @change="handleSelect('mistakeTag', $event)"
        >
          <option value="all">
            全部錯誤標籤
          </option>

          <option
            v-for="option in mistakeOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </label>

      <label>
        <span
          class="text-sm font-medium text-zinc-300"
        >
          開始日期
        </span>

        <input
          :value="modelValue.dateFrom"
          type="date"
          class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-300 outline-none transition focus:border-sky-500/40"
          @input="handleTextInput('dateFrom', $event)"
        />
      </label>

      <label>
        <span
          class="text-sm font-medium text-zinc-300"
        >
          結束日期
        </span>

        <input
          :value="modelValue.dateTo"
          type="date"
          class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-300 outline-none transition focus:border-sky-500/40"
          @input="handleTextInput('dateTo', $event)"
        />
      </label>

      <div>
        <span
          class="text-sm font-medium text-zinc-300"
        >
          收藏交易
        </span>

        <button
          type="button"
          class="mt-2 flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm transition"
          :class="
            modelValue.favoriteOnly
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
              : 'border-zinc-800 bg-zinc-950/70 text-zinc-500 hover:border-amber-500/30 hover:text-amber-300'
          "
          @click="toggleFavorite"
        >
          <span>
            只顯示收藏交易
          </span>

          <span>
            {{
              modelValue.favoriteOnly
                ? '★'
                : '☆'
            }}
          </span>
        </button>
      </div>
    </div>

    <div
      class="mt-4 grid gap-4 sm:grid-cols-2"
    >
      <label>
        <span
          class="text-sm font-medium text-zinc-300"
        >
          最低報酬倍數
        </span>

        <input
          :value="
            modelValue.minimumR ?? ''
          "
          type="number"
          step="0.01"
          placeholder="例如：1"
          class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-sky-500/40"
          @input="handleNumberInput('minimumR', $event)"
        />
      </label>

      <label>
        <span
          class="text-sm font-medium text-zinc-300"
        >
          最高報酬倍數
        </span>

        <input
          :value="
            modelValue.maximumR ?? ''
          "
          type="number"
          step="0.01"
          placeholder="例如：3"
          class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-sky-500/40"
          @input="handleNumberInput('maximumR', $event)"
        />
      </label>
    </div>

    <div
      v-if="
        modelValue.dateFrom &&
        modelValue.dateTo &&
        modelValue.dateFrom > modelValue.dateTo
      "
      class="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3"
    >
      <p class="text-sm text-rose-300">
        開始日期不能晚於結束日期。
      </p>
    </div>

    <div
      v-if="
        modelValue.minimumR !== null &&
        modelValue.maximumR !== null &&
        modelValue.minimumR > modelValue.maximumR
      "
      class="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3"
    >
      <p class="text-sm text-rose-300">
        最低報酬倍數不能大於最高報酬倍數。
      </p>
    </div>
  </section>
</template>
