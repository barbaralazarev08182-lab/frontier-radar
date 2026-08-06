/**
 * collector_state 数据访问层（阶段 1.2）。
 * 保存搜索查询状态 / ETag / Last-Modified / 最近成功时间窗口（增量采集游标）。
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface UpsertCollectorState {
  source_id: string;
  state_key: string;
  state_value: Record<string, unknown>;
  etag: string | null;
  last_modified: string | null;
  last_success_at?: string | null;
}

/** 按 (source_id, state_key) upsert 采集状态。 */
export async function upsertState(
  supabase: SupabaseClient,
  state: UpsertCollectorState
): Promise<void> {
  const { error } = await supabase.from("collector_state").upsert(
    {
      source_id: state.source_id,
      state_key: state.state_key,
      state_value: state.state_value,
      etag: state.etag,
      last_modified: state.last_modified,
      last_success_at: state.last_success_at ?? new Date().toISOString(),
    },
    { onConflict: "source_id,state_key" }
  );
  if (error) {
    throw new Error(`写入 collector_state 失败: ${error.message}`);
  }
}

/** 读取采集状态（用于条件请求 ETag / 游标）。 */
export async function getState(
  supabase: SupabaseClient,
  sourceId: string,
  stateKey: string
): Promise<{ etag: string | null; state_value: Record<string, unknown> } | null> {
  const { data, error } = await supabase
    .from("collector_state")
    .select("etag,state_value")
    .eq("source_id", sourceId)
    .eq("state_key", stateKey)
    .maybeSingle();
  if (error) {
    throw new Error(`读取 collector_state 失败: ${error.message}`);
  }
  if (!data) return null;
  return {
    etag: (data.etag as string | null) ?? null,
    state_value: (data.state_value as Record<string, unknown>) ?? {},
  };
}
