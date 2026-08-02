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
- **Purpose:** _TBD_
- **Key sections (structure only):**
  - Good Morning
  - Today's Mission
  - Economic Events
  - Trading Focus
  - Pending Reviews
  - Account Health
  - Freedom Progress

### Planning

- **Path:** `/planning`
- **Purpose:** _TBD_

### Economic Calendar

- **Path:** `/economic-calendar`
- **Purpose:** _TBD_

### Trades

- **Path:** `/trades`
- **Purpose:** _TBD_

### Playbook

- **Path:** `/playbook`
- **Purpose:** _TBD_

### Review

- **Path:** `/review`
- **Purpose:** _TBD_

### Accounts

- **Path:** `/accounts`
- **Purpose:** _TBD_

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

<!-- To be defined. How modules connect and share data. -->

## Related Documents

- [Product Vision](./01_PRODUCT_VISION.md)
- [UI Guidelines](./05_UI_GUIDELINES.md)
- [Roadmap](./08_ROADMAP.md)
