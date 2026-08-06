/**
 * collection_runs 数据访问层（阶段 1.2）。
 * 仅封装 Supabase 操作，不持有任何 GitHub HTTP 逻辑。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RunStatus, SourceSlug } from "@/lib/types";
import { ensureSourceId } from "./sources";

export interface RunStats {
  discovered_count: number;
  deduplicated_count: number;
  inserted_count: number;
  updated_count: number;
  unchanged_count: number;
  snapshot_count: number;
  error_count: number;
  request_count: number;
}

export interface FinishRunPatch {
  status: RunStatus;
  stats: RunStats;
  rate_limit_remaining: number | null;
  rate_limit_reset_at: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
}

/**
 * 创建一条 running 状态的采集运行，返回其 id。
 * 注意：collection_runs.source_id 是 sources 的 uuid 外键，
 * 入参传 source slug（如 "arxiv"），此处先解析为 sources.id。
 */
export async function createRun(
  supabase: SupabaseClient,
  sourceSlug: string
): Promise<string> {
  const sourceId = await ensureSourceId(supabase, sourceSlug as SourceSlug);
  const { data, error } = await supabase
    .from("collection_runs")
    .insert({
      source_id: sourceId,
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(`创建 collection_runs 失败: ${error?.message ?? "未知错误"}`);
  }
  return data.id as string;
}

/** 结束采集运行：写入状态、统计与限流信息。 */
export async function finishRun(
  supabase: SupabaseClient,
  runId: string,
  patch: FinishRunPatch
): Promise<void> {
  const { error } = await supabase
    .from("collection_runs")
    .update({
      status: patch.status,
      finished_at: new Date().toISOString(),
      discovered_count: patch.stats.discovered_count,
      deduplicated_count: patch.stats.deduplicated_count,
      inserted_count: patch.stats.inserted_count,
      updated_count: patch.stats.updated_count,
      unchanged_count: patch.stats.unchanged_count,
      snapshot_count: patch.stats.snapshot_count,
      error_count: patch.stats.error_count,
      request_count: patch.stats.request_count,
      rate_limit_remaining: patch.rate_limit_remaining,
      rate_limit_reset_at: patch.rate_limit_reset_at,
      error_message: patch.error_message,
      metadata: patch.metadata,
      // 向后兼容 0001 字段
      items_fetched: patch.stats.discovered_count,
      items_new: patch.stats.inserted_count,
      items_updated: patch.stats.updated_count,
    })
    .eq("id", runId);
  if (error) {
    throw new Error(`更新 collection_runs 失败: ${error.message}`);
  }
}
