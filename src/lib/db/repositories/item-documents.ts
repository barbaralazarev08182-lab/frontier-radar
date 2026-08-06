/**
 * item_documents 数据访问层（阶段 1.2.1 新增）。
 *
 * 存储条目附属文档（README / model_card / dataset_card 等）。
 * 唯一约束：(item_id, document_type, content_hash) — 相同内容不重复写入。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DocumentType } from "@/lib/types";

export interface NewItemDocument {
  item_id: string;
  document_type: DocumentType;
  source_url: string | null;
  source_revision: string | null;
  content_text: string | null;
  content_hash: string;
  etag: string | null;
  last_modified: string | null;
  original_size: number;
  stored_size: number;
  is_truncated: boolean;
  encoding?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 插入或跳过（内容 hash 冲突时 onConflict do nothing）。
 * 返回是否实际插入了新行。
 */
export async function insertDocument(
  supabase: SupabaseClient,
  doc: NewItemDocument
): Promise<boolean> {
  const { error, status } = await supabase
    .from("item_documents")
    .upsert(
      {
        item_id: doc.item_id,
        document_type: doc.document_type,
        source_url: doc.source_url,
        source_revision: doc.source_revision,
        content_text: doc.content_text,
        content_hash: doc.content_hash,
        etag: doc.etag,
        last_modified: doc.last_modified,
        original_size: doc.original_size,
        stored_size: doc.stored_size,
        is_truncated: doc.is_truncated,
        encoding: doc.encoding ?? "utf-8",
        metadata: doc.metadata ?? {},
      },
      { onConflict: "item_id,document_type,content_hash", ignoreDuplicates: true }
    );
  if (error) {
    throw new Error(`写入 item_documents 失败: ${error.message}`);
  }
  // status 201 = created (upsert with ignoreDuplicates returns inserted rows)
  // status 200/204 = no-op (duplicate ignored)
  return status === 201 || status === 200;
}
