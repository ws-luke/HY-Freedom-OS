import { getCloudIdentity } from './cloud-auth.service'
import { flushCloudDeletionQueue, queueCloudDeletion } from './cloud-deletion.service'
import { listUserRows } from './cloud-database.service'
import { migrateLocalDataToCloud } from './cloud-migration.service'
import type { StoredAccountLedgerState } from '@/types/account'
import type {
  FreedomCloudSyncRecord,
  FreedomCloudSyncSummary,
} from '@/types/cloud'
import type { StoredMissionState } from '@/types/mission'
import type { PlaybookRecord } from '@/types/playbook'
import type { SignalRecord } from '@/types/signal'
import type { StoredTradeReview } from '@/types/trade-review'
import type { TradeRecord, TradeScreenshot } from '@/types/trade'
import type { TradingPlan } from '@/types/trading-plan'

const SYNC_STORAGE_KEY = 'hy-freedom-os:cloud-sync'

const LOCAL_KEYS = {
  accounts: 'hy-freedom-os:account-ledger',
  signals: 'hy-freedom-os:signals',
  playbooks: 'hy-freedom-os:playbooks',
  trades: 'hy-freedom-os:trades',
  reviews: 'hy-freedom-os:trade-reviews',
  plan: 'hy-freedom-os:trading-plan',
  missions: 'hy-freedom-os:daily-missions',
  risk: 'hy-freedom-os:risk-settings',
  theme: 'hy-freedom-os:theme',
} as const

type CloudRow = Record<string, unknown>

interface CloudIdRow extends CloudRow {
  id: string
  local_id: string
  updated_at?: string
}

const text = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback

const nullableText = (value: unknown): string | null => {
  const result = text(value).trim()
  return result || null
}

const number = (value: unknown, fallback = 0): number => {
  const result = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(result) ? result : fallback
}

const nullableNumber = (value: unknown): number | null =>
  value === null || value === undefined || value === '' ? null : number(value)

const boolean = (value: unknown): boolean => value === true

const stringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

const readJson = <T>(key: string): T | null => {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(key)
  if (!raw) return null

  try {
    return JSON.parse(raw) as T
  }
  catch {
    return null
  }
}

const writeJson = (key: string, value: unknown): void => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

const localArray = <T>(key: string): T[] => {
  const value = readJson<unknown>(key)
  return Array.isArray(value) ? value as T[] : []
}

const newestTimestamp = (value: unknown): number => {
  if (typeof value !== 'string') return 0
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

const mergeById = <T extends { id: string; updatedAt?: string }>(
  local: T[],
  cloud: T[],
): T[] => {
  const merged = new Map(local.map(item => [item.id, item]))

  cloud.forEach(item => {
    const current = merged.get(item.id)
    if (!current || newestTimestamp(item.updatedAt) >= newestTimestamp(current.updatedAt)) {
      merged.set(item.id, item)
    }
  })

  return [...merged.values()]
}

const tradeJournalScore = (trade: TradeRecord, reviewTradeIds: Set<string>): number =>
  (reviewTradeIds.has(trade.id) ? 1000 : 0) +
  (trade.beforeScreenshot ? 100 : 0) +
  (trade.afterScreenshot ? 100 : 0) +
  (trade.signalId || trade.signal ? 40 : 0) +
  (trade.playbook ? 40 : 0) +
  (trade.reason ? 30 : 0) +
  (trade.status === 'completed' ? 20 : 0) +
  (trade.isFavorite ? 10 : 0)

const deduplicateMt5Trades = (
  trades: TradeRecord[],
  reviewTradeIds: Set<string>,
): { trades: TradeRecord[], aliases: Map<string, string> } => {
  const aliases = new Map<string, string>()
  const groups = new Map<string, TradeRecord[]>()
  const passthrough: TradeRecord[] = []

  trades.forEach(trade => {
    if (trade.dataSource !== 'mt5' || !trade.externalId) {
      passthrough.push(trade)
      return
    }
    const accountKey = trade.accountId || trade.account.trim().toLowerCase()
    const key = `${accountKey}:${trade.externalId}`
    const group = groups.get(key) ?? []
    group.push(trade)
    groups.set(key, group)
  })

  groups.forEach(group => {
    const ranked = [...group].sort((a, b) =>
      tradeJournalScore(b, reviewTradeIds) - tradeJournalScore(a, reviewTradeIds) ||
      newestTimestamp(b.updatedAt) - newestTimestamp(a.updatedAt),
    )
    const winner = ranked[0]
    if (!winner) return
    passthrough.push(winner)
    ranked.slice(1).forEach(duplicate => {
      aliases.set(duplicate.id, winner.id)
      queueCloudDeletion('trades', duplicate.id)
    })
  })

  return { trades: passthrough, aliases }
}

const screenshotReference = (
  pathValue: unknown,
  nameValue: unknown,
): TradeScreenshot | null => {
  const path = nullableText(pathValue)
  if (!path) return null

  return {
    name: text(nameValue, 'screenshot.png'),
    dataUrl: '',
    storagePath: path,
  }
}

const getCloudSnapshot = async () => {
  const [
    accounts,
    transactions,
    signals,
    playbooks,
    trades,
    reviews,
    screenshots,
    plans,
    missions,
    riskSettings,
    appSettings,
    tombstones,
  ] = await Promise.all([
    listUserRows<CloudIdRow>('trading_accounts'),
    listUserRows<CloudIdRow>('account_transactions'),
    listUserRows<CloudIdRow>('signals'),
    listUserRows<CloudIdRow>('playbooks'),
    listUserRows<CloudIdRow>('trades'),
    listUserRows<CloudIdRow>('trade_reviews'),
    listUserRows<CloudIdRow>('trade_screenshots'),
    listUserRows<CloudIdRow>('trading_plans'),
    listUserRows<CloudIdRow>('daily_missions'),
    listUserRows<CloudRow>('risk_settings'),
    listUserRows<CloudRow>('app_settings'),
    listUserRows<CloudIdRow>('sync_tombstones'),
  ])

  return {
    accounts,
    transactions,
    signals,
    playbooks,
    trades,
    reviews,
    screenshots,
    plans,
    missions,
    riskSettings,
    appSettings,
    tombstones,
  }
}

const applyCloudTombstones = (
  tombstones: CloudIdRow[],
): void => {
  if (tombstones.length === 0) return

  const deleted = (entity: string): Set<string> =>
    new Set(
      tombstones
        .filter(row => text(row.entity) === entity)
        .map(row => row.local_id),
    )

  const deletedAccounts = deleted('trading_accounts')
  const deletedTransactions = deleted('account_transactions')
  const ledger = readJson<StoredAccountLedgerState>(LOCAL_KEYS.accounts)
  if (ledger && (deletedAccounts.size > 0 || deletedTransactions.size > 0)) {
    writeJson(LOCAL_KEYS.accounts, {
      version: 2,
      accounts: ledger.accounts.filter(account => !deletedAccounts.has(account.id)),
      transactions: ledger.transactions.filter(transaction =>
        !deletedAccounts.has(transaction.accountId) &&
        !deletedTransactions.has(transaction.id),
      ),
    } satisfies StoredAccountLedgerState)
  }

  const deletedSignals = deleted('signals')
  if (deletedSignals.size > 0) {
    writeJson(
      LOCAL_KEYS.signals,
      localArray<SignalRecord>(LOCAL_KEYS.signals).filter(item => !deletedSignals.has(item.id)),
    )
  }

  const deletedPlaybooks = deleted('playbooks')
  if (deletedPlaybooks.size > 0) {
    writeJson(
      LOCAL_KEYS.playbooks,
      localArray<PlaybookRecord>(LOCAL_KEYS.playbooks).filter(item => !deletedPlaybooks.has(item.id)),
    )
  }

  const deletedTrades = deleted('trades')
  const deletedScreenshots = deleted('trade_screenshots')
  if (deletedTrades.size > 0 || deletedScreenshots.size > 0) {
    const trades = localArray<TradeRecord>(LOCAL_KEYS.trades)
      .filter(trade => !deletedTrades.has(trade.id))
      .map(trade => ({
        ...trade,
        beforeScreenshot: deletedScreenshots.has(`${trade.id}:before`) ? null : trade.beforeScreenshot,
        afterScreenshot: deletedScreenshots.has(`${trade.id}:after`) ? null : trade.afterScreenshot,
      }))
    writeJson(LOCAL_KEYS.trades, trades)
  }

  const deletedReviews = deleted('trade_reviews')
  if (deletedTrades.size > 0 || deletedReviews.size > 0) {
    writeJson(
      LOCAL_KEYS.reviews,
      localArray<StoredTradeReview>(LOCAL_KEYS.reviews).filter(review =>
        !deletedTrades.has(review.tradeId) && !deletedReviews.has(review.id),
      ),
    )
  }

  const deletedMissions = deleted('daily_missions')
  const missionState = readJson<StoredMissionState>(LOCAL_KEYS.missions)
  if (missionState && deletedMissions.size > 0) {
    writeJson(LOCAL_KEYS.missions, {
      ...missionState,
      missions: missionState.missions.filter(mission => !deletedMissions.has(mission.id)),
      updatedAt: new Date().toISOString(),
    } satisfies StoredMissionState)
  }
}

const snapshotRowCount = (snapshot: Awaited<ReturnType<typeof getCloudSnapshot>>): number =>
  snapshot.accounts.length +
  snapshot.transactions.length +
  snapshot.signals.length +
  snapshot.playbooks.length +
  snapshot.trades.length +
  snapshot.reviews.length +
  snapshot.screenshots.length +
  snapshot.plans.length +
  snapshot.missions.length +
  snapshot.riskSettings.length +
  snapshot.appSettings.length

const restoreSnapshot = async (
  snapshot: Awaited<ReturnType<typeof getCloudSnapshot>>,
  options: { skipDeviceSettings?: boolean } = {},
): Promise<number> => {
  const accountCloudToLocal = new Map(snapshot.accounts.map(row => [row.id, row.local_id]))
  const signalCloudToLocal = new Map(snapshot.signals.map(row => [row.id, row.local_id]))
  const tradeCloudToLocal = new Map(snapshot.trades.map(row => [row.id, row.local_id]))

  const cloudAccounts = snapshot.accounts.map(row => ({
    id: row.local_id,
    name: text(row.name),
    provider: text(row.provider),
    type: text(row.type, 'demo') as StoredAccountLedgerState['accounts'][number]['type'],
    status: text(row.status, 'active') as StoredAccountLedgerState['accounts'][number]['status'],
    propStage: nullableText(row.prop_stage) as StoredAccountLedgerState['accounts'][number]['propStage'],
    platform: text(row.platform),
    accountNumber: text(row.account_number),
    dataSource: text(row.data_source, 'manual') as StoredAccountLedgerState['accounts'][number]['dataSource'],
    brokerServer: text(row.broker_server),
    brokerLogin: text(row.broker_login),
    syncStatus: text(row.sync_status, 'manual') as StoredAccountLedgerState['accounts'][number]['syncStatus'],
    lastSyncedAt: nullableText(row.last_synced_at),
    lastSyncCursor: nullableText(row.last_sync_cursor),
    syncError: nullableText(row.sync_error),
    currency: text(row.currency, 'USD'),
    startingBalance: number(row.starting_balance),
    balance: number(row.balance),
    equity: number(row.equity),
    profitTargetPercent: nullableNumber(row.profit_target_percent),
    maxDailyLossPercent: nullableNumber(row.max_daily_loss_percent),
    maxDrawdownPercent: nullableNumber(row.max_drawdown_percent),
    profitSplitPercent: nullableNumber(row.profit_split_percent),
    notes: text(row.notes),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  }))

  const cloudTransactions = snapshot.transactions.flatMap(row => {
    const accountId = accountCloudToLocal.get(text(row.account_id))
    if (!accountId) return []

    return [{
      id: row.local_id,
      accountId,
      type: text(row.type, 'adjustment') as StoredAccountLedgerState['transactions'][number]['type'],
      direction: text(row.direction, 'in') as StoredAccountLedgerState['transactions'][number]['direction'],
      date: text(row.occurred_on),
      amount: number(row.amount),
      balanceAfter: nullableNumber(row.balance_after),
      method: text(row.method),
      reference: text(row.reference),
      notes: text(row.notes),
      dataSource: text(row.data_source, 'manual') as StoredAccountLedgerState['transactions'][number]['dataSource'],
      externalId: nullableText(row.external_id),
      syncedAt: nullableText(row.synced_at),
      createdAt: text(row.created_at),
      updatedAt: text(row.updated_at),
    }]
  })

  const currentLedger = readJson<StoredAccountLedgerState>(LOCAL_KEYS.accounts)
  writeJson(LOCAL_KEYS.accounts, {
    version: 2,
    accounts: mergeById(currentLedger?.accounts ?? [], cloudAccounts),
    transactions: mergeById(currentLedger?.transactions ?? [], cloudTransactions),
  } satisfies StoredAccountLedgerState)

  const cloudSignals: SignalRecord[] = []
  for (const row of snapshot.signals) {
    cloudSignals.push({
      id: row.local_id,
      name: text(row.name),
      description: text(row.description),
      direction: text(row.direction, 'both') as SignalRecord['direction'],
      status: text(row.status, 'testing') as SignalRecord['status'],
      timeframe: text(row.timeframe),
      confirmationRules: stringArray(row.confirmation_rules),
      screenshot: screenshotReference(row.screenshot_path, row.screenshot_name),
      createdAt: text(row.created_at),
      updatedAt: text(row.updated_at),
    })
  }
  writeJson(LOCAL_KEYS.signals, mergeById(localArray<SignalRecord>(LOCAL_KEYS.signals), cloudSignals))

  const cloudPlaybooks: PlaybookRecord[] = snapshot.playbooks.map(row => ({
    id: row.local_id,
    name: text(row.name),
    shortName: text(row.short_name),
    description: text(row.description),
    direction: text(row.direction, 'both') as PlaybookRecord['direction'],
    status: text(row.status, 'testing') as PlaybookRecord['status'],
    timeframe: text(row.timeframe),
    marketCondition: text(row.market_condition),
    entryConditions: stringArray(row.entry_conditions),
    avoidConditions: stringArray(row.avoid_conditions),
    totalTrades: 0,
    wins: 0,
    averageR: 0,
    rating: number(row.rating),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  }))
  writeJson(LOCAL_KEYS.playbooks, mergeById(localArray<PlaybookRecord>(LOCAL_KEYS.playbooks), cloudPlaybooks))

  const screenshotByTradeAndKind = new Map<string, CloudIdRow>()
  snapshot.screenshots.forEach(row => {
    screenshotByTradeAndKind.set(`${text(row.trade_id)}:${text(row.kind)}`, row)
  })

  const cloudTrades: TradeRecord[] = []
  for (const row of snapshot.trades) {
    const before = screenshotByTradeAndKind.get(`${row.id}:before`)
    const after = screenshotByTradeAndKind.get(`${row.id}:after`)

    cloudTrades.push({
      id: row.local_id,
      date: text(row.trade_date),
      time: text(row.trade_time, '00:00').slice(0, 5),
      symbol: text(row.symbol),
      direction: text(row.direction, 'buy') as TradeRecord['direction'],
      result: text(row.result, 'breakeven') as TradeRecord['result'],
      status: text(row.review_status, 'waiting-review') as TradeRecord['status'],
      positionStatus: text(row.position_status, 'closed') as TradeRecord['positionStatus'],
      exitReason: nullableText(row.exit_reason) as TradeRecord['exitReason'],
      closedAt: nullableText(row.closed_at),
      signalId: signalCloudToLocal.get(text(row.signal_id)) ?? null,
      signal: text(row.signal_name),
      accountId: accountCloudToLocal.get(text(row.account_id)) ?? null,
      account: text(row.account_name),
      dataSource: text(row.data_source, 'manual') as TradeRecord['dataSource'],
      externalId: nullableText(row.external_id),
      brokerDealId: nullableText(row.broker_deal_id),
      brokerPositionId: nullableText(row.broker_position_id),
      brokerOrderId: nullableText(row.broker_order_id),
      commission: number(row.commission),
      swap: number(row.swap),
      fee: number(row.fee),
      syncedAt: nullableText(row.synced_at),
      entryPrice: number(row.entry_price),
      exitPrice: number(row.exit_price),
      stopLoss: number(row.stop_loss),
      takeProfit: number(row.take_profit),
      lotSize: number(row.lot_size),
      riskAmount: number(row.risk_amount),
      profitLoss: number(row.profit_loss),
      rMultiple: number(row.r_multiple),
      playbook: text(row.playbook_name),
      reason: text(row.reason),
      beforeScreenshot: before ? screenshotReference(before.storage_path, before.file_name) : null,
      afterScreenshot: after ? screenshotReference(after.storage_path, after.file_name) : null,
      mistakeTags: stringArray(row.mistake_tags) as TradeRecord['mistakeTags'],
      customMistakeTags: stringArray(row.custom_mistake_tags),
      isFavorite: boolean(row.is_favorite),
      createdAt: text(row.created_at),
      updatedAt: text(row.updated_at),
    })
  }
  const existingReviews = localArray<StoredTradeReview>(LOCAL_KEYS.reviews)
  const mergedTrades = mergeById(localArray<TradeRecord>(LOCAL_KEYS.trades), cloudTrades)
  const deduplicatedTrades = deduplicateMt5Trades(
    mergedTrades,
    new Set(existingReviews.map(review => review.tradeId)),
  )
  writeJson(LOCAL_KEYS.trades, deduplicatedTrades.trades)

  const cloudReviews = snapshot.reviews.flatMap(row => {
    const tradeId = tradeCloudToLocal.get(text(row.trade_id))
    if (!tradeId) return []

    return [{
      id: row.local_id,
      tradeId: deduplicatedTrades.aliases.get(tradeId) ?? tradeId,
      followedPlan: row.followed_plan === null ? null : boolean(row.followed_plan),
      followedPlaybook: row.followed_playbook === null ? null : boolean(row.followed_playbook),
      respectedRisk: row.respected_risk === null ? null : boolean(row.respected_risk),
      waitedForConfirmation: row.waited_for_confirmation === null ? null : boolean(row.waited_for_confirmation),
      avoidedNewsRisk: row.avoided_news_risk === null ? null : boolean(row.avoided_news_risk),
      emotionalControl: number(row.emotional_control),
      executionScore: number(row.execution_score),
      strengths: text(row.strengths),
      mistakes: text(row.mistakes),
      improvement: text(row.improvement),
      nextTradeRule: text(row.next_trade_rule),
      summary: text(row.summary),
      totalScore: number(row.total_score),
      completedAt: text(row.completed_at),
      createdAt: text(row.created_at),
      updatedAt: text(row.updated_at),
    } satisfies StoredTradeReview]
  })
  const mergedReviews = mergeById(existingReviews, cloudReviews)
    .map(review => ({
      ...review,
      tradeId: deduplicatedTrades.aliases.get(review.tradeId) ?? review.tradeId,
    }))
  const reviewByTrade = new Map<string, StoredTradeReview>()
  mergedReviews.forEach(review => {
    const current = reviewByTrade.get(review.tradeId)
    if (!current || newestTimestamp(review.updatedAt) >= newestTimestamp(current.updatedAt)) {
      if (current && current.id !== review.id) queueCloudDeletion('trade_reviews', current.id)
      reviewByTrade.set(review.tradeId, review)
    }
    else if (current.id !== review.id) {
      queueCloudDeletion('trade_reviews', review.id)
    }
  })
  writeJson(LOCAL_KEYS.reviews, [...reviewByTrade.values()])

  const newestPlan = [...snapshot.plans].sort((a, b) => text(b.updated_at).localeCompare(text(a.updated_at)))[0]
  if (newestPlan) {
    const cloudPlan: TradingPlan = {
      date: text(newestPlan.plan_date),
      symbol: text(newestPlan.symbol),
      marketBias: text(newestPlan.market_bias, 'wait') as TradingPlan['marketBias'],
      h4Trend: text(newestPlan.h4_trend),
      h1Trend: text(newestPlan.h1_trend),
      m15Structure: text(newestPlan.m15_structure),
      supportZones: text(newestPlan.support_zones),
      resistanceZones: text(newestPlan.resistance_zones),
      allowedConditions: text(newestPlan.allowed_conditions),
      prohibitedConditions: text(newestPlan.prohibited_conditions),
      waitingSignals: stringArray(newestPlan.waiting_signals),
      focusRule: text(newestPlan.focus_rule),
      maxTrades: number(newestPlan.max_trades),
      maxRiskPercent: number(newestPlan.max_risk_percent),
      notes: text(newestPlan.notes),
      completed: boolean(newestPlan.completed),
      updatedAt: text(newestPlan.updated_at),
    }

    const localPlan = readJson<TradingPlan>(LOCAL_KEYS.plan)
    if (!localPlan || newestTimestamp(cloudPlan.updatedAt) >= newestTimestamp(localPlan.updatedAt)) {
      writeJson(LOCAL_KEYS.plan, cloudPlan)
    }
  }

  const missionsByDate = new Map<string, CloudIdRow[]>()
  snapshot.missions.forEach(row => {
    const date = text(row.mission_date)
    missionsByDate.set(date, [...(missionsByDate.get(date) ?? []), row])
  })
  const newestMissionDate = [...missionsByDate.keys()].sort().at(-1)
  if (newestMissionDate) {
    const cloudMissionState: StoredMissionState = {
      date: newestMissionDate,
      missions: (missionsByDate.get(newestMissionDate) ?? [])
        .sort((a, b) => number(a.sort_order) - number(b.sort_order))
        .map(row => ({
          id: row.local_id,
          title: text(row.title),
          completed: boolean(row.completed),
          order: number(row.sort_order),
        })),
      updatedAt: (missionsByDate.get(newestMissionDate) ?? [])
        .map(row => text(row.updated_at))
        .sort()
        .at(-1),
    }
    const localMissionState = readJson<StoredMissionState>(LOCAL_KEYS.missions)
    if (
      !localMissionState ||
      cloudMissionState.date > localMissionState.date ||
      (
        cloudMissionState.date === localMissionState.date &&
        newestTimestamp(cloudMissionState.updatedAt) >= newestTimestamp(localMissionState.updatedAt)
      )
    ) {
      writeJson(LOCAL_KEYS.missions, cloudMissionState)
    }
  }

  if (!options.skipDeviceSettings) {
    const risk = snapshot.riskSettings[0]
    if (risk) {
      writeJson(LOCAL_KEYS.risk, {
        maxTradesPerDay: number(risk.max_trades_per_day, 3),
        maxDailyLoss: number(risk.max_daily_loss, -300),
        maxConsecutiveLosses: number(risk.max_consecutive_losses, 2),
        maxRiskPerTrade: number(risk.max_risk_per_trade, 100),
      })
    }

    const settings = snapshot.appSettings[0]?.settings
    if (settings && typeof settings === 'object' && !Array.isArray(settings)) {
      const theme = (settings as Record<string, unknown>).theme
      if (theme === 'dark' || theme === 'light') {
        window.localStorage.setItem(LOCAL_KEYS.theme, theme)
      }
    }
  }

  return snapshotRowCount(snapshot)
}

export const getCloudSyncRecord = (): FreedomCloudSyncRecord | null =>
  readJson<FreedomCloudSyncRecord>(SYNC_STORAGE_KEY)

const performFreedomCloudSync = async (): Promise<FreedomCloudSyncSummary> => {
  const identity = await getCloudIdentity()
  if (!identity) throw new Error('請先登入 Freedom Cloud。')

  const existingRecord = getCloudSyncRecord()
  const deviceBelongsToUser = existingRecord?.userId === identity.userId
  const belongsToAnotherUser = Boolean(existingRecord?.userId && !deviceBelongsToUser)

  if (belongsToAnotherUser) {
    throw new Error('這台裝置的 Local Cache 屬於另一個 Freedom Account，已阻止跨帳號資料上傳。')
  }

  if (deviceBelongsToUser) {
    await flushCloudDeletionQueue()
  }

  let snapshot = await getCloudSnapshot()
  const cloudHadData = snapshotRowCount(snapshot) > 0
  let pushedRows = 0
  let pulledRows = 0
  let direction: FreedomCloudSyncSummary['direction'] = 'cloud-to-local'

  if (!cloudHadData || deviceBelongsToUser) {
    // Trusted devices reconcile Cloud first. Row-level updatedAt comparison
    // prevents an older device from overwriting a newer Cloud edit.
    if (deviceBelongsToUser && cloudHadData) {
      applyCloudTombstones(snapshot.tombstones)
      await restoreSnapshot(snapshot, { skipDeviceSettings: true })
    }

    const migration = await migrateLocalDataToCloud()
    pushedRows = migration.totalRows
    direction = 'two-way'
    snapshot = await getCloudSnapshot()
  }

  applyCloudTombstones(snapshot.tombstones)
  pulledRows = await restoreSnapshot(snapshot)
  const summary: FreedomCloudSyncSummary = {
    userId: identity.userId,
    direction,
    pushedRows,
    pulledRows,
    cloudHadData,
    syncedAt: new Date().toISOString(),
  }

  writeJson(SYNC_STORAGE_KEY, { userId: identity.userId, summary } satisfies FreedomCloudSyncRecord)
  return summary
}

let activeSync: Promise<FreedomCloudSyncSummary> | null = null

export const synchronizeFreedomCloud = async (): Promise<FreedomCloudSyncSummary> => {
  if (activeSync) return activeSync

  activeSync = performFreedomCloudSync()
  try {
    return await activeSync
  }
  finally {
    activeSync = null
  }
}

export const cloudSyncService = {
  sync: synchronizeFreedomCloud,
  getLastSync: getCloudSyncRecord,
}
