-- Frontier Radar · AI-COST-02 · Cost observability
-- Additive telemetry only. No existing analysis rows are rewritten.

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null unique references public.ai_analyses(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  source text not null,
  provider text not null,
  model text not null,
  prompt_tokens int,
  completion_tokens int,
  total_tokens int,
  model_call_count smallint not null default 1,
  repair_count smallint not null default 0,
  created_at timestamptz not null default now(),
  constraint ai_usage_prompt_tokens_nonnegative check (prompt_tokens is null or prompt_tokens >= 0),
  constraint ai_usage_completion_tokens_nonnegative check (completion_tokens is null or completion_tokens >= 0),
  constraint ai_usage_total_tokens_nonnegative check (total_tokens is null or total_tokens >= 0),
  constraint ai_usage_model_call_count_positive check (model_call_count >= 1),
  constraint ai_usage_repair_count_nonnegative check (repair_count >= 0)
);

create index if not exists idx_ai_usage_created_at
  on public.ai_usage_events (created_at desc);
create index if not exists idx_ai_usage_source_created_at
  on public.ai_usage_events (source, created_at desc);
create index if not exists idx_ai_usage_model_created_at
  on public.ai_usage_events (model, created_at desc);

alter table public.ai_usage_events enable row level security;
revoke all on table public.ai_usage_events from anon, authenticated;
grant select, insert on table public.ai_usage_events to service_role;
