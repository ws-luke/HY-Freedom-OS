# Trading System

> Source of truth for trading domain concepts, workflows, and module responsibilities.

## Scope

This document defines the trading domain for HY Freedom OS.

<!-- Domain details to be defined by product and trading leadership. -->

## Trading Philosophy

<!-- To be defined. -->

## Target Trading Style

- **Focus:** Swing trading
- **Discipline model:** Planning → Execution → Review → Continuous improvement

## Domain Modules

<!-- Map trading concepts to application modules. Do not invent rules or calculations. -->

| Module | Domain Responsibility |
|--------|----------------------|
| Mission Control | _TBD_ |
| Planning | _TBD_ |
| Economic Calendar | USD medium/high-impact events increase the daily risk level. New entries are blocked during generated event windows. |

## Economic-event risk rules

- Standard high-impact event: no new positions from 30 minutes before until 30 minutes after release.
- CPI, NFP, FOMC, interest-rate, Powell, PCE, GDP, and unemployment-rate events: window starts 45 minutes before release.
- Medium-impact event: no new positions from 15 minutes before until 15 minutes after release.
- The window ending does not imply immediate entry permission; spread, volatility, structure, and the normal trade checklist must recover first.
- Missing live data never becomes an implicit safe signal. The UI displays cache age or an unavailable state.
| Trades | _TBD_ |
| Playbook | _TBD_ |
| Review | _TBD_ |
| Accounts | _TBD_ |
| Investment | _TBD_ |
| Tools | _TBD_ |

## Core Workflows

<!-- To be defined. -->

### Planning Workflow

_TBD_

### Execution Workflow

_TBD_

### Review Workflow

_TBD_

### Continuous Improvement Workflow

_TBD_

## Key Domain Entities

<!-- To be defined. Names only — no invented fields or business rules. -->

| Entity | Description |
|--------|-------------|
| _TBD_ | _TBD_ |

## Glossary

<!-- To be defined. Trading terms used consistently across the product. -->

| Term | Definition |
|------|------------|
| _TBD_ | _TBD_ |

## Related Documents

- [Product Vision](./01_PRODUCT_VISION.md)
- [Information Architecture](./03_INFORMATION_ARCHITECTURE.md)
- [Database Plan](./04_DATABASE_PLAN.md)
- [AI Coach](./07_AI_COACH.md)
