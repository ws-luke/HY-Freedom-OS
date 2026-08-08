<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'

import PlanField from '../components/PlanField.vue'
import PlanningCommandPanel from '../components/PlanningCommandPanel.vue'
import CoachPlanBridgeCard from '@/modules/ai-coach/components/CoachPlanBridgeCard.vue'
import { useTradingPlanStore } from '@/stores/useTradingPlanStore'
import { useSignalStore } from '@/stores/useSignalStore'
import type { MarketBias } from '@/types/trading-plan'

const planStore = useTradingPlanStore()
const signalStore = useSignalStore()
const {
  plan,
  completionPercent,
  isReadyToComplete,
} = storeToRefs(planStore)

const { selectableSignals } = storeToRefs(signalStore)

const biasOptions: Array<{
  value: MarketBias
  label: string
  description: string
}> = [
  {
    value: 'bullish',
    label: '偏多',
    description: '只找順勢多單機會',
  },
  {
    value: 'bearish',
    label: '偏空',
    description: '只找順勢空單機會',
  },
  {
    value: 'range',
    label: '震盪',
    description: '等待區間邊緣確認',
  },
  {
    value: 'wait',
    label: '等待',
    description: '方向不明，不主動交易',
  },
]

const signalOptions = computed(() =>
  selectableSignals.value.map(signal => signal.name),
)

const formattedPlanDate = computed(() => {
  const parts =
    plan.value.date
      .split('-')
      .map(Number)

  const year =
    parts[0] ?? new Date().getFullYear()

  const month =
    parts[1] ?? new Date().getMonth() + 1

  const day =
    parts[2] ?? new Date().getDate()

  return new Intl.DateTimeFormat(
    'zh-TW',
    {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
    },
  ).format(
    new Date(
      year,
      month - 1,
      day,
    ),
  )
})

const statusText = computed(() => {
  if (plan.value.completed) return '規劃已完成'
  if (completionPercent.value >= 75) return '接近完成'
  if (completionPercent.value > 0) return '規劃進行中'
  return '尚未開始'
})

const biasButtonClasses = (bias: MarketBias): string => {
  if (plan.value.marketBias === bias) {
    return 'border-amber-400/50 bg-amber-500/15 text-amber-200 shadow-[0_0_25px_rgba(245,158,11,0.08)]'
  }

  return 'border-zinc-700/80 bg-zinc-950/50 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-900 hover:text-zinc-200'
}

const decreaseMaxTrades = (): void => {
  plan.value.maxTrades = Math.max(0, plan.value.maxTrades - 1)
}

const increaseMaxTrades = (): void => {
  plan.value.maxTrades = Math.min(20, plan.value.maxTrades + 1)
}

const decreaseRisk = (): void => {
  plan.value.maxRiskPercent = Math.max(
    0,
    Number((plan.value.maxRiskPercent - 0.1).toFixed(1)),
  )
}

const increaseRisk = (): void => {
  plan.value.maxRiskPercent = Math.min(
    100,
    Number((plan.value.maxRiskPercent + 0.1).toFixed(1)),
  )
}

onMounted(() => {
  planStore.ensureCurrentDay()
})
</script>

<template>
  <div class="space-y-4 pb-10">
    <section
      class="flex flex-col gap-5 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-xl shadow-black/10 xl:flex-row xl:items-center xl:justify-between"
    >
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-zinc-100">
          Planning v2 · 盤前作戰計畫
        </h1>

        <p class="mt-2 text-sm leading-6 text-zinc-400">
          先定義方向、區域、允許與禁止條件，再決定今天是否值得交易。
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3"
        >
          <p class="text-xs text-zinc-500">
            完成度
          </p>

          <p class="mt-1 text-lg font-semibold text-amber-300">
            {{ completionPercent }}%
          </p>
        </div>

        <div
          class="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3"
        >
          <p class="text-xs text-zinc-500">
            今日日期
          </p>

          <p class="mt-1 text-sm font-medium text-zinc-200">
            {{ formattedPlanDate }}
          </p>
        </div>

        <button
          type="button"
          class="rounded-2xl border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-400 transition hover:border-rose-500/30 hover:text-rose-300"
          @click="planStore.resetToday"
        >
          重設今日規劃
        </button>
      </div>
    </section>

    <PlanningCommandPanel />

    <CoachPlanBridgeCard />

    <section
      class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-xl shadow-black/10"
    >
      <div
        class="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)]"
      >
        <label>
          <span class="text-sm font-medium text-zinc-200">
            交易商品
          </span>

          <input
            v-model="plan.symbol"
            type="text"
            :disabled="plan.completed"
            class="mt-3 w-full rounded-2xl border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-amber-500/40 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <div>
          <p class="text-sm font-medium text-zinc-200">
            今日市場傾向
          </p>

          <div class="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <button
              v-for="option in biasOptions"
              :key="option.value"
              type="button"
              :disabled="plan.completed"
              class="rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60"
              :class="biasButtonClasses(option.value)"
              @click="planStore.setBias(option.value)"
            >
              <p class="font-medium">
                {{ option.label }}
              </p>

              <p class="mt-1 text-xs leading-5 opacity-70">
                {{ option.description }}
              </p>
            </button>
          </div>
        </div>
      </div>
    </section>

    <div class="grid gap-4 2xl:grid-cols-[1fr_1fr_0.95fr]">
      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-xl shadow-black/10"
      >
        <h2 class="text-lg font-semibold text-amber-300">
          多週期分析
        </h2>

        <div class="mt-5 space-y-5">
          <PlanField
            v-model="plan.h4Trend"
            label="4H 趨勢"
            description="大方向、通道與主要市場結構。"
            placeholder="例如：4H 多頭結構，等待回踩主要支撐。"
            :rows="4"
            :disabled="plan.completed"
          />

          <PlanField
            v-model="plan.h1Trend"
            label="1H 結構"
            description="確認回踩、結構延續或可能反轉。"
            placeholder="例如：1H 回踩但尚未出現結構轉強。"
            :rows="4"
            :disabled="plan.completed"
          />

          <PlanField
            v-model="plan.m15Structure"
            label="15M 結構"
            description="記錄目前結構與等待的確認條件。"
            placeholder="例如：15M 區間整理，等待突破回踩。"
            :rows="4"
            :disabled="plan.completed"
          />
        </div>
      </section>

      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-xl shadow-black/10"
      >
        <h2 class="text-lg font-semibold text-amber-300">
          進場脈絡
        </h2>

        <div class="mt-5 space-y-5">
          <PlanField
            v-model="plan.allowedConditions"
            label="允許交易條件"
            description="條件未完成時，不得自行降低標準。"
            placeholder="例如：H1 回踩支撐＋15M 結構確認＋低週期出現訊號。"
            :rows="5"
            :disabled="plan.completed"
          />

          <PlanField
            v-model="plan.prohibitedConditions"
            label="拒絕進場條件"
            description="列出今天禁止進場的情況。"
            placeholder="例如：重大數據前後、區間中央、追價或連續虧損後。"
            :rows="5"
            :disabled="plan.completed"
          />

          <div>
            <p class="text-sm font-medium text-zinc-200">
              耐心等待的訊號
            </p>

            <p class="mt-1 text-xs leading-5 text-zinc-500">
              只執行已列入今天規劃的訊號。
            </p>

            <div class="mt-3 flex flex-wrap gap-2">
              <button
                v-for="signal in signalOptions"
                :key="signal"
                type="button"
                :disabled="plan.completed"
                class="rounded-full border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60"
                :class="
                  plan.waitingSignals.includes(signal)
                    ? 'border-amber-400/50 bg-amber-500/15 text-amber-200'
                    : 'border-zinc-700 bg-zinc-950/60 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                "
                @click="planStore.toggleSignal(signal)"
              >
                {{ signal }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <div class="space-y-4">
        <section
          class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-xl shadow-black/10"
        >
          <h2 class="text-lg font-semibold text-amber-300">
            關鍵區域
          </h2>

          <div class="mt-5 space-y-5">
            <PlanField
              v-model="plan.supportZones"
              label="重要支撐區域"
              placeholder="輸入價位、區域與判斷理由。"
              :rows="4"
              :disabled="plan.completed"
            />

            <PlanField
              v-model="plan.resistanceZones"
              label="重要壓力區域"
              placeholder="輸入價位、區域與判斷理由。"
              :rows="4"
              :disabled="plan.completed"
            />
          </div>
        </section>

        <section
          class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-xl shadow-black/10"
        >
          <h2 class="text-lg font-semibold text-amber-300">
            交易規則
          </h2>

          <div class="mt-5 grid gap-3">
            <div
              class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
            >
              <p class="text-xs text-zinc-500">
                最大交易次數
              </p>

              <div class="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  :disabled="plan.completed"
                  class="h-9 w-9 rounded-xl border border-zinc-700 text-zinc-400 transition hover:border-amber-500/40 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                  @click="decreaseMaxTrades"
                >
                  −
                </button>

                <input
                  v-model.number="plan.maxTrades"
                  type="number"
                  min="0"
                  max="20"
                  :disabled="plan.completed"
                  class="w-20 bg-transparent text-center text-xl font-semibold text-zinc-100 outline-none"
                />

                <button
                  type="button"
                  :disabled="plan.completed"
                  class="h-9 w-9 rounded-xl border border-zinc-700 text-zinc-400 transition hover:border-amber-500/40 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                  @click="increaseMaxTrades"
                >
                  ＋
                </button>
              </div>
            </div>

            <div
              class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
            >
              <p class="text-xs text-zinc-500">
                單筆最大風險
              </p>

              <div class="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  :disabled="plan.completed"
                  class="h-9 w-9 rounded-xl border border-zinc-700 text-zinc-400 transition hover:border-amber-500/40 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                  @click="decreaseRisk"
                >
                  −
                </button>

                <div class="text-xl font-semibold text-zinc-100">
                  {{ plan.maxRiskPercent.toFixed(1) }}%
                </div>

                <button
                  type="button"
                  :disabled="plan.completed"
                  class="h-9 w-9 rounded-xl border border-zinc-700 text-zinc-400 transition hover:border-amber-500/40 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                  @click="increaseRisk"
                >
                  ＋
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <div class="grid gap-4 2xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]">
      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-xl shadow-black/10"
      >
        <h2 class="text-lg font-semibold text-amber-300">
          今日總結
        </h2>

        <div class="mt-5">
          <PlanField
            v-model="plan.notes"
            label="今日交易計畫總結與提醒"
            placeholder="記錄今天最重要的方向、條件、風險與需要提醒自己的事情。"
            :rows="5"
            :disabled="plan.completed"
          />
        </div>
      </section>

      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-xl shadow-black/10"
      >
        <p class="text-sm text-zinc-500">
          規劃狀態
        </p>

        <h2 class="mt-3 text-xl font-semibold text-zinc-100">
          {{
            plan.completed
              ? '今日規劃已鎖定'
              : statusText
          }}
        </h2>

        <p class="mt-2 text-sm leading-6 text-zinc-500">
          完成並鎖定後，可避免盤中因情緒而隨意更改交易標準。
        </p>

        <button
          v-if="!plan.completed"
          type="button"
          :disabled="!isReadyToComplete"
          class="mt-5 w-full rounded-2xl border border-amber-500/30 bg-amber-500/10 px-6 py-3 text-sm font-medium text-amber-300 transition hover:border-amber-400/50 hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-900 disabled:text-zinc-600"
          @click="planStore.markCompleted"
        >
          完成今日規劃並鎖定
        </button>

        <button
          v-else
          type="button"
          class="mt-5 w-full rounded-2xl border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-400 transition hover:border-amber-500/30 hover:text-amber-300"
          @click="planStore.reopen"
        >
          重新開啟編輯
        </button>
      </section>
    </div>
  </div>
</template>
