# Freedom Sync Cloud Bridge v1

## Production path

Freedom OS broker synchronization now has two paths:

- Cloud Bridge (primary): `MT5 Terminal -> Windows Freedom Agent -> Supabase -> Freedom OS`
- Local fallback: `MT5 Terminal -> Windows Freedom Agent -> browser localhost -> Freedom OS`

The Cloud Bridge is outbound-only. The Windows PC does not expose an inbound public port and Cloudflare never receives an MT5 password.

## Security model

- MT5 credentials remain on the Windows PC and are protected with Windows DPAPI.
- The Cloud Bridge pairs with a dedicated Supabase user session created by a one-time Freedom OS email/password sign-in.
- The Freedom OS password is not stored by the Agent.
- The resulting access/refresh session is encrypted with Windows DPAPI.
- The Agent uses only the public Supabase publishable key plus the signed-in user's JWT.
- PostgreSQL RLS limits `broker_sync_channels` and `trading_accounts` to `auth.uid() = user_id`.
- No `service_role`, Supabase secret key, database password, or MT5 password is shipped in the browser.

## Delivery semantics

`broker_sync_channels` is an acknowledged hand-off channel per trading account.

1. The Agent reads the user's MT5-backed `trading_accounts` rows through RLS.
2. The Agent syncs an account only when its Read-only credential is available in Windows DPAPI.
3. A normalized broker payload is stored in the channel with a `payload_cursor`.
4. Freedom OS validates and imports the payload with the existing broker sync parser.
5. Only after a successful import does Freedom OS set `acked_cursor`.
6. The Agent does not replace an unacknowledged payload. After acknowledgement, the next MT5 query resumes from the acknowledged cursor with the Agent's existing overlap window.

This prevents an unopened phone/browser from losing a broker payload while the Windows Agent keeps running.

## Database migration

Apply:

`supabase/migrations/202608080003_broker_cloud_bridge.sql`

The migration creates `public.broker_sync_channels`, enables RLS, removes anonymous access, grants CRUD to authenticated users, and adds the standard Freedom OS `updated_at` trigger.

## Windows Agent

Agent version: `1.3.0` or newer.

Use the project-provided:

- `mt5-sync-service/Freedom-MT5-Sync-Setup.bat`
- `mt5-sync-service/Freedom-MT5-Sync-Start.bat`

The Agent polls Freedom Cloud every 20 seconds by default. `FREEDOM_CLOUD_POLL_SECONDS` may override this value with a minimum of 10 seconds.

## Pairing

Open Account Management on the Windows PC while the Agent is running. The `Freedom Sync Cloud Bridge v1` card handles pairing. The login is used once to create the Agent's own Supabase session; the password is discarded after the request.

After pairing, the Windows Agent can continue delivering MT5 payloads even when the Freedom OS browser is closed. A phone or any logged-in Freedom OS client consumes and acknowledges the next payload through Supabase.

## Custom domain

The Agent default CORS allow-list includes local development origins, the production
`https://freedom.9day.tw` origin, and `https://hy-freedom-os.pages.dev` as a deployment fallback.

If Freedom OS moves to a custom production domain, set `FREEDOM_OS_ALLOWED_ORIGINS` before starting the Agent, using a comma-separated list of trusted origins.
