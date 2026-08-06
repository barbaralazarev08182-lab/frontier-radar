/**
 * score_components 数据访问层 + items.latest_score 更新（阶段 1.5）。
 *
 * 每次评分写入：
 *  - freshness / interest_relevance / source_signal / editorial_value（有 AI 时）四个组件
 *  - total 汇总行（normalized_score = 总分，score_version 标记）
 *
 * 不覆盖用户收藏、笔记或采集数据（只写评分相关列）。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BasicScoreResult } from "@/lib/scoring/basic-score";

/** 今天（业务日按 YYYY-MM-DD，与采集器一致）。 */
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
      ? `总分 ${result.scoreVersion}`
      : `总分 ${result.scoreVersion}（临时分：无 AI 分析，不含 editorial value）`,
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
