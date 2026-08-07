/**
 * item_metrics_snapshot 数据访问层。
 *
 * 每次采集运行写一份独立快照，供 Momentum / Rising 计算使用。
 * GitHub 主要使用 stars / forks；Hugging Face 使用 downloads / likes；
 * 其他来源可通过 score_raw / raw_extra 保存来源特有的公开互动信号。
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface NewMetricSnapshot {
  item_id: string;
  collection_run_id: string;
  snapshot_date: string;
  stars: number | null;
  forks: number | null;
  watchers: number | null;
  open_issues: number | null;
  subscribers: number | null;
  downloads?: number | null;
  likes?: number | null;
  views?: number | null;
  citations?: number | null;
  score_raw?: number | null;
  raw_extra?: Record<string, unknown>;
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
        downloads: snap.downloads ?? null,
        likes: snap.likes ?? null,
        views: snap.views ?? null,
        citations: snap.citations ?? null,
        score_raw: snap.score_raw ?? null,
        raw_extra: snap.raw_extra ?? {},
        captured_at: new Date().toISOString(),
      },
      { onConflict: "item_id,collection_run_id" }
    );
  if (error) {
    throw new Error(`写入 item_metrics_snapshot 失败: ${error.message}`);
  }
}
