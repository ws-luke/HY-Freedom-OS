import { getCloudIdentity } from './cloud-auth.service'
import { listUserRows, upsertUserRows } from './cloud-database.service'
import { removeTradeScreenshot, uploadCloudDataUrl } from './cloud-storage.service'
import type { StoredAccountLedgerState } from '@/types/account'
import type {
  FreedomCloudMigrationRecord,
  FreedomCloudMigrationSummary,
} from '@/types/cloud'
import type { StoredMissionState } from '@/types/mission'
import type { PlaybookRecord } from '@/types/playbook'
import type { SignalRecord } from '@/types/signal'
import type { StoredTradeReview } from '@/types/trade-review'
import type { TradeRecord } from '@/types/trade'
import type { TradingPlan } from '@/types/trading-plan'

const MIGRATION_STORAGE_KEY = 'hy-freedom-os:cloud-migration'

interface LocalRiskSettings {
  maxTradesPerDay: number
  maxDailyLoss: number
  maxConsecutiveLosses: number
  maxRiskPerTrade: number
}

interface CloudMappedRow extends Record<string, unknown> {
  id: string
  local_id: string
  name?: string
  short_name?: string
}

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

const readArray = <T>(key: string): T[] => {
  const value = readJson<unknown>(key)
  return Array.isArray(value) ? value as T[] : []
}

const toMap = (rows: CloudMappedRow[]): Map<string, string> =>
  new Map(rows.map(row => [row.local_id, row.id]))

const normalized = (value: string): string => value.trim().toLowerCase()

const safeText = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback

const safeNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const migrateAccounts = async (
  state: StoredAccountLedgerState | null,
): Promise<{ count: number; idMap: Map<string, string>; nameMap: Map<string, string> }> => {
  const accounts = state?.accounts ?? []
  await upsertUserRows('trading_accounts', accounts.map(account => ({
    local_id: account.id,
    name: account.name,
    provider: account.provider,
    type: account.type,
    status: account.status,
    prop_stage: account.propStage,
    platform: account.platform,
    account_number: account.accountNumber,
    data_source: account.dataSource,
    broker_server: account.brokerServer,
    broker_login: account.brokerLogin,
    sync_status: account.syncStatus,
    last_synced_at: account.lastSyncedAt,
    last_sync_cursor: account.lastSyncCursor,
    sync_error: account.syncError,
    currency: account.currency,
    starting_balance: account.startingBalance,
    balance: account.balance,
    equity: account.equity,
    profit_target_percent: account.profitTargetPercent,
    max_daily_loss_percent: account.maxDailyLossPercent,
    max_drawdown_percent: account.maxDrawdownPercent,
    profit_split_percent: account.profitSplitPercent,
    notes: account.notes,
    created_at: account.createdAt,
    updated_at: account.updatedAt,
  })))

  const cloudRows = await listUserRows<CloudMappedRow>('trading_accounts')
  const idMap = toMap(cloudRows)
  const nameMap = new Map<string, string>()

  accounts.forEach(account => {
    const cloudId = idMap.get(account.id)
    if (cloudId) nameMap.set(normalized(account.name), cloudId)
  })

  return { count: accounts.length, idMap, nameMap }
}

const migrateSignals = async (
  signals: SignalRecord[],
): Promise<{ count: number; idMap: Map<string, string> }> => {
  const rows: Record<string, unknown>[] = []
  const existingRows = await listUserRows<CloudMappedRow & { screenshot_path?: string | null }>('signals')
  const existingByLocalId = new Map(existingRows.map(row => [row.local_id, row]))

  for (const signal of signals) {
    const previousPath = existingByLocalId.get(signal.id)?.screenshot_path ?? null
    let screenshotPath: string | null = signal.screenshot?.storagePath ?? null

    if (signal.screenshot?.dataUrl) {
      screenshotPath = await uploadCloudDataUrl(
        'signals',
        signal.id,
        signal.screenshot.name,
        signal.screenshot.dataUrl,
        signal.screenshot.storagePath ?? previousPath,
      )
    }
    else if (!signal.screenshot && previousPath) {
      await removeTradeScreenshot(previousPath)
    }

    rows.push({
      local_id: signal.id,
      name: signal.name,
      description: signal.description,
      direction: signal.direction,
      status: signal.status,
      timeframe: signal.timeframe,
      confirmation_rules: signal.confirmationRules,
      screenshot_path: screenshotPath,
      screenshot_name: signal.screenshot?.name ?? null,
      created_at: signal.createdAt,
      updated_at: signal.updatedAt,
    })
  }

  await upsertUserRows('signals', rows)
  const cloudRows = await listUserRows<CloudMappedRow>('signals')
  return { count: signals.length, idMap: toMap(cloudRows) }
}

const migratePlaybooks = async (
  playbooks: PlaybookRecord[],
): Promise<{
  count: number
  idMap: Map<string, string>
  nameMap: Map<string, string>
}> => {
  await upsertUserRows('playbooks', playbooks.map(playbook => ({
    local_id: playbook.id,
    name: playbook.name,
    short_name: playbook.shortName,
    description: playbook.description,
    direction: playbook.direction,
    status: playbook.status,
    timeframe: playbook.timeframe,
    market_condition: playbook.marketCondition,
    entry_conditions: playbook.entryConditions,
    avoid_conditions: playbook.avoidConditions,
    rating: playbook.rating,
    created_at: playbook.createdAt,
    updated_at: playbook.updatedAt,
  })))

  const cloudRows = await listUserRows<CloudMappedRow>('playbooks')
  const idMap = toMap(cloudRows)
  const nameMap = new Map<string, string>()

  cloudRows.forEach(row => {
    if (row.name) nameMap.set(normalized(row.name), row.id)
    if (row.short_name) nameMap.set(normalized(row.short_name), row.id)
  })

  return { count: playbooks.length, idMap, nameMap }
}

const migrateTrades = async (
  trades: TradeRecord[],
  accountIdMap: Map<string, string>,
  accountNameMap: Map<string, string>,
  signalIdMap: Map<string, string>,
  playbookNameMap: Map<string, string>,
): Promise<{ count: number; idMap: Map<string, string> }> => {
  await upsertUserRows('trades', trades.map(trade => ({
    local_id: trade.id,
    account_id:
      (trade.accountId ? accountIdMap.get(trade.accountId) : null) ??
      accountNameMap.get(normalized(trade.account)) ??
      null,
    signal_id: trade.signalId ? signalIdMap.get(trade.signalId) ?? null : null,
    playbook_id: playbookNameMap.get(normalized(trade.playbook)) ?? null,
    trade_date: trade.date.replaceAll('/', '-'),
    trade_time: trade.time || '00:00',
    closed_at: trade.closedAt,
    symbol: trade.symbol,
    direction: trade.direction,
    result: trade.result,
    review_status: trade.status,
    position_status: trade.positionStatus,
    exit_reason: trade.exitReason,
    signal_name: trade.signal,
    playbook_name: trade.playbook,
    account_name: trade.account,
    data_source: trade.dataSource,
    external_id: trade.externalId,
    broker_deal_id: trade.brokerDealId,
    broker_position_id: trade.brokerPositionId,
    broker_order_id: trade.brokerOrderId,
    commission: trade.commission,
    swap: trade.swap,
    fee: trade.fee,
    synced_at: trade.syncedAt,
    entry_price: trade.entryPrice,
    exit_price: trade.exitPrice,
    stop_loss: trade.stopLoss,
    take_profit: trade.takeProfit,
    lot_size: trade.lotSize,
    risk_amount: trade.riskAmount,
    profit_loss: trade.profitLoss,
    r_multiple: trade.rMultiple,
    reason: trade.reason,
    mistake_tags: trade.mistakeTags,
    custom_mistake_tags: trade.customMistakeTags,
    is_favorite: trade.isFavorite,
    created_at: trade.createdAt,
    updated_at: trade.updatedAt,
  })))

  const cloudRows = await listUserRows<CloudMappedRow>('trades')
  return { count: trades.length, idMap: toMap(cloudRows) }
}

const migrateReviews = async (
  reviews: StoredTradeReview[],
  tradeIdMap: Map<string, string>,
): Promise<number> => {
  const rows = reviews.flatMap(review => {
    const cloudTradeId = tradeIdMap.get(review.tradeId)
    if (!cloudTradeId) return []

    return [{
      local_id: review.id,
      trade_id: cloudTradeId,
      followed_plan: review.followedPlan,
      followed_playbook: review.followedPlaybook,
      respected_risk: review.respectedRisk,
      waited_for_confirmation: review.waitedForConfirmation,
      avoided_news_risk: review.avoidedNewsRisk,
      emotional_control: review.emotionalControl,
      execution_score: review.executionScore,
      strengths: review.strengths,
      mistakes: review.mistakes,
      improvement: review.improvement,
      next_trade_rule: review.nextTradeRule,
      summary: review.summary,
      total_score: review.totalScore,
      completed_at: review.completedAt,
      created_at: review.createdAt,
      updated_at: review.updatedAt,
    }]
  })

  await upsertUserRows('trade_reviews', rows)
  return rows.length
}

const migrateTradeScreenshots = async (
  trades: TradeRecord[],
  tradeIdMap: Map<string, string>,
): Promise<number> => {
  const rows: Record<string, unknown>[] = []

  for (const trade of trades) {
    const cloudTradeId = tradeIdMap.get(trade.id)
    if (!cloudTradeId) continue

    for (const item of [
      { kind: 'before' as const, screenshot: trade.beforeScreenshot },
      { kind: 'after' as const, screenshot: trade.afterScreenshot },
    ]) {
      if (!item.screenshot) continue

      const storagePath = item.screenshot.dataUrl
        ? await uploadCloudDataUrl(
            'trades',
            `${trade.id}-${item.kind}`,
            item.screenshot.name,
            item.screenshot.dataUrl,
            item.screenshot.storagePath,
          )
        : item.screenshot.storagePath

      if (!storagePath) continue

      rows.push({
        local_id: `${trade.id}:${item.kind}`,
        trade_id: cloudTradeId,
        kind: item.kind,
        storage_path: storagePath,
        file_name: item.screenshot.name,
        mime_type: null,
      })
    }
  }

  await upsertUserRows('trade_screenshots', rows)
  return rows.length
}

const migrateTransactions = async (
  state: StoredAccountLedgerState | null,
  accountIdMap: Map<string, string>,
): Promise<number> => {
  const transactions = state?.transactions ?? []
  const rows = transactions.flatMap(transaction => {
    const cloudAccountId = accountIdMap.get(transaction.accountId)
    if (!cloudAccountId) return []

    return [{
      local_id: transaction.id,
      account_id: cloudAccountId,
      type: transaction.type,
      direction: transaction.direction,
      occurred_on: transaction.date,
      amount: transaction.amount,
      balance_after: transaction.balanceAfter,
      method: transaction.method,
      reference: transaction.reference,
      notes: transaction.notes,
      data_source: transaction.dataSource,
      external_id: transaction.externalId,
      synced_at: transaction.syncedAt,
      created_at: transaction.createdAt,
      updated_at: transaction.updatedAt,
    }]
  })

  await upsertUserRows('account_transactions', rows)
  return rows.length
}

const migratePlan = async (plan: TradingPlan | null): Promise<number> => {
  if (!plan) return 0

  // Local TradingPlan existed before some of these fields were introduced.
  // Normalize at the Cloud boundary so legacy localStorage can never turn an
  // omitted property into NULL for a PostgreSQL NOT NULL column.
  const date = safeText(plan.date, new Date().toISOString().slice(0, 10))
  const symbol = safeText(plan.symbol, 'XAUUSD') || 'XAUUSD'
  const marketBias = ['bullish', 'bearish', 'range', 'wait'].includes(plan.marketBias)
    ? plan.marketBias
    : 'wait'

  await upsertUserRows('trading_plans', [{
    local_id: `${date}:${symbol}`,
    plan_date: date,
    symbol,
    market_bias: marketBias,
    h4_trend: safeText(plan.h4Trend),
    h1_trend: safeText(plan.h1Trend),
    m15_structure: safeText(plan.m15Structure),
    support_zones: safeText(plan.supportZones),
    resistance_zones: safeText(plan.resistanceZones),
    allowed_conditions: safeText(plan.allowedConditions),
    prohibited_conditions: safeText(plan.prohibitedConditions),
    waiting_signals: Array.isArray(plan.waitingSignals)
      ? plan.waitingSignals.filter((item): item is string => typeof item === 'string')
      : [],
    focus_rule: safeText(plan.focusRule),
    max_trades: Math.max(0, Math.round(safeNumber(plan.maxTrades, 2))),
    max_risk_percent: Math.max(0, safeNumber(plan.maxRiskPercent, 1)),
    notes: safeText(plan.notes),
    completed: plan.completed === true,
    updated_at: safeText(plan.updatedAt, new Date().toISOString()),
  }])

  return 1
}

const migrateMissions = async (state: StoredMissionState | null): Promise<number> => {
  if (!state?.date || !Array.isArray(state.missions)) return 0

  const rows = state.missions.map(mission => ({
    local_id: mission.id,
    mission_date: state.date,
    title: mission.title,
    completed: mission.completed,
    sort_order: mission.order,
    updated_at: state.updatedAt ?? new Date().toISOString(),
  }))

  await upsertUserRows(
    'daily_missions',
    rows,
    'user_id,mission_date,local_id',
  )
  return rows.length
}

const migrateSettings = async (
  risk: LocalRiskSettings | null,
  theme: string | null,
): Promise<number> => {
  let count = 0

  if (risk) {
    await upsertUserRows('risk_settings', [{
      max_trades_per_day: risk.maxTradesPerDay,
      max_daily_loss: risk.maxDailyLoss,
      max_consecutive_losses: risk.maxConsecutiveLosses,
      max_risk_per_trade: risk.maxRiskPerTrade,
    }], 'user_id')
    count += 1
  }

  await upsertUserRows('app_settings', [{
    settings: {
      theme: theme === 'light' ? 'light' : 'dark',
      migratedFrom: 'localStorage',
    },
  }], 'user_id')
  count += 1

  return count
}

export const getCloudMigrationRecord = (): FreedomCloudMigrationRecord | null => {
  return readJson<FreedomCloudMigrationRecord>(MIGRATION_STORAGE_KEY)
}

export const migrateLocalDataToCloud = async (): Promise<FreedomCloudMigrationSummary> => {
  const identity = await getCloudIdentity()
  if (!identity) throw new Error('請先登入 Freedom Cloud。')

  const accountState = readJson<StoredAccountLedgerState>('hy-freedom-os:account-ledger')
  const signals = readArray<SignalRecord>('hy-freedom-os:signals')
  const playbooks = readArray<PlaybookRecord>('hy-freedom-os:playbooks')
  const trades = readArray<TradeRecord>('hy-freedom-os:trades')
  const reviews = readArray<StoredTradeReview>('hy-freedom-os:trade-reviews')
  const plan = readJson<TradingPlan>('hy-freedom-os:trading-plan')
  const missions = readJson<StoredMissionState>('hy-freedom-os:daily-missions')
  const risk = readJson<LocalRiskSettings>('hy-freedom-os:risk-settings')
  const theme = typeof window !== 'undefined'
    ? window.localStorage.getItem('hy-freedom-os:theme')
    : null

  const accountResult = await migrateAccounts(accountState)
  const signalResult = await migrateSignals(signals)
  const playbookResult = await migratePlaybooks(playbooks)
  const tradeResult = await migrateTrades(
    trades,
    accountResult.idMap,
    accountResult.nameMap,
    signalResult.idMap,
    playbookResult.nameMap,
  )
  const reviewsCount = await migrateReviews(reviews, tradeResult.idMap)
  const screenshotsCount = await migrateTradeScreenshots(trades, tradeResult.idMap)
  const transactionsCount = await migrateTransactions(accountState, accountResult.idMap)
  const plansCount = await migratePlan(plan)
  const missionsCount = await migrateMissions(missions)
  const settingsCount = await migrateSettings(risk, theme)
  const migratedAt = new Date().toISOString()

  const summary: FreedomCloudMigrationSummary = {
    accounts: accountResult.count,
    transactions: transactionsCount,
    signals: signalResult.count,
    playbooks: playbookResult.count,
    trades: tradeResult.count,
    reviews: reviewsCount,
    screenshots: screenshotsCount,
    plans: plansCount,
    missions: missionsCount,
    settings: settingsCount,
    totalRows:
      accountResult.count +
      transactionsCount +
      signalResult.count +
      playbookResult.count +
      tradeResult.count +
      reviewsCount +
      screenshotsCount +
      plansCount +
      missionsCount +
      settingsCount,
    migratedAt,
  }

  if (typeof window !== 'undefined') {
    const record: FreedomCloudMigrationRecord = {
      userId: identity.userId,
      summary,
    }
    window.localStorage.setItem(MIGRATION_STORAGE_KEY, JSON.stringify(record))
  }

  return summary
}

export const cloudMigrationService = {
  migrate: migrateLocalDataToCloud,
  getLastMigration: getCloudMigrationRecord,
}
