<script setup lang="ts">
import { computed, reactive, watch } from 'vue'

import AccountIcon from './AccountIcon.vue'
import {
  defaultTransactionDirection,
  transactionTypeLabels,
} from '@/services/account-ledger.service'

import type {
  AccountTransaction,
  AccountTransactionDirection,
  AccountTransactionType,
  NewAccountTransactionInput,
  TradingAccount,
} from '@/types/account'

interface TransactionFormData {
  type: AccountTransactionType
  direction: AccountTransactionDirection
  date: string
  amount: number | null
  balanceAfter: number | null
  method: string
  reference: string
  notes: string
}

const props = withDefaults(
  defineProps<{
    open: boolean
    account: TradingAccount | null
    transaction?: AccountTransaction | null
    presetType?: AccountTransactionType
  }>(),
  {
    transaction: null,
    presetType: 'deposit',
  },
)

const emit = defineEmits<{
  close: []
  submit: [input: NewAccountTransactionInput]
}>()

const transactionOptions: Array<{
  value: AccountTransactionType
  description: string
}> = [
  { value: 'deposit', description: '資金進入帳戶' },
  { value: 'withdrawal', description: '從帳戶提領資金' },
  { value: 'payout', description: 'Prop Firm 分潤提領' },
  { value: 'challenge-fee', description: '購買挑戰或重試費用' },
  { value: 'refund', description: '收到退費或費用返還' },
  { value: 'platform-fee', description: '月費、手續費或佣金' },
  { value: 'adjustment', description: '其他人工調整項目' },
]

const today = (): string =>
  new Date().toISOString().slice(0, 10)

const getDirection = (
  type: AccountTransactionType,
): AccountTransactionDirection =>
  type === 'adjustment'
    ? 'in'
    : defaultTransactionDirection[type]

const createForm = (
  type: AccountTransactionType,
): TransactionFormData => ({
  type,
  direction: getDirection(type),
  date: today(),
  amount: null,
  balanceAfter: null,
  method: '',
  reference: '',
  notes: '',
})

const form = reactive<TransactionFormData>(
  createForm(props.presetType),
)

const isEditing = computed(() =>
  Boolean(props.transaction),
)

const isValid = computed(() =>
  Boolean(
    props.account &&
      form.date &&
      form.amount !== null &&
      Number(form.amount) > 0,
  ),
)

const expectedBalance = computed(() => {
  if (
    !props.account ||
    form.amount === null ||
    !Number.isFinite(Number(form.amount))
  ) {
    return null
  }

  const amount = Math.abs(Number(form.amount))
  const result =
    form.direction === 'in'
      ? props.account.balance + amount
      : props.account.balance - amount

  return Math.max(0, Number(result.toFixed(2)))
})

const formatMoney = (
  value: number,
): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: props.account?.currency || 'USD',
    maximumFractionDigits: 2,
  }).format(value)

const setType = (
  type: AccountTransactionType,
): void => {
  form.type = type
  if (type !== 'adjustment') {
    form.direction = getDirection(type)
  }
}

const useExpectedBalance = (): void => {
  if (expectedBalance.value === null) return
  form.balanceAfter = expectedBalance.value
}

const loadForm = (): void => {
  if (!props.transaction) {
    Object.assign(
      form,
      createForm(props.presetType),
    )
    return
  }

  Object.assign(form, {
    type: props.transaction.type,
    direction: props.transaction.direction,
    date: props.transaction.date,
    amount: props.transaction.amount,
    balanceAfter: props.transaction.balanceAfter,
    method: props.transaction.method,
    reference: props.transaction.reference,
    notes: props.transaction.notes,
  })
}

const submitForm = (): void => {
  if (!isValid.value || !props.account) return

  const amount = Math.abs(Number(form.amount))
  const rawBalanceAfter = form.balanceAfter as
    | number
    | string
    | null
    | undefined
  const balanceAfter =
    rawBalanceAfter === null ||
    rawBalanceAfter === undefined ||
    rawBalanceAfter === ''
      ? null
      : Math.max(0, Number(rawBalanceAfter))

  emit('submit', {
    accountId: props.account.id,
    type: form.type,
    direction: form.direction,
    date: form.date,
    amount,
    balanceAfter:
      balanceAfter !== null &&
      Number.isFinite(balanceAfter)
        ? balanceAfter
        : null,
    method: form.method.trim(),
    reference: form.reference.trim(),
    notes: form.notes.trim(),
  })
}

watch(
  [
    () => props.open,
    () => props.transaction,
    () => props.presetType,
    () => props.account,
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
        v-if="open && account"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-5"
        @click.self="emit('close')"
      >
        <section
          class="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-[1.75rem] border border-white/[0.09] bg-[#101012] shadow-2xl shadow-black/60"
        >
          <header
            class="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-white/[0.07] bg-[#101012]/95 p-5 backdrop-blur sm:p-6"
          >
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300/70">
                Cash ledger
              </p>
              <h2 class="mt-2 text-2xl font-semibold tracking-tight text-white">
                {{ isEditing ? '編輯資金紀錄' : '新增資金紀錄' }}
              </h2>
              <p class="mt-1 text-sm text-zinc-500">
                {{ account.name }} · {{ account.currency }}
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
              <p class="text-sm font-medium text-zinc-300">資金類型</p>
              <div class="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                <button
                  v-for="option in transactionOptions"
                  :key="option.value"
                  type="button"
                  class="rounded-2xl border p-3.5 text-left transition"
                  :class="
                    form.type === option.value
                      ? form.direction === 'in'
                        ? 'border-emerald-400/25 bg-emerald-400/[0.07]'
                        : 'border-rose-400/25 bg-rose-400/[0.07]'
                      : 'border-white/[0.07] bg-white/[0.02] hover:border-white/[0.13]'
                  "
                  @click="setType(option.value)"
                >
                  <p
                    class="text-sm font-semibold"
                    :class="
                      form.type === option.value
                        ? form.direction === 'in'
                          ? 'text-emerald-300'
                          : 'text-rose-300'
                        : 'text-zinc-400'
                    "
                  >
                    {{ transactionTypeLabels[option.value] }}
                  </p>
                  <p class="mt-1.5 line-clamp-2 text-[10px] leading-4 text-zinc-700">
                    {{ option.description }}
                  </p>
                </button>
              </div>
            </section>

            <section
              v-if="form.type === 'adjustment'"
              class="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4"
            >
              <p class="text-xs text-zinc-500">調整方向</p>
              <div class="mt-3 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  class="rounded-xl border px-4 py-3 text-sm font-medium transition"
                  :class="form.direction === 'in' ? 'border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300' : 'border-zinc-800 text-zinc-600'"
                  @click="form.direction = 'in'"
                >
                  增加餘額
                </button>
                <button
                  type="button"
                  class="rounded-xl border px-4 py-3 text-sm font-medium transition"
                  :class="form.direction === 'out' ? 'border-rose-400/25 bg-rose-400/[0.08] text-rose-300' : 'border-zinc-800 text-zinc-600'"
                  @click="form.direction = 'out'"
                >
                  減少餘額
                </button>
              </div>
            </section>

            <section class="grid gap-4 sm:grid-cols-2">
              <label>
                <span class="text-sm font-medium text-zinc-300">日期 *</span>
                <input
                  v-model="form.date"
                  type="date"
                  required
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition focus:border-sky-400/35"
                />
              </label>

              <label>
                <span class="text-sm font-medium text-zinc-300">金額（{{ account.currency }}）*</span>
                <div class="relative mt-2">
                  <span
                    class="pointer-events-none absolute inset-y-0 left-4 flex items-center text-zinc-600"
                  >
                    {{ form.direction === 'in' ? '+' : '−' }}
                  </span>
                  <input
                    v-model.number="form.amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    placeholder="0.00"
                    class="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-3 pl-9 pr-4 text-zinc-100 outline-none transition placeholder:text-zinc-700 focus:border-sky-400/35"
                  />
                </div>
              </label>

              <label>
                <span class="text-sm font-medium text-zinc-300">資金方式</span>
                <input
                  v-model="form.method"
                  type="text"
                  list="funding-methods"
                  placeholder="銀行轉帳／信用卡／Wise…"
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition placeholder:text-zinc-700 focus:border-sky-400/35"
                />
                <datalist id="funding-methods">
                  <option value="銀行轉帳" />
                  <option value="信用卡" />
                  <option value="Wise" />
                  <option value="PayPal" />
                  <option value="加密貨幣" />
                  <option value="虛擬資金" />
                </datalist>
              </label>

              <label>
                <span class="text-sm font-medium text-zinc-300">交易編號／參考碼</span>
                <input
                  v-model="form.reference"
                  type="text"
                  placeholder="付款編號、Payout ID…"
                  class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition placeholder:text-zinc-700 focus:border-sky-400/35"
                />
              </label>
            </section>

            <section class="rounded-2xl border border-white/[0.07] bg-black/15 p-4">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <label class="min-w-0 flex-1">
                  <span class="text-sm font-medium text-zinc-300">完成後帳戶餘額</span>
                  <span class="ml-2 text-[11px] text-zinc-700">選填</span>
                  <input
                    v-model.number="form.balanceAfter"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="用來同步帳戶目前餘額"
                    class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition placeholder:text-zinc-700 focus:border-sky-400/35"
                  />
                </label>
                <button
                  v-if="expectedBalance !== null"
                  type="button"
                  class="rounded-xl border border-sky-400/15 bg-sky-400/[0.05] px-4 py-3 text-xs font-medium text-sky-300 transition hover:bg-sky-400/[0.09]"
                  @click="useExpectedBalance"
                >
                  套用預估 {{ formatMoney(expectedBalance) }}
                </button>
              </div>
              <p class="mt-2 text-[11px] leading-5 text-zinc-700">
                填寫後會同步更新帳戶餘額；留空則只保存這筆流水，不改動餘額。
              </p>
            </section>

            <label class="block">
              <span class="text-sm font-medium text-zinc-300">備註</span>
              <textarea
                v-model="form.notes"
                rows="3"
                placeholder="這筆資金異動的原因、方案或其他細節…"
                class="mt-2 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition placeholder:text-zinc-700 focus:border-sky-400/35"
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
                class="rounded-xl bg-sky-300 px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
              >
                {{ isEditing ? '儲存紀錄' : '新增紀錄' }}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
