/**
 * arXiv 采集器诊断脚本（阶段 1.4）。
 *
 * 用法：npm run doctor:arxiv
 *
 * 检查项（不输出任何密钥值）：
 *   - arXiv 环境变量配置（Base URL / 超时 / 重试 / 间隔 / 天数）
 *   - 发现组数量与分类覆盖
 *   - 查询串构造正确（buildArxivQuery 快照）
 *   - 当前环境能否访问 arXiv API（1 条真实查询 + XML 解析验证）
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
// Main
// ---------------------------------------------------------------------------
async function main() {
  const env = loadEnv();

  const { enabledArxivGroups, ARXIV_DISCOVERY_GROUPS, buildArxivQuery } = await import(
    "@/config/arxiv-discovery"
  );
  const { ArxivClient } = await import("@/lib/arxiv/client");

  const results = {
    timestamp: new Date().toISOString(),
    checks: {} as Record<string, unknown>,
  };

  // 1) 环境变量
  results.checks["arxiv_api_base_url"] = {
    value: env.ARXIV_API_BASE_URL ?? "https://export.arxiv.org/api/query（默认）",
  };
  results.checks["config"] = {
    discovery_days: Number(env.ARXIV_DISCOVERY_DAYS) || 7,
    max_results_per_query: Number(env.ARXIV_MAX_RESULTS_PER_QUERY) || 30,
    request_timeout_ms: Number(env.ARXIV_REQUEST_TIMEOUT_MS) || 20_000,
    max_retries: Number(env.ARXIV_MAX_RETRIES) || 2,
    request_interval_ms: Number(env.ARXIV_REQUEST_INTERVAL_MS) || 3000,
  };

  // 2) 发现组
  const groups = enabledArxivGroups();
  const categories = new Set<string>();
  for (const g of ARXIV_DISCOVERY_GROUPS) {
    for (const c of g.categories) categories.add(c);
  }
  results.checks["discovery_groups"] = {
    total: ARXIV_DISCOVERY_GROUPS.length,
    enabled: groups.length,
    categories: [...categories],
    note: "详见 src/config/arxiv-discovery.ts",
  };

  // 3) 查询串快照（前 3 组）
  results.checks["query_samples"] = groups.slice(0, 3).map((g) => ({
    id: g.id,
    query: buildArxivQuery(g),
  }));

  // 4) API 可达性 + XML 解析（1 条真实查询）
  const client = new ArxivClient({
    baseUrl: env.ARXIV_API_BASE_URL ?? "https://export.arxiv.org/api/query",
    timeoutMs: 15_000,
    maxRetries: 1,
    requestIntervalMs: 0,
  });

  let apiCheck: Record<string, unknown>;
  try {
    const r = await client.search({
      searchQuery: "cat:cs.LG",
      start: 0,
      maxResults: 1,
      sortBy: "submittedDate",
      sortOrder: "descending",
    });
    apiCheck = {
      reachable: true,
      total_results: r.totalResults,
      entries: r.entries.length,
      first_entry_id: r.entries[0]?.id ?? null,
    };
  } catch (err) {
    apiCheck = {
      reachable: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
  results.checks["arxiv_api_reachable"] = apiCheck;

  process.stdout.write(JSON.stringify(results, null, 2) + "\n");

  if (apiCheck.reachable === false) process.exitCode = 2;
  else process.exitCode = 0;
}

main().catch((err) => {
  process.stderr.write(`[doctor:arxiv] 错误：${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
