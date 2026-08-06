-- ============================================================================
-- Frontier Radar · 0004_github_items_runs.sql
-- 阶段 1.2 GitHub 采集器：扩展 items 承载仓库归一化字段，扩展 collection_runs
-- 承载运行统计。不改写旧迁移；缺失字段统一用 null，禁止编造默认值。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- items：新增 GitHub 仓库专属归一化字段（跨源通用列 title/owner/full_name/
-- language/license/homepage/topics/source_url/external_url/created_at_source/
-- pushed_at_source 已在 0001 中，这里补充仓库特有的结构化字段）
-- ----------------------------------------------------------------------------
alter table public.items
  add column if not exists owner_login text,
  add column if not exists repository_name text,
  add column if not exists default_branch text,
  add column if not exists visibility text,
  add column if not exists archived boolean,
  add column if not exists fork boolean,
  add column if not exists has_issues boolean,
  add column if not exists has_discussions boolean,
  add column if not exists has_wiki boolean,
  add column if not exists has_pages boolean,
  add column if not exists repository_size integer;

-- ----------------------------------------------------------------------------
-- collection_runs：新增运行统计列（与 0001 的 items_fetched/items_new/
-- items_updated 并存，便于审计与向后兼容）
-- ----------------------------------------------------------------------------
alter table public.collection_runs
  add column if not exists discovered_count int not null default 0,
  add column if not exists deduplicated_count int not null default 0,
  add column if not exists inserted_count int not null default 0,
  add column if not exists updated_count int not null default 0,
  add column if not exists unchanged_count int not null default 0,
  add column if not exists snapshot_count int not null default 0,
  add column if not exists request_count int not null default 0;
