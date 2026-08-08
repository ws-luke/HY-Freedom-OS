-- Freedom Cloud Sync v2
-- Durable deletion markers for safe multi-device synchronization.

create table if not exists public.sync_tombstones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity text not null check (entity in (
    'trading_accounts',
    'account_transactions',
    'signals',
    'playbooks',
    'trades',
    'trade_reviews',
    'trade_screenshots',
    'daily_missions'
  )),
  local_id text not null,
  deleted_at timestamptz not null default now(),
  unique (user_id, entity, local_id)
);

create index if not exists sync_tombstones_user_deleted_idx
on public.sync_tombstones(user_id, deleted_at desc);

alter table public.sync_tombstones enable row level security;

drop policy if exists "Freedom owners manage sync tombstones" on public.sync_tombstones;
create policy "Freedom owners manage sync tombstones"
on public.sync_tombstones for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on public.sync_tombstones from anon;
grant select, insert, update, delete on public.sync_tombstones to authenticated;
