-- Freedom Access Control v1.1
-- Explicit API grants for projects whose public-schema default privileges do
-- not automatically expose newly created RLS-protected tables.

grant usage on schema public to authenticated;
grant select on table public.access_roles to authenticated;
grant select, update on table public.feature_flags to authenticated;
grant select, insert, delete on table public.user_feature_access to authenticated;

grant execute on function public.freedom_is_admin(uuid) to authenticated;
grant execute on function public.freedom_access_context() to authenticated;
grant execute on function public.freedom_admin_list_users() to authenticated;
grant execute on function public.freedom_admin_set_role(uuid, text) to authenticated;
grant execute on function public.freedom_admin_set_feature_access(uuid, text, boolean) to authenticated;

-- Re-assert the Freedom OS owner after upgrades or imported auth data.
insert into public.access_roles (user_id, role)
select id, 'admin'
from auth.users
where id = '09ca3c07-b969-4a0c-b33e-2f46ba03181b'::uuid
   or lower(email) = 'hirosi840101@gmail.com'
on conflict (user_id) do update set role = 'admin', updated_at = now();

notify pgrst, 'reload schema';
