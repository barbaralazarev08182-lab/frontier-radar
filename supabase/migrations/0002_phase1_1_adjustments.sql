-- ============================================================================
-- Frontier Radar · 增量迁移 0002 · 阶段 1.1 Schema 补充
-- 原则：只 ADD / RENAME / INDEX，不重写 0001 已建结构。
-- 对应阶段 1.1 「开始前的 Schema 补充检查」第 2/3/5 项。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- (2) raw_items.payload_hash：原始 payload 指纹，用于判断是否变化、避免无谓重写
-- ----------------------------------------------------------------------------
alter table public.raw_items
  add column if not exists payload_hash text;

create index if not exists idx_raw_items_payload_hash
  on public.raw_items (payload_hash);

-- ----------------------------------------------------------------------------
-- (3) item_metrics_snapshot.captured_at + (item_id, captured_at) 索引
--     captured_at = 实际抓取时间戳；snapshot_date 仍为业务日（Asia/Shanghai）
-- ----------------------------------------------------------------------------
alter table public.item_metrics_snapshot
  add column if not exists captured_at timestamptz not null default now();

create index if not exists idx_snapshots_item_captured
  on public.item_metrics_snapshot (item_id, captured_at desc);

-- ----------------------------------------------------------------------------
-- (5) ai_analyses：补 provider / schema_version / input_hash / estimated_cost
--     并将 tokens_used 统一命名为 token_usage
-- ----------------------------------------------------------------------------
alter table public.ai_analyses
  add column if not exists provider text,
  add column if not exists schema_version text,
  add column if not exists input_hash text,
  add column if not exists estimated_cost numeric(10,6);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ai_analyses'
      and column_name = 'tokens_used'
  ) then
    alter table public.ai_analyses rename column tokens_used to token_usage;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 说明（对应检查项 7 / 8，无需 DDL，仅记录口径）：
--   7. 不同数据源缺不同指标 —— 各 metrics 字段均 nullable，多余/源特有指标入 raw_extra jsonb，
--      评分引擎按可用指标归一化，缺失按冷启动中性处理（见 docs/SCORING.md）。
--   8. GitHub / Hugging Face / arXiv 热度字段不强求一致 —— stars/likes/downloads/citations
--      各自可空，主指标按 item_type 选择，由评分层映射，schema 不强制齐平。
-- ----------------------------------------------------------------------------
