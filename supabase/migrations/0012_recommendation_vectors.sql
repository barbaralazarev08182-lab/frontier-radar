-- ============================================================================
-- Frontier Radar · 0012_recommendation_vectors.sql
-- 个性化推荐向量层（不依赖外部 Embedding API）。
--
-- 当前 vector_version = interest-keyword-v1：
--   - item_feature_vectors 缓存内容特征向量；
--   - user_interest_vectors 保存由用户行为聚合出的兴趣向量；
--   - 后续可无缝替换为 MiniLM / BGE 等语义 embedding，而不改反馈事件表。
-- ============================================================================

create table if not exists public.item_feature_vectors (
  item_id uuid primary key references public.items(id) on delete cascade,
  vector_version text not null,
  dimensions text[] not null,
  feature_vector real[] not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_item_feature_vectors_version
  on public.item_feature_vectors (vector_version, updated_at desc);

create table if not exists public.user_interest_vectors (
  visitor_id uuid primary key,
  vector_version text not null,
  dimensions text[] not null,
  interest_vector real[] not null,
  event_count integer not null default 0,
  positive_event_count integer not null default 0,
  negative_event_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_interest_vectors_updated
  on public.user_interest_vectors (updated_at desc);

-- 浏览器端不能直接读取或修改推荐画像；统一由服务端 service_role 使用。
revoke all on public.item_feature_vectors from anon, authenticated;
revoke all on public.user_interest_vectors from anon, authenticated;

grant select, insert, update, delete on public.item_feature_vectors to service_role;
grant select, insert, update, delete on public.user_interest_vectors to service_role;
