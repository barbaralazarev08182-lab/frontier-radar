/**
 * 数据源幂等初始化（阶段 1.7）。
 *
 * 用法：npm run seed:sources
 *
 * 规则：
 *  - 使用 slug upsert（onConflict: slug）；
 *  - 重复运行不产生重复数据；
 *  - 不删除已有来源；
 *  - 不写演示内容；
 *  - 输出 created / updated / unchanged 数量。
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv(): void {
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
      if (process.env[t.slice(0, eq).trim()] === undefined) {
        process.env[t.slice(0, eq).trim()] = v;
      }
    }
  }
}

const SOURCE_SEEDS = [
  { slug: "github", name: "GitHub", base_url: "https://api.github.com" },
  { slug: "huggingface", name: "Hugging Face", base_url: "https://huggingface.co/api" },
  { slug: "arxiv", name: "arXiv", base_url: "http://export.arxiv.org/api/query" },
] as const;

async function main() {
  loadEnv();
  const { createAdminClient } = await import("@/lib/supabase/admin");

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (err) {
    process.stderr.write(
      `[seed:sources] ${err instanceof Error ? err.message : String(err)}\n` +
        "请配置 NEXT_PUBLIC_SUPABASE_URL 与 SUPABASE_SECRET_KEY（或 SUPABASE_SERVICE_ROLE_KEY）。\n"
    );
    process.exitCode = 1;
    return;
  }

  const stats = { created: 0, updated: 0, unchanged: 0 };

  for (const seed of SOURCE_SEEDS) {
    const { data: existing, error: readError } = await supabase
      .from("sources")
      .select("id, name, base_url")
      .eq("slug", seed.slug)
      .maybeSingle();
    if (readError) {
      throw new Error(`查询 sources 失败: ${readError.message}`);
    }

    if (existing) {
      // 只补齐缺失字段，不覆盖用户自定义内容
      const patch: Record<string, string> = {};
      if (!existing.name && seed.name) patch.name = seed.name;
      if (!existing.base_url && seed.base_url) patch.base_url = seed.base_url;
      if (Object.keys(patch).length > 0) {
        const { error } = await supabase
          .from("sources")
          .update(patch)
          .eq("slug", seed.slug);
        if (error) throw new Error(`更新 sources 失败: ${error.message}`);
        stats.updated++;
      } else {
        stats.unchanged++;
      }
    } else {
      const { error } = await supabase.from("sources").insert({
        slug: seed.slug,
        name: seed.name,
        base_url: seed.base_url,
        enabled: true,
      });
      if (error) throw new Error(`插入 sources 失败: ${error.message}`);
      stats.created++;
    }
  }

  process.stdout.write(
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        stats,
        sources: SOURCE_SEEDS.map((s) => s.slug),
        note: "幂等初始化；重复运行不产生重复数据",
      },
      null,
      2
    ) + "\n"
  );
}

main().catch((err) => {
  process.stderr.write(`[seed:sources] 错误：${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
