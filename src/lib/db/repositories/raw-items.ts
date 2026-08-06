/**
 * raw_items 数据访问层（阶段 1.2）。
 * 原始不可变 payload；相同 (source_id, source_item_id, payload_hash) 不重复插入。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ItemType } from "@/lib/types";

export interface NewRawItem {
  source_id: string;
  source_item_id: string;
  item_type: ItemType;
  source_url: string;
  raw_payload: Record<string, unknown>;
  payload_hash: string;
  collection_run_id: string | null;
  fetched_at?: string;
}

/**
 * 插入原始记录。若 (source_id, source_item_id, payload_hash) 已存在则跳过。
 * 返回是否实际插入（false 表示未变化）。
 */
export async function insertRawItem(
  supabase: SupabaseClient,
  item: NewRawItem
): Promise<boolean> {
  const { data, error } = await supabase
    .from("raw_items")
    .upsert(
      {
        source_id: item.source_id,
        source_item_id: item.source_item_id,
        item_type: item.item_type,
        source_url: item.source_url,
        raw_payload: item.raw_payload,
        payload_hash: item.payload_hash,
        collection_run_id: item.collection_run_id,
        fetched_at: item.fetched_at ?? new Date().toISOString(),
      },
      {
        onConflict: "source_id,source_item_id,payload_hash",
        ignoreDuplicates: true, // 相同 payload 不重复插入（do nothing）
      }
    )
    .select("id")
    .maybeSingle();
  if (error) {
    throw new Error(`插入 raw_items 失败: ${error.message}`);
  }
  return data !== null;
}
