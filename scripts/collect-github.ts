/**
 * GitHub 采集命令行入口（阶段 1.2.1 加固）。
 *
 * 用法：
 *   npm run collect:github          # 真实采集（需 GITHUB_TOKEN + Supabase 配置）
 *   npm run collect:github:dry      # dry-run（调用真实 GitHub API，不写数据库）
 *   npm run collect:github:smoke    # 最小冒烟测试（dry-run + 限制参数）
 *
 * 新增参数（阶段 1.2.1）：
 *   --max-groups N          本次运行最大查询组数
 *   --max-search-requests N 最大 Search 请求数
 *   --pages-per-query N     每查询分页数（覆盖环境变量）
 *   --enrich-limit N        README enrichment 上限
 *   --skip-readme           跳过 README 获取
 *   --resume                从上次中断位置继续
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { GitHubClient } from "@/lib/github/client";
import {
  GitHubCollector,
  DryRunSink,
  type CollectorSink,
} from "@/lib/collectors/github/collector";
import { SupabaseCollectorSink } from "@/lib/collectors/github/sink";
import { loadBudgetConfig } from "@/lib/collectors/github/budget";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureSourceId } from "@/lib/db/repositories/sources";
import { createLogger } from "@/lib/logger";
import { computeSinceDate, enabledGroups } from "@/config/github-discovery";
import { assertHasToken } from "@/lib/github/client";

// ---------------------------------------------------------------------------
// .env 加载
// ---------------------------------------------------------------------------
function loadEnv(): void {
  const files = [".env.local", ".env"];
  for (const f of files) {
    const p = resolve(process.cwd(), f);
    if (!existsSync(p)) continue;
    const content = readFileSync(p, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 参数解析（阶段 1.2.1 扩展）
// ---------------------------------------------------------------------------
interface CliArgs {
  dryRun: boolean;
  discoveryDays: number;
  pagesPerQuery: number;
  perPage: number;
  enrichLimit: number;
  minStars: number;
  readmeMaxBytes: number;
  // 阶段 1.2.1 新增
  maxGroups?: number;
  maxSearchRequests?: number;
  skipReadme: boolean;
  resume: boolean;
}

function num(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseArgs(argv: string[]): CliArgs {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  return {
    dryRun: argv.includes("--dry-run"),
    discoveryDays: num(
      get("--days"),
      num(process.env.GITHUB_DISCOVERY_DAYS, 7)
    ),
    pagesPerQuery: num(
      get("--pages-per-query"),
      num(get("--pages"),
      num(process.env.GITHUB_SEARCH_PAGES_PER_QUERY, 2))
    ),
    perPage: num(
      get("--per-page"),
      num(process.env.GITHUB_SEARCH_PER_PAGE, 50)
    ),
    enrichLimit: num(
      get("--enrich-limit"),
      num(process.env.GITHUB_ENRICH_LIMIT, 50)
    ),
    minStars: num(get("--min-stars"), 0),
    readmeMaxBytes: num(get("--readme-max-bytes"), 50_000),
    // 阶段 1.2.1
    maxGroups: get("--max-groups") ? num(get("--max-groups"), 6) : undefined,
    maxSearchRequests: get("--max-search-requests")
      ? num(get("--max-search-requests"), 24)
      : undefined,
    skipReadme: argv.includes("--skip-readme"),
    resume: argv.includes("--resume"),
  };
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

async function main(): Promise<void> {
  loadEnv();
  const args = parseArgs(process.argv.slice(2));
  const logger = createLogger({ level: "info" });
  const budget = loadBudgetConfig();

  const token = process.env.GITHUB_TOKEN;
  const client = new GitHubClient({
    baseUrl: process.env.GITHUB_API_BASE_URL ?? "https://api.github.com",
    apiVersion: process.env.GITHUB_API_VERSION ?? "2026-03-10",
    token,
    timeoutMs: num(process.env.GITHUB_REQUEST_TIMEOUT_MS, 15_000),
    maxRetries: num(process.env.GITHUB_MAX_RETRIES, 3),
    logger,
  });

  const since = computeSinceDate(args.discoveryDays);
  const snapshotDate = businessDateShanghai();

  // 构建采集器公共选项
  function baseCollectorOpts(sink: CollectorSink) {
    return {
      client,
      sink,
      sourceId: "dry-run",
      discoveryDays: args.discoveryDays,
      pagesPerQuery: args.pagesPerQuery,
      perPage: args.perPage,
      enrichLimit: args.enrichLimit,
      minStars: args.minStars,
      readmeMaxBytes: args.readmeMaxBytes,
      snapshotDate,
      groups: enabledGroups(), // 预算控制会在内部选择子集
      budget,
      maxGroups: args.maxGroups,
      maxSearchRequests: args.maxSearchRequests,
      skipReadme: args.skipReadme,
      logger,
    };
  }

  if (args.dryRun) {
    if (!token) {
      process.stderr.write(
        "[collect:github:dry] 缺少 GITHUB_TOKEN。\n" +
          "dry-run 需要真实调用 GitHub API，未配置 Token 时受匿名限流限制，" +
          "为避免伪造成功结果，本命令在未配置 Token 时不执行真实发现。\n" +
          "请先在 .env.local 配置 GITHUB_TOKEN（fine-grained PAT）后重试。\n"
      );
      process.exitCode = 0;
      return;
    }
    const sink = new DryRunSink();
    const collector = new GitHubCollector(baseCollectorOpts(sink as CollectorSink));
    const result = await collector.collect();
    const rl = client.getLastRateLimit();
    const summary = {
      mode: "dry-run",
      status: result.status,
      time_window: { since, snapshot_date: snapshotDate },
      discovered: result.discovered,
      deduplicated: result.deduplicated,
      would_insert: result.inserted,
      would_update: result.updated,
      unchanged: result.unchanged,
      would_readmes: sink.wouldWrite.readmes,
      would_snapshots: result.snapshots,
      requests: result.requests,
      errors: result.errorCount,
      rate_limit_remaining: rl?.remaining ?? null,
      rate_limit_reset: rl?.resetAtMs
        ? new Date(rl.resetAtMs).toISOString()
        : null,
      budget: {
        search_request_budget: budget.searchRequestBudget,
        groups_per_run: budget.groupsPerRun,
        max_groups: args.maxGroups ?? budget.groupsPerRun,
        max_search_requests: args.maxSearchRequests ?? budget.searchRequestBudget,
        skip_readme: args.skipReadme,
      },
      note: "dry-run 不写数据库；would_* 为前瞻性计数（假设均为新增）。",
    };
    process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
    process.exitCode = result.status === "failed" ? 1 : 0;
    return;
  }

  // 真实采集
  try {
    assertHasToken(token);
  } catch (err) {
    process.stderr.write(
      `[collect:github] ${err instanceof Error ? err.message : String(err)}\n`
    );
    process.exitCode = 1;
    return;
  }

  let sink: SupabaseCollectorSink;
  let sourceId: string;
  try {
    const supabase = createAdminClient();
    sourceId = await ensureSourceId(supabase, "github");
    sink = new SupabaseCollectorSink(supabase, sourceId);
  } catch (err) {
    process.stderr.write(
      `[collect:github] Supabase 未配置或初始化失败：${
        err instanceof Error ? err.message : String(err)
      }\n真实采集需要 Supabase 配置（dry-run 可无此配置）。\n`
    );
    process.exitCode = 1;
    return;
  }

  // Resume：读取轮换游标
  let resumeCursor: string | null = null;
  if (args.resume) {
    try {
      const cursorState = await sink.getQueryEtag("__rotation_cursor__");
      if (cursorState) {
        // 从 stateValue 中提取 cursor（实际实现需从 DB 读取完整 state）
        resumeCursor = cursorState;
        logger.info("github.cli.resume_cursor_found", { cursor: resumeCursor });
      }
    } catch {
      // 无法读取游标则从头开始
    }
  }

  const collector = new GitHubCollector({
    ...baseCollectorOpts(sink),
    sourceId,
    getQueryEtag: (key) => sink.getQueryEtag(key),
    getReadmeEtag: (id) => sink.getReadmeEtag(id),
    resumeCursor,
  });

  const result = await collector.collect();
  const rl = client.getLastRateLimit();
  const summary = {
    mode: "real",
    status: result.status,
    time_window: { since, snapshot_date: snapshotDate },
    discovered: result.discovered,
    deduplicated: result.deduplicated,
    inserted: result.inserted,
    updated: result.updated,
    unchanged: result.unchanged,
    snapshots: result.snapshots,
    requests: result.requests,
    errors: result.errorCount,
    rate_limit_remaining: rl?.remaining ?? null,
    rate_limit_reset: rl?.resetAtMs ? new Date(rl.resetAtMs).toISOString() : null,
    budget: {
      search_request_budget: budget.searchRequestBudget,
      groups_per_run: budget.groupsPerRun,
      max_groups: args.maxGroups ?? budget.groupsPerRun,
      max_search_requests: args.maxSearchRequests ?? budget.searchRequestBudget,
      skip_readme: args.skipReadme,
      resumed: args.resume,
    },
  };
  process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
  process.exitCode = result.status === "failed" ? 1 : 0;
}

main().catch((err) => {
  process.stderr.write(
    `[collect:github] 未捕获错误：${err instanceof Error ? err.message : String(err)}\n`
  );
  process.exitCode = 1;
});
