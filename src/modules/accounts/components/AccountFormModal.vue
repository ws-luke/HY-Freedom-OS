<script setup lang="ts">
import { computed, reactive, watch } from 'vue'

import AccountIcon from './AccountIcon.vue'

import type {
  AccountDataSource,
  AccountStatus,
  AccountType,
  NewTradingAccountInput,
  PropAccountStage,
  TradingAccount,
} from '@/types/account'

interface AccountFormData {
  name: string
  provider: string
  type: AccountType
  status: AccountStatus
  propStage: PropAccountStage
  platform: string
  accountNumber: string
  dataSource: AccountDataSource
  brokerServer: string
  brokerLogin: string
  currency: string
  startingBalance: number | null
  balance: number | null
  equity: number | null
  profitTargetPercent: number | null
  maxDailyLossPercent: number | null
  maxDrawdownPercent: number | null
  profitSplitPercent: number | null
  notes: string
}

const props = withDefaults(
  defineProps<{
    open: boolean
    account?: TradingAccount | null
    presetType?: AccountType
  }>(),
  {
    account: null,
    presetType: 'live',
  },
)

const emit = defineEmits<{
  close: []
  submit: [input: NewTradingAccountInput]
}>()

const accountTypeOptions: Array<{
  value: AccountType
  label: string
  description: string
}> = [
  {
    value: 'prop',
    label: 'FTMO／Prop Firm',
    description: '挑戰、驗證與資金帳戶',
  },
  {
    value: 'demo',
    label: '模擬帳戶',
    description: '練習與策略驗證使用',
  },
  {
    value: 'live',
    label: '個人真倉',
    description: '自己的券商實盤帳戶',
  },
]

const statusOptions: Array<{
  value: AccountStatus
  label: string
}> = [
  { value: 'active', label: '使用中' },
  { value: 'paused', label: '暫停使用' },
  { value: 'passed', label: '已通過' },
  { value: 'failed', label: '已失敗' },
  { value: 'closed', label: '已關閉' },
]

const propStageOptions: Array<{
  value: PropAccountStage
  label: string
}> = [
  { value: 'challenge', label: 'Challenge 挑戰' },
  { value: 'verification', label: 'Verification 驗證' },
  { value: 'funded', label: 'Funded 資金帳戶' },
]

const createForm = (
  type: AccountType,
): AccountFormData => ({
  name: '',
  provider: type === 'prop' ? 'FTMO' : '',
  type,
  status: 'active',
  propStage: 'challenge',
  platform: 'MT5',
  accountNumber: '',
  dataSource: 'manual',
  brokerServer: '',
  brokerLogin: '',
  currency: 'USD',
  startingBalance: null,
  balance: null,
  equity: null,
  profitTargetPercent:
    type === 'prop' ? 10 : null,
  maxDailyLossPercent:
    type === 'prop' ? 5 : null,
  maxDrawdownPercent:
    type === 'prop' ? 10 : null,
  profitSplitPercent:
    type === 'prop' ? 80 : null,
  notes: '',
})

const form = reactive<AccountFormData>(
  createForm(props.presetType),
)

const isEditing = computed(() => Boolean(props.account))

const isValid = computed(() =>
  Boolean(
    form.name.trim() &&
      form.provider.trim() &&
      form.currency.trim() &&
      (
        form.dataSource === 'mt5'
          ? form.brokerServer.trim() && form.brokerLogin.trim()
          : form.startingBalance !== null &&
            form.startingBalance >= 0 &&
            form.balance !== null &&
            form.balance >= 0 &&
            form.equity !== null &&
            form.equity >= 0
      ),
  ),
)

const numericOrZero = (
  value: number | null,
): number => {
  const numberValue = Number(value)
  return Number.isFinite(numberValue)
    ? Math.max(0, numberValue)
    : 0
}

const nullableNumber = (
  value: number | null,
): number | null => {
  if (value === null || value === undefined) {
    return null
  }

  const numberValue = Number(value)
  return Number.isFinite(numberValue)
    ? Math.max(0, numberValue)
    : null
}

const loadForm = (): void => {
  if (!props.account) {
    Object.assign(
      form,
      createForm(props.presetType),
    )
    return
  }

  Object.assign(form, {
    name: props.account.name,
    provider: props.account.provider,
    type: props.account.type,
    status: props.account.status,
    propStage:
      props.account.propStage ?? 'challenge',
    platform: props.account.platform,
    accountNumber: props.account.accountNumber,
    dataSource: props.account.dataSource,
    brokerServer: props.account.brokerServer,
    brokerLogin: props.account.brokerLogin,
    currency: props.account.currency,
    startingBalance: props.account.startingBalance,
    balance: props.account.balance,
    equity: props.account.equity,
    profitTargetPercent:
      props.account.profitTargetPercent,
    maxDailyLossPercent:
      props.account.maxDailyLossPercent,
    maxDrawdownPercent:
      props.account.maxDrawdownPercent,
    profitSplitPercent:
      props.account.profitSplitPercent,
    notes: props.account.notes,
  })
}

const setAccountType = (type: AccountType): void => {
  if (isEditing.value || form.type === type) return

  const previousName = form.name
  const previousCurrency = form.currency
  Object.assign(form, createForm(type))
  form.name = previousName
  form.currency = previousCurrency
}

const submitForm = (): void => {
  if (!isValid.value) return

  emit('submit', {
    name: form.name.trim(),
    provider: form.provider.trim(),
    type: form.type,
    status: form.status,
    propStage:
      form.type === 'prop'
        ? form.propStage
        : null,
    platform: form.platform.trim(),
    accountNumber: form.accountNumber.trim(),
    dataSource: form.dataSource,
    brokerServer: form.dataSource === 'mt5' ? form.brokerServer.trim() : '',
    brokerLogin: form.dataSource === 'mt5' ? form.brokerLogin.trim() : '',
    currency:
      form.currency.trim().toUpperCase(),
    startingBalance: numericOrZero(
      form.startingBalance,
    ),
    balance: numericOrZero(form.balance),
    equity: numericOrZero(form.equity),
    profitTargetPercent:
      form.type === 'prop'
        ? nullableNumber(form.profitTargetPercent)
        : null,
    maxDailyLossPercent:
      form.type === 'prop'
        ? nullableNumber(form.maxDailyLossPercent)
        : null,
    maxDrawdownPercent:
      form.type === 'prop'
        ? nullableNumber(form.maxDrawdownPercent)
        : null,
    profitSplitPercent:
      form.type === 'prop'
        ? nullableNumber(form.profitSplitPercent)
        : null,
    notes: form.notes.trim(),
  })
}

watch(
  [
    () => props.open,
    () => props.account,
    () => props.presetType,
  ],
  ([open]) => {
    if (open) loadForm()
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
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-5"
        @click.self="emit('close')"
      >
        <section
          class="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-[1.75rem] border border-white/[0.09] bg-[#101012] shadow-2xl shadow-black/60"
        >
          <header
            class="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-white/[0.07] bg-[#101012]/95 p-5 backdrop-blur sm:p-6"
          >
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300/70">
                Account profile
              </p>
              <h2 class="mt-2 text-2xl font-semibold tracking-tight text-white">
                {{ isEditing ? '編輯帳戶' : '建立交易帳戶' }}
              </h2>
              <p class="mt-1 text-sm text-zinc-500">
                帳戶密碼、API 金鑰與完整登入資料請勿填入。
              </p>
            </div>
            <button
              type="button"
              class="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] text-zinc-500 transition hover:border-white/15 hover:text-white"
              aria-label="關閉"
              @click="emit('close')"
            >
              <AccountIcon name="close" :size="18" />
            </button>
          </header>

          <form class="space-y-7 p-5 sm:p-6" @submit.prevent="submitForm">
            <section>
              <p class="text-sm font-medium text-zinc-300">帳戶類型</p>
              <div class="mt-3 grid gap-3 sm:grid-cols-3">
                <button
                  v-for="option in accountTypeOptions"
                  :key="option.value"
                  type="button"
                  :disabled="isEditing"
                  class="rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed"
                  :class="
                    form.type === option.value
                      ? 'border-amber-400/30 bg-amber-400/[0.08]'
                      : 'border-white/[0.07] bg-white/[0.025] hover:border-white/[0.13]'
                  "
                  @click="setAccountType(option.value)"
                >
                  <p
                    class="text-sm font-semibold"
                    :class="form.type === option.value ? 'text-amber-300' : 'text-zinc-300'"
                  >
                    {{ option.label }}
                  </p>
                  <p class="mt-1.5 text-xs leading-5 text-zinc-600">
                    {{ option.description }}
                  </p>
                </button>
              </div>
            </section>

            <section class="rounded-2xl border border-sky-400/15 bg-sky-400/[0.035] p-4 sm:p-5">
              <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p class="text-sm font-medium text-zinc-200">交易資料來源</p>
                  <p class="mt-1 text-xs leading-5 text-zinc-600">
                    手動帳戶維持現有流程；MT5 Sync 帳戶會在同步服務接通後自動建立持倉、歷史交易與待復盤紀錄。
                  </p>
                </div>
                <div class="grid min-w-[250px] grid-cols-2 gap-2">
                  <button
                    type="button"
                    class="rounded-xl border px-3 py-2.5 text-xs font-medium transition"
                    :class="form.dataSource === 'manual' ? 'border-zinc-600 bg-zinc-800 text-zinc-200' : 'border-zinc-800 text-zinc-600'"
                    @click="form.dataSource = 'manual'"
                  >
                    Manual
                  </button>
                  <button
                    type="button"
                    class="rounded-xl border px-3 py-2.5 text-xs font-medium transition"
                    :class="form.dataSource === 'mt5' ? 'border-sky-400/35 bg-sky-400/10 text-sky-300' : 'border-zinc-800 text-zinc-600'"
                    @click="form.dataSource = 'mt5'; form.platform = 'MT5'"
                  >
                    MT5 Sync
                  </button>
                </div>
              </div>

              <div v-if="form.dataSource === 'mt5'" class="mt-4 grid gap-3 sm:grid-cols-2">
                <label>
                  <span class="text-xs text-zinc-500">MT5 Server *</span>
                  <input
                    v-model="form.brokerServer"
                    type="text"
                    required
                    placeholder="例如 FTMO-Demo2"
                    class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-sky-400/35"
                  />
                </label>
                <label>
                  <span class="text-xs text-zinc-500">MT5 Login *</span>
                  <input
                    v-model="form.brokerLogin"
                    type="text"
                    inputmode="numeric"
                    required
                    placeholder="MT5 帳戶號碼"
                    class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-sky-400/35"
                  />
                </label>
              </div>

              <div v-if="form.dataSource === 'mt5'" class="mt-3 rounded-xl border border-amber-400/10 bg-amber-400/[0.035] px-3.5 py-3 text-[11px] leading-5 text-amber-200/60">
                Freedom OS 不會把 MT5 密碼存進瀏覽器。建立帳戶後，在「連接 MT5」視窗輸入 Investor / Read-only Password，只用於當次同步。
              </div>
            </section>

            <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <label class="sm:col-span-2">
                <span class="text-sm font-medium text-zinc-300">帳戶名稱 *</span>
                <input
                  v-model="form.name"
                  type="text"
                  required
                  placeholder="例如：FTMO 100K #1"
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition placeholder:text-zinc-700 focus:border-amber-400/35"
                />
                <span class="mt-1.5 block text-[11px] text-zinc-700">
                  交易紀錄會用此名稱自動對應帳戶績效。
                </span>
              </label>

              <label>
                <span class="text-sm font-medium text-zinc-300">
                  {{ form.type === 'prop' ? 'Prop Firm' : '券商／平台商' }} *
                </span>
                <input
                  v-model="form.provider"
                  type="text"
                  required
                  :placeholder="form.type === 'prop' ? 'FTMO' : '券商名稱'"
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition placeholder:text-zinc-700 focus:border-amber-400/35"
                />
              </label>

              <label>
                <span class="text-sm font-medium text-zinc-300">狀態</span>
                <select
                  v-model="form.status"
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition focus:border-amber-400/35"
                >
                  <option v-for="status in statusOptions" :key="status.value" :value="status.value">
                    {{ status.label }}
                  </option>
                </select>
              </label>

              <label v-if="form.type === 'prop'">
                <span class="text-sm font-medium text-zinc-300">帳戶階段</span>
                <select
                  v-model="form.propStage"
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition focus:border-amber-400/35"
                >
                  <option v-for="stage in propStageOptions" :key="stage.value" :value="stage.value">
                    {{ stage.label }}
                  </option>
                </select>
              </label>

              <label>
                <span class="text-sm font-medium text-zinc-300">交易平台</span>
                <input
                  v-model="form.platform"
                  type="text"
                  placeholder="MT5／cTrader／DXtrade"
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition placeholder:text-zinc-700 focus:border-amber-400/35"
                />
              </label>

              <label>
                <span class="text-sm font-medium text-zinc-300">帳號末碼</span>
                <input
                  v-model="form.accountNumber"
                  type="text"
                  placeholder="只記錄末 4–6 碼"
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition placeholder:text-zinc-700 focus:border-amber-400/35"
                />
              </label>

              <label>
                <span class="text-sm font-medium text-zinc-300">幣別</span>
                <select
                  v-model="form.currency"
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition focus:border-amber-400/35"
                >
                  <option value="USD">USD</option>
                  <option value="TWD">TWD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="JPY">JPY</option>
                </select>
              </label>
            </section>

            <section v-if="form.dataSource === 'manual'">
              <div>
                <p class="text-sm font-medium text-zinc-300">帳戶資金快照</p>
                <p class="mt-1 text-xs text-zinc-600">餘額與淨值可隨時回來更新；不會由交易盈虧硬算。</p>
              </div>
              <div class="mt-3 grid gap-4 sm:grid-cols-3">
                <label>
                  <span class="text-xs text-zinc-500">初始資金 *</span>
                  <input
                    v-model.number="form.startingBalance"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder="100000"
                    class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition placeholder:text-zinc-700 focus:border-amber-400/35"
                  />
                </label>
                <label>
                  <span class="text-xs text-zinc-500">目前餘額 *</span>
                  <input
                    v-model.number="form.balance"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder="100000"
                    class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition placeholder:text-zinc-700 focus:border-amber-400/35"
                  />
                </label>
                <label>
                  <span class="text-xs text-zinc-500">目前淨值 *</span>
                  <input
                    v-model.number="form.equity"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder="100000"
                    class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition placeholder:text-zinc-700 focus:border-amber-400/35"
                  />
                </label>
              </div>
            </section>

            <section v-else class="rounded-2xl border border-emerald-400/12 bg-emerald-400/[0.035] p-4 sm:p-5">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p class="text-sm font-medium text-emerald-300">資金資料由 MT5 自動取得</p>
                  <p class="mt-1 text-xs leading-5 text-zinc-600">建立帳戶時不用輸入初始資金、餘額或淨值；首次同步後自動更新。</p>
                </div>
                <span class="w-fit rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-2.5 py-1 text-[10px] font-medium text-emerald-300">AUTO SYNC</span>
              </div>
              <div class="mt-4 grid grid-cols-3 gap-2">
                <div class="rounded-xl border border-white/[0.055] bg-black/15 p-3">
                  <p class="text-[10px] text-zinc-700">初始資金</p>
                  <p class="mt-1 text-xs font-medium text-zinc-400">MT5 歷史辨識</p>
                </div>
                <div class="rounded-xl border border-white/[0.055] bg-black/15 p-3">
                  <p class="text-[10px] text-zinc-700">目前餘額</p>
                  <p class="mt-1 text-xs font-medium text-zinc-400">MT5 Balance</p>
                </div>
                <div class="rounded-xl border border-white/[0.055] bg-black/15 p-3">
                  <p class="text-[10px] text-zinc-700">目前淨值</p>
                  <p class="mt-1 text-xs font-medium text-zinc-400">MT5 Equity</p>
                </div>
              </div>
            </section>

            <section v-if="form.type === 'prop'">
              <div>
                <p class="text-sm font-medium text-zinc-300">Prop Firm 規則</p>
                <p class="mt-1 text-xs text-zinc-600">請依你實際購買的方案填寫，不套用固定 FTMO 規則。</p>
              </div>
              <div class="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <label>
                  <span class="text-xs text-zinc-500">獲利目標 %</span>
                  <input
                    v-model.number="form.profitTargetPercent"
                    type="number"
                    min="0"
                    step="0.1"
                    class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none focus:border-amber-400/35"
                  />
                </label>
                <label>
                  <span class="text-xs text-zinc-500">單日虧損上限 %</span>
                  <input
                    v-model.number="form.maxDailyLossPercent"
                    type="number"
                    min="0"
                    step="0.1"
                    class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none focus:border-amber-400/35"
                  />
                </label>
                <label>
                  <span class="text-xs text-zinc-500">總虧損上限 %</span>
                  <input
                    v-model.number="form.maxDrawdownPercent"
                    type="number"
                    min="0"
                    step="0.1"
                    class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none focus:border-amber-400/35"
                  />
                </label>
                <label>
                  <span class="text-xs text-zinc-500">分潤比例 %</span>
                  <input
                    v-model.number="form.profitSplitPercent"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none focus:border-amber-400/35"
                  />
                </label>
              </div>
            </section>

            <label class="block">
              <span class="text-sm font-medium text-zinc-300">備註</span>
              <textarea
                v-model="form.notes"
                rows="3"
                placeholder="方案、限制、使用目的或其他需要記住的事項…"
                class="mt-2 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition placeholder:text-zinc-700 focus:border-amber-400/35"
              />
            </label>

            <footer class="flex flex-col-reverse gap-3 border-t border-white/[0.07] pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                class="rounded-xl border border-white/[0.08] px-5 py-3 text-sm text-zinc-400 transition hover:text-white"
                @click="emit('close')"
              >
                取消
              </button>
              <button
                type="submit"
                :disabled="!isValid"
                class="rounded-xl bg-amber-300 px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
              >
                {{ isEditing ? '儲存帳戶' : '建立帳戶' }}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
