-- Gate 11B-C1: make browser-facing database access explicit and opt-in.
-- The application currently uses server-side service-role access for public data reads/writes.

revoke all privileges on all tables in schema public from anon, authenticated;
revoke all privileges on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from anon, authenticated, public;

-- Preserve the server role's pre-existing effective access to trigger helpers.
grant execute on function public.touch_updated_at() to service_role;
grant execute on function public.touch_items_last_updated_at() to service_role;

-- Prevent postgres-owned future objects from reintroducing browser-role grants implicitly.
alter default privileges for role postgres in schema public
  revoke all privileges on tables from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all privileges on sequences from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, public;
