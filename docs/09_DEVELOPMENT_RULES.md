# Development Rules

> Source of truth for engineering conventions and implementation constraints.

## Tech Stack

| Layer | Technology |
|-------|------------|
| UI framework | Vue 3 (Composition API) |
| Build tool | Vite |
| Language | TypeScript |
| State management | Pinia |
| Routing | Vue Router |
| Styling | Tailwind CSS |
| Backend (planned) | Supabase |

## Architecture

### Pattern

Feature-based architecture.

### Source Structure

```
src/
├── app/              # Bootstrap (main.ts, App.vue)
├── components/       # Shared components (App*, base/Base*)
├── layouts/          # Layout shells
├── modules/          # Feature modules
├── router/           # Route definitions
├── stores/           # Pinia stores
├── services/         # API / data services
├── types/            # Shared TypeScript types
├── utils/            # Shared utilities
├── styles/           # Global styles
├── config/           # App configuration
└── constants/        # App constants
```

### Module Structure

```
modules/<feature>/
├── views/
├── components/
├── composables/      # When needed
├── stores/           # When needed
└── services/         # When needed
```

## Coding Standards

### Vue

- Use `<script setup lang="ts">` only
- No Options API
- Lazy-load module views in the router

### Component Naming

- Shared UI primitives: `Base` prefix (e.g. `BasePanel`)
- App shell components: `App` prefix (e.g. `AppHeader`)
- Module sections: `*Section` suffix
- Module pages: `*View` suffix

### TypeScript

- Strict typing enabled
- Shared types live in `src/types/`
- Module-specific types live within the module

## Implementation Constraints

During structure and foundation sprints:

- **No business logic** in UI layout components
- **No API calls** until the API layer is defined
- **No Supabase** until database plan is approved and implemented
- **No fake statistics or mock data** in the UI
- **No charts** unless explicitly requested for a sprint

## State Management

<!-- To be defined. Pinia store conventions, naming, and module ownership. -->

## Services Layer

<!-- To be defined. API client setup, error handling, and data mapping. -->

## Testing

<!-- To be defined. -->

## Git & Workflow

<!-- To be defined. Branching, commit conventions, PR requirements. -->

## Documentation

- Product and engineering decisions are recorded in `docs/`
- Update relevant docs when architecture or conventions change
- Do not implement features that contradict documented decisions without updating docs first

## Related Documents

- [Design System](./02_DESIGN_SYSTEM.md)
- [UI Guidelines](./05_UI_GUIDELINES.md)
- [Database Plan](./04_DATABASE_PLAN.md)
- [Roadmap](./08_ROADMAP.md)
