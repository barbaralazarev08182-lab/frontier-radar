-- ============================================================================
-- Frontier Radar · 0003_collector_state.sql
-- 采集器增量状态（ETag / Last-Modified / 成功时间窗口 / 游标）
-- 用于以后条件请求与增量采集，不改写 0001。
-- ============================================================================

create table if not exists public.collector_state (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete cascade,
  state_key text not null,
  state_value jsonb not null default '{}'::jsonb,
  etag text,
  last_modified timestamptz,
  last_success_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, state_key)
);
create index if not exists idx_collector_state_source on public.collector_state (source_id);

drop trigger if exists trg_collector_state_updated on public.collector_state;
create trigger trg_collector_state_updated before update on public.collector_state
  for each row execute function public.touch_updated_at();
