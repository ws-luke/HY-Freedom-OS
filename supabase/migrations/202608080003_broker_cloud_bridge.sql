-- Freedom Broker Cloud Bridge v1
-- Durable hand-off between a user-owned Windows MT5 agent and Freedom OS clients.

create table if not exists public.broker_sync_channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.trading_accounts(id) on delete cascade,
  agent_id text not null default '',
  agent_version text not null default '',
  status text not null default 'idle'
    check (status in ('idle', 'syncing', 'ready', 'error')),
  payload jsonb,
  payload_cursor text,
  acked_cursor text,
  last_error text,
  agent_last_seen timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, account_id)
);

create index if not exists broker_sync_channels_user_idx
on public.broker_sync_channels(user_id);

create index if not exists broker_sync_channels_ready_idx
on public.broker_sync_channels(user_id, status, updated_at desc);

alter table public.broker_sync_channels enable row level security;

drop policy if exists "Freedom owners manage broker bridge" on public.broker_sync_channels;
create policy "Freedom owners manage broker bridge"
on public.broker_sync_channels for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on public.broker_sync_channels from anon;
grant select, insert, update, delete on public.broker_sync_channels to authenticated;

drop trigger if exists broker_sync_channels_updated_at on public.broker_sync_channels;
create trigger broker_sync_channels_updated_at before update on public.broker_sync_channels
for each row execute function public.freedom_set_updated_at();

