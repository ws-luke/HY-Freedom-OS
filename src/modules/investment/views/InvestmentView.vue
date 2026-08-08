<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { buildCapitalDashboard } from '@/services/capital-management.service'
import { formatCurrency } from '@/services'
import { useAccountStore } from '@/stores/useAccountStore'
import { useTradeStore } from '@/stores/useTradeStore'
import { useTradingRiskStore } from '@/stores/useTradingRiskStore'
import type { CapitalRiskLevel } from '@/services/capital-management.service'
import type { TradingAccount } from '@/types/account'

const accountStore = useAccountStore()
const tradeStore = useTradeStore()
const tradingRiskStore = useTradingRiskStore()

const { accounts, transactions } = storeToRefs(accountStore)
const { trades } = storeToRefs(tradeStore)
const { settings } = storeToRefs(tradingRiskStore)

const dashboard = computed(() =>
  buildCapitalDashboard(
    accounts.value,
    transactions.value,
    trades.value,
    settings.value,
  ),
)

const maxMonthlyAbsolutePnl = computed(() =>
  Math.max(
    1,
    ...dashboard.value.monthlyPerformance.map(point =>
      Math.abs(point.profitLoss),
    ),
  ),
)

const money = (value: number): string =>
  formatCurrency(value, 'USD')

const signedMoney = (value: number): string =>
  `${value > 0 ? '+' : ''}${money(value)}`

const pnlClass = (value: number): string => {
  if (value > 0) return 'text-emerald-300'
  if (value < 0) return 'text-rose-300'
  return 'text-zinc-300'
}

const riskLabel: Record<CapitalRiskLevel, string> = {
  healthy: '安全',
  warning: '注意',
  danger: '高風險',
}

const riskBadgeClass: Record<CapitalRiskLevel, string> = {
  healthy: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  warning: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  danger: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
}

const progressClass = (level: CapitalRiskLevel): string => {
  if (level === 'danger') return 'bg-rose-400'
  if (level === 'warning') return 'bg-amber-400'
  return 'bg-emerald-400'
}

const accountTypeLabel = (
  account: TradingAccount,
): string => {
  if (account.type === 'live') return '真倉'
  if (account.type === 'demo') return '模擬'
  if (account.propStage === 'challenge') return 'Prop 挑戰'
  if (account.propStage === 'verification') return 'Prop 驗證'
  if (account.propStage === 'funded') return 'Prop Funded'
  return 'Prop Firm'
}

const allocationTone: Record<
  'prop' | 'live' | 'demo',
  string
> = {
  prop: 'bg-violet-400',
  live: 'bg-emerald-400',
  demo: 'bg-sky-400',
}
</script>

<template>
  <div class="space-y-6 pb-10">
    <section
      class="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-[#101012] p-6 shadow-2xl shadow-black/15 sm:p-8"
    >
      <div
        class="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-emerald-500/8 blur-3xl"
      />
      <div
        class="pointer-events-none absolute bottom-[-130px] left-[25%] h-64 w-64 rounded-full bg-violet-500/8 blur-3xl"
      />

      <div
        class="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between"
      >
        <div class="max-w-3xl">
          <div class="flex flex-wrap items-center gap-3">
            <p
              class="text-xs font-medium tracking-[0.24em] text-emerald-300"
            >
              CAPITAL COMMAND
            </p>

            <span
              class="rounded-full border px-2.5 py-1 text-[11px] font-medium"
              :class="riskBadgeClass[dashboard.riskLevel]"
            >
              整體風險 · {{ riskLabel[dashboard.riskLevel] }}
            </span>
          </div>

          <h1
            class="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl"
          >
            資金管理
          </h1>

          <p
            class="mt-3 max-w-2xl text-sm leading-7 text-zinc-500"
          >
            把真倉、Prop Firm、模擬資金與交易風險放在同一個視角。這裡不負責記帳，而是回答：目前資金是否健康、今天還能承受多少風險。
          </p>
        </div>

        <div class="flex flex-wrap gap-3">
          <RouterLink
            to="/accounts"
            class="rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-emerald-400/25 hover:text-emerald-300"
          >
            管理帳戶
          </RouterLink>

          <RouterLink
            to="/trading-risk"
            class="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-300 transition hover:bg-amber-500/15"
          >
            交易風控設定
          </RouterLink>
        </div>
      </div>
    </section>

    <section
      v-if="dashboard.accountCount === 0"
      class="rounded-3xl border border-dashed border-zinc-700 bg-zinc-900/60 p-10 text-center"
    >
      <div
        class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-xl text-emerald-300"
      >
        $
      </div>

      <h2 class="mt-5 text-xl font-semibold text-zinc-100">
        先建立你的第一個交易帳戶
      </h2>

      <p class="mx-auto mt-2 max-w-lg text-sm leading-7 text-zinc-500">
        資金管理會直接讀取帳戶管理中的 FTMO、模擬倉與真倉資料，不需要重複輸入。
      </p>

      <RouterLink
        to="/accounts"
        class="mt-6 inline-flex rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
      >
        前往帳戶管理
      </RouterLink>
    </section>

    <template v-else>
      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article
          class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
        >
          <p class="text-xs text-zinc-500">自有真倉 Equity</p>
          <p class="mt-3 text-2xl font-semibold text-emerald-300">
            {{ money(dashboard.liveEquity) }}
          </p>
          <p class="mt-2 text-xs text-zinc-600">
            真正屬於自己的交易資金
          </p>
        </article>

        <article
          class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
        >
          <p class="text-xs text-zinc-500">Prop Firm Equity</p>
          <p class="mt-3 text-2xl font-semibold text-violet-300">
            {{ money(dashboard.propEquity) }}
          </p>
          <p class="mt-2 text-xs text-zinc-600">
            挑戰、驗證與 Funded 帳戶
          </p>
        </article>

        <article
          class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
        >
          <p class="text-xs text-zinc-500">本月已實現損益</p>
          <p
            class="mt-3 text-2xl font-semibold"
            :class="pnlClass(dashboard.monthProfitLoss)"
          >
            {{ signedMoney(dashboard.monthProfitLoss) }}
          </p>
          <p class="mt-2 text-xs text-zinc-600">
            來自本月交易紀錄
          </p>
        </article>

        <article
          class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
        >
          <p class="text-xs text-zinc-500">累計分潤出金</p>
          <p class="mt-3 text-2xl font-semibold text-sky-300">
            {{ money(dashboard.cashflow.payouts) }}
          </p>
          <p class="mt-2 text-xs text-zinc-600">
            來自帳戶資金流水
          </p>
        </article>
      </section>

      <section class="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <article
          class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6"
        >
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p
                class="text-xs font-medium tracking-[0.18em] text-amber-300"
              >
                TODAY RISK BUDGET
              </p>
              <h2 class="mt-2 text-xl font-semibold text-zinc-100">
                今日風險預算
              </h2>
            </div>

            <span
              class="rounded-full border px-2.5 py-1 text-[11px] font-medium"
              :class="riskBadgeClass[dashboard.riskLevel]"
            >
              {{ riskLabel[dashboard.riskLevel] }}
            </span>
          </div>

          <div class="mt-6 grid gap-3 sm:grid-cols-4">
            <div class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <p class="text-xs text-zinc-600">每日虧損上限</p>
              <p class="mt-2 font-semibold text-zinc-200">
                {{ money(dashboard.dailyRiskLimit) }}
              </p>
            </div>

            <div class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <p class="text-xs text-zinc-600">今日交易損益</p>
              <p class="mt-2 font-semibold" :class="pnlClass(dashboard.todayProfitLoss)">
                {{ signedMoney(dashboard.todayProfitLoss) }}
              </p>
            </div>

            <div class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <p class="text-xs text-zinc-600">今日剩餘風險</p>
              <p class="mt-2 font-semibold text-amber-300">
                {{ money(dashboard.remainingDailyRisk) }}
              </p>
            </div>

            <div class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <p class="text-xs text-zinc-600">單筆風險上限</p>
              <p class="mt-2 font-semibold text-zinc-200">
                {{ money(dashboard.maxRiskPerTrade) }}
              </p>
            </div>
          </div>

          <div class="mt-5">
            <div class="flex items-center justify-between gap-4 text-xs">
              <span class="text-zinc-500">今日虧損額度使用</span>
              <span class="font-medium text-zinc-300">
                {{ dashboard.dailyRiskUsagePercent.toFixed(0) }}%
              </span>
            </div>

            <div class="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                class="h-full rounded-full transition-all"
                :class="progressClass(dashboard.riskLevel)"
                :style="{ width: `${dashboard.dailyRiskUsagePercent}%` }"
              />
            </div>
          </div>

          <p class="mt-4 text-xs leading-6 text-zinc-600">
            今日獲利不會自動放大可承受虧損；Freedom OS 以保守方式維持原始每日風險上限。
          </p>
        </article>

        <article
          class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6"
        >
          <p
            class="text-xs font-medium tracking-[0.18em] text-violet-300"
          >
            CAPITAL MIX
          </p>
          <h2 class="mt-2 text-xl font-semibold text-zinc-100">
            監控資本結構
          </h2>

          <div class="mt-6 space-y-5">
            <div
              v-for="allocation in dashboard.allocations"
              :key="allocation.type"
            >
              <div class="flex items-center justify-between gap-4">
                <div>
                  <p class="text-sm font-medium text-zinc-300">
                    {{ allocation.label }}
                  </p>
                  <p class="mt-1 text-xs text-zinc-600">
                    {{ allocation.count }} 個帳戶 · {{ money(allocation.equity) }} Equity
                  </p>
                </div>

                <p class="text-sm font-semibold text-zinc-200">
                  {{ allocation.percent.toFixed(1) }}%
                </p>
              </div>

              <div class="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  class="h-full rounded-full"
                  :class="allocationTone[allocation.type]"
                  :style="{ width: `${allocation.percent}%` }"
                />
              </div>
            </div>
          </div>

          <div
            class="mt-6 flex items-center justify-between gap-4 border-t border-zinc-800 pt-4"
          >
            <span class="text-xs text-zinc-500">總監控 Equity</span>
            <span class="font-semibold text-zinc-200">
              {{ money(dashboard.trackedEquity) }}
            </span>
          </div>

          <p class="mt-3 text-[11px] leading-5 text-zinc-700">
            Prop Firm 與模擬資金不視為個人淨資產；此比例只用於交易資本曝險觀察。
          </p>
        </article>
      </section>

      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6"
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p
              class="text-xs font-medium tracking-[0.18em] text-sky-300"
            >
              ACCOUNT RISK MAP
            </p>
            <h2 class="mt-2 text-xl font-semibold text-zinc-100">
              帳戶風險地圖
            </h2>
            <p class="mt-1 text-sm text-zinc-500">
              高風險帳戶會自動排到前面。
            </p>
          </div>

          <p class="text-xs text-zinc-600">
            共 {{ dashboard.accountCount }} 個監控帳戶
          </p>
        </div>

        <div class="mt-6 grid gap-4 xl:grid-cols-2">
          <article
            v-for="snapshot in dashboard.snapshots"
            :key="snapshot.account.id"
            class="rounded-2xl border border-zinc-800 bg-zinc-950/55 p-5"
          >
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="truncate font-semibold text-zinc-100">
                    {{ snapshot.account.name }}
                  </h3>
                  <span
                    class="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-500"
                  >
                    {{ accountTypeLabel(snapshot.account) }}
                  </span>
                </div>

                <p class="mt-1 text-xs text-zinc-600">
                  {{ snapshot.account.provider || '未設定商家' }} · {{ snapshot.account.platform || '未設定平台' }}
                </p>
              </div>

              <span
                class="rounded-full border px-2.5 py-1 text-[11px] font-medium"
                :class="riskBadgeClass[snapshot.riskLevel]"
              >
                {{ riskLabel[snapshot.riskLevel] }}
              </span>
            </div>

            <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <p class="text-[11px] text-zinc-600">Balance</p>
                <p class="mt-1 text-sm font-semibold text-zinc-300">
                  {{ money(snapshot.account.balance) }}
                </p>
              </div>
              <div>
                <p class="text-[11px] text-zinc-600">Equity</p>
                <p class="mt-1 text-sm font-semibold text-zinc-300">
                  {{ money(snapshot.account.equity) }}
                </p>
              </div>
              <div>
                <p class="text-[11px] text-zinc-600">今日 P/L</p>
                <p class="mt-1 text-sm font-semibold" :class="pnlClass(snapshot.todayProfitLoss)">
                  {{ signedMoney(snapshot.todayProfitLoss) }}
                </p>
              </div>
              <div>
                <p class="text-[11px] text-zinc-600">本月 P/L</p>
                <p class="mt-1 text-sm font-semibold" :class="pnlClass(snapshot.monthProfitLoss)">
                  {{ signedMoney(snapshot.monthProfitLoss) }}
                </p>
              </div>
            </div>

            <div class="mt-5 grid gap-4 sm:grid-cols-3">
              <div>
                <div class="flex items-center justify-between gap-3 text-xs">
                  <span class="text-zinc-500">最大回撤額度</span>
                  <span class="text-zinc-300">
                    {{ snapshot.maxDrawdownAmount === null ? '未設定' : `${snapshot.health.drawdownUsagePercent.toFixed(0)}%` }}
                  </span>
                </div>
                <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    class="h-full rounded-full"
                    :class="progressClass(snapshot.riskLevel)"
                    :style="{ width: `${Math.min(100, snapshot.health.drawdownUsagePercent)}%` }"
                  />
                </div>
                <p class="mt-2 text-[11px] text-zinc-600">
                  {{ snapshot.remainingDrawdown === null ? '帳戶未設定 Max Drawdown' : `剩餘 ${money(snapshot.remainingDrawdown)}` }}
                </p>
              </div>

              <div>
                <div class="flex items-center justify-between gap-3 text-xs">
                  <span class="text-zinc-500">今日虧損額度</span>
                  <span class="text-zinc-300">
                    {{ snapshot.dailyLossLimitAmount === null ? '未設定' : `${snapshot.dailyLossUsagePercent.toFixed(0)}%` }}
                  </span>
                </div>
                <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    class="h-full rounded-full"
                    :class="progressClass(snapshot.riskLevel)"
                    :style="{ width: `${Math.min(100, snapshot.dailyLossUsagePercent)}%` }"
                  />
                </div>
                <p class="mt-2 text-[11px] text-zinc-600">
                  {{ snapshot.remainingDailyLoss === null ? '帳戶未設定 Daily Loss' : `剩餘 ${money(snapshot.remainingDailyLoss)}` }}
                </p>
              </div>

              <div>
                <div class="flex items-center justify-between gap-3 text-xs">
                  <span class="text-zinc-500">獲利目標進度</span>
                  <span class="text-zinc-300">
                    {{ snapshot.targetProgressPercent === null ? '未設定' : `${snapshot.targetProgressPercent.toFixed(0)}%` }}
                  </span>
                </div>
                <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    class="h-full rounded-full bg-emerald-400"
                    :style="{ width: `${snapshot.targetProgressPercent ?? 0}%` }"
                  />
                </div>
                <p class="mt-2 text-[11px] text-zinc-600">
                  {{ snapshot.profitTargetAmount === null ? '帳戶未設定 Profit Target' : `目前 ${money(snapshot.currentProfitAmount)} / ${money(snapshot.profitTargetAmount)}` }}
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6"
      >
        <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="text-xs font-medium tracking-[0.18em] text-emerald-300">
              6 MONTH PERFORMANCE
            </p>
            <h2 class="mt-2 text-xl font-semibold text-zinc-100">
              近六個月已實現損益
            </h2>
          </div>
          <p class="text-xs text-zinc-600">
            同時保留每月交易數與平均 R
          </p>
        </div>

        <div class="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="point in dashboard.monthlyPerformance"
            :key="point.key"
            class="rounded-2xl border border-zinc-800 bg-zinc-950/55 p-4"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs text-zinc-600">{{ point.label }}</p>
                <p class="mt-1 text-lg font-semibold" :class="pnlClass(point.profitLoss)">
                  {{ signedMoney(point.profitLoss) }}
                </p>
              </div>
              <div class="text-right text-[11px] leading-5 text-zinc-600">
                <p>{{ point.trades }} 筆</p>
                <p>{{ point.averageR > 0 ? '+' : '' }}{{ point.averageR.toFixed(2) }}R</p>
              </div>
            </div>

            <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div
                class="h-full min-w-[2px] rounded-full"
                :class="point.profitLoss >= 0 ? 'bg-emerald-400' : 'bg-rose-400'"
                :style="{ width: `${Math.max(2, Math.abs(point.profitLoss) / maxMonthlyAbsolutePnl * 100)}%` }"
              />
            </div>
          </article>
        </div>
      </section>

      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article class="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <p class="text-xs text-zinc-500">累計入金</p>
          <p class="mt-2 text-lg font-semibold text-emerald-300">
            {{ money(dashboard.cashflow.deposits) }}
          </p>
        </article>
        <article class="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <p class="text-xs text-zinc-500">一般出金</p>
          <p class="mt-2 text-lg font-semibold text-zinc-300">
            {{ money(dashboard.cashflow.withdrawals) }}
          </p>
        </article>
        <article class="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <p class="text-xs text-zinc-500">Prop 分潤出金</p>
          <p class="mt-2 text-lg font-semibold text-sky-300">
            {{ money(dashboard.cashflow.payouts) }}
          </p>
        </article>
        <article class="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <p class="text-xs text-zinc-500">挑戰／平台費用</p>
          <p class="mt-2 text-lg font-semibold text-rose-300">
            {{ money(dashboard.cashflow.fees) }}
          </p>
        </article>
      </section>
    </template>
  </div>
</template>
