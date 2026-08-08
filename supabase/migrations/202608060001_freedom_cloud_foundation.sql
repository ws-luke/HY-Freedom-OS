-- Freedom Cloud Foundation v1
-- PostgreSQL / Supabase schema for user-owned trading data.

create extension if not exists pgcrypto;

create or replace function public.freedom_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  timezone text not null default 'Asia/Taipei',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trading_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  name text not null,
  provider text not null default '',
  type text not null check (type in ('prop', 'demo', 'live')),
  status text not null check (status in ('active', 'paused', 'passed', 'failed', 'closed')),
  prop_stage text check (prop_stage is null or prop_stage in ('challenge', 'verification', 'funded')),
  platform text not null default '',
  account_number text not null default '',
  data_source text not null default 'manual' check (data_source in ('manual', 'mt5')),
  broker_server text not null default '',
  broker_login text not null default '',
  sync_status text not null default 'manual' check (sync_status in ('manual', 'pending', 'connected', 'syncing', 'error')),
  last_synced_at timestamptz,
  last_sync_cursor text,
  sync_error text,
  currency text not null default 'USD',
  starting_balance numeric(20, 6) not null default 0,
  balance numeric(20, 6) not null default 0,
  equity numeric(20, 6) not null default 0,
  profit_target_percent numeric(8, 4),
  max_daily_loss_percent numeric(8, 4),
  max_drawdown_percent numeric(8, 4),
  profit_split_percent numeric(8, 4),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, local_id)
);

create table if not exists public.account_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  account_id uuid not null references public.trading_accounts(id) on delete cascade,
  type text not null check (type in ('deposit', 'withdrawal', 'payout', 'challenge-fee', 'refund', 'platform-fee', 'adjustment')),
  direction text not null check (direction in ('in', 'out')),
  occurred_on date not null,
  amount numeric(20, 6) not null check (amount >= 0),
  balance_after numeric(20, 6),
  method text not null default '',
  reference text not null default '',
  notes text not null default '',
  data_source text not null default 'manual' check (data_source in ('manual', 'mt5')),
  external_id text,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, local_id)
);

create unique index if not exists account_transactions_external_unique
on public.account_transactions(user_id, account_id, external_id)
where external_id is not null;

create table if not exists public.signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  name text not null,
  description text not null default '',
  direction text not null check (direction in ('buy', 'sell', 'both')),
  status text not null check (status in ('active', 'testing', 'paused')),
  timeframe text not null default '',
  confirmation_rules text[] not null default '{}',
  screenshot_path text,
  screenshot_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, local_id)
);

create table if not exists public.playbooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  name text not null,
  short_name text not null default '',
  description text not null default '',
  direction text not null check (direction in ('buy', 'sell', 'both')),
  status text not null check (status in ('active', 'testing', 'paused')),
  timeframe text not null default '',
  market_condition text not null default '',
  entry_conditions text[] not null default '{}',
  avoid_conditions text[] not null default '{}',
  rating smallint not null default 0 check (rating between 0 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, local_id)
);

create table if not exists public.trading_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  plan_date date not null,
  symbol text not null,
  market_bias text not null check (market_bias in ('bullish', 'bearish', 'range', 'wait')),
  h4_trend text not null default '',
  h1_trend text not null default '',
  m15_structure text not null default '',
  support_zones text not null default '',
  resistance_zones text not null default '',
  allowed_conditions text not null default '',
  prohibited_conditions text not null default '',
  waiting_signals text[] not null default '{}',
  focus_rule text not null default '',
  max_trades integer not null default 0,
  max_risk_percent numeric(8, 4) not null default 0,
  notes text not null default '',
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, local_id),
  unique (user_id, plan_date, symbol)
);

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  account_id uuid references public.trading_accounts(id) on delete set null,
  signal_id uuid references public.signals(id) on delete set null,
  playbook_id uuid references public.playbooks(id) on delete set null,
  trade_date date not null,
  trade_time time not null default '00:00',
  opened_at timestamptz,
  closed_at timestamptz,
  symbol text not null,
  direction text not null check (direction in ('buy', 'sell')),
  result text not null check (result in ('win', 'loss', 'breakeven')),
  review_status text not null check (review_status in ('waiting-review', 'reviewing', 'completed')),
  position_status text not null check (position_status in ('open', 'closed')),
  exit_reason text check (exit_reason is null or exit_reason in ('take-profit', 'stop-loss', 'manual')),
  signal_name text not null default '',
  playbook_name text not null default '',
  account_name text not null default '',
  data_source text not null default 'manual' check (data_source in ('manual', 'mt5')),
  external_id text,
  broker_deal_id text,
  broker_position_id text,
  broker_order_id text,
  commission numeric(20, 8) not null default 0,
  swap numeric(20, 8) not null default 0,
  fee numeric(20, 8) not null default 0,
  synced_at timestamptz,
  entry_price numeric(24, 10) not null default 0,
  exit_price numeric(24, 10) not null default 0,
  stop_loss numeric(24, 10) not null default 0,
  take_profit numeric(24, 10) not null default 0,
  lot_size numeric(20, 8) not null default 0,
  risk_amount numeric(20, 6) not null default 0,
  profit_loss numeric(20, 6) not null default 0,
  r_multiple numeric(16, 6) not null default 0,
  reason text not null default '',
  mistake_tags text[] not null default '{}',
  custom_mistake_tags text[] not null default '{}',
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, local_id)
);

create unique index if not exists trades_external_unique
on public.trades(user_id, account_id, data_source, external_id)
where external_id is not null;

create table if not exists public.trade_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  trade_id uuid not null references public.trades(id) on delete cascade,
  followed_plan boolean,
  followed_playbook boolean,
  respected_risk boolean,
  waited_for_confirmation boolean,
  avoided_news_risk boolean,
  emotional_control smallint not null check (emotional_control between 1 and 10),
  execution_score smallint not null check (execution_score between 1 and 10),
  strengths text not null default '',
  mistakes text not null default '',
  improvement text not null default '',
  next_trade_rule text not null default '',
  summary text not null default '',
  total_score smallint not null check (total_score between 0 and 100),
  completed_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, local_id),
  unique (user_id, trade_id)
);

create table if not exists public.trade_screenshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  trade_id uuid not null references public.trades(id) on delete cascade,
  kind text not null check (kind in ('before', 'after')),
  storage_path text not null,
  file_name text not null,
  mime_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, local_id),
  unique (user_id, storage_path)
);

create table if not exists public.daily_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  mission_date date not null,
  title text not null,
  completed boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, mission_date, local_id)
);

create table if not exists public.risk_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  max_trades_per_day integer not null default 3,
  max_daily_loss numeric(20, 6) not null default -300,
  max_consecutive_losses integer not null default 2,
  max_risk_per_trade numeric(20, 6) not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sync_tombstones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity text not null check (entity in (
    'trading_accounts', 'account_transactions', 'signals', 'playbooks',
    'trades', 'trade_reviews', 'trade_screenshots', 'daily_missions'
  )),
  local_id text not null,
  deleted_at timestamptz not null default now(),
  unique (user_id, entity, local_id)
);

create index if not exists trading_accounts_user_idx on public.trading_accounts(user_id);
create index if not exists account_transactions_user_account_idx on public.account_transactions(user_id, account_id, occurred_on desc);
create index if not exists signals_user_idx on public.signals(user_id);
create index if not exists playbooks_user_idx on public.playbooks(user_id);
create index if not exists trading_plans_user_date_idx on public.trading_plans(user_id, plan_date desc);
create index if not exists trades_user_account_date_idx on public.trades(user_id, account_id, trade_date desc);
create index if not exists trades_user_symbol_idx on public.trades(user_id, symbol);
create index if not exists trades_user_review_status_idx on public.trades(user_id, review_status);
create index if not exists trades_user_signal_idx on public.trades(user_id, signal_id);
create index if not exists trades_user_playbook_idx on public.trades(user_id, playbook_id);
create index if not exists trade_reviews_user_trade_idx on public.trade_reviews(user_id, trade_id);
create index if not exists trade_screenshots_user_trade_idx on public.trade_screenshots(user_id, trade_id);
create index if not exists daily_missions_user_date_idx on public.daily_missions(user_id, mission_date desc);
create index if not exists sync_tombstones_user_deleted_idx on public.sync_tombstones(user_id, deleted_at desc);

alter table public.profiles enable row level security;
alter table public.trading_accounts enable row level security;
alter table public.account_transactions enable row level security;
alter table public.signals enable row level security;
alter table public.playbooks enable row level security;
alter table public.trading_plans enable row level security;
alter table public.trades enable row level security;
alter table public.trade_reviews enable row level security;
alter table public.trade_screenshots enable row level security;
alter table public.daily_missions enable row level security;
alter table public.risk_settings enable row level security;
alter table public.app_settings enable row level security;
alter table public.sync_tombstones enable row level security;

drop policy if exists "Freedom owners manage profiles" on public.profiles;
create policy "Freedom owners manage profiles"
on public.profiles for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Freedom owners manage accounts" on public.trading_accounts;
create policy "Freedom owners manage accounts"
on public.trading_accounts for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Freedom owners manage transactions" on public.account_transactions;
create policy "Freedom owners manage transactions"
on public.account_transactions for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Freedom owners manage signals" on public.signals;
create policy "Freedom owners manage signals"
on public.signals for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Freedom owners manage playbooks" on public.playbooks;
create policy "Freedom owners manage playbooks"
on public.playbooks for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Freedom owners manage plans" on public.trading_plans;
create policy "Freedom owners manage plans"
on public.trading_plans for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Freedom owners manage trades" on public.trades;
create policy "Freedom owners manage trades"
on public.trades for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Freedom owners manage reviews" on public.trade_reviews;
create policy "Freedom owners manage reviews"
on public.trade_reviews for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Freedom owners manage screenshot metadata" on public.trade_screenshots;
create policy "Freedom owners manage screenshot metadata"
on public.trade_screenshots for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Freedom owners manage missions" on public.daily_missions;
create policy "Freedom owners manage missions"
on public.daily_missions for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Freedom owners manage risk settings" on public.risk_settings;
create policy "Freedom owners manage risk settings"
on public.risk_settings for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Freedom owners manage app settings" on public.app_settings;
create policy "Freedom owners manage app settings"
on public.app_settings for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Freedom owners manage sync tombstones" on public.sync_tombstones;
create policy "Freedom owners manage sync tombstones"
on public.sync_tombstones for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on public.profiles from anon;
revoke all on public.trading_accounts from anon;
revoke all on public.account_transactions from anon;
revoke all on public.signals from anon;
revoke all on public.playbooks from anon;
revoke all on public.trading_plans from anon;
revoke all on public.trades from anon;
revoke all on public.trade_reviews from anon;
revoke all on public.trade_screenshots from anon;
revoke all on public.daily_missions from anon;
revoke all on public.risk_settings from anon;
revoke all on public.app_settings from anon;
revoke all on public.sync_tombstones from anon;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.trading_accounts to authenticated;
grant select, insert, update, delete on public.account_transactions to authenticated;
grant select, insert, update, delete on public.signals to authenticated;
grant select, insert, update, delete on public.playbooks to authenticated;
grant select, insert, update, delete on public.trading_plans to authenticated;
grant select, insert, update, delete on public.trades to authenticated;
grant select, insert, update, delete on public.trade_reviews to authenticated;
grant select, insert, update, delete on public.trade_screenshots to authenticated;
grant select, insert, update, delete on public.daily_missions to authenticated;
grant select, insert, update, delete on public.risk_settings to authenticated;
grant select, insert, update, delete on public.app_settings to authenticated;
grant select, insert, update, delete on public.sync_tombstones to authenticated;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.freedom_set_updated_at();

drop trigger if exists trading_accounts_updated_at on public.trading_accounts;
create trigger trading_accounts_updated_at before update on public.trading_accounts
for each row execute function public.freedom_set_updated_at();

drop trigger if exists account_transactions_updated_at on public.account_transactions;
create trigger account_transactions_updated_at before update on public.account_transactions
for each row execute function public.freedom_set_updated_at();

drop trigger if exists signals_updated_at on public.signals;
create trigger signals_updated_at before update on public.signals
for each row execute function public.freedom_set_updated_at();

drop trigger if exists playbooks_updated_at on public.playbooks;
create trigger playbooks_updated_at before update on public.playbooks
for each row execute function public.freedom_set_updated_at();

drop trigger if exists trading_plans_updated_at on public.trading_plans;
create trigger trading_plans_updated_at before update on public.trading_plans
for each row execute function public.freedom_set_updated_at();

drop trigger if exists trades_updated_at on public.trades;
create trigger trades_updated_at before update on public.trades
for each row execute function public.freedom_set_updated_at();

drop trigger if exists trade_reviews_updated_at on public.trade_reviews;
create trigger trade_reviews_updated_at before update on public.trade_reviews
for each row execute function public.freedom_set_updated_at();

drop trigger if exists trade_screenshots_updated_at on public.trade_screenshots;
create trigger trade_screenshots_updated_at before update on public.trade_screenshots
for each row execute function public.freedom_set_updated_at();

drop trigger if exists daily_missions_updated_at on public.daily_missions;
create trigger daily_missions_updated_at before update on public.daily_missions
for each row execute function public.freedom_set_updated_at();

drop trigger if exists risk_settings_updated_at on public.risk_settings;
create trigger risk_settings_updated_at before update on public.risk_settings
for each row execute function public.freedom_set_updated_at();

drop trigger if exists app_settings_updated_at on public.app_settings;
create trigger app_settings_updated_at before update on public.app_settings
for each row execute function public.freedom_set_updated_at();

create or replace function public.freedom_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists freedom_auth_user_created on auth.users;
create trigger freedom_auth_user_created
after insert on auth.users
for each row execute function public.freedom_handle_new_user();

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'trade-screenshots',
  'trade-screenshots',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Freedom users read own screenshots" on storage.objects;
create policy "Freedom users read own screenshots"
on storage.objects for select to authenticated
using (
  bucket_id = 'trade-screenshots'
  and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
);

drop policy if exists "Freedom users upload own screenshots" on storage.objects;
create policy "Freedom users upload own screenshots"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'trade-screenshots'
  and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
);

drop policy if exists "Freedom users update own screenshots" on storage.objects;
create policy "Freedom users update own screenshots"
on storage.objects for update to authenticated
using (
  bucket_id = 'trade-screenshots'
  and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
)
with check (
  bucket_id = 'trade-screenshots'
  and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
);

drop policy if exists "Freedom users delete own screenshots" on storage.objects;
create policy "Freedom users delete own screenshots"
on storage.objects for delete to authenticated
using (
  bucket_id = 'trade-screenshots'
  and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
);
