# Zeabur Production Deployment

Freedom OS production topology:

- **Zeabur Web Service**: Vue production assets, PWA, SPA routing, and the Economic Calendar proxy.
- **Supabase**: PostgreSQL, Auth, Storage, RLS, and Cloud Sync data.
- **Freedom MT5 Sync Service**: stays on the Windows machine/VPS that has MetaTrader 5 installed.

## Zeabur service

Deploy the project root as a Git or Local Project service. Zeabur detects the root `Dockerfile` automatically.

The container listens on `0.0.0.0:$PORT`. Zeabur may override the Dockerfile fallback port automatically.

### Build-time public variables

The current Freedom OS Supabase project has browser-safe defaults. To override them, set these in Zeabur before building:

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Never put a Supabase `service_role` key, database password, MT5 password, or other server secret in a `VITE_*` variable. Vite variables are shipped to the browser.

`VITE_MT5_SYNC_URL` is optional. Keep localhost for desktop-local MT5 sync. Do not expose a public/VPS MT5 endpoint until Freedom Sync has an authenticated secure relay.

## Production routes

- `/` and Vue Router paths: Freedom OS app shell.
- `/api/economic-calendar`: same-origin live-data API; excluded from Service Worker caching.
- `/healthz`: deployment health probe.
- `/assets/*`: immutable Vite build assets.
- `/sw.js`: no-cache so PWA updates are detected promptly.

Production builds require a Freedom Account before protected Vue routes are opened. Local Vite development keeps local mode available for development and offline diagnostics.

## Release checks

```bash
npm ci
npm run build
npm start
```

After a release, verify `/healthz`, a direct nested route such as `/trades`, Supabase sign-in/cloud sync, and Economic Calendar before promoting the deployment.
