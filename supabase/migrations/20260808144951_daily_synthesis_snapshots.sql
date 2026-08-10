create table if not exists public.daily_synthesis_snapshots (
  id uuid primary key default gen_random_uuid(),
  edition_date date not null,
  selection_hash text not null,
  signal_ids text[] not null,
  provider text not null,
  model text not null,
  prompt_version text not null,
  schema_version text not null default 'daily-synthesis-v1',
  payload jsonb,
  status text not null default 'success',
  error_message text,
  token_usage integer,
  latency_ms integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_synthesis_signal_count check (cardinality(signal_ids) between 1 and 7),
  constraint daily_synthesis_status check (status in ('success', 'failed')),
  constraint daily_synthesis_payload_status check (
    (status = 'success' and payload is not null and error_message is null)
    or (status = 'failed' and payload is null)
  ),
  constraint daily_synthesis_unique_selection unique (edition_date, selection_hash, prompt_version)
);

create index if not exists idx_daily_synthesis_lookup
  on public.daily_synthesis_snapshots (edition_date desc, selection_hash, created_at desc);

create index if not exists idx_daily_synthesis_status
  on public.daily_synthesis_snapshots (status, created_at desc);

grant select, insert, update on public.daily_synthesis_snapshots to service_role;
