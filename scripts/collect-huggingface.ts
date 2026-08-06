/**
 * HuggingFace Hub 采集脚本（阶段 1.3）。
 *
 * 用法：
 *   npm run collect:huggingface          # 真实采集（需 Supabase）
 *   npm run collect:huggingface:dry      # dry-run（可匿名运行）
 *   npm run collect:huggingface:smoke    # smoke 测试（少量数据）
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
  types: string[];
  limitPerType: number;
  enrichLimit: number;
  skipCards: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    dryRun: false,
    types: ["models", "datasets", "spaces"],
    limitPerType: 50,
    enrichLimit: 10,
    skipCards: false,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--dry-run") result.dryRun = true;
    else if (a === "--skip-cards") result.skipCards = true;
    else if (a === "--limit-per-type" && args[i + 1]) result.limitPerType = Number(args[++i]) || 50;
    else if (a === "--enrich-limit" && args[i + 1]) result.enrichLimit = Number(args[++i]) || 10;
    else if (a === "--types" && args[i + 1]) result.types = (args[++i] ?? "").split(",").map((t) => t.trim());
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

  // HF 客户端选项
  const hfOpts = {
    baseUrl: env.HF_API_BASE_URL ?? "https://huggingface.co",
    token: env.HF_TOKEN ?? undefined,
    timeoutMs: Number(env.HF_REQUEST_TIMEOUT_MS) || 15_000,
    maxRetries: Number(env.HF_MAX_RETRIES) || 2,
  };

  // Supabase（仅非 dry-run）
  const supabase = cli.dryRun ? null : await createSupabaseClient(env);

  // 导入采集器
  const { collectHuggingFace } = await import(
    "@/lib/collectors/huggingface/collector"
  );

  console.error(`[collect:hf] 模式=${cli.dryRun ? "dry-run" : "live"} types=[${cli.types.join(",")}] limit=${cli.limitPerType} enrich=${cli.enrichLimit}`);

  const result = await collectHuggingFace(supabase, {
    sourceId: "huggingface",
    limitPerType: cli.limitPerType,
    enrichLimit: cli.enrichLimit,
    skipCards: cli.skipCards,
    dryRun: cli.dryRun,
    hfClientOpts: hfOpts,
  });

  // 输出 JSON 结果
  const output = {
    timestamp: new Date().toISOString(),
    mode: cli.dryRun ? "dry-run" : "live",
    status: result.status,
    run_id: result.runId,
    discovery: {
      models: result.discovery.models.length,
      datasets: result.discovery.datasets.length,
      spaces: result.discovery.spaces.length,
      total_before_dedup:
        result.discovery.totalDiscovered.models +
        result.discovery.totalDiscovered.datasets +
        result.discovery.totalDiscovered.spaces,
    },
    stats: result.stats,
    error: result.error ?? null,
  };

  process.stdout.write(JSON.stringify(output, null, 2) + "\n");

  // 退出码
  if (result.status === "failed") process.exitCode = 1;
  else if (result.status === "partial") process.exitCode = 2;
  else process.exitCode = 0;
}

main().catch((err) => {
  process.stderr.write(`[collect:hf] 致命错误：${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
