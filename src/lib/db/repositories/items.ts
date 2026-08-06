/**
 * items 数据访问层（阶段 1.2）。
 * 按 (source_id, source_item_id) upsert 归一化条目。
 *
 * 重要：upsert 只写入来源提供的字段，绝不覆盖用户收藏 / 用户笔记 / AI 分析 /
 * 手动标签 / 后续生成的评分（这些列不在写入列中，Postgres 保留原值）。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NormalizedRepo } from "@/lib/collectors/github/normalize";

export interface UpsertItemResult {
  id: string;
  inserted: boolean;
}

/** 判断条目是否已存在（用于 inserted / updated 计数）。 */
export async function itemExists(
  supabase: SupabaseClient,
  sourceId: string,
  sourceItemId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("items")
    .select("id")
    .eq("source_id", sourceId)
    .eq("source_item_id", sourceItemId)
    .maybeSingle();
  if (error) {
    throw new Error(`查询 items 失败: ${error.message}`);
  }
  return data !== null;
}

/** upsert 一个归一化条目，返回 id 与是否新插入。 */
export async function upsertItem(
  supabase: SupabaseClient,
  sourceId: string,
  n: NormalizedRepo
): Promise<UpsertItemResult> {
  const existed = await itemExists(supabase, sourceId, n.sourceItemId);
  const row = {
    source_id: sourceId,
    source_item_id: n.sourceItemId,
    dedupe_key: n.dedupeKey,
    item_type: n.itemType,
    title: n.title,
    description: n.description,
    owner: n.ownerLogin,
    owner_login: n.ownerLogin,
    full_name: n.fullName,
    language: n.primaryLanguage,
    license: n.license,
    homepage: n.homepageUrl,
    source_url: n.canonicalUrl,
    external_url: n.homepageUrl,
    topics: n.topics,
    has_code: true,
    has_demo: n.hasPages === true,
    has_dataset: false,
    created_at_source: n.createdAt,
    pushed_at_source: n.pushedAt,
    repository_name: n.repositoryName,
    default_branch: n.defaultBranch,
    visibility: n.visibility,
    archived: n.archived,
    fork: n.fork,
    has_issues: n.hasIssues,
    has_discussions: n.hasDiscussions,
    has_wiki: n.hasWiki,
    has_pages: n.hasPages,
    repository_size: n.repositorySize,
    last_updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("items")
    .upsert(row, { onConflict: "source_id,source_item_id" })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(`upsert items 失败: ${error?.message ?? "未知错误"}`);
  }
  return { id: data.id as string, inserted: !existed };
}
