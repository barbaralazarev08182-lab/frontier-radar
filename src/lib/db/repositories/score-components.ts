/**
 * score_components 数据访问层 + items.latest_score 更新。
 *
 * Discovery Score v3 会把各个公开评分维度逐项写入 score_components，
 * 再写一条 total 汇总行。无 AI 时仍然使用项目元数据与启发式信号生成完整分；
 * AI 只会增强 Novelty / Idea Spark 等维度，不再决定“有没有正式分”。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BasicScoreResult } from "@/lib/scoring/basic-score";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 写入全部评分组件 + total 行，并更新 items.latest_score。 */
export async function upsertBasicScore(
  supabase: SupabaseClient,
  itemId: string,
  result: BasicScoreResult
): Promise<void> {
  const snapshotDate = today();
  const rows = result.components.map((c) => ({
    item_id: itemId,
    snapshot_date: snapshotDate,
    dimension: c.dimension,
    raw_value: c.rawValue,
    normalized_score: c.normalizedScore,
    weight: c.weight,
    rationale: c.rationale,
    score_version: result.scoreVersion,
  }));
  rows.push({
    item_id: itemId,
    snapshot_date: snapshotDate,
    dimension: "total",
    raw_value: null,
    normalized_score: result.total,
    weight: 1,
    rationale: result.hasAi
      ? `总分 ${result.scoreVersion} · 已使用缓存 AI 分析增强 Novelty / Idea Spark`
      : `总分 ${result.scoreVersion} · 无 AI，使用项目与增长信号完整评分`,
    score_version: result.scoreVersion,
  });

  const { error } = await supabase
    .from("score_components")
    .upsert(rows, { onConflict: "item_id,snapshot_date,dimension" });
  if (error) {
    throw new Error(`写入 score_components 失败: ${error.message}`);
  }
}

/** 更新 items.latest_score（仅评分列，不触碰用户数据）。 */
export async function updateLatestScore(
  supabase: SupabaseClient,
  itemId: string,
  total: number
): Promise<void> {
  const { error } = await supabase
    .from("items")
    .update({ latest_score: total })
    .eq("id", itemId);
  if (error) {
    throw new Error(`更新 items.latest_score 失败: ${error.message}`);
  }
}
