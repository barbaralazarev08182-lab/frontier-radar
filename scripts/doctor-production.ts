/**
 * 生产环境诊断（阶段 1.7）。
 *
 * 用法：npm run doctor:production
 *
 * 检查项：
 *   - 数据模式是否为 supabase
 *   - Supabase URL / Publishable 或 anon Key / Secret 或 service role Key
 *   - CRON_SECRET
 *   - GitHub / Hugging Face / AI 配置状态
 *   - frontier_feed_v1 可查询性 + 数据量
 *   - sources 三条记录
 *   - 最近一次 collection run（只输出状态与时间）
 *   - items 数量
 *
 * 禁止输出：密钥、密钥长度、Authorization Header、完整数据库错误、原始内容正文。
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

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

function present(v: string | undefined): boolean {
  return !!v && v.length > 0;
}

async function main() {
  const env = loadEnv();
  const { resolveDataMode } = await import("@/lib/feed/provider");

  const results = {
    timestamp: new Date().toISOString(),
    checks: {} as Record<string, unknown>,
  };

  results.checks["data_mode"] = {
    value: resolveDataMode(env.FRONTIER_DATA_MODE, true),
    env_value: env.FRONTIER_DATA_MODE ?? "（未设置）",
    required: "supabase",
    ok: resolveDataMode(env.FRONTIER_DATA_MODE, true) === "supabase",
  };

  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const publishable = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const secret = env.SUPABASE_SECRET_KEY ?? "";
  const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  results.checks["supabase"] = {
    url: present(url) ? "已配置" : "未配置",
    publishable_key: present(publishable) ? "已配置" : "未配置",
    anon_key: present(anon) ? "已配置" : "未配置",
    secret_key: present(secret) ? "已配置" : "未配置",
    service_role_key: present(serviceRole) ? "已配置" : "未配置",
    // 组合判断（不输出任何值本身）
    read_ready: present(url) && (present(publishable) || present(anon)),
    write_ready: present(url) && (present(secret) || present(serviceRole)),
  };

  results.checks["cron_secret"] = {
    present: present(env.CRON_SECRET),
    required: true,
  };

  results.checks["github"] = {
    token: present(env.GITHUB_TOKEN) ? "已配置" : "未配置（GitHub Cron 将 skipped）",
  };
  results.checks["huggingface"] = {
    token: present(env.HF_TOKEN) ? "已配置（可选）" : "未配置（匿名采集）",
  };
  results.checks["ai"] = {
    configured:
      present(env.AI_BASE_URL) && present(env.AI_API_KEY) && present(env.AI_MODEL),
    note: present(env.AI_BASE_URL) && present(env.AI_API_KEY) && present(env.AI_MODEL)
      ? "已配置（analyze Cron 可用）"
      : "未配置完整（analyze Cron 将 skipped）",
  };

  // 数据库检查（只读，使用 Publishable/anon key）
  if (!present(url) || !(present(publishable) || present(anon))) {
    results.checks["database"] = { note: "Supabase 未配置，跳过数据库检查" };
    process.stdout.write(JSON.stringify(results, null, 2) + "\n");
    process.exitCode = 0;
    return;
  }

  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(url, publishable || anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // frontier_feed_v1 可查询 + 数量
    const feedRes = await client.from("frontier_feed_v1").select("item_id", { count: "exact", head: true });
    results.checks["frontier_feed_v1"] = {
      queryable: !feedRes.error,
      item_count: typeof feedRes.count === "number" ? feedRes.count : null,
      note: feedRes.error ? `查询失败（${feedRes.error.code ?? "unknown"}）；请确认已应用迁移 0001–0008` : undefined,
    };

    // sources 三条记录
    const srcRes = await client.from("sources").select("slug");
    const slugs = (srcRes.data ?? []).map((r) => (r as { slug?: unknown }).slug as string);
    results.checks["sources"] = {
      slugs,
      complete: ["github", "huggingface", "arxiv"].every((s) => slugs.includes(s)),
      note: "缺失时运行 npm run seed:sources",
    };

    // 最近一次 collection run
    const runRes = await client
      .from("collection_runs")
      .select("status, started_at")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (runRes.error) {
      results.checks["latest_run"] = { note: `查询失败（${runRes.error.code ?? "unknown"}）` };
    } else {
      results.checks["latest_run"] = runRes.data
        ? { status: (runRes.data as { status?: unknown }).status, started_at: (runRes.data as { started_at?: unknown }).started_at }
        : { note: "暂无采集运行记录" };
    }

    // items 数量
    const itemsRes = await client.from("items").select("id", { count: "exact", head: true });
    results.checks["items_count"] = typeof itemsRes.count === "number" ? itemsRes.count : null;
  } catch (err) {
    results.checks["database"] = {
      error: `网络异常: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  process.stdout.write(JSON.stringify(results, null, 2) + "\n");
  process.exitCode = 0;
}

main().catch((err) => {
  process.stderr.write(`[doctor:production] 错误：${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
