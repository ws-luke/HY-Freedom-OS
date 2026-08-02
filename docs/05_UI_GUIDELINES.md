# UI Guidelines

> Source of truth for layout, interaction, and page-level UI conventions.

## Layout System

### Application Shell

All authenticated module pages render inside `MainLayout`.

```
┌─────────────────────────────────────────┐
│ AppHeader                               │
├──────────┬──────────────────────────────┤
│ AppSidebar│  Module Content             │
│          │  (RouterView)                │
└──────────┴──────────────────────────────┘
```

### Content Width

<!-- To be defined. Current Mission Control uses max-w-7xl. -->

## Responsive Breakpoints

<!-- To be defined. Document Tailwind breakpoint usage conventions. -->

| Breakpoint | Usage |
|------------|-------|
| Default | Mobile-first single column |
| `lg` | Desktop multi-column layouts |

## Page Structure Conventions

<!-- To be defined. -->

### Placeholder Pages

During early sprints, module pages may display only a page title until feature work begins.

### Section-Based Pages

Pages composed of discrete sections should:

- Use module-scoped section components
- Compose shared `Base*` UI primitives
- Avoid embedding business logic in layout components

## Component Naming

| Type | Convention | Example |
|------|------------|---------|
| Shared UI primitives | `Base` prefix | `BasePanel` |
| Module sections | Descriptive + `Section` suffix | `GoodMorningSection` |
| Module views | Descriptive + `View` suffix | `MissionControlView` |
| App shell | `App` prefix | `AppHeader`, `AppSidebar` |

## Composition API

- Use `<script setup lang="ts">` exclusively
- No Options API

## Content Guidelines

<!-- To be defined. -->

### Placeholder Text

Use neutral placeholder copy during structure-only sprints.

- Do not include fake statistics
- Do not include mock data
- Do not imply unimplemented functionality as live

## Accessibility

<!-- To be defined. -->

## Related Documents

- [Design System](./02_DESIGN_SYSTEM.md)
- [Information Architecture](./03_INFORMATION_ARCHITECTURE.md)
- [Development Rules](./09_DEVELOPMENT_RULES.md)
