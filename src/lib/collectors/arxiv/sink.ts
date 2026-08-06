/**
 * arXiv 论文持久化 Sink（阶段 1.4）。
 *
 * 复用现有表：
 *   - raw_items：原始 Atom entry payload
 *   - items：论文归一化条目（item_type = "paper"，只写通用列）
 *   - item_documents：摘要存为 document_type = "paper_abstract"
 *
 * 论文没有 downloads / likes / stars 等指标，不写 item_metrics_snapshot，
 * 也不把发布时间当作热度指标。
 *
 * arXiv 特有字段（version / primary_category / doi 等）不新增表列：
 * 全部保留在 raw_items.raw_payload，摘要文档在 metadata 中冗余少量关键字段。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NormalizedArxivPaper } from "./normalize";
import { computePayloadHash } from "@/lib/hash";
import { insertRawItem } from "@/lib/db/repositories/raw-items";
import { insertDocument } from "@/lib/db/repositories/item-documents";

export interface ArxivPersistInput {
  sourceId: string;
  collectionRunId: string;
  normalized: NormalizedArxivPaper;
}

export interface ArxivPersistOutcome {
  itemId: string;
  inserted: boolean;
  rawInserted: boolean;
  abstractWritten: boolean;
}

/** 摘要文档使用的 source_revision：如 "v3"，无版本时为 null。 */
export function arxivDocumentRevision(version: number | null): string | null {
  return version === null ? null : `v${version}`;
}

/** 查询论文是否已存在（用于 inserted / updated 计数）。 */
async function paperExists(
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

/** 按论文字段 upsert items 行（只写通用列，来源字段不覆盖用户数据）。 */
async function upsertPaperItem(
  supabase: SupabaseClient,
  sourceId: string,
  n: NormalizedArxivPaper
): Promise<{ id: string; inserted: boolean }> {
  const existed = await paperExists(supabase, sourceId, n.sourceItemId);
  const { data, error } = await supabase
    .from("items")
    .upsert(
      {
        source_id: sourceId,
        source_item_id: n.sourceItemId,
        dedupe_key: n.dedupeKey,
        item_type: "paper",
        title: n.title,
        description: n.description,
        owner: n.authors[0] ?? null,
        owner_login: null,
        repository_name: null,
        full_name: null,
        language: n.primaryCategory,
        license: null,
        homepage: null,
        source_url: n.canonicalUrl,
        external_url: n.canonicalUrl,
        topics: n.categories,
        has_code: false, // 不推断论文是否附代码
        has_demo: false,
        has_dataset: false,
        created_at_source: n.publishedAt,
        pushed_at_source: n.updatedAt,
        last_updated_at: new Date().toISOString(),
      },
      { onConflict: "source_id,source_item_id" }
    )
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(`upsert items 失败: ${error?.message ?? "未知错误"}`);
  }
  return { id: data.id as string, inserted: !existed };
}

export class ArxivCollectorSink {
  constructor(private readonly supabase: SupabaseClient, private readonly sourceId: string) {}

  async persistPaper(input: ArxivPersistInput): Promise<ArxivPersistOutcome> {
    const n = input.normalized;

    // 1) 原始 payload（按 payload_hash 去重；论文新版本 → 新 payload → 新记录）
    const rawInserted = await insertRawItem(this.supabase, {
      source_id: input.sourceId,
      source_item_id: n.sourceItemId,
      item_type: "paper",
      source_url: n.canonicalUrl,
      raw_payload: n.rawPayload,
      payload_hash: n.payloadHash,
      collection_run_id: input.collectionRunId,
    });

    // 2) 归一化条目 upsert
    const { id: itemId, inserted } = await upsertPaperItem(
      this.supabase,
      input.sourceId,
      n
    );

    // 3) 摘要写入 item_documents（同版本同摘要 → 相同 content_hash → 不重复写入；
    //    版本更新且摘要变化 → 新 hash → 允许保存新文档版本）
    let abstractWritten = false;
    if (n.description) {
      const contentBytes = Buffer.byteLength(n.description, "utf-8");
      abstractWritten = await insertDocument(this.supabase, {
        item_id: itemId,
        document_type: "paper_abstract",
        source_url: n.canonicalUrl,
        source_revision: arxivDocumentRevision(n.version),
        content_text: n.description,
        content_hash: computePayloadHash(n.description),
        etag: null,
        last_modified: n.updatedAt,
        original_size: contentBytes,
        stored_size: contentBytes,
        is_truncated: false,
        encoding: "utf-8",
        metadata: {
          version: n.version,
          primary_category: n.primaryCategory,
          categories: n.categories,
          authors: n.authors,
          doi: n.doi,
          journal_reference: n.journalReference,
          comment: n.comment,
          pdf_url: n.pdfUrl,
        },
      });
    }

    return { itemId, inserted, rawInserted, abstractWritten };
  }
}
