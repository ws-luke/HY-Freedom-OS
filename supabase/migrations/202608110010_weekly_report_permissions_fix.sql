-- Weekly Report Center v1 permissions fix
-- RLS controls row visibility, while PostgreSQL table grants control whether
-- the authenticated role can access the table at all. Both layers are needed.

grant select, insert, update, delete
  on table public.weekly_reports
  to authenticated;

grant select, insert, update, delete
  on table public.weekly_report_assets
  to authenticated;

grant execute
  on function public.get_public_weekly_report(text)
  to anon, authenticated;

grant execute
  on function public.is_weekly_report_asset_public(text)
  to anon, authenticated;

notify pgrst, 'reload schema';
