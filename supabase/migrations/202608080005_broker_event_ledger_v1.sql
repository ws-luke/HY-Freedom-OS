-- Freedom Broker Event Ledger v1
-- Durable 24/7 broker source-of-truth written by the user-owned MT5 Agent.

create table if not exists public.broker_account_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.trading_accounts(id) on delete cascade,
  local_account_id text not null,
  broker_login text not null default '',
  broker_server text not null default '',
  provider text not null default 'mt5' check (provider = 'mt5'),
  payload jsonb not null default '{}'::jsonb,
  sync_cursor text,
  captured_at timestamptz not null default now(),
  agent_id text not null default '',
  agent_version text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, account_id)
);

create table if not exists public.broker_trade_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.trading_accounts(id) on delete cascade,
  local_account_id text not null,
  provider text not null default 'mt5' check (provider = 'mt5'),
  external_id text not null,
  position_id text,
  position_status text not null check (position_status in ('open', 'closed')),
  opened_at timestamptz not null,
  closed_at timestamptz,
  payload jsonb not null,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, account_id, external_id)
);

create table if not exists public.broker_cashflow_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.trading_accounts(id) on delete cascade,
  local_account_id text not null,
  provider text not null default 'mt5' check (provider = 'mt5'),
  external_id text not null,
  occurred_at timestamptz not null,
  payload jsonb not null,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, account_id, external_id)
);

create index if not exists broker_account_snapshots_user_idx
on public.broker_account_snapshots(user_id, captured_at desc);

create index if not exists broker_trade_ledger_account_idx
on public.broker_trade_ledger(user_id, account_id, updated_at desc);

create index if not exists broker_trade_ledger_review_source_idx
on public.broker_trade_ledger(user_id, local_account_id, updated_at desc);

create index if not exists broker_cashflow_ledger_account_idx
on public.broker_cashflow_ledger(user_id, account_id, updated_at desc);

alter table public.broker_account_snapshots enable row level security;
alter table public.broker_trade_ledger enable row level security;
alter table public.broker_cashflow_ledger enable row level security;

drop policy if exists "Freedom owners manage broker snapshots" on public.broker_account_snapshots;
create policy "Freedom owners manage broker snapshots"
on public.broker_account_snapshots for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Freedom owners manage broker trade ledger" on public.broker_trade_ledger;
create policy "Freedom owners manage broker trade ledger"
on public.broker_trade_ledger for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Freedom owners manage broker cashflow ledger" on public.broker_cashflow_ledger;
create policy "Freedom owners manage broker cashflow ledger"
on public.broker_cashflow_ledger for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on public.broker_account_snapshots from anon;
revoke all on public.broker_trade_ledger from anon;
revoke all on public.broker_cashflow_ledger from anon;

grant select, insert, update, delete on public.broker_account_snapshots to authenticated;
grant select, insert, update, delete on public.broker_trade_ledger to authenticated;
grant select, insert, update, delete on public.broker_cashflow_ledger to authenticated;

drop trigger if exists broker_account_snapshots_updated_at on public.broker_account_snapshots;
create trigger broker_account_snapshots_updated_at before update on public.broker_account_snapshots
for each row execute function public.freedom_set_updated_at();

drop trigger if exists broker_trade_ledger_updated_at on public.broker_trade_ledger;
create trigger broker_trade_ledger_updated_at before update on public.broker_trade_ledger
for each row execute function public.freedom_set_updated_at();

drop trigger if exists broker_cashflow_ledger_updated_at on public.broker_cashflow_ledger;
create trigger broker_cashflow_ledger_updated_at before update on public.broker_cashflow_ledger
for each row execute function public.freedom_set_updated_at();

