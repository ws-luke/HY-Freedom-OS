<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'

import { useTradeStore } from '@/stores/useTradeStore'

import type {
  TradeMistakeTag,
  TradeRecord,
} from '@/types/trade'

interface MistakeDefinition {
  tag: TradeMistakeTag
  label: string
  description: string
  solution: string
}

interface MistakeStatistic extends MistakeDefinition {
  count: number
  rate: number
  totalProfitLoss: number
  averageR: number
  affectedTrades: TradeRecord[]
}

const tradeStore = useTradeStore()

const {
  sortedClosedTrades: sortedTrades,
} = storeToRefs(tradeStore)

const mistakeDefinitions: MistakeDefinition[] = [
  {
    tag: 'fomo',
    label: 'FOMO 追價',
    description:
      '害怕錯過行情，在價格已離開理想進場區後追進。',
    solution:
      '價格離開原定區域後取消交易，等待下一次回踩或新結構。',
  },
  {
    tag: 'overtrade',
    label: '過度交易',
    description:
      '交易次數超出原定限制，或在沒有高品質機會時勉強進場。',
    solution:
      '設定每日交易次數上限，達到上限後停止看盤與下單。',
  },
  {
    tag: 'early-entry',
    label: '過早進場',
    description:
      '結構、回踩或進場訊號尚未完成就提前建立部位。',
    solution:
      '等待指定週期收線，確認結構完成後才允許進場。',
  },
  {
    tag: 'late-entry',
    label: '太晚進場',
    description:
      '錯過理想位置後仍然進場，使停損距離或風險報酬變差。',
    solution:
      '錯過原始進場區後直接放棄，不因行情已經啟動而追價。',
  },
  {
    tag: 'early-exit',
    label: '過早離場',
    description:
      '行情尚未破壞原始交易邏輯，就因短線波動提前出場。',
    solution:
      '離場只依照停損、停利或結構失效條件，不依照情緒處理。',
  },
  {
    tag: 'late-exit',
    label: '太晚離場',
    description:
      '價格已經達到離場條件，但沒有執行，造成獲利回吐或虧損擴大。',
    solution:
      '進場前寫清楚離場條件，條件成立後立即執行。',
  },
  {
    tag: 'moved-stop',
    label: '移動停損',
    description:
      '為了避免認賠，把停損往不利方向移動。',
    solution:
      '停損只能縮小風險，禁止向增加風險的方向移動。',
  },
  {
    tag: 'oversized-risk',
    label: '風險過大',
    description:
      '單筆交易風險超出原定限制，影響帳戶與心理狀態。',
    solution:
      '下單前先輸入固定風險金額，部位大小必須依照停損距離計算。',
  },
  {
    tag: 'ignored-trend',
    label: '忽略趨勢',
    description:
      '交易方向與高週期趨勢或主要市場結構相反。',
    solution:
      '先確認 4H 與 1H 方向，逆勢交易必須有更嚴格的確認條件。',
  },
  {
    tag: 'ignored-news',
    label: '忽略新聞',
    description:
      '在重大經濟事件公布前後進場，承受不可控制的波動。',
    solution:
      '重大數據前後依照系統限制停止建立新倉。',
  },
  {
    tag: 'revenge-trade',
    label: '報復交易',
    description:
      '虧損後急著追回損失，在情緒影響下再次進場。',
    solution:
      '虧損後強制離開畫面，至少等待一個完整交易週期。',
  },
  {
    tag: 'no-confirmation',
    label: '沒有確認',
    description:
      '沒有等待低週期結構、K 棒或進場訊號完成。',
    solution:
      '建立固定確認清單，所有條件完成後才允許按下交易按鈕。',
  },
]

const taggedTrades = computed(() =>
  sortedTrades.value.filter(
    trade =>
      trade.mistakeTags.length > 0 ||
      trade.customMistakeTags.length > 0,
  ),
)

const totalMistakeOccurrences = computed(() =>
  sortedTrades.value.reduce(
    (total, trade) =>
      total +
      trade.mistakeTags.length +
      trade.customMistakeTags.length,
    0,
  ),
)

const mistakeStatistics = computed<MistakeStatistic[]>(() =>
  mistakeDefinitions
    .map(definition => {
      const affectedTrades =
        sortedTrades.value.filter(trade =>
          trade.mistakeTags.includes(
            definition.tag,
          ),
        )

      const count = affectedTrades.length

      const totalProfitLoss =
        affectedTrades.reduce(
          (total, trade) =>
            total + trade.profitLoss,
          0,
        )

      const totalR = affectedTrades.reduce(
        (total, trade) =>
          total + trade.rMultiple,
        0,
      )

      return {
        ...definition,
        count,
        rate:
          sortedTrades.value.length > 0
            ? Math.round(
                (
                  count /
                  sortedTrades.value.length
                ) * 100,
              )
            : 0,
        totalProfitLoss,
        averageR:
          count > 0
            ? Number(
                (
                  totalR /
                  count
                ).toFixed(2),
              )
            : 0,
        affectedTrades,
      }
    })
    .filter(item => item.count > 0)
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count
      }

      return a.totalProfitLoss - b.totalProfitLoss
    }),
)

const primaryMistake = computed(
  () => mistakeStatistics.value[0] ?? null,
)

const topMistakes = computed(() =>
  mistakeStatistics.value.slice(0, 5),
)

const customTagStatistics = computed(() => {
  const tagMap = new Map<
    string,
    {
      label: string
      count: number
      totalProfitLoss: number
      totalR: number
    }
  >()

  sortedTrades.value.forEach(trade => {
    trade.customMistakeTags.forEach(tag => {
      const normalized = tag.trim()

      if (!normalized) {
        return
      }

      const key = normalized.toLowerCase()

      const current = tagMap.get(key) ?? {
        label: normalized,
        count: 0,
        totalProfitLoss: 0,
        totalR: 0,
      }

      current.count += 1
      current.totalProfitLoss +=
        trade.profitLoss
      current.totalR += trade.rMultiple

      tagMap.set(key, current)
    })
  })

  return [...tagMap.values()]
    .map(item => ({
      ...item,
      averageR:
        item.count > 0
          ? Number(
              (
                item.totalR /
                item.count
              ).toFixed(2),
            )
          : 0,
    }))
    .sort((a, b) => b.count - a.count)
})

const affectedTradeRate = computed(() => {
  if (sortedTrades.value.length === 0) {
    return 0
  }

  return Math.round(
    (
      taggedTrades.value.length /
      sortedTrades.value.length
    ) * 100,
  )
})

const mistakeLossAmount = computed(() =>
  taggedTrades.value
    .filter(trade => trade.profitLoss < 0)
    .reduce(
      (total, trade) =>
        total + trade.profitLoss,
      0,
    ),
)

const formatMoney = (
  value: number,
): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)

const profitLossClasses = (
  value: number,
): string => {
  if (value > 0) {
    return 'text-emerald-300'
  }

  if (value < 0) {
    return 'text-rose-300'
  }

  return 'text-zinc-300'
}

const barClasses = (
  rate: number,
): string => {
  if (rate >= 50) {
    return 'bg-rose-400'
  }

  if (rate >= 30) {
    return 'bg-orange-400'
  }

  if (rate >= 15) {
    return 'bg-amber-400'
  }

  return 'bg-sky-400'
}
</script>

<template>
  <section
    class="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-xl shadow-black/10"
  >
    <div
      class="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-rose-500/10 blur-3xl"
    />

    <div class="relative">
      <header
        class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
      >
        <div>
          <p
            class="text-xs font-medium tracking-[0.2em] text-rose-400"
          >
            行為分析
          </p>

          <h2
            class="mt-2 text-xl font-semibold text-zinc-100"
          >
            重複交易錯誤
          </h2>

          <p
            class="mt-1 text-sm leading-6 text-zinc-500"
          >
            根據交易錯誤標籤，找出最常發生且影響最大的執行問題。
          </p>
        </div>

        <RouterLink
          to="/trades"
          class="rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 py-2.5 text-sm font-medium text-zinc-400 transition hover:border-rose-500/30 hover:text-rose-300"
        >
          前往交易紀錄
        </RouterLink>
      </header>

      <div
        class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
        >
          <p class="text-xs text-zinc-500">
            有錯誤標籤交易
          </p>

          <p
            class="mt-2 text-2xl font-semibold text-rose-300"
          >
            {{ taggedTrades.length }}
          </p>

          <p class="mt-1 text-xs text-zinc-600">
            共 {{ sortedTrades.length }} 筆交易
          </p>
        </div>

        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
        >
          <p class="text-xs text-zinc-500">
            錯誤交易比例
          </p>

          <p
            class="mt-2 text-2xl font-semibold"
            :class="
              affectedTradeRate >= 50
                ? 'text-rose-300'
                : affectedTradeRate >= 25
                  ? 'text-amber-300'
                  : 'text-emerald-300'
            "
          >
            {{ affectedTradeRate }}%
          </p>
        </div>

        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
        >
          <p class="text-xs text-zinc-500">
            錯誤出現次數
          </p>

          <p
            class="mt-2 text-2xl font-semibold text-amber-300"
          >
            {{ totalMistakeOccurrences }}
          </p>
        </div>

        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
        >
          <p class="text-xs text-zinc-500">
            錯誤交易虧損
          </p>

          <p
            class="mt-2 text-2xl font-semibold"
            :class="
              profitLossClasses(
                mistakeLossAmount,
              )
            "
          >
            {{ formatMoney(mistakeLossAmount) }}
          </p>
        </div>
      </div>

      <section
        v-if="primaryMistake"
        class="mt-6 rounded-3xl border border-rose-500/20 bg-rose-500/5 p-5"
      >
        <div
          class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"
        >
          <div class="max-w-3xl">
            <p
              class="text-xs font-medium tracking-[0.18em] text-rose-400"
            >
              最優先改善
            </p>

            <h3
              class="mt-2 text-2xl font-semibold text-rose-300"
            >
              {{ primaryMistake.label }}
            </h3>

            <p
              class="mt-3 text-sm leading-7 text-zinc-400"
            >
              {{ primaryMistake.description }}
            </p>
          </div>

          <div
            class="grid shrink-0 grid-cols-3 gap-3"
          >
            <div
              class="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-center"
            >
              <p class="text-xs text-zinc-500">
                出現
              </p>

              <p
                class="mt-1 text-xl font-semibold text-rose-300"
              >
                {{ primaryMistake.count }}
              </p>
            </div>

            <div
              class="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-center"
            >
              <p class="text-xs text-zinc-500">
                比例
              </p>

              <p
                class="mt-1 text-xl font-semibold text-amber-300"
              >
                {{ primaryMistake.rate }}%
              </p>
            </div>

            <div
              class="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-center"
            >
              <p class="text-xs text-zinc-500">
                平均 R
              </p>

              <p
                class="mt-1 text-xl font-semibold"
                :class="
                  profitLossClasses(
                    primaryMistake.averageR,
                  )
                "
              >
                {{ primaryMistake.averageR.toFixed(2) }}R
              </p>
            </div>
          </div>
        </div>

        <div
          class="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4"
        >
          <p class="text-xs text-amber-300/70">
            下一筆交易執行規則
          </p>

          <p
            class="mt-2 text-sm font-medium leading-7 text-amber-200"
          >
            {{ primaryMistake.solution }}
          </p>
        </div>
      </section>

      <div
        v-if="topMistakes.length"
        class="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]"
      >
        <section
          class="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-5"
        >
          <h3
            class="text-lg font-semibold text-zinc-100"
          >
            錯誤發生排名
          </h3>

          <p
            class="mt-1 text-sm text-zinc-500"
          >
            顯示錯誤出現在全部交易中的比例。
          </p>

          <div class="mt-6 space-y-5">
            <article
              v-for="item in topMistakes"
              :key="item.tag"
            >
              <div
                class="flex items-start justify-between gap-4"
              >
                <div>
                  <p
                    class="font-medium text-zinc-300"
                  >
                    {{ item.label }}
                  </p>

                  <p
                    class="mt-1 text-xs text-zinc-600"
                  >
                    {{ item.count }} 筆交易
                  </p>
                </div>

                <div class="text-right">
                  <p
                    class="font-semibold text-rose-300"
                  >
                    {{ item.rate }}%
                  </p>

                  <p
                    class="mt-1 text-xs"
                    :class="
                      profitLossClasses(
                        item.totalProfitLoss,
                      )
                    "
                  >
                    {{
                      item.totalProfitLoss > 0
                        ? '+'
                        : ''
                    }}
                    {{
                      formatMoney(
                        item.totalProfitLoss,
                      )
                    }}
                  </p>
                </div>
              </div>

              <div
                class="mt-3 h-2.5 overflow-hidden rounded-full bg-zinc-800"
              >
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="barClasses(item.rate)"
                  :style="{
                    width: `${item.rate}%`,
                  }"
                />
              </div>
            </article>
          </div>
        </section>

        <section
          class="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-5"
        >
          <h3
            class="text-lg font-semibold text-zinc-100"
          >
            最近錯誤交易
          </h3>

          <p
            class="mt-1 text-sm text-zinc-500"
          >
            最近有標記執行問題的交易。
          </p>

          <div class="mt-5 space-y-3">
            <article
              v-for="trade in taggedTrades.slice(0, 5)"
              :key="trade.id"
              class="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"
            >
              <div
                class="flex items-start justify-between gap-4"
              >
                <div>
                  <p
                    class="font-medium text-zinc-200"
                  >
                    {{ trade.symbol }}
                  </p>

                  <p
                    class="mt-1 text-xs text-zinc-600"
                  >
                    {{ trade.date }}
                    ·
                    {{ trade.playbook }}
                  </p>
                </div>

                <p
                  class="shrink-0 font-semibold"
                  :class="
                    profitLossClasses(
                      trade.profitLoss,
                    )
                  "
                >
                  {{
                    trade.profitLoss > 0
                      ? '+'
                      : ''
                  }}
                  {{ formatMoney(trade.profitLoss) }}
                </p>
              </div>

              <div
                class="mt-3 flex flex-wrap gap-2"
              >
                <span
                  v-for="tag in trade.mistakeTags"
                  :key="tag"
                  class="rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-[11px] text-rose-300"
                >
                  {{
                    mistakeDefinitions.find(
                      item => item.tag === tag,
                    )?.label ?? tag
                  }}
                </span>

                <span
                  v-for="tag in trade.customMistakeTags"
                  :key="tag"
                  class="rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-300"
                >
                  {{ tag }}
                </span>
              </div>
            </article>
          </div>
        </section>
      </div>

      <section
        v-if="customTagStatistics.length"
        class="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950/50 p-5"
      >
        <h3
          class="text-lg font-semibold text-zinc-100"
        >
          自訂錯誤標籤
        </h3>

        <p
          class="mt-1 text-sm text-zinc-500"
        >
          由你自行建立的交易問題分類。
        </p>

        <div
          class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
        >
          <article
            v-for="item in customTagStatistics"
            :key="item.label"
            class="rounded-2xl border border-violet-500/15 bg-violet-500/5 p-4"
          >
            <p
              class="font-medium text-violet-300"
            >
              {{ item.label }}
            </p>

            <div
              class="mt-4 flex items-center justify-between gap-4"
            >
              <p class="text-sm text-zinc-500">
                {{ item.count }} 次
              </p>

              <p
                class="font-semibold"
                :class="
                  profitLossClasses(
                    item.averageR,
                  )
                "
              >
                {{ item.averageR.toFixed(2) }}R
              </p>
            </div>
          </article>
        </div>
      </section>

      <div
        v-if="!mistakeStatistics.length"
        class="mt-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center"
      >
        <div
          class="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 text-xl text-emerald-300"
        >
          ✓
        </div>

        <p
          class="mt-4 font-medium text-emerald-300"
        >
          尚未記錄重複交易錯誤
        </p>

        <p
          class="mt-2 text-sm leading-6 text-emerald-200/60"
        >
          在交易詳情中加入錯誤標籤後，系統會自動統計問題與改善方向。
        </p>
      </div>
    </div>
  </section>
</template>
