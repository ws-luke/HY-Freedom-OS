# Freedom Sync Reliability v2

## Goal

Reliability v2 turns the Windows MT5 bridge into an unattended background component instead of a browser-adjacent manual process.

Production path remains:

`MT5 -> Windows Freedom Agent -> Supabase broker channel -> Freedom OS`

Local browser-to-Agent sync remains available as a fallback.

## Agent v1.4.0

The Windows Agent now reports and persists per-account operational state:

- agent heartbeat
- last sync start/completion
- last successful sync
- consecutive failure count
- next retry time
- background autostart state
- sanitized last error

The Agent continues processing other MT5 accounts when one account fails.

## Retry policy

The normal broker poll is 20 seconds.

Failed accounts use exponential backoff derived from the normal poll interval and capped at five minutes. During the cooldown the Agent continues updating its heartbeat so Freedom OS can distinguish "Agent offline" from "one account is retrying".

An unacknowledged broker payload is never overwritten. Heartbeat telemetry continues while the payload waits for a Freedom OS client to consume it.

## Heartbeat health

Freedom OS considers a cloud Agent stale after 90 seconds without a heartbeat. This is deliberately longer than the normal 20-second poll so brief network jitter does not produce false offline alarms.

Account Management shows health independently for every MT5-backed account.

## Windows background autostart

Run once:

`mt5-sync-service/Freedom-MT5-Sync-Install-Autostart.bat`

The installer creates a Startup shortcut for the current Windows user. It requires no Freedom OS password and does not request Administrator privileges.

At Windows sign-in a hidden VBS supervisor starts the Agent through the project's existing Python virtual environment. If the Python Agent exits unexpectedly, the supervisor waits five seconds and starts it again.

`Freedom-MT5-Sync-Setup.bat` also enables autostart automatically after dependencies are installed.

To disable future background startup:

`mt5-sync-service/Freedom-MT5-Sync-Uninstall-Autostart.bat`

The existing `Freedom-MT5-Sync-Start.bat` remains as a visible diagnostic/manual fallback.

## Database migration

Apply after the Cloud Bridge v1 migration:

`supabase/migrations/202608080004_sync_reliability_v2.sql`

The migration is additive. It does not delete broker payloads, trades, account history, or existing Cloud Bridge pairing data.

## Security

Reliability v2 does not change the credential boundary:

- MT5 Read-only credentials remain Windows DPAPI protected.
- Freedom Cloud session remains Windows DPAPI protected.
- Browser and Cloudflare never receive the MT5 password.
- Agent database access still uses the signed-in user's Supabase session and RLS.
- No Supabase elevated secret/service key is added.

