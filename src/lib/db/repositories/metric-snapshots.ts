/**
 * item_metrics_snapshot 数据访问层（阶段 1.2.1 加固）。
 *
 * 变更：
 *   - 唯一约束从 (item_id, snapshot_date) 改为 (item_id, collection_run_id)
 *   - 同一天多次运行产生独立快照，不再覆盖
 *   - 写入时必须提供 collection_run_id
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface NewMetricSnapshot {
  item_id: string;
  collection_run_id: string;
  snapshot_date: string; // YYYY-MM-DD（业务日，保留用于聚合查询）
  stars: number | null;
  forks: number | null;
  watchers: number | null;
  open_issues: number | null;
  subscribers: number | null;
}

/** 写入快照；每次采集运行独立一份，不覆盖历史快照。 */
export async function insertSnapshot(
  supabase: SupabaseClient,
  snap: NewMetricSnapshot
): Promise<void> {
  const { error } = await supabase
    .from("item_metrics_snapshot")
    .upsert(
      {
        item_id: snap.item_id,
        collection_run_id: snap.collection_run_id,
        snapshot_date: snap.snapshot_date,
        stars: snap.stars,
        forks: snap.forks,
        watchers: snap.watchers,
        open_issues: snap.open_issues,
        subscribers: snap.subscribers,
        captured_at: new Date().toISOString(),
      },
      { onConflict: "item_id,collection_run_id" }
    );
  if (error) {
    throw new Error(`写入 item_metrics_snapshot 失败: ${error.message}`);
  }
}
