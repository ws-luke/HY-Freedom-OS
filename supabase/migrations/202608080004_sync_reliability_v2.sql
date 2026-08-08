-- Freedom Sync Reliability v2
-- Per-account heartbeat, retry and background-autostart telemetry.

alter table public.broker_sync_channels
  add column if not exists local_account_id text not null default '',
  add column if not exists last_sync_started_at timestamptz,
  add column if not exists last_sync_completed_at timestamptz,
  add column if not exists last_success_at timestamptz,
  add column if not exists next_retry_at timestamptz,
  add column if not exists consecutive_failures integer not null default 0,
  add column if not exists autostart_enabled boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'broker_sync_channels_failures_nonnegative'
      and conrelid = 'public.broker_sync_channels'::regclass
  ) then
    alter table public.broker_sync_channels
      add constraint broker_sync_channels_failures_nonnegative
      check (consecutive_failures >= 0);
  end if;
end;
$$;

create index if not exists broker_sync_channels_local_account_idx
on public.broker_sync_channels(user_id, local_account_id);

