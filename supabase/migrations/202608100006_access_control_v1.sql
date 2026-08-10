-- Freedom Access Control v1
-- Server-enforced roles, staged feature releases, and admin management RPCs.

create table if not exists public.access_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feature_flags (
  feature_key text primary key,
  label text not null,
  description text not null default '',
  release_mode text not null default 'admin'
    check (release_mode in ('disabled', 'admin', 'selected', 'everyone')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_feature_access (
  user_id uuid not null references auth.users(id) on delete cascade,
  feature_key text not null references public.feature_flags(feature_key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, feature_key)
);

create or replace function public.freedom_is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.access_roles
    where user_id = check_user_id and role = 'admin'
  );
$$;

revoke all on function public.freedom_is_admin(uuid) from public;
grant execute on function public.freedom_is_admin(uuid) to authenticated;

insert into public.access_roles (user_id, role)
select id, 'user' from auth.users
on conflict (user_id) do nothing;

-- The current Freedom OS owner becomes the initial administrator.
insert into public.access_roles (user_id, role)
select id, 'admin'
from auth.users
where id = '09ca3c07-b969-4a0c-b33e-2f46ba03181b'::uuid
   or lower(email) = 'hirosi840101@gmail.com'
on conflict (user_id) do update set role = 'admin', updated_at = now();

insert into public.feature_flags
  (feature_key, label, description, release_mode, sort_order)
values
  ('economic-calendar', '真實經濟日曆', '即時經濟事件、風險時段與交易限制提醒。', 'admin', 10),
  ('ai-coach', 'AI 教練', '交易行為分析、週報與個人化改善建議。', 'admin', 20),
  ('capital-management', '資金管理', '帳戶配置、風險預算與資金流管理。', 'admin', 30),
  ('trader-toolbox', '交易工具箱', '倉位、損益與交易輔助工具。', 'admin', 40),
  ('advanced-analytics', '進階交易分析', '多維績效、Edge Explorer 與進階統計。', 'admin', 50)
on conflict (feature_key) do update set
  label = excluded.label,
  description = excluded.description,
  sort_order = excluded.sort_order;

create or replace function public.freedom_create_access_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.access_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists freedom_auth_user_access_role on auth.users;
create trigger freedom_auth_user_access_role
after insert on auth.users
for each row execute procedure public.freedom_create_access_role();

create or replace function public.freedom_access_context()
returns table (
  user_id uuid,
  email text,
  display_name text,
  role text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  features jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.id,
    u.email::text,
    coalesce(p.display_name, ''),
    coalesce(r.role, 'user'),
    u.created_at,
    u.last_sign_in_at,
    coalesce((
      select jsonb_object_agg(
        f.feature_key,
        case
          when coalesce(r.role, 'user') = 'admin' then true
          when f.release_mode = 'everyone' then true
          when f.release_mode = 'selected' then exists (
            select 1 from public.user_feature_access a
            where a.user_id = u.id and a.feature_key = f.feature_key
          )
          else false
        end
      )
      from public.feature_flags f
    ), '{}'::jsonb)
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  left join public.access_roles r on r.user_id = u.id
  where u.id = auth.uid();
$$;

create or replace function public.freedom_admin_list_users()
returns table (
  user_id uuid,
  email text,
  display_name text,
  role text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  selected_features text[]
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.freedom_is_admin(auth.uid()) then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  return query
  select
    u.id,
    u.email::text,
    coalesce(p.display_name, ''),
    coalesce(r.role, 'user'),
    u.created_at,
    u.last_sign_in_at,
    coalesce(array_agg(a.feature_key order by a.feature_key)
      filter (where a.feature_key is not null), '{}'::text[])
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  left join public.access_roles r on r.user_id = u.id
  left join public.user_feature_access a on a.user_id = u.id
  group by u.id, u.email, p.display_name, r.role, u.created_at, u.last_sign_in_at
  order by u.created_at asc;
end;
$$;

create or replace function public.freedom_admin_set_role(target_user_id uuid, target_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.freedom_is_admin(auth.uid()) then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  if target_role not in ('admin', 'user') then
    raise exception 'INVALID_ROLE' using errcode = '22023';
  end if;
  if target_user_id = auth.uid() and target_role <> 'admin' then
    raise exception 'CANNOT_DEMOTE_SELF' using errcode = '22023';
  end if;

  insert into public.access_roles (user_id, role)
  values (target_user_id, target_role)
  on conflict (user_id) do update set role = excluded.role, updated_at = now();
end;
$$;

create or replace function public.freedom_admin_set_feature_access(
  target_user_id uuid,
  target_feature_key text,
  enabled boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.freedom_is_admin(auth.uid()) then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if enabled then
    insert into public.user_feature_access (user_id, feature_key)
    values (target_user_id, target_feature_key)
    on conflict do nothing;
  else
    delete from public.user_feature_access
    where user_id = target_user_id and feature_key = target_feature_key;
  end if;
end;
$$;

revoke all on function public.freedom_access_context() from public;
revoke all on function public.freedom_admin_list_users() from public;
revoke all on function public.freedom_admin_set_role(uuid, text) from public;
revoke all on function public.freedom_admin_set_feature_access(uuid, text, boolean) from public;
grant execute on function public.freedom_access_context() to authenticated;
grant execute on function public.freedom_admin_list_users() to authenticated;
grant execute on function public.freedom_admin_set_role(uuid, text) to authenticated;
grant execute on function public.freedom_admin_set_feature_access(uuid, text, boolean) to authenticated;

alter table public.access_roles enable row level security;
alter table public.feature_flags enable row level security;
alter table public.user_feature_access enable row level security;

drop policy if exists "Users read own access role" on public.access_roles;
create policy "Users read own access role" on public.access_roles
for select to authenticated using (user_id = auth.uid() or public.freedom_is_admin());

drop policy if exists "Authenticated read feature flags" on public.feature_flags;
create policy "Authenticated read feature flags" on public.feature_flags
for select to authenticated using (true);

drop policy if exists "Admins manage feature flags" on public.feature_flags;
create policy "Admins manage feature flags" on public.feature_flags
for all to authenticated using (public.freedom_is_admin()) with check (public.freedom_is_admin());

drop policy if exists "Users read selected feature access" on public.user_feature_access;
create policy "Users read selected feature access" on public.user_feature_access
for select to authenticated using (user_id = auth.uid() or public.freedom_is_admin());

drop policy if exists "Admins manage selected feature access" on public.user_feature_access;
create policy "Admins manage selected feature access" on public.user_feature_access
for all to authenticated using (public.freedom_is_admin()) with check (public.freedom_is_admin());

drop trigger if exists access_roles_updated_at on public.access_roles;
create trigger access_roles_updated_at before update on public.access_roles
for each row execute procedure public.freedom_set_updated_at();

drop trigger if exists feature_flags_updated_at on public.feature_flags;
create trigger feature_flags_updated_at before update on public.feature_flags
for each row execute procedure public.freedom_set_updated_at();
