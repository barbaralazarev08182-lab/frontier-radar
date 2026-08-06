/**
 * Supabase 数据层诊断脚本（阶段 1.6）。
 *
 * 用法：npm run doctor:supabase
 *
 * 检查项：
 *   - 数据模式（fixture / supabase）
 *   - Supabase URL / anon key / service role key 是否存在
 *   - 是否能连接 Supabase（最小查询）
 *   - frontier_feed_v1 View 是否可查询
 *   - 是否有数据（只输出计数，不输出用户数据内容）
 *
 * 禁止输出：密钥、密钥长度、完整数据库错误对象、用户数据内容。
 * 未配置真实 Supabase 时只报告未配置，不影响 fixture 页面。
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

function checkPresent(key: string, env: Record<string, string>) {
  const value = env[key];
  return { key, present: !!value && value.length > 0, label: value ? "已配置" : "未配置（缺失）" };
}

async function main() {
  const env = loadEnv();
  const { resolveDataMode } = await import("@/lib/feed/provider");

  const results = {
    timestamp: new Date().toISOString(),
    checks: {} as Record<string, unknown>,
  };

  // 1) 数据模式（脚本侧与 Next 相同的解析逻辑；脚本无 NODE_ENV 差异按开发默认）
  results.checks["data_mode"] = {
    value: resolveDataMode(env.FRONTIER_DATA_MODE, false),
    env_value: env.FRONTIER_DATA_MODE ?? "（未设置，开发默认 fixture）",
  };

  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  results.checks["supabase_url"] = checkPresent("NEXT_PUBLIC_SUPABASE_URL", env);
  results.checks["supabase_anon_key"] = checkPresent("NEXT_PUBLIC_SUPABASE_ANON_KEY", env);
  results.checks["supabase_service_role"] = checkPresent("SUPABASE_SERVICE_ROLE_KEY", env);

  if (!url || !anonKey) {
    results.checks["connection"] = {
      ok: null,
      note: "未配置 Supabase，跳过连接检查（fixture 页面不受影响）",
    };
    results.checks["frontier_feed_v1"] = { queryable: null, note: "跳过" };
    process.stdout.write(JSON.stringify(results, null, 2) + "\n");
    process.exitCode = 0;
    return;
  }

  // 2) 连接检查（匿名 key + 最小查询；输出只含状态）
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { error } = await client.from("sources").select("id").limit(1);
    if (error) {
      results.checks["connection"] = {
        ok: false,
        error: `连接失败（${error.code ?? "unknown"}）`,
      };
    } else {
      results.checks["connection"] = { ok: true, note: "可以连接 Supabase" };
    }
  } catch (err) {
    results.checks["connection"] = {
      ok: false,
      error: `网络异常: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // 3) frontier_feed_v1 可查询 + 计数
  try {
    const { count, error } = await client
      .from("frontier_feed_v1")
      .select("item_id", { count: "exact", head: true });
    if (error) {
      results.checks["frontier_feed_v1"] = {
        queryable: false,
        note: `查询失败（${error.code ?? "unknown"}）；请确认已应用迁移 0001–0008`,
      };
    } else {
      results.checks["frontier_feed_v1"] = {
        queryable: true,
        item_count: typeof count === "number" ? count : null,
      };
    }
  } catch (err) {
    results.checks["frontier_feed_v1"] = {
      queryable: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  process.stdout.write(JSON.stringify(results, null, 2) + "\n");
  process.exitCode = 0;
}

main().catch((err) => {
  process.stderr.write(`[doctor:supabase] 错误：${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
