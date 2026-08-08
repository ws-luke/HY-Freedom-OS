import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { queueCloudDeletion } from '@/services/cloud/cloud-deletion.service'

import type {
  AccountDataSource,
  AccountStatus,
  AccountTransaction,
  AccountTransactionDirection,
  AccountTransactionType,
  AccountType,
  BrokerSyncStatus,
  NewAccountTransactionInput,
  NewTradingAccountInput,
  PropAccountStage,
  StoredAccountLedgerState,
  TradingAccount,
} from '@/types/account'

const STORAGE_KEY = 'hy-freedom-os:account-ledger'
const STORAGE_VERSION = 2 as const

const accountDataSources: AccountDataSource[] = ['manual', 'mt5']
const brokerSyncStatuses: BrokerSyncStatus[] = [
  'manual',
  'pending',
  'connected',
  'syncing',
  'error',
]

const accountTypes: AccountType[] = [
  'prop',
  'demo',
  'live',
]

const accountStatuses: AccountStatus[] = [
  'active',
  'paused',
  'passed',
  'failed',
  'closed',
]

const propStages: PropAccountStage[] = [
  'challenge',
  'verification',
  'funded',
]

const transactionTypes: AccountTransactionType[] = [
  'deposit',
  'withdrawal',
  'payout',
  'challenge-fee',
  'refund',
  'platform-fee',
  'adjustment',
]

const transactionDirections: AccountTransactionDirection[] = [
  'in',
  'out',
]

const normalizeText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : ''

const normalizeNumber = (
  value: unknown,
  fallback = 0,
): number => {
  const numberValue = Number(value)
  return Number.isFinite(numberValue)
    ? numberValue
    : fallback
}

const normalizeNullableNumber = (
  value: unknown,
): number | null => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null
  }

  const numberValue = Number(value)
  return Number.isFinite(numberValue)
    ? numberValue
    : null
}

const normalizeAccount = (
  value: Partial<TradingAccount>,
): TradingAccount => {
  const now = new Date().toISOString()
  const type = accountTypes.includes(
    value.type as AccountType,
  )
    ? value.type as AccountType
    : 'live'
  const status = accountStatuses.includes(
    value.status as AccountStatus,
  )
    ? value.status as AccountStatus
    : 'active'
  const propStage =
    type === 'prop' &&
    propStages.includes(
      value.propStage as PropAccountStage,
    )
      ? value.propStage as PropAccountStage
      : null
  const dataSource = accountDataSources.includes(value.dataSource as AccountDataSource)
    ? value.dataSource as AccountDataSource
    : 'manual'
  const rawSyncStatus = brokerSyncStatuses.includes(value.syncStatus as BrokerSyncStatus)
    ? value.syncStatus as BrokerSyncStatus
    : null
  const syncStatus: BrokerSyncStatus = dataSource === 'manual'
    ? 'manual'
    : !rawSyncStatus || rawSyncStatus === 'manual'
      ? 'pending'
      : rawSyncStatus

  return {
    id:
      normalizeText(value.id) ||
      crypto.randomUUID(),
    name: normalizeText(value.name),
    provider: normalizeText(value.provider),
    type,
    status,
    propStage,
    platform: normalizeText(value.platform),
    accountNumber: normalizeText(
      value.accountNumber,
    ),
    dataSource,
    brokerServer: normalizeText(value.brokerServer),
    brokerLogin: normalizeText(value.brokerLogin),
    syncStatus,
    lastSyncedAt: normalizeText(value.lastSyncedAt) || null,
    lastSyncCursor: normalizeText(value.lastSyncCursor) || null,
    syncError: normalizeText(value.syncError) || null,
    currency:
      normalizeText(value.currency).toUpperCase() ||
      'USD',
    startingBalance: Math.max(
      0,
      normalizeNumber(value.startingBalance),
    ),
    balance: Math.max(
      0,
      normalizeNumber(value.balance),
    ),
    equity: Math.max(
      0,
      normalizeNumber(value.equity),
    ),
    profitTargetPercent: normalizeNullableNumber(
      value.profitTargetPercent,
    ),
    maxDailyLossPercent: normalizeNullableNumber(
      value.maxDailyLossPercent,
    ),
    maxDrawdownPercent: normalizeNullableNumber(
      value.maxDrawdownPercent,
    ),
    profitSplitPercent: normalizeNullableNumber(
      value.profitSplitPercent,
    ),
    notes: normalizeText(value.notes),
    createdAt:
      normalizeText(value.createdAt) || now,
    updatedAt:
      normalizeText(value.updatedAt) || now,
  }
}

const normalizeTransaction = (
  value: Partial<AccountTransaction>,
): AccountTransaction => {
  const now = new Date().toISOString()
  const type = transactionTypes.includes(
    value.type as AccountTransactionType,
  )
    ? value.type as AccountTransactionType
    : 'adjustment'
  const direction = transactionDirections.includes(
    value.direction as AccountTransactionDirection,
  )
    ? value.direction as AccountTransactionDirection
    : 'in'

  return {
    id:
      normalizeText(value.id) ||
      crypto.randomUUID(),
    accountId: normalizeText(value.accountId),
    type,
    direction,
    date:
      normalizeText(value.date) ||
      new Date().toISOString().slice(0, 10),
    amount: Math.abs(normalizeNumber(value.amount)),
    balanceAfter: normalizeNullableNumber(
      value.balanceAfter,
    ),
    method: normalizeText(value.method),
    reference: normalizeText(value.reference),
    notes: normalizeText(value.notes),
    dataSource: value.dataSource === 'mt5' ? 'mt5' : 'manual',
    externalId: normalizeText(value.externalId) || null,
    syncedAt: normalizeText(value.syncedAt) || null,
    createdAt:
      normalizeText(value.createdAt) || now,
    updatedAt:
      normalizeText(value.updatedAt) || now,
  }
}

const readStoredState = (): StoredAccountLedgerState => {
  if (typeof window === 'undefined') {
    return {
      version: STORAGE_VERSION,
      accounts: [],
      transactions: [],
    }
  }

  const rawValue = window.localStorage.getItem(
    STORAGE_KEY,
  )

  if (!rawValue) {
    return {
      version: STORAGE_VERSION,
      accounts: [],
      transactions: [],
    }
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<
      StoredAccountLedgerState
    >
    const accounts = Array.isArray(parsed.accounts)
      ? parsed.accounts.map(account =>
          normalizeAccount(account),
        )
      : []
    const accountIds = new Set(
      accounts.map(account => account.id),
    )
    const transactions = Array.isArray(
      parsed.transactions,
    )
      ? parsed.transactions
          .map(transaction =>
            normalizeTransaction(transaction),
          )
          .filter(transaction =>
            accountIds.has(transaction.accountId),
          )
      : []

    return {
      version: STORAGE_VERSION,
      accounts,
      transactions,
    }
  }
  catch {
    return {
      version: STORAGE_VERSION,
      accounts: [],
      transactions: [],
    }
  }
}

const accountStatusOrder: Record<
  AccountStatus,
  number
> = {
  active: 0,
  paused: 1,
  passed: 2,
  failed: 3,
  closed: 4,
}

export const useAccountStore = defineStore(
  'account-ledger',
  () => {
    const initialState = readStoredState()
    const accounts = ref<TradingAccount[]>(
      initialState.accounts,
    )
    const transactions = ref<AccountTransaction[]>(
      initialState.transactions,
    )

    const sortedAccounts = computed(() =>
      [...accounts.value].sort((a, b) => {
        const statusDifference =
          accountStatusOrder[a.status] -
          accountStatusOrder[b.status]

        if (statusDifference !== 0) {
          return statusDifference
        }

        return b.updatedAt.localeCompare(a.updatedAt)
      }),
    )

    const activeAccounts = computed(() =>
      sortedAccounts.value.filter(
        account =>
          account.status === 'active' ||
          account.status === 'passed',
      ),
    )

    const accountNames = computed(() =>
      activeAccounts.value.map(account => account.name),
    )

    const sortedTransactions = computed(() =>
      [...transactions.value].sort((a, b) => {
        const dateDifference = b.date.localeCompare(
          a.date,
        )

        if (dateDifference !== 0) {
          return dateDifference
        }

        return b.createdAt.localeCompare(a.createdAt)
      }),
    )

    const getAccountById = (
      accountId: string,
    ): TradingAccount | null =>
      accounts.value.find(
        account => account.id === accountId,
      ) ?? null

    const getTransactionsByAccountId = (
      accountId: string,
    ): AccountTransaction[] =>
      sortedTransactions.value.filter(
        transaction =>
          transaction.accountId === accountId,
      )

    const save = (): void => {
      if (typeof window === 'undefined') return

      const state: StoredAccountLedgerState = {
        version: STORAGE_VERSION,
        accounts: accounts.value,
        transactions: transactions.value,
      }

      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state),
      )
    }

    const addAccount = (
      input: NewTradingAccountInput,
    ): TradingAccount => {
      const now = new Date().toISOString()
      const account = normalizeAccount({
        ...input,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      })

      accounts.value.unshift(account)
      return account
    }

    const updateAccount = (
      accountId: string,
      updates: Partial<NewTradingAccountInput>,
    ): TradingAccount | null => {
      const index = accounts.value.findIndex(
        account => account.id === accountId,
      )
      const current = accounts.value[index]

      if (index < 0 || !current) return null

      const nextDataSource = updates.dataSource ?? current.dataSource
      const connectionChanged =
        nextDataSource !== current.dataSource ||
        (updates.brokerServer !== undefined && updates.brokerServer.trim() !== current.brokerServer) ||
        (updates.brokerLogin !== undefined && updates.brokerLogin.trim() !== current.brokerLogin)

      const updated = normalizeAccount({
        ...current,
        ...updates,
        syncStatus:
          nextDataSource === 'manual'
            ? 'manual'
            : connectionChanged
              ? 'pending'
              : current.syncStatus,
        syncError: connectionChanged ? null : current.syncError,
        id: current.id,
        createdAt: current.createdAt,
        updatedAt: new Date().toISOString(),
      })

      accounts.value[index] = updated
      return updated
    }

    const updateSyncState = (
      accountId: string,
      state: {
        status: BrokerSyncStatus
        syncedAt?: string | null
        cursor?: string | null
        error?: string | null
        startingBalance?: number | null
        balance?: number
        equity?: number
        currency?: string
      },
    ): TradingAccount | null => {
      const account = getAccountById(accountId)
      if (!account || account.dataSource !== 'mt5') return null

      const index = accounts.value.findIndex(item => item.id === accountId)
      const updated = normalizeAccount({
        ...account,
        startingBalance:
          state.startingBalance !== undefined && state.startingBalance !== null && state.startingBalance > 0
            ? state.startingBalance
            : account.startingBalance,
        balance: state.balance ?? account.balance,
        equity: state.equity ?? account.equity,
        currency: state.currency ?? account.currency,
        syncStatus: state.status,
        lastSyncedAt: state.syncedAt === undefined ? account.lastSyncedAt : state.syncedAt,
        lastSyncCursor: state.cursor === undefined ? account.lastSyncCursor : state.cursor,
        syncError: state.error ?? null,
        updatedAt: new Date().toISOString(),
      })

      accounts.value[index] = updated
      return updated
    }

    const removeAccount = (
      accountId: string,
    ): void => {
      queueCloudDeletion('trading_accounts', accountId)
      accounts.value = accounts.value.filter(
        account => account.id !== accountId,
      )
      transactions.value = transactions.value.filter(
        transaction =>
          transaction.accountId !== accountId,
      )
    }

    const addTransaction = (
      input: NewAccountTransactionInput,
    ): AccountTransaction | null => {
      const account = getAccountById(input.accountId)
      if (!account) return null

      const now = new Date().toISOString()
      const transaction = normalizeTransaction({
        ...input,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      })

      transactions.value.unshift(transaction)

      if (transaction.balanceAfter !== null) {
        updateAccount(account.id, {
          balance: Math.max(
            0,
            transaction.balanceAfter,
          ),
        })
      }

      return transaction
    }

    const updateTransaction = (
      transactionId: string,
      updates: Partial<NewAccountTransactionInput>,
    ): AccountTransaction | null => {
      const index = transactions.value.findIndex(
        transaction =>
          transaction.id === transactionId,
      )
      const current = transactions.value[index]

      if (index < 0 || !current) return null

      const updated = normalizeTransaction({
        ...current,
        ...updates,
        id: current.id,
        createdAt: current.createdAt,
        updatedAt: new Date().toISOString(),
      })

      transactions.value[index] = updated

      if (updated.balanceAfter !== null) {
        updateAccount(updated.accountId, {
          balance: Math.max(0, updated.balanceAfter),
        })
      }

      return updated
    }

    const removeTransaction = (
      transactionId: string,
    ): void => {
      queueCloudDeletion('account_transactions', transactionId)
      transactions.value = transactions.value.filter(
        transaction =>
          transaction.id !== transactionId,
      )
    }

    const upsertSyncedTransaction = (
      input: NewAccountTransactionInput & { externalId: string },
    ): { transaction: AccountTransaction | null; created: boolean } => {
      const existing = transactions.value.find(transaction =>
        transaction.accountId === input.accountId &&
        transaction.dataSource === 'mt5' &&
        transaction.externalId === input.externalId,
      )

      if (!existing) {
        return {
          transaction: addTransaction({ ...input, dataSource: 'mt5' }),
          created: true,
        }
      }

      return {
        transaction: updateTransaction(existing.id, { ...input, dataSource: 'mt5' }),
        created: false,
      }
    }

    watch(
      [accounts, transactions],
      save,
      { deep: true },
    )

    return {
      accounts,
      activeAccounts,
      accountNames,
      sortedAccounts,
      sortedTransactions,
      transactions,
      getAccountById,
      getTransactionsByAccountId,
      addAccount,
      updateAccount,
      updateSyncState,
      removeAccount,
      addTransaction,
      updateTransaction,
      removeTransaction,
      upsertSyncedTransaction,
    }
  },
)
