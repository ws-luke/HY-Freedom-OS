# Database Plan

> Source of truth for data storage strategy and schema direction.

## Backend Platform

- **Planned provider:** Supabase
- **Status:** Not implemented

## Design Principles

- UUID primary keys and immutable ownership keys
- Currency amounts stored as fixed-precision decimals in the backend
- Account identity separated from its display name
- Ledger records are append-oriented and independently auditable
- Historical trades keep a readable account-name snapshot while linking by `account_id`
- Different currencies are not aggregated without an explicit exchange-rate source

## Data Ownership Model

- Current client build is single-user and local-first.
- Backend tables will be scoped by `user_id`; no account or ledger row is shared across users.
- Authentication and multi-device sync remain planned work.

## Entity Overview

<!-- To be defined. List core entities without inventing fields or relationships. -->

| Entity | Description | Current status |
|--------|-------------|----------------|
| `trading_accounts` | Prop Firm, demo, and personal live account master data and risk rules | Implemented locally |
| `account_transactions` | Deposits, withdrawals, payouts, fees, refunds, and adjustments | Implemented locally |
| `trades` | Trading journal records linked by nullable `account_id` | Implemented locally |
| `account_balance_snapshots` | Future time-series balance/equity history | Planned |

### `trading_accounts`

Core fields: `id`, `user_id`, `name`, `provider`, `type`, `status`, `prop_stage`, `platform`, `account_number`, `currency`, `starting_balance`, `balance`, `equity`, Prop Firm rule percentages, notes, and timestamps.

### `account_transactions`

Core fields: `id`, `user_id`, `account_id`, `type`, `direction`, `date`, positive `amount`, nullable `balance_after`, `method`, `reference`, notes, and timestamps.

Transaction direction is explicit. Amount remains positive; signed cash flow is derived from `direction`.

### `trades`

`account_id` is nullable for backward-compatible imports. `account` remains the account-name snapshot shown in the journal.

## Schema Conventions

- Database names use `snake_case`; TypeScript models use `camelCase`.
- Monetary fields require `numeric(18, 2)` or greater precision; never floating-point database types.
- ISO currency codes are stored uppercase.
- Timestamps use UTC; user-entered ledger dates remain date-only values.
- Account deletion must be restricted or soft-deleted after backend migration. The current local build confirms and cascades its ledger records while preserving trades.

## Authentication & Authorization

<!-- To be defined. -->

## Row-Level Security

<!-- To be defined. -->

## Migration Strategy

1. Read the versioned local key `hy-freedom-os:account-ledger`.
2. Upsert account rows first and preserve their UUIDs.
3. Insert ledger rows only after their referenced accounts exist.
4. Backfill trade `account_id` by exact normalized account name only when the match is unique.
5. Keep unmatched legacy trade records nullable and visible for manual mapping.

## API Layer Mapping

- `useAccountStore` is the current persistence boundary.
- `account-ledger.service.ts` owns cash-flow, performance, and account-health calculations.
- A future repository/API adapter can replace local storage without changing Accounts views or calculation services.

## Related Documents

- [Information Architecture](./03_INFORMATION_ARCHITECTURE.md)
- [Trading System](./06_TRADING_SYSTEM.md)
- [Development Rules](./09_DEVELOPMENT_RULES.md)
