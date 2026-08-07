-- ============================================================================
-- Frontier Radar · 0014_project_entities.sql
-- Project Entity persistence layer.
--
-- Goals:
--  - Keep source-specific items unchanged as the ingestion / scoring unit.
--  - Persist cross-source project identity beside items instead of replacing it.
--  - Make one item belong to at most one project entity.
--  - Store conservative match evidence so entity resolution remains auditable.
--  - Keep all tables server-only; Today can continue using runtime clustering
--    until the materialized layer is populated and explicitly enabled.
-- ============================================================================

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  canonical_key text,
  primary_item_id uuid references public.items(id) on delete set null,
  canonical_homepage text,
  canonical_repo_url text,
  first_seen_at timestamptz,
  latest_seen_at timestamptz,
  source_count integer not null default 0 check (source_count >= 0),
  entity_confidence numeric(4,3) not null default 1.000
    check (entity_confidence >= 0 and entity_confidence <= 1),
  resolution_version text not null default 'runtime-cluster-v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_latest_seen
  on public.projects (latest_seen_at desc nulls last);

create index if not exists idx_projects_source_count
  on public.projects (source_count desc, latest_seen_at desc nulls last);

create index if not exists idx_projects_canonical_key
  on public.projects (canonical_key)
  where canonical_key is not null;

create table if not exists public.project_sources (
  project_id uuid not null references public.projects(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  source_url text not null,
  match_method text not null,
  match_confidence numeric(4,3) not null
    check (match_confidence >= 0 and match_confidence <= 1),
  first_seen_at timestamptz,
  latest_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, item_id),
  unique (item_id)
);

create index if not exists idx_project_sources_project
  on public.project_sources (project_id, first_seen_at asc nulls last);

create index if not exists idx_project_sources_source
  on public.project_sources (source_id, latest_seen_at desc nulls last);

-- Recompute only denormalized project rollups. Project identity / matching remains
-- application-owned so a future resolver can mark possible_match instead of being
-- forced into a database merge.
create or replace function public.refresh_project_rollup(target_project_id uuid)
returns void as $$
begin
  update public.projects p
  set
    source_count = coalesce((
      select count(distinct ps.source_id)::integer
      from public.project_sources ps
      where ps.project_id = target_project_id
    ), 0),
    first_seen_at = (
      select min(ps.first_seen_at)
      from public.project_sources ps
      where ps.project_id = target_project_id
    ),
    latest_seen_at = (
      select max(ps.latest_seen_at)
      from public.project_sources ps
      where ps.project_id = target_project_id
    ),
    updated_at = now()
  where p.id = target_project_id;
end;
$$ language plpgsql;

create or replace function public.refresh_project_rollup_trigger()
returns trigger as $$
declare
  current_project_id uuid;
  previous_project_id uuid;
begin
  current_project_id := case when tg_op = 'DELETE' then null else new.project_id end;
  previous_project_id := case when tg_op = 'INSERT' then null else old.project_id end;

  if current_project_id is not null then
    perform public.refresh_project_rollup(current_project_id);
  end if;

  if previous_project_id is not null and previous_project_id is distinct from current_project_id then
    perform public.refresh_project_rollup(previous_project_id);
  end if;

  return coalesce(new, old);
end;
$$ language plpgsql;

drop trigger if exists trg_project_sources_rollup on public.project_sources;
create trigger trg_project_sources_rollup
  after insert or update or delete on public.project_sources
  for each row execute function public.refresh_project_rollup_trigger();

-- Project intelligence is server-owned for now. Do not expose entity tables to
-- anonymous browser clients until the read contract and RLS policy are deliberate.
revoke all on public.projects from anon, authenticated;
revoke all on public.project_sources from anon, authenticated;

grant select, insert, update, delete on public.projects to service_role;
grant select, insert, update, delete on public.project_sources to service_role;
