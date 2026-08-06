/**
 * arXiv 论文采集脚本（阶段 1.4）。
 *
 * 用法：
 *   npm run collect:arxiv              # 真实采集（需 Supabase）
 *   npm run collect:arxiv:dry          # dry-run（可匿名运行）
 *   npm run collect:arxiv:smoke        # smoke 测试（少量数据：1 组 × 5 条）
 *   npm run collect:arxiv:dry -- --categories=cs.LG,eess.AS
 *
 * CLI 参数（保持最小）：
 *   --dry-run       不写数据库，仅真实调用 arXiv API 并完成解析/标准化/去重
 *   --max-groups=N  最多执行 N 个查询组
 *   --max-results=N 每个查询最多结果数
 *   --categories=A,B 只运行包含这些分类的查询组
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// .env 加载
// ---------------------------------------------------------------------------
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const f of [".env.local", ".env"]) {
    const p = resolve(process.cwd(), f);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq <= 0) continue;
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (env[t.slice(0, eq).trim()] === undefined) env[t.slice(0, eq).trim()] = v;
    }
  }
  return env;
}

// ---------------------------------------------------------------------------
// CLI 参数解析
// ---------------------------------------------------------------------------
interface CliArgs {
  dryRun: boolean;
  maxGroups: number;
  maxResults: number;
  categories: string[];
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    dryRun: false,
    maxGroups: 0,
    maxResults: 30,
    categories: [],
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === "--dry-run") {
      result.dryRun = true;
      continue;
    }

    // 支持 "--flag=value" 与 "--flag value" 两种形式
    const eq = a.indexOf("=");
    const flag = eq > 0 ? a.slice(0, eq) : a;
    let value: string | null = eq > 0 ? a.slice(eq + 1) : null;
    if (value === null) {
      value = args[i + 1] ?? null;
      if (value !== null) i++;
    }
    if (value === null) continue;

    switch (flag) {
      case "--max-groups":
        result.maxGroups = Number(value) || 0;
        break;
      case "--max-results":
        result.maxResults = Number(value) || 30;
        break;
      case "--categories":
        result.categories = value.split(",").map((c) => c.trim()).filter(Boolean);
        break;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Supabase 客户端（延迟导入，dry-run 时不需要）
// ---------------------------------------------------------------------------
async function createSupabaseClient(env: Record<string, string>) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const { createClient: createSupabase } = await import("@supabase/supabase-js");
    return createSupabase(url, key);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const env = loadEnv();
  const cli = parseArgs();

  const arxivOpts = {
    baseUrl: env.ARXIV_API_BASE_URL ?? "https://export.arxiv.org/api/query",
    timeoutMs: Number(env.ARXIV_REQUEST_TIMEOUT_MS) || 20_000,
    maxRetries: Number(env.ARXIV_MAX_RETRIES) || 2,
    requestIntervalMs: Number(env.ARXIV_REQUEST_INTERVAL_MS) || 3000,
  };

  const supabase = cli.dryRun ? null : await createSupabaseClient(env);

  const { collectArxiv } = await import("@/lib/collectors/arxiv/collector");

  console.error(
    `[collect:arxiv] 模式=${cli.dryRun ? "dry-run" : "live"} groups=${cli.maxGroups || "all"} max-results=${cli.maxResults} categories=[${cli.categories.join(",") || "all"}]`
  );

  const result = await collectArxiv(supabase, {
    sourceId: "arxiv",
    maxResultsPerQuery: cli.maxResults,
    maxGroups: cli.maxGroups,
    discoveryDays: Number(env.ARXIV_DISCOVERY_DAYS) || 7,
    categoryFilter: cli.categories,
    dryRun: cli.dryRun,
    arxivClientOpts: arxivOpts,
  });

  // 输出 JSON 结果（不输出完整 XML）
  const output = {
    timestamp: new Date().toISOString(),
    mode: cli.dryRun ? "dry-run" : "live",
    status: result.status,
    run_id: result.runId,
    discovery: {
      papers: result.discovery.papers.length,
      fetched: result.discovery.fetched,
      filtered_by_date: result.discovery.filteredByDate,
      groups_run: result.discovery.groupsRun,
    },
    stats: result.stats,
    error: result.error ?? null,
    samples: result.discovery.papers.slice(0, 3).map((p) => ({
      id: p.normalized.sourceItemId,
      title: p.normalized.title.slice(0, 120),
      abstract: (p.normalized.description ?? "").slice(0, 200),
      categories: p.normalized.categories,
    })),
  };

  process.stdout.write(JSON.stringify(output, null, 2) + "\n");

  if (result.status === "failed") process.exitCode = 1;
  else if (result.status === "partial") process.exitCode = 2;
  else process.exitCode = 0;
}

main().catch((err) => {
  process.stderr.write(`[collect:arxiv] 致命错误：${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
