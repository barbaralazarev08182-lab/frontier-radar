/**
 * HuggingFace Hub 持久化 Sink（阶段 1.3）。
 *
 * 复用现有 Supabase repositories：
 *   - raw_items / items / item_metrics_snapshot / item_documents / collector_state
 *
 * 与 GitHub sink 的区别：
 *   - source_id 通过 sources.slug = "huggingface" 解析为 UUID
 *   - source_item_id 含类型前缀（model:/dataset:/space:）
 *   - 指标快照写入 downloads + likes
 *   - Card 写入 model_card / dataset_card / space_readme
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NormalizedHFItem } from "./normalize";
import type { EnrichedCard } from "./enrich";
import { CARD_DOCUMENT_TYPES } from "./enrich";
import { computePayloadHash } from "@/lib/hash";
import { insertRawItem } from "@/lib/db/repositories/raw-items";
import { upsertItem } from "@/lib/db/repositories/items";
import { insertSnapshot } from "@/lib/db/repositories/metric-snapshots";
import { insertDocument } from "@/lib/db/repositories/item-documents";
import { ensureSourceId } from "@/lib/db/repositories/sources";
import type { SourceSlug } from "@/lib/types";

export interface HFPersistRepoInput {
  sourceId: string;
  collectionRunId: string;
  snapshotDate: string;
  normalized: NormalizedHFItem;
  card?: EnrichedCard | null;
}

export interface HFPersistOutcome {
  inserted: boolean;
  updated: boolean;
  rawInserted: boolean;
  snapshotWritten: boolean;
  cardWritten: boolean;
}

export class HFCollectorSink {
  private resolvedSourceId: string | null = null;

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly sourceId: string
  ) {}

  private async getSourceId(): Promise<string> {
    if (!this.resolvedSourceId) {
      this.resolvedSourceId = await ensureSourceId(
        this.supabase,
        this.sourceId as SourceSlug
      );
    }
    return this.resolvedSourceId;
  }

  async persistItem(input: HFPersistRepoInput): Promise<HFPersistOutcome> {
    const n = input.normalized;
    const sourceUuid = await this.getSourceId();

    // 1) 原始 payload（不可变，按 payload_hash 去重）
    const rawInserted = await insertRawItem(this.supabase, {
      source_id: sourceUuid,
      source_item_id: n.sourceItemId,
      item_type: n.itemType as "model" | "dataset" | "space",
      source_url: n.canonicalUrl,
      raw_payload: n.rawPayload,
      payload_hash: n.payloadHash,
      collection_run_id: input.collectionRunId,
    });

    // 2) 归一化条目 upsert
    // 注意：HF 内容使用通用字段映射到 items 表
    const { id: itemId, inserted } = await upsertItem(
      this.supabase,
      sourceUuid,
      // 将 NormalizedHFItem 映射为 upsertItem 需要的形状
      // 由于 upsertItem 期望 NormalizedRepo 类型，这里做适配
      {
        sourceItemId: n.sourceItemId,
        dedupeKey: n.dedupeKey,
        itemType: n.itemType as "repo", // items 表目前只有 repo 类型，HF 用 repo 占位
        title: n.title,
        canonicalUrl: n.canonicalUrl,
        description: n.description,
        author: n.author,
        ownerLogin: n.author,
        repositoryName: n.fullName.split("/").pop() ?? n.title,
        fullName: n.fullName,
        primaryLanguage: n.pipelineTag ?? n.sdk ?? null,
        license: null,
        defaultBranch: null,
        homepageUrl: null,
        createdAt: n.createdAt ?? new Date().toISOString(),
        pushedAt: n.updatedAt ?? new Date().toISOString(),
        stars: n.likes ?? 0,
        forks: 0,
        watchers: 0,
        openIssues: 0,
        subscribers: null,
        language: n.pipelineTag ?? n.sdk ?? null,
        topics: n.tags,
        hasCode: n.contentType === "model",
        hasDemo: n.contentType === "space",
        hasDataset: n.contentType === "dataset",
        created_at_source: n.createdAt,
        pushed_at_source: n.updatedAt,
        visibility: n.private ? "private" : "public",
        archived: false,
        fork: false,
        hasIssues: false,
        hasDiscussions: false,
        hasWiki: false,
        hasPages: n.contentType === "space",
        repositorySize: null,
        last_updated_at: new Date().toISOString(),
      } as never
    );

    // 3) 指标快照（downloads + likes）
    await insertSnapshot(this.supabase, {
      item_id: itemId,
      collection_run_id: input.collectionRunId,
      snapshot_date: input.snapshotDate,
      stars: n.likes,
      forks: null,
      watchers: null,
      open_issues: null,
      subscribers: null,
    });

    // 4) Card 写入 item_documents
    let cardWritten = false;
    if (input.card?.card?.content) {
      const cardContent = input.card.card.content;
      const revision = input.card.card.revision ?? "main";
      const contentBytes = Buffer.byteLength(cardContent, "utf-8");
      cardWritten = await insertDocument(this.supabase, {
        item_id: itemId,
        document_type: CARD_DOCUMENT_TYPES[input.card.contentType] as "model_card" | "dataset_card" | "space_readme",
        source_url: `${n.canonicalUrl}/raw/${revision}/README.md`,
        source_revision: revision,
        content_text: cardContent,
        content_hash: computePayloadHash(cardContent),
        etag: input.card.card.etag ?? null,
        last_modified: input.card.card.lastModified ?? null,
        original_size: contentBytes,
        stored_size: contentBytes,
        is_truncated: false,
        encoding: "utf-8",
      });
    }

    return { inserted, updated: !inserted, rawInserted, snapshotWritten: true, cardWritten };
  }
}
