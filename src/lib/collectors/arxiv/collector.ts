/**
 * arXiv 采集器编排器（阶段 1.4）。
 *
 * 流程：
 *   1. 创建 collection_run（dry-run 跳过）
 *   2. 发现论文（discoverArxivPapers，串行 + 间隔）
 *   3. 持久化（raw_items → items → item_documents.paper_abstract）
 *   4. 完成 collection_run
 *
 * 支持 dry-run（不写数据库）。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { ArxivClient, type ArxivClientOptions } from "@/lib/arxiv/client";
import { discoverArxivPapers, type DiscoverArxivResult } from "./discover";
import { ArxivCollectorSink, type ArxivPersistInput } from "./sink";
import { createRun, finishRun } from "@/lib/db/repositories/collection-runs";
import type { Logger } from "@/lib/logger";

export interface ArxivCollectorOptions {
  sourceId?: string; // 默认 "arxiv"
  /** 每个查询的最大结果数 */
  maxResultsPerQuery: number;
  /** 最多执行多少查询组（0 = 不限制） */
  maxGroups?: number;
  /** 发布时间窗口（天） */
  discoveryDays: number;
  /** 只运行这些 id 的查询组（轮换用；空 = 全部） */
  groupIds?: string[];
  /** 只运行这些分类相关的组 */
  categoryFilter?: string[];
  /** 是否 dry-run */
  dryRun: boolean;
  /** arXiv 客户端选项 */
  arxivClientOpts: ArxivClientOptions;
}

export interface ArxivCollectResult {
  runId: string | null;
  status: "success" | "partial" | "failed";
  discovery: DiscoverArxivResult;
  stats: {
    papers_found: number;
    papers_inserted: number;
    papers_updated: number;
    abstracts_written: number;
    groups_run: number;
    requests_made: number;
    duration_ms: number;
    errors: number;
  };
  error?: string;
}

/** Dry-run sink：只计数，不写数据库。 */
class DryRunSink {
  async persistPaper(input: ArxivPersistInput) {
    return {
      itemId: "dry-run",
      inserted: true,
      rawInserted: true,
      abstractWritten: !!input.normalized.description,
    };
  }
}

/**
 * 执行一次完整的 arXiv 论文采集。
 */
export async function collectArxiv(
  supabase: SupabaseClient | null,
  opts: ArxivCollectorOptions,
  logger?: Logger
): Promise<ArxivCollectResult> {
  const log = logger ?? { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };
  const sourceId = opts.sourceId ?? "arxiv";

  const client = new ArxivClient(opts.arxivClientOpts);
  const sink = opts.dryRun
    ? new DryRunSink()
    : new ArxivCollectorSink(supabase!, sourceId);

  let runId: string | null = null;

  // 1) 创建采集运行记录
  if (!opts.dryRun && supabase) {
    try {
      runId = await createRun(supabase, sourceId);
    } catch (err) {
      log.error("arxiv.collect.create_run_failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      return {
        runId: null,
        status: "failed",
        discovery: { papers: [], fetched: 0, filteredByDate: 0, groupsRun: 0 },
        stats: {
          papers_found: 0,
          papers_inserted: 0,
          papers_updated: 0,
          abstracts_written: 0,
          groups_run: 0,
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
  let abstractsWritten = 0;
  let errors = 0;

  try {
    // 2) 发现
    log.info("arxiv.collect.discovering", {
      max_results_per_query: opts.maxResultsPerQuery,
      discovery_days: opts.discoveryDays,
    });

    const discovery = await discoverArxivPapers(client, {
      maxResultsPerQuery: opts.maxResultsPerQuery,
      maxGroups: opts.maxGroups,
      groupIds: opts.groupIds,
      discoveryDays: opts.discoveryDays,
      categoryFilter: opts.categoryFilter,
      logger: log,
    });

    log.info("arxiv.collect.discovered", {
      papers: discovery.papers.length,
      fetched: discovery.fetched,
      filtered_by_date: discovery.filteredByDate,
      groups_run: discovery.groupsRun,
    });

    // 3) 持久化
    for (const { normalized, queryIds } of discovery.papers) {
      try {
        const outcome = await sink.persistPaper({
          sourceId,
          collectionRunId: runId ?? "dry-run",
          normalized,
        });
        if (outcome.inserted) totalInserted++;
        else totalUpdated++;
        if (outcome.abstractWritten) abstractsWritten++;
        log.debug("arxiv.collect.persisted", {
          source_item_id: normalized.sourceItemId,
          query_ids: queryIds,
          version: normalized.version,
        });
      } catch (err) {
        errors++;
        log.warn("arxiv.collect.persist_error", {
          source_item_id: normalized.sourceItemId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // 4) 完成运行记录
    if (!opts.dryRun && supabase && runId) {
      await finishRun(supabase, runId, {
        status: errors > 0 ? "partial" : "success",
        stats: {
          discovered_count: discovery.papers.length,
          deduplicated_count: Math.max(0, discovery.fetched - discovery.papers.length),
          inserted_count: totalInserted,
          updated_count: totalUpdated,
          unchanged_count: 0,
          snapshot_count: 0, // 论文无指标快照
          error_count: errors,
          request_count: client.getRequestCount(),
        },
        rate_limit_remaining: null,
        rate_limit_reset_at: null,
        error_message: null,
        metadata: {
          fetched: discovery.fetched,
          filtered_by_date: discovery.filteredByDate,
          groups_run: discovery.groupsRun,
          abstracts_written: abstractsWritten,
          requests_made: client.getRequestCount(),
        } as Record<string, unknown>,
      });
    }

    return {
      runId,
      status: errors > 0 ? "partial" : "success",
      discovery,
      stats: {
        papers_found: discovery.papers.length,
        papers_inserted: totalInserted,
        papers_updated: totalUpdated,
        abstracts_written: abstractsWritten,
        groups_run: discovery.groupsRun,
        requests_made: client.getRequestCount(),
        duration_ms: Date.now() - startedAt,
        errors,
      },
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    log.error("arxiv.collect.unexpected_error", { error: errorMsg });

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
      discovery: { papers: [], fetched: 0, filteredByDate: 0, groupsRun: 0 },
      stats: {
        papers_found: 0,
        papers_inserted: 0,
        papers_updated: 0,
        abstracts_written: 0,
        groups_run: 0,
        requests_made: client.getRequestCount(),
        duration_ms: Date.now() - startedAt,
        errors: 1,
      },
      error: errorMsg,
    };
  }
}
