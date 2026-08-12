-- Gate 11B-A: Function / Privilege Hardening
-- Keep the RLS event trigger internal-only and pin trigger-function search paths.

revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.rls_auto_enable() from anon, authenticated;

alter function public.touch_updated_at()
  set search_path to pg_catalog;

alter function public.touch_items_last_updated_at()
  set search_path to pg_catalog;
