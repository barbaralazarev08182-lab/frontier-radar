/**
 * GitHub 采集器诊断脚本（阶段 1.2.1）。
 *
 * 用法：npm run doctor:github
 *
 * 检查项（不输出任何密钥值）：
 *   - GITHUB_TOKEN 是否存在
 *   - Supabase URL / service role key 是否存在
 *   - API Base URL / Version
 *   - 查询组数量与预算配置
 *   - 当前环境能否访问 GitHub API（仅 HEAD 请求，不消耗配额）
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// .env 加载（与 collect-github.ts 同步）
// ---------------------------------------------------------------------------
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
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
      if (env[key] === undefined) {
        env[key] = value;
      }
    }
  }
  return env;
}

// ---------------------------------------------------------------------------
// 安全检查函数（绝不输出密钥值）
// ---------------------------------------------------------------------------

function checkPresent(key: string, env: Record<string, string>): { key: string; present: boolean; label: string } {
  const value = env[key];
  return {
    key,
    present: !!value && value.length > 0,
    label: value ? `已配置 (${value.length > 0 ? "✓" : ""})` : "未配置（缺失）",
  };
}

async function checkApiReachable(baseUrl: string): Promise<{ reachable: boolean; status?: number; error?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${baseUrl}/`, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "manual",
    });
    clearTimeout(timeout);
    return { reachable: true, status: res.status };
  } catch (err) {
    return { reachable: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  const env = loadEnv();

  const results = {
    timestamp: new Date().toISOString(),
    checks: {} as Record<string, unknown>,
  };

  // 1) GitHub Token
  results.checks["github_token"] = checkPresent("GITHUB_TOKEN", env);

  // 2) Supabase
  results.checks["supabase_url"] = checkPresent("NEXT_PUBLIC_SUPABASE_URL", env);
  results.checks["supabase_service_role"] = checkPresent("SUPABASE_SERVICE_ROLE_KEY", env);

  // 3) API 配置
  results.checks["github_api_base_url"] = {
    value: env.GITHUB_API_BASE_URL ?? "https://api.github.com（默认）",
  };
  results.checks["github_api_version"] = {
    value: env.GITHUB_API_VERSION ?? "2026-03-10（默认）",
  };

  // 4) 查询组数量（硬编码，不依赖运行时 import）
  results.checks["discovery_groups"] = {
    count: 18, // 与 github-discovery.ts DISCOVERY_GROUPS 长度一致
    note: "详见 src/config/github-discovery.ts",
  };

  // 5) 预算配置
  results.checks["budget"] = {
    search_request_budget: Number(env.GITHUB_SEARCH_REQUEST_BUDGET) || 24,
    search_rate_limit_reserve: Number(env.GITHUB_SEARCH_RATE_LIMIT_RESERVE) || 3,
    core_rate_limit_reserve: Number(env.GITHUB_CORE_RATE_LIMIT_RESERVE) || 50,
    groups_per_run: Number(env.GITHUB_DISCOVERY_GROUPS_PER_RUN) || 6,
  };

  // 6) GitHub API 可达性（HEAD / ，不消耗搜索配额）
  const baseUrl = env.GITHUB_API_BASE_URL ?? "https://api.github.com";
  const apiCheck = await checkApiReachable(baseUrl);
  results.checks["github_api_reachable"] = apiCheck;

  // 输出报告（JSON）
  process.stdout.write(JSON.stringify(results, null, 2) + "\n");

  // 退出码：Token 缺失 → 1；API 不可达 → 2；否则 0
  const tokenOk = results.checks["github_token"] as { present: boolean };
  const apiOk = results.checks["github_api_reachable"] as { reachable: boolean };
  if (!tokenOk.present) {
    process.exitCode = 1;
  } else if (!apiOk.reachable) {
    process.exitCode = 2;
  } else {
    process.exitCode = 0;
  }
}

main().catch((err) => {
  process.stderr.write(`[doctor:github] 错误：${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
