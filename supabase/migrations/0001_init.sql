-- ============================================================================
-- Frontier Radar · 初始 Schema · 0001_init.sql
-- 原则：
--   1. 原始数据(raw_items) 与 AI 分析(ai_analyses) 分离
--   2. 保留原始来源与链接(source_id/source_url/external_url)
--   3. 每日指标快照(item_metrics_snapshot) 支撑 24h/7d 增长
--   4. 多维评分组件(score_components) 透明可审计
--   5. 不以总 Star 数为唯一热度依据
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- sources：数据源注册表
-- ----------------------------------------------------------------------------
create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,                 -- 'github' | 'huggingface' | 'arxiv'
  name text not null,
  description text,
  base_url text,
  docs_url text,
  rate_limit_per_hour int,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- collection_runs：采集器每次执行日志（错误/重试/限流追踪）
-- ----------------------------------------------------------------------------
create table if not exists public.collection_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('running','success','partial','failed')),
  items_fetched int not null default 0,
  items_new int not null default 0,
  items_updated int not null default 0,
  error_count int not null default 0,
  error_message text,
  rate_limit_remaining int,
  rate_limit_reset_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists idx_collection_runs_source_time
  on public.collection_runs (source_id, started_at desc);

-- ----------------------------------------------------------------------------
-- raw_items：不可变原始 payload（原始数据层）
-- ----------------------------------------------------------------------------
create table if not exists public.raw_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete cascade,
  source_item_id text not null,               -- 源内原始 id
  item_type text not null,                    -- 'repo'|'model'|'dataset'|'space'|'paper'
  source_url text not null,
  raw_payload jsonb not null,                 -- 原始 API 响应，不改写
  fetched_at timestamptz not null default now(),
  collection_run_id uuid references public.collection_runs(id) on delete set null,
  unique (source_id, source_item_id)
);
create index if not exists idx_raw_items_fetched on public.raw_items (fetched_at desc);
create index if not exists idx_raw_items_source_type on public.raw_items (source_id, item_type);

-- ----------------------------------------------------------------------------
-- items：归一化去重后的规范条目（被追踪的实体）
-- ----------------------------------------------------------------------------
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete cascade,
  source_item_id text not null,
  dedupe_key text not null unique,            -- 源内规范去重键
  item_type text not null,
  title text not null,
  summary text,
  description text,
  owner text,
  full_name text,
  language text,
  license text,
  homepage text,
  source_url text not null,                   -- 原始来源链接
  external_url text,                          -- 面向用户的跳转链接
  topics text[] not null default '{}',
  has_code boolean not null default false,
  has_demo boolean not null default false,
  has_dataset boolean not null default false,
  created_at_source timestamptz,              -- 源创建时间
  pushed_at_source timestamptz,               -- 源最近更新时间
  first_seen_at timestamptz not null default now(),
  last_updated_at timestamptz not null default now(),
  latest_score numeric(5,2),                  -- 冗余的最新 Frontier Score
  is_active boolean not null default true,
  unique (source_id, source_item_id)
);
create index if not exists idx_items_type on public.items (item_type);
create index if not exists idx_items_updated on public.items (last_updated_at desc);
create index if not exists idx_items_score on public.items (latest_score desc);
create index if not exists idx_items_topics on public.items using gin (topics);

-- ----------------------------------------------------------------------------
-- item_metrics_snapshot：每日指标快照（24h / 7d 增长计算基础）
-- ----------------------------------------------------------------------------
create table if not exists public.item_metrics_snapshot (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  snapshot_date date not null,
  stars int,
  forks int,
  watchers int,
  open_issues int,
  subscribers int,
  downloads int,
  views int,
  citations int,
  likes int,
  score_raw numeric(5,2),                     -- 当日原始指标合成分（参考）
  raw_extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (item_id, snapshot_date)
);
create index if not exists idx_snapshots_date on public.item_metrics_snapshot (snapshot_date desc);
create index if not exists idx_snapshots_item on public.item_metrics_snapshot (item_id, snapshot_date desc);

-- ----------------------------------------------------------------------------
-- score_components：评分维度拆解（透明可审计）
-- ----------------------------------------------------------------------------
create table if not exists public.score_components (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  snapshot_date date not null,
  dimension text not null,                    -- 'momentum'|'velocity'|'novelty'|'relevance'|'engagement'|'accessibility'|'quality'
  raw_value numeric,
  normalized_score numeric(5,2) not null,
  weight numeric(4,3) not null,
  rationale text,
  created_at timestamptz not null default now(),
  unique (item_id, snapshot_date, dimension)
);
create index if not exists idx_score_item on public.score_components (item_id, snapshot_date desc);

-- ----------------------------------------------------------------------------
-- tags / item_tags：规范化标签
-- ----------------------------------------------------------------------------
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text,                              -- 'topic'|'domain'|'license'|'language'
  created_at timestamptz not null default now()
);
create table if not exists public.item_tags (
  item_id uuid not null references public.items(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (item_id, tag_id)
);

-- ----------------------------------------------------------------------------
-- ai_analyses：AI 分析结果（结构化 JSON，与原始数据分离）
-- ----------------------------------------------------------------------------
create table if not exists public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  analysis_type text not null,                -- 'summary'|'deep'|'idea'
  model text not null,                        -- 腾讯模型 id
  prompt_version text,
  result jsonb not null,                      -- 结构化 JSON（见 ItemAnalysisResult 契约）
  score_contribution numeric(5,2),
  tokens_used int,
  latency_ms int,
  status text not null check (status in ('success','failed')),
  error_message text,
  created_at timestamptz not null default now()
);
create index if not exists idx_ai_item on public.ai_analyses (item_id, created_at desc);
create index if not exists idx_ai_result on public.ai_analyses using gin (result);

-- ----------------------------------------------------------------------------
-- saved_items：用户收藏（Saved 页面）
-- ----------------------------------------------------------------------------
create table if not exists public.saved_items (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  note text,
  folder text,                                -- 可选分组
  saved_at timestamptz not null default now(),
  unique (item_id)
);
create index if not exists idx_saved_saved_at on public.saved_items (saved_at desc);

-- ----------------------------------------------------------------------------
-- ideas / idea_items：Idea Lab
-- ----------------------------------------------------------------------------
create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  origin text not null check (origin in ('user','ai_suggested','hybrid')),
  status text not null check (status in ('draft','exploring','archived','done')),
  ai_result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_ideas_updated on public.ideas (updated_at desc);

create table if not exists public.idea_items (
  idea_id uuid not null references public.ideas(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  relevance text,                             -- 该条目如何支撑此灵感
  primary key (idea_id, item_id)
);

-- ----------------------------------------------------------------------------
-- updated_at 触发器（sources / items / ideas）
-- ----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sources_updated on public.sources;
create trigger trg_sources_updated before update on public.sources
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_items_updated on public.items;
create trigger trg_items_updated before update on public.items
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_ideas_updated on public.ideas;
create trigger trg_ideas_updated before update on public.ideas
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 说明：RLS 策略在阶段 1.2 落地 Supabase 时按单用户最低限度配置，
-- 此迁移仅建表，不开启 RLS，避免阻塞阶段 0 类型设计与评审。
-- ----------------------------------------------------------------------------
