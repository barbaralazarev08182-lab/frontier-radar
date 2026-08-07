-- ============================================================================
-- Frontier Radar · 0015_harden_project_entities.sql
-- Security/performance follow-up for persistent Project Entity tables.
-- ============================================================================

-- Cover the foreign key used when resolving a project's selected primary item.
create index if not exists idx_projects_primary_item
  on public.projects (primary_item_id)
  where primary_item_id is not null;

-- Pin function resolution so callers cannot influence object lookup through a
-- mutable search_path. These functions are internal rollup helpers only.
alter function public.refresh_project_rollup(uuid)
  set search_path = pg_catalog, public;

alter function public.refresh_project_rollup_trigger()
  set search_path = pg_catalog, public;

-- They are invoked internally by the service role / trigger and are not public
-- RPC endpoints.
revoke execute on function public.refresh_project_rollup(uuid) from public, anon, authenticated;
revoke execute on function public.refresh_project_rollup_trigger() from public, anon, authenticated;

grant execute on function public.refresh_project_rollup(uuid) to service_role;
grant execute on function public.refresh_project_rollup_trigger() to service_role;
