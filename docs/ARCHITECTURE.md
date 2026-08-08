# Freedom OS Architecture

## Layers

View
Component
Composable
Store
Service

Mission Control uses a module composable as its read-model layer:

`MissionControlView → useMissionControlDashboard → Stores / Services`

The view only composes sections. Cross-module priority, readiness, market-window,
performance, and coaching calculations remain in the module composable.

Account Management uses a local-first ledger boundary:

`AccountsView → useAccountStore → versioned local storage`

`AccountsView → account-ledger.service → cash flow / performance / health`

Trades link to accounts with `accountId`; the account name is also stored as a
readable historical snapshot. Legacy imported trades without an ID use an exact
normalized-name fallback until they are manually relinked.

The Economic Calendar uses a live-data adapter and a versioned cache:

`TradingView Calendar → economicCalendar.service → normalized events → useEconomicCalendarStore`

The store derives XAU/USD relevance, daily risk, next-event state, and no-entry
windows. Mission Control consumes the same read model. API failure may use a
clearly marked recent cache, but never fabricated fallback events.

## Rules

- View 不寫 Business Logic
- Component 不做資料計算
- Store 只管理 State
- Service 負責商業邏輯
- UI 使用 Base Components
- 不同幣別不得在沒有匯率來源時直接加總

## Design System

- BaseCard
- BaseBadge
- BaseProgress

## TODO

- TradingRiskService
- TradeAnalyticsService
- AiCoachService
