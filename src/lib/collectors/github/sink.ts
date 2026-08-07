/**
 * Supabase 持久化桩（阶段 1.2.1 加固）。
 *
 * 变更：
 *   - README 从 raw_items 伪条目迁移到 item_documents 表
 *   - metric snapshot 关联 collection_run_id
 *   - 同日多次运行产生独立快照
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CollectorSink,
  FinishRunInput,
  PersistRepoInput,
  PersistRepoOutcome,
  SaveStateInput,
} from "./collector";
import { computePayloadHash } from "@/lib/hash";
import {
  createRun,
  finishRun,
  type RunStats,
} from "@/lib/db/repositories/collection-runs";
import { insertRawItem } from "@/lib/db/repositories/raw-items";
import { upsertItem } from "@/lib/db/repositories/items";
import { insertSnapshot } from "@/lib/db/repositories/metric-snapshots";
import { insertDocument } from "@/lib/db/repositories/item-documents";
import { getState, upsertState } from "@/lib/db/repositories/collector-state";

export class SupabaseCollectorSink implements CollectorSink {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly sourceId: string
  ) {}

  async startRun(): Promise<string> {
    return createRun(this.supabase, "github");
  }

  async finishRun(input: FinishRunInput): Promise<void> {
    await finishRun(this.supabase, input.runId, {
      status: input.status,
      stats: input.stats as RunStats,
      rate_limit_remaining: input.rateLimitRemaining,
      rate_limit_reset_at: input.rateLimitResetAt,
      error_message: input.errorMessage,
      metadata: input.metadata,
    });
  }

  async persistRepo(input: PersistRepoInput): Promise<PersistRepoOutcome> {
    // 1) 原始仓库 payload（不可变，按 payload_hash 去重）
    const rawInserted = await insertRawItem(this.supabase, {
      source_id: input.sourceId,
      source_item_id: input.normalized.sourceItemId,
      item_type: "repo",
      source_url: input.normalized.canonicalUrl,
      raw_payload: input.normalized.rawPayload,
      payload_hash: input.normalized.payloadHash,
      collection_run_id: input.collectionRunId,
    });

    // 2) 归一化条目 upsert（只更新来源字段）
    const { id: itemId, inserted } = await upsertItem(
      this.supabase,
      input.sourceId,
      input.normalized
    );

    // 3) 指标快照（关联本次运行，每次运行独立一份）
    await insertSnapshot(this.supabase, {
      item_id: itemId,
      collection_run_id: input.collectionRunId,
      snapshot_date: input.snapshotDate,
      stars: input.normalized.stars,
      forks: input.normalized.forks,
      watchers: input.normalized.watchers,
      open_issues: input.normalized.openIssues,
      subscribers: input.normalized.subscribers,
    });

    // 4) README 写入 item_documents（不再伪装成 raw_item）
    let readmeWritten = false;
    if (input.readme) {
      const readmeContent = input.readme.readme.content;
      const contentBytes = Buffer.byteLength(readmeContent, "utf-8");
      readmeWritten = await insertDocument(this.supabase, {
        item_id: itemId,
        document_type: "readme",
        source_url: `${input.normalized.canonicalUrl}/raw/${input.normalized.defaultBranch ?? "main"}/README.md`,
        source_revision: null, // GitHub API 不一定返回 commit SHA
        content_text: readmeContent,
        content_hash: computePayloadHash(readmeContent),
        etag: input.readmeEtag ?? null,
        last_modified: null,
        original_size: contentBytes,
        stored_size: contentBytes,
        is_truncated: input.readmeTruncated ?? false,
        encoding: "utf-8",
      });
    }

    return { inserted, updated: !inserted, rawInserted, snapshotWritten: true, readmeWritten };
  }

  async saveQueryState(input: SaveStateInput): Promise<void> {
    await upsertState(this.supabase, {
      source_id: this.sourceId,
      state_key: input.stateKey,
      state_value: input.stateValue,
      etag: input.etag,
      last_modified: null,
    });
  }

  /** 从 collector_state 读取查询 ETag（增量条件请求）。 */
  async getQueryEtag(stateKey: string): Promise<string | null> {
    const s = await getState(this.supabase, this.sourceId, stateKey);
    return s?.etag ?? null;
  }

  /** 从 collector_state 读取 README ETag（增量条件请求）。 */
  async getReadmeEtag(sourceItemId: string): Promise<string | null> {
    const s = await getState(
      this.supabase,
      this.sourceId,
      `readme:${sourceItemId}`
    );
    return s?.etag ?? null;
  }
}
