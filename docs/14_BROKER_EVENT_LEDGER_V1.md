# Freedom Broker Event Ledger v1

## Purpose

Broker Event Ledger removes the browser from the MT5 data-capture critical path.

The production data path is now:

`MT5 -> Windows Agent -> Supabase Broker Ledger -> Freedom OS Journal -> Review`

The Windows Agent owns the broker capture cursor. Freedom OS does not need to be open for the Agent to continue collecting broker state.

## Durable tables

`broker_account_snapshots`

- one current broker snapshot per trading account
- broker login/server identity
- balance, equity, currency and starting-balance payload
- independent `sync_cursor`
- capture time and Agent identity/version

`broker_trade_ledger`

- one row per MT5 normalized position external ID
- open positions are updated in place as state changes
- closing the position updates the same row to `closed`
- raw normalized broker payload remains available for journal projection

`broker_cashflow_ledger`

- one row per MT5 broker cashflow external ID
- deposits, withdrawals, payouts and adjustments remain broker-source records

All three tables are protected by authenticated-user RLS and explicitly revoke anonymous access.

## Idempotency

Trade uniqueness:

`(user_id, account_id, external_id)`

Cashflow uniqueness:

`(user_id, account_id, external_id)`

The Agent uses upsert semantics. Its existing 10-minute MT5 overlap window can therefore safely resend recent broker objects without creating duplicates.

## Independent cursor

Before Ledger v1, Cloud Bridge would hold an unacknowledged payload until a Freedom OS client opened and acknowledged it.

Ledger v1 reads the last `broker_account_snapshots.sync_cursor`, polls MT5 from that cursor, durably upserts the results, and advances the snapshot cursor. This continues regardless of browser state.

Cloud Bridge v2 remains as telemetry and compatibility fallback. If the Ledger migration is not installed, Agent v1.5 falls back to the previous acknowledged-payload behavior.

## Journal projection

Freedom OS polls the Ledger after sign-in and while the app is visible. Ledger rows are passed through the existing Broker Sync validation/import path, so existing journal behavior is retained:

- account snapshot update
- trade upsert by MT5 external ID
- cashflow upsert
- closed trade enters review workflow
- existing review metadata is preserved by the normal trade upsert path

Ledger import is idempotent. A failed app-side projection does not delete or acknowledge source rows; the durable broker ledger remains available for the next retry/device.

## Migration

Apply after Cloud Bridge v1 and Reliability v2:

`supabase/migrations/202608080005_broker_event_ledger_v1.sql`

The migration is additive and does not delete existing trading accounts, journal trades, account transactions, reviews, screenshots, or Cloud Bridge state.

## Agent requirement

Freedom MT5 Agent `v1.5.0` or newer.

No new Python dependency is required. Existing Windows DPAPI credentials and the paired Freedom Cloud session remain valid after the Agent upgrade.

