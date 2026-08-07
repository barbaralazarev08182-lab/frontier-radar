-- ============================================================================
-- Frontier Radar · 0013_semantic_recommendation.sql
-- 真正语义 Embedding 层（离线生成，线上只读取，不增加用户访问时的模型/API 成本）。
--
-- 当前推荐模型：intfloat/multilingual-e5-small（384 维，适合中英混合内容）。
-- 这里先使用 real[] 存储，候选页仅几十条，应用层计算 cosine 足够；
-- 后续用户/内容规模扩大后可无缝迁移到 pgvector ANN 索引。
-- ============================================================================

create table if not exists public.item_semantic_embeddings (
  item_id uuid primary key references public.items(id) on delete cascade,
  model text not null,
  dimensions integer not null check (dimensions > 0),
  content_hash text not null,
  embedding real[] not null,
  updated_at timestamptz not null default now(),
  constraint item_semantic_embeddings_dimensions_match
    check (array_length(embedding, 1) = dimensions)
);

create index if not exists idx_item_semantic_embeddings_model
  on public.item_semantic_embeddings (model, updated_at desc);

create table if not exists public.user_semantic_profiles (
  visitor_id uuid primary key,
  model text not null,
  dimensions integer not null check (dimensions > 0),
  embedding real[] not null,
  event_count integer not null default 0,
  positive_event_count integer not null default 0,
  negative_event_count integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint user_semantic_profiles_dimensions_match
    check (array_length(embedding, 1) = dimensions)
);

create index if not exists idx_user_semantic_profiles_model
  on public.user_semantic_profiles (model, updated_at desc);

-- 推荐训练数据视图：把行为标签与内容特征统一成可导出的训练样本。
create or replace view public.recommendation_training_v1 as
select
  e.id as event_id,
  e.visitor_id,
  e.item_id,
  e.event_type,
  e.dwell_ms,
  e.created_at as event_created_at,
  case e.event_type
    when 'interested' then 1.0
    when 'open_source' then 0.75
    when 'open_detail' then 0.50
    when 'dwell' then least(0.50, greatest(0.0, coalesce(e.dwell_ms, 0)::numeric / 60000.0))
    when 'not_interested' then -1.0
    else 0.0
  end::numeric as target_weight,
  s.slug as source_slug,
  i.item_type as content_type,
  i.title,
  i.description,
  i.topics,
  i.latest_score,
  i.created_at_source,
  i.pushed_at_source
from public.user_events e
join public.items i on i.id = e.item_id
join public.sources s on s.id = i.source_id;

-- 浏览器不能直接读取用户画像/训练数据；仅服务端 service_role 使用。
revoke all on public.item_semantic_embeddings from anon, authenticated;
revoke all on public.user_semantic_profiles from anon, authenticated;
revoke all on public.recommendation_training_v1 from anon, authenticated;

grant select, insert, update, delete on public.item_semantic_embeddings to service_role;
grant select, insert, update, delete on public.user_semantic_profiles to service_role;
grant select on public.recommendation_training_v1 to service_role;
