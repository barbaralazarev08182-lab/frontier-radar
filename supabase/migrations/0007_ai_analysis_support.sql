-- ============================================================================
-- Frontier Radar · 0007_ai_analysis_support.sql
-- 阶段 1.5 AI 分析 + 基础排序支持（最小迁移）：
--   A) ai_analyses.result 允许 NULL：failed 记录保存简短错误，不编造 result
--   B) score_components.score_version：标记评分版本（basic-frontier-v1）
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A) ai_analyses.result 允许 NULL
-- ----------------------------------------------------------------------------
alter table public.ai_analyses
  alter column result drop not null;

-- ----------------------------------------------------------------------------
-- B) score_components.score_version
-- ----------------------------------------------------------------------------
alter table public.score_components
  add column if not exists score_version text;

-- 便于按版本检索评分
create index if not exists idx_score_components_version
  on public.score_components (item_id, score_version);
