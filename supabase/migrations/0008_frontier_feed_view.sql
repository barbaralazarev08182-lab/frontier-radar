-- ============================================================================
-- Frontier Radar · 0008_frontier_feed_view.sql
-- 阶段 1.6：只读 Feed View，供 Today / Explore 页面查询。
--
-- 设计：
--  - 组合 items + sources + 最新一条成功 ai_analyses + 最新一条指标快照；
--  - 使用 lateral join 选取"最新"记录；
--  - 没有 AI 分析、没有指标快照的 item 仍返回（LEFT JOIN）；
--  - 只选 ai_analyses.status = 'success'，不把 failed 分析当正式结果；
--  - View 只含公开数据，无任何密钥 / 用户私有信息。
-- ============================================================================

create or replace view public.frontier_feed_v1 as
select
  i.id                                   as item_id,
  s.slug                                 as source_slug,
  i.item_type                            as content_type,
  i.title                                as title,
  i.source_url                           as canonical_url,
  i.owner                                as author,
  i.description                          as description,
  i.created_at_source                    as published_at,
  i.pushed_at_source                     as updated_at,
  i.latest_score                         as latest_score,
  i.topics                               as source_tags,
  a.result                               as analysis_result,
  a.created_at                           as analysis_created_at,
  coalesce(a.result->>'summaryZh', '')   as summary_zh,
  coalesce(a.result->>'whyItMatters', '') as why_it_matters,
  coalesce(a.result->>'tags', '[]')::jsonb  as tags,
  coalesce(
    array_to_string(
      array(
        select jsonb_array_elements_text(coalesce(a.result->>'tags', '[]')::jsonb)
      ),
      ' '
    ),
    ''
  )                                      as tags_text,
  ms.metrics                             as metrics
from public.items i
join public.sources s on s.id = i.source_id
left join lateral (
  select a2.result, a2.created_at
  from public.ai_analyses a2
  where a2.item_id = i.id
    and a2.status = 'success'
  order by a2.created_at desc
  limit 1
) a on true
left join lateral (
  select jsonb_build_object(
    'stars',     ms2.stars,
    'forks',     ms2.forks,
    'downloads', ms2.downloads,
    'likes',     ms2.likes
  ) as metrics
  from public.item_metrics_snapshot ms2
  where ms2.item_id = i.id
  order by ms2.captured_at desc
  limit 1
) ms on true
where i.is_active = true;

-- 只读保障（尽力而为；不涉及 RLS 强制，页面层只做 SELECT）
grant select on public.frontier_feed_v1 to anon, authenticated, service_role;
