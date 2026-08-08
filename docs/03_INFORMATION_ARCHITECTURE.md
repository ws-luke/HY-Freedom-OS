# Information Architecture

> Source of truth for application structure, navigation, and module boundaries.

## Application Shell

```
MainLayout
├── AppHeader
├── AppSidebar
└── RouterView (module pages)
```

## Navigation Order

| Order | Module | Route | Route Name |
|-------|--------|-------|------------|
| 1 | Mission Control | `/` | `mission-control` |
| 2 | Planning | `/planning` | `planning` |
| 3 | Economic Calendar | `/economic-calendar` | `economic-calendar` |
| 4 | Trades | `/trades` | `trades` |
| 5 | Playbook | `/playbook` | `playbook` |
| 6 | Review | `/review` | `review` |
| 7 | Accounts | `/accounts` | `accounts` |
| 8 | Investment | `/investment` | `investment` |
| 9 | Tools | `/tools` | `tools` |
| 10 | Settings | `/settings` | `settings` |

## Module Overview

<!-- To be defined per module. Purpose, primary user tasks, and key entities. -->

### Mission Control

- **Path:** `/`
- **Purpose:** Convert cross-module state into one clear trading decision and the next required action.
- **Key sections:**
  - Command status and readiness score
  - Quick workflow navigation
  - Daily execution sequence and trading-plan snapshot
  - Economic-event restriction window
  - Trading-risk and recent-performance pulse
  - Market focus, coaching insight, review queue, and account health
- **Decision priority:** Risk lock → active event restriction → incomplete plan → incomplete daily mission → pending review → trade recording
- **Data orchestration:** `modules/mission-control/composables/useMissionControlDashboard.ts`

### Planning

- **Path:** `/planning`
- **Purpose:** _TBD_

### Economic Calendar

- **Path:** `/economic-calendar`
- **Purpose:** Provide a real, Taiwan-time economic-event feed focused on USD releases that can materially affect XAU/USD execution.
- **Data source:** TradingView Economic Calendar with each event retaining its original publisher and source URL.
- **Primary tasks:**
  - Review today, tomorrow, and the next seven days
  - Compare actual, forecast, and previous values
  - Filter XAU/USD-relevant, high-, medium-, or low-impact events
  - See the next relevant event countdown and dynamic no-entry window
  - Distinguish live, cached, and unavailable states without fake fallback data
- **Refresh policy:** Five-minute normal refresh; one-minute refresh around an event and while a restriction is active.

### Trades

- **Path:** `/trades`
- **Purpose:** Record executions, screenshots, strategy context, results, and review state.
- **Account relationship:** New and edited trades persist `accountId` when linked to a managed account. Imported legacy records continue to fall back to account-name matching.

### Playbook

- **Path:** `/playbook`
- **Purpose:** _TBD_

### Review

- **Path:** `/review`
- **Purpose:** _TBD_

### Accounts

- **Path:** `/accounts`
- **Purpose:** Manage Prop Firm, demo, and personal live trading accounts together with a complete cash ledger.
- **Primary tasks:**
  - Create and maintain account identity, provider, platform, currency, balance, and equity
  - Track challenge, verification, funded, paused, failed, and closed states
  - Store Prop Firm targets, daily-loss limits, maximum drawdown, and profit split
  - Record every deposit, withdrawal, payout, challenge fee, refund, platform fee, and manual adjustment
  - Filter the ledger by keyword, type, direction, and date range
  - Compare account cash flow, current health, and linked trade performance
- **Persistence:** `useAccountStore` stores schema-versioned account and ledger state locally until the planned backend is introduced.

### Investment

- **Path:** `/investment`
- **Purpose:** _TBD_

### Tools

- **Path:** `/tools`
- **Purpose:** _TBD_

### Settings

- **Path:** `/settings`
- **Purpose:** _TBD_

## Cross-Module Relationships

- **Accounts → Trades:** `TradingAccount.id` is the stable relationship key. The account name remains a human-readable snapshot on every trade.
- **Trades → Accounts:** Account performance is calculated from linked trade records without rewriting historical trade P/L.
- **Accounts → Mission Control:** Active-account count, primary-currency equity, current-day linked trade P/L, and drawdown health feed the dashboard summary.
- **Economic Calendar → Mission Control:** Live upcoming USD events, high-impact count, risk score, countdown, and active restriction window feed the decision dashboard.
- **Currency rule:** Amounts in different currencies are never silently added together. Portfolio totals are grouped by currency.

## Related Documents

- [Product Vision](./01_PRODUCT_VISION.md)
- [UI Guidelines](./05_UI_GUIDELINES.md)
- [Roadmap](./08_ROADMAP.md)
