/**
 * GitHub 采集器编排器（阶段 1.2）。
 *
 * 数据流：发现 → 标准化/去重（discover）→ README 富化（enrich）→ 持久化（sink）
 *         → 保存查询状态（ETag）→ 结束运行。
 *
 * 不负责：Frontier Score / AI 摘要 / 创新性判断 / 个性化推荐 / 页面展示。
 * GitHub HTTP 客户端不直接调用 Supabase；持久化全部经 CollectorSink。
 *
 * 实现统一 Collector 接口（src/lib/types）。dry-run 通过传入 DryRunSink 实现，
 * 不写数据库，但仍完成发现/标准化/去重并产出统计。
 */
import type { Collector, CollectorResult, RunStatus, SourceSlug } from "@/lib/types";
import type { GitHubClient } from "@/lib/github/client";
import type { GitHubRepo, GitHubRateLimit } from "@/lib/github/types";
import { discoverRepos, type DiscoveryResult } from "./discover";
import { enrichReadmes, type EnrichOptions, type RepoReadmePayload } from "./enrich";
import {
  enabledGroups,
  computeSinceDate,
  type DiscoveryGroup,
} from "@/config/github-discovery";
import {
  loadBudgetConfig,
  estimateBudget,
  selectGroups,
  formatEstimateReport,
  shouldStopSearch,
  shouldStopCore,
  type BudgetConfig,
  type GroupSelection,
} from "./budget";
import type { NormalizedRepo } from "./normalize";
import type { Logger } from "@/lib/logger";
import type { RunStats } from "@/lib/db/repositories/collection-runs";

const GITHUB_SOURCE: SourceSlug = "github";

export interface PersistRepoInput {
  collectionRunId: string;
  sourceId: string;
  normalized: NormalizedRepo;
  rawRepo: GitHubRepo;
  readme: RepoReadmePayload | null;
  readmeEtag: string | null;
  readmeTruncated: boolean;
  snapshotDate: string;
}

export interface PersistRepoOutcome {
  inserted: boolean; // items 新插入
  updated: boolean; // items 更新
  rawInserted: boolean; // raw_items 新版本（false = 未变化）
  snapshotWritten: boolean;
  readmeWritten: boolean; // item_documents 是否写入了新版本
}

export interface SaveStateInput {
  stateKey: string;
  etag: string | null;
  stateValue: Record<string, unknown>;
}

export interface FinishRunInput {
  runId: string;
  status: RunStatus;
  stats: RunStats;
  rateLimitRemaining: number | null;
  rateLimitResetAt: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
}

/** 采集器与持久化层之间的边界（便于 dry-run 与测试注入）。 */
export interface CollectorSink {
  startRun(): Promise<string>;
  finishRun(input: FinishRunInput): Promise<void>;
  persistRepo(input: PersistRepoInput): Promise<PersistRepoOutcome>;
  saveQueryState(input: SaveStateInput): Promise<void>;
}

export interface GitHubCollectorOptions {
  client: GitHubClient;
  sink: CollectorSink;
  sourceId: string;
  discoveryDays: number;
  pagesPerQuery: number;
  perPage: number;
  enrichLimit: number;
  minStars: number;
  readmeMaxBytes: number;
  /** 业务日（YYYY-MM-DD）；默认 UTC 今日 */
  snapshotDate?: string;
  groups?: DiscoveryGroup[];
  logger?: Logger;
  getQueryEtag?: (key: string) => Promise<string | null> | string | null;
  getReadmeEtag?: (
    sourceItemId: string
  ) => Promise<string | null> | string | null;
  /** 阶段 1.2.1：预算控制 */
  budget?: BudgetConfig;
  /** CLI 强制覆盖：最大查询组数 */
  maxGroups?: number;
  /** CLI 强制覆盖：最大 Search 请求数 */
  maxSearchRequests?: number;
  /** CLI：跳过 README 获取 */
  skipReadme?: boolean;
  /** Resume：从上次中断的组继续 */
  resumeCursor?: string | null;
}

function newStats(): RunStats {
  return {
    discovered_count: 0,
    deduplicated_count: 0,
    inserted_count: 0,
    updated_count: 0,
    unchanged_count: 0,
    snapshot_count: 0,
    error_count: 0,
    request_count: 0,
  };
}

export class GitHubCollector implements Collector {
  readonly source: SourceSlug = GITHUB_SOURCE;
  private readonly opts: GitHubCollectorOptions;

  constructor(opts: GitHubCollectorOptions) {
    this.opts = opts;
  }

  private get logger(): Logger {
    return this.opts.logger ?? {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    };
  }

  async collect(): Promise<CollectorResult> {
    const started = Date.now();
    const stats = newStats();
    const errors: string[] = [];
    const allGroups = this.opts.groups ?? enabledGroups();
    const budget = this.opts.budget ?? loadBudgetConfig();
    const since = computeSinceDate(this.opts.discoveryDays);
    const snapshotDate =
      this.opts.snapshotDate ?? new Date().toISOString().slice(0, 10);

    // ---- 阶段 1.2.1：查询组选择（轮换/Resume） ----
    const groupSelection: GroupSelection = selectGroups(
      allGroups,
      budget,
      this.opts.resumeCursor,
      this.opts.maxGroups
    );
    if (groupSelection.isResume) {
      this.logger.info("github.collector.resume", {
        cursor: this.opts.resumeCursor,
        selected_groups: groupSelection.selected.length,
      });
    }

    // ---- 运行前预估 ----
    const estimate = estimateBudget(
      groupSelection.selected,
      this.opts.pagesPerQuery,
      this.opts.enrichLimit,
      budget,
      this.opts.maxGroups
    );
    formatEstimateReport(estimate, this.logger);

    let runId: string;
    try {
      runId = await this.opts.sink.startRun();
    } catch (err) {
      throw err;
    }

    let status: RunStatus = "success";
    let errorMessage: string | null = null;
    let discovery: DiscoveryResult | null = null;

    try {
      // ---- 发现阶段（带预算保护）----
      discovery = await discoverRepos(this.opts.client, {
        groups: groupSelection.selected,
        since,
        pagesPerQuery: this.opts.pagesPerQuery,
        perPage: this.opts.perPage,
        getQueryEtag: this.opts.getQueryEtag,
        logger: this.logger,
        searchRequestBudget: this.opts.maxSearchRequests ?? budget.searchRequestBudget,
        searchRateLimitReserve: budget.searchRateLimitReserve,
      });
      stats.discovered_count = discovery.totalDiscovered;
      stats.deduplicated_count = discovery.deduplicated;

      // 检查是否因预算/限额中止
      if (discovery.abort.aborted) {
        this.logger.warn("github.collector.discovery_aborted", {
          reason: discovery.abort.reason,
          requests_used: discovery.abort.searchRequestsUsed,
        });
        status = "partial";
        errorMessage = discovery.abort.reason;
      }

      // ---- README 富化阶段（带 Core 保护）----
      const shouldEnrich = !this.opts.skipReadme && discovery.items.length > 0;
      if (shouldEnrich) {
        const rl = this.opts.client.getLastRateLimit();
        if (
          rl &&
          rl.remaining != null &&
          budget.coreRateLimitReserve > 0 &&
          rl.remaining <= budget.coreRateLimitReserve
        ) {
          const stopReason = `速率限制剩余 (${rl.remaining}) 达到 Core 保留额度 (${budget.coreRateLimitReserve})`;
          this.logger.warn("github.collector.core_rate_limit_reserve", { reason: stopReason });
          if (!errorMessage) errorMessage = stopReason;
          status = "partial";
        } else {
          const enrichOpts: EnrichOptions = {
            limit: this.opts.enrichLimit,
            minStars: this.opts.minStars,
            since,
            readmeMaxBytes: this.opts.readmeMaxBytes,
            getReadmeEtag: this.opts.getReadmeEtag,
            logger: this.logger,
          };
          const enrich = await enrichReadmes(
            this.opts.client,
            discovery.items,
            enrichOpts
          );

          for (const d of discovery.items) {
            try {
              const readmePayload = enrich.readmes.get(d.normalized.sourceItemId) ?? null;
              const outcome = await this.opts.sink.persistRepo({
                collectionRunId: runId,
                sourceId: this.opts.sourceId,
                normalized: d.normalized,
                rawRepo: d.rawRepo,
                readme: readmePayload,
                readmeEtag: readmePayload?.readme.etag ?? null,
                readmeTruncated: readmePayload?.readme.truncated ?? false,
                snapshotDate,
              });
              if (outcome.inserted) stats.inserted_count++;
              else if (outcome.rawInserted) stats.updated_count++;
              else stats.unchanged_count++;
              if (outcome.snapshotWritten) stats.snapshot_count++;
            } catch (err) {
              stats.error_count++;
              const msg = err instanceof Error ? err.message : String(err);
              errors.push(msg);
              this.logger.error("github.collector.persist_error", {
                id: d.normalized.sourceItemId,
                error: msg,
              });
            }
          }
        }
      }

      // 无 README 或跳过 README：直接持久化已发现条目
      if (!shouldEnrich || status === "partial") {
        for (const d of discovery.items) {
          // 如果已经过 enrich 循环则跳过（避免重复）
          if (shouldEnrich && status !== "partial") continue;
          try {
            const outcome = await this.opts.sink.persistRepo({
              collectionRunId: runId,
              sourceId: this.opts.sourceId,
              normalized: d.normalized,
              rawRepo: d.rawRepo,
              readme: null,
              readmeEtag: null,
              readmeTruncated: false,
              snapshotDate,
            });
            if (outcome.inserted) stats.inserted_count++;
            else if (outcome.rawInserted) stats.updated_count++;
            else stats.unchanged_count++;
            if (outcome.snapshotWritten) stats.snapshot_count++;
          } catch (err) {
            stats.error_count++;
            const msg = err instanceof Error ? err.message : String(err);
            errors.push(msg);
            this.logger.error("github.collector.persist_error", {
              id: d.normalized.sourceItemId,
              error: msg,
            });
          }
        }
      }

      // 保存查询 ETag + 轮换游标
      for (const [key, etag] of Object.entries(discovery.queryEtags)) {
        try {
          await this.opts.sink.saveQueryState({
            stateKey: key,
            etag,
            stateValue: { since, captured_at: new Date().toISOString() },
          });
        } catch (err) {
          stats.error_count++;
          errors.push(err instanceof Error ? err.message : String(err));
        }
      }

      // 保存轮换游标（供下次 resume）
      if (groupSelection.cursor) {
        try {
          await this.opts.sink.saveQueryState({
            stateKey: "__rotation_cursor__",
            etag: null,
            stateValue: { cursor: groupSelection.cursor, selected_at: new Date().toISOString() },
          });
        } catch (err) {
          this.logger.warn("github.collector.cursor_save_error", {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      stats.request_count = this.opts.client.getRequestCount();

      if (stats.error_count > 0 && stats.inserted_count === 0 && stats.updated_count === 0) {
        status = "failed";
      } else if (stats.error_count > 0 || discovery.abort.aborted) {
        status = "partial";
      }
    } catch (err) {
      status = "failed";
      errorMessage = err instanceof Error ? err.message : String(err);
      stats.error_count++;
      errors.push(errorMessage);
    } finally {
      const rl = this.opts.client.getLastRateLimit();
      await this.opts.sink.finishRun({
        runId,
        status,
        stats,
        rateLimitRemaining: rl?.remaining ?? null,
        rateLimitResetAt:
          rl?.resetAtMs != null ? new Date(rl.resetAtMs).toISOString() : null,
        errorMessage,
        metadata: {
          source: this.source,
          since,
          snapshot_date: snapshotDate,
          query_groups: groupSelection.selected.length,
          query_stats: discovery?.queryStats ?? {},
          abort: discovery?.abort ?? null,
          enrich: discovery ? { items: discovery.items.length } : null,
          budget: {
            estimated: estimate.estimatedSearchRequests,
            used: discovery?.abort.searchRequestsUsed ?? 0,
            limit: this.opts.maxSearchRequests ?? budget.searchRequestBudget,
          },
        },
      });
    }

    const rl = this.opts.client.getLastRateLimit();
    return {
      source: this.source,
      status,
      itemsFetched: stats.discovered_count,
      itemsNew: stats.inserted_count,
      itemsUpdated: stats.updated_count,
      errorCount: stats.error_count,
      errors,
      rateLimitRemaining: rl?.remaining ?? undefined,
      rateLimitResetAt:
        rl?.resetAtMs != null ? new Date(rl.resetAtMs).toISOString() : undefined,
      durationMs: Date.now() - started,
      discovered: stats.discovered_count,
      deduplicated: stats.deduplicated_count,
      inserted: stats.inserted_count,
      updated: stats.updated_count,
      unchanged: stats.unchanged_count,
      snapshots: stats.snapshot_count,
      requests: stats.request_count,
    };
  }
}

/**
 * Dry-run 持久化桩：不写数据库，仅记录将会写入的内容并产出统计。
 * 注意：dry-run 无法预知条目是否已存在，故所有条目计为「将新插入」。
 */
export class DryRunSink implements CollectorSink {
  readonly wouldWrite: {
    repos: number;
    readmes: number;
    states: number;
  } = { repos: 0, readmes: 0, states: 0 };

  async startRun(): Promise<string> {
    return "dry-run";
  }

  async finishRun(): Promise<void> {
    // no-op
  }

  async persistRepo(input: PersistRepoInput): Promise<PersistRepoOutcome> {
    this.wouldWrite.repos++;
    if (input.readme) this.wouldWrite.readmes++;
    return {
      inserted: true,
      updated: false,
      rawInserted: true,
      snapshotWritten: true,
      readmeWritten: !!input.readme,
    };
  }

  async saveQueryState(): Promise<void> {
    this.wouldWrite.states++;
  }
}
