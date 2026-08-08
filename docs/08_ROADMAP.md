# Roadmap

> Source of truth for delivery phases and sprint history.

## Roadmap Principles

<!-- To be defined. How priorities are set and sequenced. -->

## Completed

### Sprint 1 — Project Architecture

- Feature-based folder structure
- Vue Router with lazy-loaded module views
- Pinia registered (no stores)
- Tailwind CSS dark theme (application-wide)
- Application shell: `MainLayout`, `AppHeader`, `AppSidebar`
- Placeholder pages for all modules

### Sprint 2 — Mission Control (Structure Only)

- `BasePanel` shared UI component
- Mission Control section components
- Responsive bento grid layout
- Placeholder content only (no data, charts, or business logic)

### Mission Control v2 — Decision Dashboard

- Replaced the long card stack with a decision-first command dashboard
- Added readiness scoring across plan, missions, risk, and event restrictions
- Added deterministic next-action priority and state-aware command messaging
- Consolidated risk, recent performance, market focus, coaching, reviews, and account health
- Preserved daily-mission create, edit, complete, delete, and reset actions
- Added responsive desktop/mobile layouts and cleaned up the dashboard clock lifecycle

### Account Management v1 — Account & Cash Ledger

- Replaced the Accounts placeholder with a complete operational module
- Added Prop Firm/FTMO, demo, and personal live account profiles
- Added challenge, verification, funded, active, paused, failed, and closed lifecycle states
- Added balance, equity, account return, Prop Firm rules, and drawdown-usage visibility
- Added per-entry deposits, withdrawals, payouts, challenge fees, refunds, platform fees, and adjustments
- Added ledger search and type, direction, and date filtering with responsive desktop/mobile views
- Added schema-versioned local persistence with no fabricated account data
- Linked trades to managed accounts by stable account ID with legacy name fallback
- Connected real account state and daily linked P/L to Mission Control
- Prevented silent cross-currency aggregation

### Real Economic Calendar v1 — XAU/USD Event Risk

- Removed both legacy mock economic-event data paths and duplicate event models
- Connected the TradingView Economic Calendar public data feed
- Added actual, forecast, previous, importance, publisher, and source-link fields
- Normalized every event into Asia/Taipei time
- Added today, tomorrow, and seven-day calendar ranges with search and impact filtering
- Added XAU/USD relevance classification for USD medium/high-impact events
- Added dynamic event countdowns, daily risk scoring, and event-specific no-entry windows
- Added five-minute background refresh with one-minute refresh around releases
- Added versioned local cache and explicit LIVE, CACHE, and OFFLINE states
- Connected live event state to Mission Control without fixed mock restrictions

## Planned

<!-- To be defined by product leadership. -->

### Sprint 3

_TBD_

### Sprint 4

_TBD_

## Backlog

<!-- To be defined. Unscheduled work items grouped by module or theme. -->

| Item | Module | Priority | Status |
|------|--------|----------|--------|
| _TBD_ | _TBD_ | _TBD_ | _TBD_ |

## Out of Scope (Current Phase)

- Supabase integration
- API layer
- Fake / mock data in production UI

## Related Documents

- [Product Vision](./01_PRODUCT_VISION.md)
- [Information Architecture](./03_INFORMATION_ARCHITECTURE.md)
- [Development Rules](./09_DEVELOPMENT_RULES.md)
