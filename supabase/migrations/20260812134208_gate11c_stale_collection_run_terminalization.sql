-- Gate 11C: terminalize orphaned collection runs after a conservative timeout.
-- Any new collection run sweeps stale running rows globally, so a disabled source
-- does not depend on its own next run to recover.

create or replace function public.terminalize_stale_collection_runs()
returns trigger
language plpgsql
security invoker
set search_path to pg_catalog
as $$
begin
  update public.collection_runs
  set
    status = 'failed',
    finished_at = coalesce(finished_at, now()),
    error_count = greatest(coalesce(error_count, 0), 1),
    error_message = coalesce(
      nullif(error_message, ''),
      'Automatically terminalized: collection run remained running for more than 1 hour.'
    ),
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'terminalized_reason', 'stale_running_timeout',
      'terminalized_at', now()
    )
  where status = 'running'
    and started_at < coalesce(new.started_at, now()) - interval '1 hour';

  return new;
end;
$$;

revoke execute on function public.terminalize_stale_collection_runs() from public, anon, authenticated;

drop trigger if exists trg_terminalize_stale_collection_runs on public.collection_runs;
create trigger trg_terminalize_stale_collection_runs
before insert on public.collection_runs
for each row
execute function public.terminalize_stale_collection_runs();

-- One-time repair of rows already orphaned before this trigger existed.
update public.collection_runs
set
  status = 'failed',
  finished_at = coalesce(finished_at, now()),
  error_count = greatest(coalesce(error_count, 0), 1),
  error_message = coalesce(
    nullif(error_message, ''),
    'Automatically terminalized: collection run remained running for more than 1 hour.'
  ),
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'terminalized_reason', 'stale_running_timeout',
    'terminalized_at', now()
  )
where status = 'running'
  and started_at < now() - interval '1 hour';