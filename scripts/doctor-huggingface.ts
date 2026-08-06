/**
 * HuggingFace 采集器诊断脚本（阶段 1.3）。
 *
 * 用法：npm run doctor:huggingface
 *
 * 检查项（不输出任何密钥值）：
 *   - HF_TOKEN 是否存在
 *   - Supabase URL / service role key 是否存在
 *   - API Base URL
 *   - 查询组数量与配置
 *   - 当前环境能否访问 HuggingFace API（仅 HEAD 请求，不消耗配额）
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
// 检查函数
// ---------------------------------------------------------------------------

function checkPresent(key: string, env: Record<string, string>) {
  const value = env[key];
  return {
    key,
    present: !!value && value.length > 0,
    label: value ? "已配置" : "未配置（缺失）",
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
// Main
// ---------------------------------------------------------------------------
async function main() {
  const env = loadEnv();

  // 动态导入配置（避免循环依赖）
  const { HF_DISCOVERY_GROUPS } = await import("@/config/huggingface-discovery");

  const results = {
    timestamp: new Date().toISOString(),
    checks: {} as Record<string, unknown>,
  };

  // 1) HF Token
  results.checks["hf_token"] = checkPresent("HF_TOKEN", env);

  // 2) Supabase
  results.checks["supabase_url"] = checkPresent("NEXT_PUBLIC_SUPABASE_URL", env);
  results.checks["supabase_service_role"] = checkPresent("SUPABASE_SERVICE_ROLE_KEY", env);

  // 3) API 配置
  results.checks["hf_api_base_url"] = {
    value: env.HF_API_BASE_URL ?? "https://huggingface.co（默认）",
  };

  // 4) 查询组数量
  const modelGroups = (HF_DISCOVERY_GROUPS.models ?? []).filter((g) => g.enabled).length;
  const datasetGroups = (HF_DISCOVERY_GROUPS.datasets ?? []).filter((g) => g.enabled).length;
  const spaceGroups = (HF_DISCOVERY_GROUPS.spaces ?? []).filter((g) => g.enabled).length;

  results.checks["discovery_groups"] = {
    models: modelGroups,
    datasets: datasetGroups,
    spaces: spaceGroups,
    total: modelGroups + datasetGroups + spaceGroups,
    note: "详见 src/config/huggingface-discovery.ts",
  };

  // 5) 预算/限制配置
  results.checks["limits"] = {
    limit_per_type: Number(env.HF_DISCOVERY_LIMIT_PER_TYPE) || 50,
    enrich_limit_per_type: Number(env.HF_ENRICH_LIMIT_PER_TYPE) || 10,
    request_timeout_ms: Number(env.HF_REQUEST_TIMEOUT_MS) || 15_000,
    max_retries: Number(env.HF_MAX_RETRIES) || 2,
  };

  // 6) HF API 可达性
  const baseUrl = env.HF_API_BASE_URL ?? "https://huggingface.co";
  const apiCheck = await checkApiReachable(baseUrl);
  results.checks["hf_api_reachable"] = apiCheck;

  // 输出报告
  process.stdout.write(JSON.stringify(results, null, 2) + "\n");

  // 退出码：API 不可达 → 2；否则 0（Token 可选）
  if (!apiCheck.reachable) process.exitCode = 2;
  else process.exitCode = 0;
}

main().catch((err) => {
  process.stderr.write(`[doctor:hf] 错误：${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
