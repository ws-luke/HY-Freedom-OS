# Cloudflare Pages Deployment

Cloudflare Pages is the preferred low-cost Freedom OS web runtime. Zeabur Docker support remains available as a fallback.

## Architecture

- **Cloudflare Pages static assets**: Vue, PWA, CSS, JS, icons.
- **Cloudflare Pages Functions**: `/api/economic-calendar` and `/healthz` only.
- **Supabase**: PostgreSQL, Auth, RLS, Storage, and Cloud Sync.
- **Freedom MT5 Sync Service**: Windows machine/VPS with MetaTrader 5 installed.

The output `_routes.json` intentionally limits Functions invocation to `/api/*` and `/healthz`. Normal app/static requests do not invoke Pages Functions.

## Git build settings

Connect the `HY-Freedom-OS` GitHub repository with these settings:

```text
Framework preset: Vue (or None)
Build command: npm run build
Build output directory: dist
Root directory: /
Production branch: main
```

The repository pins Node.js `22.18.0` through `.node-version` so Cloudflare Pages does not depend on its rolling default build image.

The current Freedom OS Supabase project has browser-safe public defaults. Optional build-variable overrides are:

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Never expose a Supabase `service_role`, PostgreSQL password, or MT5 password through `VITE_*` variables.

`VITE_MT5_SYNC_URL` should remain unset for the current desktop-local MT5 Agent design. A remote endpoint requires an authenticated Freedom Sync relay first.

## Cloudflare-specific files

- `functions/api/economic-calendar.js`: Edge proxy for real calendar data.
- `functions/healthz.js`: runtime health probe used by Launch Guard.
- `public/_routes.json`: Functions cost boundary.
- `public/_redirects`: Vue Router SPA fallback.
- `public/_headers`: static security and PWA cache headers.

## Post-deploy verification

Verify the generated `*.pages.dev` URL in this order:

1. `/healthz` returns `status: ok`.
2. `/login` opens directly without a 404.
3. Freedom Account login succeeds.
4. Settings → Launch Guard reports a healthy service and HTTPS context.
5. Economic Calendar loads real data.
6. Supabase Cloud Sync completes for the signed-in user.
7. PWA installation becomes available on a supported browser.
