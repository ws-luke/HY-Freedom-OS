-- Freedom OS Weekly Report Sharing v1
-- Owner data stays private. Anonymous visitors can only resolve a published,
-- unexpired snapshot through the security-definer token function.

create table if not exists public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  title text not null,
  share_token uuid not null default gen_random_uuid() unique,
  is_published boolean not null default true,
  expires_at timestamptz,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  snapshot jsonb not null,
  constraint weekly_reports_date_order check (week_end >= week_start)
);

create index if not exists weekly_reports_owner_week_idx
  on public.weekly_reports(user_id, week_start desc);
create index if not exists weekly_reports_public_token_idx
  on public.weekly_reports(share_token)
  where is_published = true;

alter table public.weekly_reports enable row level security;

drop policy if exists "weekly_reports_owner_select" on public.weekly_reports;
create policy "weekly_reports_owner_select" on public.weekly_reports
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "weekly_reports_owner_insert" on public.weekly_reports;
create policy "weekly_reports_owner_insert" on public.weekly_reports
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "weekly_reports_owner_update" on public.weekly_reports;
create policy "weekly_reports_owner_update" on public.weekly_reports
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "weekly_reports_owner_delete" on public.weekly_reports;
create policy "weekly_reports_owner_delete" on public.weekly_reports
  for delete to authenticated using (auth.uid() = user_id);

create table if not exists public.weekly_report_assets (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.weekly_reports(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now(),
  unique(report_id, storage_path)
);

create index if not exists weekly_report_assets_path_idx
  on public.weekly_report_assets(storage_path);
alter table public.weekly_report_assets enable row level security;

drop policy if exists "weekly_report_assets_owner_all" on public.weekly_report_assets;
create policy "weekly_report_assets_owner_all" on public.weekly_report_assets
  for all to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id and exists (
      select 1 from public.weekly_reports report
      where report.id = report_id and report.user_id = auth.uid()
    )
  );

create or replace function public.get_public_weekly_report(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'title', report.title,
    'publishedAt', report.published_at,
    'expiresAt', report.expires_at,
    'snapshot', report.snapshot
  )
  from public.weekly_reports report
  where report.share_token::text = p_token
    and report.is_published = true
    and (report.expires_at is null or report.expires_at > now())
  limit 1;
$$;

revoke all on function public.get_public_weekly_report(text) from public;
grant execute on function public.get_public_weekly_report(text) to anon, authenticated;

create or replace function public.is_weekly_report_asset_public(p_path text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.weekly_report_assets asset
    join public.weekly_reports report on report.id = asset.report_id
    where asset.storage_path = p_path
      and report.is_published = true
      and (report.expires_at is null or report.expires_at > now())
  );
$$;

revoke all on function public.is_weekly_report_asset_public(text) from public;
grant execute on function public.is_weekly_report_asset_public(text) to anon, authenticated;

-- A private screenshot becomes anonymously readable only while an active,
-- unexpired report explicitly references that exact object path.
drop policy if exists "weekly_report_public_screenshot_read" on storage.objects;
create policy "weekly_report_public_screenshot_read" on storage.objects
  for select to anon
  using (
    bucket_id = 'trade-screenshots'
    and public.is_weekly_report_asset_public(name)
  );

notify pgrst, 'reload schema';
