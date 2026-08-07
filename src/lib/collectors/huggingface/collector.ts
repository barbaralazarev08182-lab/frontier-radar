/**
 * HuggingFace Hub 采集器编排器（阶段 1.3）。
 *
 * 流程：
 *   1. 创建 collection_run
 *   2. 发现 Models / Datasets / Spaces（discoverHFContent）
 *   3. Enrich Card/README（前 N 条）
 *   4. 持久化（raw_items → items → snapshots → item_documents）
 *   5. 完成 collection_run
 *
 * 支持 dry-run（不写数据库）和真实运行。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { HFClient, type HFClientOptions } from "@/lib/huggingface/client";
import { discoverHFContent, type DiscoveryHFResult } from "./discover";
import { enrichHFCards, type EnrichedCard } from "./enrich";
import { HFCollectorSink, type HFPersistRepoInput } from "./sink";
import { createRun, finishRun } from "@/lib/db/repositories/collection-runs";
import type { Logger } from "@/lib/logger";

export interface HFCollectorOptions {
  sourceId?: string; // 默认 "huggingface"
  /** 兼容旧调用：每种类型默认最大采集数量 */
  limitPerType: number;
  /** 可选的分类型配额；用于产品发现时提升 Space 占比。 */
  modelLimit?: number;
  datasetLimit?: number;
  spaceLimit?: number;
  /** enrichment 总数量（按 Spaces → Models → Datasets 顺序优先） */
  enrichLimit: number;
  /** 是否跳过 Card 获取 */
  skipCards: boolean;
  /** 是否 dry-run */
  dryRun: boolean;
  /** HF 客户端选项 */
  hfClientOpts: HFClientOptions;
}

export interface HFCollectResult {
  runId: string | null;
  status: "success" | "partial" | "failed";
  discovery: DiscoveryHFResult;
  stats: {
    models_found: number;
    datasets_found: number;
    spaces_found: number;
    cards_fetched: number;
    cardsWritten: number;
    requests_made: number;
    duration_ms: number;
    errors: number;
  };
  error?: string;
}

/** Dry-run sink：只计数，不写数据库 */
class DryRunSink {
  async persistItem(_input: HFPersistRepoInput) {
    return { inserted: true, updated: false, rawInserted: true, snapshotWritten: true, cardWritten: !!_input.card?.card };
  }
}

/** 执行一次完整的 HuggingFace Hub 采集。 */
export async function collectHuggingFace(
  supabase: SupabaseClient | null,
  opts: HFCollectorOptions,
  logger?: Logger
): Promise<HFCollectResult> {
  const log = logger ?? { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };
  const sourceId = opts.sourceId ?? "huggingface";

  const client = new HFClient(opts.hfClientOpts);
  const sink = opts.dryRun
    ? new DryRunSink()
    : new HFCollectorSink(supabase!, sourceId);

  let runId: string | null = null;

  if (!opts.dryRun && supabase) {
    try {
      runId = await createRun(supabase, sourceId);
    } catch (err) {
      log.error("hf.collect.create_run_failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      return {
        runId: null,
        status: "failed",
        discovery: {
          models: [], datasets: [], spaces: [],
          totalDiscovered: { models: 0, datasets: 0, spaces: 0 },
          deduplicated: { models: 0, datasets: 0, spaces: 0 },
          etags: {},
        },
        stats: {
          models_found: 0,
          datasets_found: 0,
          spaces_found: 0,
          cards_fetched: 0,
          cardsWritten: 0,
          requests_made: 0,
          duration_ms: 0,
          errors: 0,
        },
        error: `创建 collection_run 失败: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  const startedAt = Date.now();
  let totalInserted = 0;
  let totalUpdated = 0;
  let errors = 0;
  let cardsWritten = 0;
  let firstPersistError: string | null = null;

  try {
    log.info("hf.collect.discovering", {
      model_limit: opts.modelLimit ?? opts.limitPerType,
      dataset_limit: opts.datasetLimit ?? opts.limitPerType,
      space_limit: opts.spaceLimit ?? opts.limitPerType,
    });

    const discovery = await discoverHFContent(client, {
      limitPerType: opts.limitPerType,
      modelLimit: opts.modelLimit,
      datasetLimit: opts.datasetLimit,
      spaceLimit: opts.spaceLimit,
      logger: log,
    });

    // Frontier Radar 的项目发现模式优先可直接试玩的 Spaces。
    // Enrichment 也按这个顺序分配，让最有价值的候选更容易拿到 README/Card。
    const allItems = [
      ...discovery.spaces.map((s) => ({ item: s.normalized, type: "space" as const })),
      ...discovery.models.map((m) => ({ item: m.normalized, type: "model" as const })),
      ...discovery.datasets.map((d) => ({ item: d.normalized, type: "dataset" as const })),
    ];

    log.info("hf.collect.discovered", {
      models: discovery.models.length,
      datasets: discovery.datasets.length,
      spaces: discovery.spaces.length,
      total_before_dedup:
        discovery.totalDiscovered.models +
        discovery.totalDiscovered.datasets +
        discovery.totalDiscovered.spaces,
    });

    let enrichedCards: EnrichedCard[] = [];
    if (!opts.skipCards && allItems.length > 0) {
      const enrichResult = await enrichHFCards(
        client,
        allItems.map((i) => i.item),
        opts.enrichLimit,
        log
      );
      enrichedCards = enrichResult.cards;
      log.info("hf.collect.enriched", {
        fetched: enrichResult.fetched,
        not_found: enrichResult.notFound,
        errors: enrichResult.errors,
      });
    }

    const cardMap = new Map(enrichedCards.map((c) => [c.sourceItemId, c]));
    const snapshotDate = new Date().toISOString().slice(0, 10);

    for (const { item } of allItems) {
      try {
        const card = cardMap.get(item.sourceItemId) ?? null;
        const outcome = await sink.persistItem({
          sourceId,
          collectionRunId: runId ?? "dry-run",
          snapshotDate,
          normalized: item,
          card,
        });
        if (outcome.inserted) totalInserted++;
        else if (outcome.updated) totalUpdated++;
        if (outcome.cardWritten) cardsWritten++;
      } catch (err) {
        errors++;
        const message = err instanceof Error ? err.message : String(err);
        if (!firstPersistError) firstPersistError = message;
        log.warn("hf.collect.persist_error", {
          source_item_id: item.sourceItemId,
          error: message,
        });
      }
    }

    if (!opts.dryRun && supabase && runId) {
      await finishRun(supabase, runId, {
        status: errors > 0 ? "partial" : "success",
        stats: {
          discovered_count: allItems.length,
          deduplicated_count: 0,
          inserted_count: totalInserted,
          updated_count: totalUpdated,
          unchanged_count: 0,
          snapshot_count: totalInserted,
          error_count: errors,
          request_count: client.getRequestCount(),
        },
        rate_limit_remaining: null,
        rate_limit_reset_at: null,
        error_message: firstPersistError,
        metadata: {
          models_found: discovery.models.length,
          datasets_found: discovery.datasets.length,
          spaces_found: discovery.spaces.length,
          cards_fetched: enrichedCards.length,
          cardsWritten,
          requests_made: client.getRequestCount(),
          discovery_mode: "spaces-first",
        } as Record<string, unknown>,
      });
    }

    return {
      runId,
      status: errors > 0 ? "partial" : "success",
      discovery,
      stats: {
        models_found: discovery.models.length,
        datasets_found: discovery.datasets.length,
        spaces_found: discovery.spaces.length,
        cards_fetched: enrichedCards.length,
        cardsWritten,
        requests_made: client.getRequestCount(),
        duration_ms: Date.now() - startedAt,
        errors,
      },
      error: firstPersistError ?? undefined,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    log.error("hf.collect.unexpected_error", { error: errorMsg });

    if (!opts.dryRun && supabase && runId) {
      await finishRun(supabase, runId, {
        status: "failed",
        stats: {
          discovered_count: 0,
          deduplicated_count: 0,
          inserted_count: 0,
          updated_count: 0,
          unchanged_count: 0,
          snapshot_count: 0,
          error_count: 1,
          request_count: client.getRequestCount(),
        },
        rate_limit_remaining: null,
        rate_limit_reset_at: null,
        error_message: errorMsg,
        metadata: {},
      }).catch(() => {});
    }

    return {
      runId,
      status: "failed",
      discovery: {
        models: [], datasets: [], spaces: [],
        totalDiscovered: { models: 0, datasets: 0, spaces: 0 },
        deduplicated: { models: 0, datasets: 0, spaces: 0 },
        etags: {},
      },
      stats: {
        models_found: 0,
        datasets_found: 0,
        spaces_found: 0,
        cards_fetched: 0,
        cardsWritten: 0,
        requests_made: client.getRequestCount(),
        duration_ms: Date.now() - startedAt,
        errors: 1,
      },
      error: errorMsg,
    };
  }
}
