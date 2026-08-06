/**
 * 后台任务服务函数（阶段 1.7）。
 *
 * 复用入口：
 *  - CLI script（scripts/collect-*、analyze-items 的可选路径）
 *  - Next.js Route Handler（src/app/api/cron/*）
 *
 * 规则：
 *  - 不在本模块解析 process.argv、不调用 shell / 子进程；
 *  - 每个任务独立，单个数据源失败不影响其他任务；
 *  - 返回精简 JobResult（只含计数与消息，不含密钥、不含完整 payload）；
 *  - 任务内部错误全部捕获并映射为 failed / partial，不向调用方抛出。
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureSourceId } from "@/lib/db/repositories/sources";
import { getState, upsertState } from "@/lib/db/repositories/collector-state";
import { createLogger, type Logger } from "@/lib/logger";

export interface JobResult {
  job: string;
  status: "succeeded" | "partial" | "failed" | "skipped";
  startedAt: string;
  completedAt: string;
  discovered?: number;
  persisted?: number;
  analyzed?: number;
  errors: number;
  message?: string;
}

export interface JobRunOptions {
  logger?: Logger;
  /** 覆盖环境变量（测试注入用） */
  env?: Record<string, string | undefined>;
}

function nowIso(): string {
  return new Date().toISOString();
}

function envOf(opts: JobRunOptions, name: string): string | undefined {
  const v = opts.env?.[name];
  if (v !== undefined) return v;
  return process.env[name] || undefined;
}

function numEnv(opts: JobRunOptions, name: string, fallback: number): number {
  const n = Number(envOf(opts, name));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** 业务日（Asia/Shanghai），格式 YYYY-MM-DD。 */
function businessDateShanghai(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

function result(job: string, status: JobResult["status"], startedAt: string, patch: Partial<JobResult> = {}): JobResult {
  return {
    job,
    status,
    startedAt,
    completedAt: nowIso(),
    errors: 0,
    ...patch,
  };
}

// ---------------------------------------------------------------------------
// GitHub
// ---------------------------------------------------------------------------

/**
 * GitHub 小批量增量采集（Cron 参数：最多 6 组、每查询 1 页、README 上限 10，支持 resume）。
 * 缺少 GITHUB_TOKEN 时返回 skipped，不影响数据库已有内容。
 */
export async function runGithubCollection(opts: JobRunOptions = {}): Promise<JobResult> {
  const startedAt = nowIso();
  const logger = opts.logger ?? createLogger({ level: "info" });

  const token = envOf(opts, "GITHUB_TOKEN");
  if (!token) {
    return result("github", "skipped", startedAt, {
      message: "缺少 GITHUB_TOKEN，GitHub 采集跳过（不影响其他数据源）",
    });
  }

  try {
    const { GitHubClient } = await import("@/lib/github/client");
    const { GitHubCollector } = await import("@/lib/collectors/github/collector");
    const { SupabaseCollectorSink } = await import("@/lib/collectors/github/sink");
    const { loadBudgetConfig } = await import("@/lib/collectors/github/budget");
    const { enabledGroups } = await import("@/config/github-discovery");

    const supabase = createAdminClient();
    const sourceId = await ensureSourceId(supabase, "github");
    const sink = new SupabaseCollectorSink(supabase, sourceId);

    const client = new GitHubClient({
      baseUrl: envOf(opts, "GITHUB_API_BASE_URL") ?? "https://api.github.com",
      apiVersion: envOf(opts, "GITHUB_API_VERSION") ?? "2026-03-10",
      token,
      timeoutMs: numEnv(opts, "GITHUB_REQUEST_TIMEOUT_MS", 15_000),
      maxRetries: numEnv(opts, "GITHUB_MAX_RETRIES", 3),
      logger,
    });

    // Resume：从上一次轮换游标（group id）继续
    let resumeCursor: string | null = null;
    try {
      const st = await getState(supabase, sourceId, "__rotation_cursor__");
      const cursor = st?.state_value?.cursor;
      if (typeof cursor === "string" && cursor) resumeCursor = cursor;
    } catch {
      // 无法读取游标则从头开始
    }

    const collector = new GitHubCollector({
      client,
      sink,
      sourceId,
      discoveryDays: numEnv(opts, "GITHUB_DISCOVERY_DAYS", 7),
      pagesPerQuery: 1,
      perPage: numEnv(opts, "GITHUB_SEARCH_PER_PAGE", 50),
      enrichLimit: 10,
      minStars: 0,
      readmeMaxBytes: 50_000,
      snapshotDate: businessDateShanghai(),
      groups: enabledGroups(),
      budget: loadBudgetConfig(),
      maxGroups: 6,
      maxSearchRequests: 24,
      resumeCursor,
      getQueryEtag: (key) => sink.getQueryEtag(key),
      getReadmeEtag: (id) => sink.getReadmeEtag(id),
      logger,
    });

    const r = await collector.collect();
    return result("github", mapStatus(r.status), startedAt, {
      discovered: r.discovered ?? r.itemsFetched,
      persisted: (r.inserted ?? 0) + (r.updated ?? 0),
      errors: r.errorCount,
      message: r.errors[0] ?? undefined,
    });
  } catch (err) {
    logger.error("job.github.failed", { error: err instanceof Error ? err.message : String(err) });
    return result("github", "failed", startedAt, {
      errors: 1,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

// ---------------------------------------------------------------------------
// Hugging Face
// ---------------------------------------------------------------------------

/**
 * Hugging Face 小批量采集（每类 limit 20、每类 enrich 5；允许匿名访问）。
 * 网络超时等失败写入 failed 状态，不删除已有数据。
 */
export async function runHuggingFaceCollection(opts: JobRunOptions = {}): Promise<JobResult> {
  const startedAt = nowIso();
  const logger = opts.logger ?? createLogger({ level: "info" });

  try {
    const { collectHuggingFace } = await import("@/lib/collectors/huggingface/collector");

    const supabase = createAdminClient();
    const r = await collectHuggingFace(supabase, {
      sourceId: "huggingface",
      limitPerType: 20,
      enrichLimit: 5,
      skipCards: false,
      dryRun: false,
      hfClientOpts: {
        baseUrl: envOf(opts, "HF_API_BASE_URL") ?? "https://huggingface.co",
        token: envOf(opts, "HF_TOKEN") ?? undefined,
        timeoutMs: numEnv(opts, "HF_REQUEST_TIMEOUT_MS", 15_000),
        maxRetries: numEnv(opts, "HF_MAX_RETRIES", 2),
        logger,
      },
    });

    return result("huggingface", mapStatus(r.status), startedAt, {
      discovered:
        r.discovery.models.length + r.discovery.datasets.length + r.discovery.spaces.length,
      persisted: r.stats.models_found + r.stats.datasets_found + r.stats.spaces_found,
      errors: r.stats.errors,
      message: r.error ?? undefined,
    });
  } catch (err) {
    logger.error("job.huggingface.failed", { error: err instanceof Error ? err.message : String(err) });
    return result("huggingface", "failed", startedAt, {
      errors: 1,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

// ---------------------------------------------------------------------------
// arXiv
// ---------------------------------------------------------------------------

const ARXIV_ROTATION_KEY = "__arxiv_rotation_cursor__";

/**
 * arXiv 小批量采集（每次最多 4 个轮换查询组、每组最多 20 条）。
 * 使用 collector_state 保存轮换起点，避免每天只抓前几个主题。
 * arXiv 无需 Token。
 */
export async function runArxivCollection(opts: JobRunOptions = {}): Promise<JobResult> {
  const startedAt = nowIso();
  const logger = opts.logger ?? createLogger({ level: "info" });

  try {
    const { collectArxiv } = await import("@/lib/collectors/arxiv/collector");
    const { enabledArxivGroups } = await import("@/config/arxiv-discovery");

    const supabase = createAdminClient();
    const sourceId = await ensureSourceId(supabase, "arxiv");

    // 轮换：从上次起点取 4 组（循环）
    const maxGroups = 4;
    const allGroupIds = enabledArxivGroups().map((g) => g.id);
    let cursor = 0;
    try {
      const st = await getState(supabase, sourceId, ARXIV_ROTATION_KEY);
      const raw = st?.state_value?.cursor;
      if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
        cursor = Math.floor(raw) % Math.max(1, allGroupIds.length);
      }
    } catch {
      // 读不到则从头开始
    }
    const rotated = allGroupIds.length > 0
      ? [...allGroupIds.slice(cursor), ...allGroupIds.slice(0, cursor)].slice(0, maxGroups)
      : [];

    const r = await collectArxiv(supabase, {
      sourceId,
      maxResultsPerQuery: 20,
      maxGroups,
      discoveryDays: numEnv(opts, "ARXIV_DISCOVERY_DAYS", 7),
      groupIds: rotated,
      dryRun: false,
      arxivClientOpts: {
        baseUrl: envOf(opts, "ARXIV_API_BASE_URL") ?? "https://export.arxiv.org/api/query",
        timeoutMs: numEnv(opts, "ARXIV_REQUEST_TIMEOUT_MS", 20_000),
        maxRetries: numEnv(opts, "ARXIV_MAX_RETRIES", 2),
        requestIntervalMs: numEnv(opts, "ARXIV_REQUEST_INTERVAL_MS", 3000),
        logger,
      },
    });

    // 保存下一次轮换起点
    const nextCursor = (cursor + Math.max(1, rotated.length)) % Math.max(1, allGroupIds.length);
    try {
      await upsertState(supabase, {
        source_id: sourceId,
        state_key: ARXIV_ROTATION_KEY,
        state_value: { cursor: nextCursor, rotated_at: nowIso(), groups: rotated },
        etag: null,
        last_modified: null,
      });
    } catch (err) {
      logger.warn("job.arxiv.cursor_save_failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return result("arxiv", mapStatus(r.status), startedAt, {
      discovered: r.discovery.fetched,
      persisted: r.stats.papers_found,
      errors: r.stats.errors,
      message: r.error ?? undefined,
    });
  } catch (err) {
    logger.error("job.arxiv.failed", { error: err instanceof Error ? err.message : String(err) });
    return result("arxiv", "failed", startedAt, {
      errors: 1,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

// ---------------------------------------------------------------------------
// AI Analyze
// ---------------------------------------------------------------------------

/**
 * AI 分析小批量任务（每次最多 10 条）。
 * 只分析无成功结果或输入变化的条目（analyzeItem 内幂等去重）；
 * 单条失败不终止批次；更新 score_components 与 items.latest_score。
 * 缺少 TokenHub 配置时返回 skipped。
 */
export async function runAiAnalysis(opts: JobRunOptions = {}): Promise<JobResult> {
  const startedAt = nowIso();
  const logger = opts.logger ?? createLogger({ level: "info" });

  const baseUrl = envOf(opts, "AI_BASE_URL");
  const apiKey = envOf(opts, "AI_API_KEY");
  const model = envOf(opts, "AI_MODEL");
  if (!baseUrl || !apiKey || !model) {
    return result("analyze", "skipped", startedAt, {
      message: "缺少 AI_BASE_URL / AI_API_KEY / AI_MODEL，AI 分析跳过",
    });
  }

  const limit = numEnv(opts, "AI_ANALYSIS_BATCH_SIZE", 10);
  const maxInputChars = numEnv(opts, "AI_MAX_INPUT_CHARS", 12_000);
  const temperature = Number(envOf(opts, "AI_TEMPERATURE")) || 0.2;
  const timeoutMs = numEnv(opts, "AI_REQUEST_TIMEOUT_MS", 60_000);
  const maxRetries = numEnv(opts, "AI_MAX_RETRIES", 2);

  try {
    const { createAiProvider } = await import("@/lib/ai/provider");
    const { ANALYSIS_PROMPT_VERSION, ANALYSIS_SCHEMA_VERSION } = await import("@/lib/ai/schema");
    const { analyzeItem } = await import("@/lib/ai/analyze-item");
    const { computeBasicScore } = await import("@/lib/scoring/basic-score");
    const {
      selectItemsForAnalysis,
      getAnalysisDocuments,
      getLatestSnapshot,
    } = await import("@/lib/db/repositories/ai-analyses");
    const { upsertBasicScore, updateLatestScore } = await import(
      "@/lib/db/repositories/score-components"
    );

    const supabase: SupabaseClient = createAdminClient();
    const provider = createAiProvider({
      tokenHub: { baseUrl, apiKey, model, timeoutMs, maxRetries, temperature },
      promptVersion: ANALYSIS_PROMPT_VERSION,
      schemaVersion: ANALYSIS_SCHEMA_VERSION,
      logger,
    });

    const pool = await selectItemsForAnalysis(supabase, {
      poolLimit: Math.max(limit, 20),
      model,
      promptVersion: ANALYSIS_PROMPT_VERSION,
    });

    if (pool.length === 0) {
      return result("analyze", "skipped", startedAt, { message: "无待分析条目" });
    }

    let analyzed = 0;
    let errors = 0;
    for (const item of pool) {
      if (analyzed >= limit) break;
      const [documents, snapshot] = await Promise.all([
        getAnalysisDocuments(supabase, item.id),
        getLatestSnapshot(supabase, item.id),
      ]);
      const r = await analyzeItem(supabase, {
        item,
        documents,
        snapshot,
        provider,
        model,
        promptVersion: ANALYSIS_PROMPT_VERSION,
        schemaVersion: ANALYSIS_SCHEMA_VERSION,
        maxInputChars,
        dryRun: false,
        force: false,
      });

      if (r.status === "success") {
        analyzed++;
        try {
          const score = computeBasicScore({
            source: item.source_slug,
            itemType: item.item_type,
            title: item.title,
            description: item.description,
            topics: item.topics,
            createdAtSource: item.created_at_source,
            pushedAtSource: item.pushed_at_source,
            stars: snapshot?.stars ?? null,
            forks: snapshot?.forks ?? null,
            downloads: snapshot?.downloads ?? null,
            likes: snapshot?.likes ?? null,
            aiResult: r.result,
          });
          await upsertBasicScore(supabase, item.id, score);
          await updateLatestScore(supabase, item.id, score.total);
        } catch (err) {
          errors++;
          logger.warn("job.analyze.score_failed", {
            item_id: item.id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      } else if (r.status === "failed") {
        errors++;
        logger.warn("job.analyze.item_failed", {
          item_id: item.id,
          error: r.error,
        });
      }
    }

    const status: JobResult["status"] =
      analyzed === 0 && errors > 0 ? "failed" : errors > 0 ? "partial" : "succeeded";
    return result("analyze", status, startedAt, { analyzed, errors });
  } catch (err) {
    logger.error("job.analyze.failed", { error: err instanceof Error ? err.message : String(err) });
    return result("analyze", "failed", startedAt, {
      errors: 1,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

function mapStatus(status: string): JobResult["status"] {
  switch (status) {
    case "success":
      return "succeeded";
    case "partial":
      return "partial";
    case "failed":
      return "failed";
    default:
      return "failed";
  }
}
