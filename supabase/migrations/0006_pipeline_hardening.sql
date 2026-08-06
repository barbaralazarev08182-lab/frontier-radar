-- ============================================================================
-- Frontier Radar · 0006_pipeline_hardening.sql
-- 阶段 1.2.1 管线加固：
--   A) 指标快照关联采集运行（支持同日多次运行）
--   B) 新建 item_documents 表（README 等附属文档独立存储）
--   C) README 从 raw_items 伪条目迁移到 item_documents
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A) item_metrics_snapshot：关联 collection_run + 放开日级唯一约束
-- ----------------------------------------------------------------------------

-- A1. 新增 collection_run_id 外键（指向 collection_runs，级联置空）
alter table public.item_metrics_snapshot
  add column if not exists collection_run_id uuid
    references public.collection_runs(id) on delete set null;

-- A2. captured_at 已在 0001 后续隐含使用（TS 类型已有），确保列存在
alter table public.item_metrics_snapshot
  alter column captured_at drop default,
  alter column captured_at set not null,
  alter column captured_at drop expression if exists;

-- A3. 删除旧唯一约束 (item_id, snapshot_date)
-- 注意：PostgreSQL 自动生成的约束名格式为
--   ${table}_${col1}_${col2}_key（来自 unique() 定义）
alter table public.item_metrics_snapshot
  drop constraint if exists item_metrics_snapshot_item_id_snapshot_date_key;

-- A4. 建立新幂等约束：(item_id, collection_run_id)
--     同一次运行内同一 item 只有一份快照；不同运行产生独立快照
alter table public.item_metrics_snapshot
  add constraint item_metrics_snapshot_run_unique
    unique (item_id, collection_run_id);

-- A5. 新增组合索引：(item_id, captured_at desc)
--     用于按 item 查询最新快照、时间线回溯
create index if not exists idx_snapshots_item_captured
  on public.item_metrics_snapshot (item_id, captured_at desc);

-- A6. 保留 snapshot_date 作为普通字段（方便日级聚合查询），不加唯一/索引
--     （已有 idx_snapshots_date 覆盖按日期扫描场景）

-- ----------------------------------------------------------------------------
-- B) item_documents：通用附属文档表
--     存放 README / model_card / dataset_card / paper_abstract 等
-- ----------------------------------------------------------------------------
create table if not exists public.item_documents (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  document_type text not null,                  -- 'readme' | 'model_card' | 'dataset_card' | ...
  source_url text,
  source_revision text,                         -- git SHA / version 标识
  content_text text,                            -- 纯文本内容（可截断）
  content_hash text not null,                   -- SHA-256 hex（去重依据）
  etag text,                                    -- HTTP ETag（条件请求用）
  last_modified timestamptz,                    -- HTTP Last-Modified
  original_size int not null default 0,         -- 原始字节长度
  stored_size int not null default 0,           -- 实际存储字节长度
  is_truncated boolean not null default false,  -- 是否被截断
  encoding text not null default 'utf-8',       -- 字符编码
  metadata jsonb not null default '{}'::jsonb,  -- 扩展元数据
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- B1. 唯一约束：相同内容不重复写入；(item_id, document_type, content_hash)
create unique index if not exists idx_item_documents_unique_content
  on public.item_documents (item_id, document_type, content_hash);

-- B2. 按 item_id 查找最新文档版本
create index if not exists idx_item_documents_item_type
  on public.item_documents (item_id, document_type, fetched_at desc);

-- B3. 按 content_hash 反查（去重检测用）
create index if not exists idx_item_documents_content_hash
  on public.item_documents (content_hash);

-- B4. updated_at 触发器
drop trigger if exists trg_item_documents_updated on public.item_documents;
create trigger trg_item_documents_updated before update on public.item_documents
  for each row execute function public.touch_updated_at();
