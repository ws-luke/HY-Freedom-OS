-- Legend Daily Planning v3
-- Preserves the academy worksheet structure and one independent plan per day.

alter table public.trading_plans
  add column if not exists news text not null default '',
  add column if not exists session_plans jsonb not null default '{}'::jsonb,
  add column if not exists mindset_reminder text not null default '',
  add column if not exists plan_version integer not null default 3;

create index if not exists trading_plans_user_symbol_date_idx
on public.trading_plans(user_id, symbol, plan_date desc);

notify pgrst, 'reload schema';
