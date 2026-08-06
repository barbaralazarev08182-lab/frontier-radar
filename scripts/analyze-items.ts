/**
 * 分析脚本：对数据库中的待分析条目执行 AI 分析 + 基础排序（阶段 1.5）。
 *
 * 用法：
 *   npm run analyze:items                 # 真实分析（需 Supabase + AI Key）
 *   npm run analyze:items:dry             # dry-run：准备输入、展示字符数，不调模型不写库
 *   npm run analyze:items:smoke           # dry-run 1 条
 *   npm run analyze:items -- --limit=5 --source=arxiv --force
 *
 * CLI 参数：
 *   --limit=N      最多分析 N 条（默认 AI_ANALYSIS_BATCH_SIZE）
 *   --source=a,b   只分析这些来源（github / huggingface / arxiv）
 *   --item-id=id   只分析指定 item
 *   --force        忽略幂等去重强制重新分析（默认关闭）
 *   --dry-run      不调用模型、不写数据库（无数据库时使用内置 fixture）
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
  limit: number;
  sources: string[];
  itemId: string | null;
  force: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = { dryRun: false, limit: 0, sources: [], itemId: null, force: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    const eq = a.indexOf("=");
    const flag = eq > 0 ? a.slice(0, eq) : a;
    const value = eq > 0 ? a.slice(eq + 1) : args[i + 1] ?? null;
    if (flag === "--dry-run") { result.dryRun = true; continue; }
    if (flag === "--force") { result.force = true; continue; }
    if (value === null) continue;
    if (value !== null && eq <= 0) i++;
    switch (flag) {
      case "--limit": result.limit = Number(value) || 0; break;
      case "--source": result.sources = value.split(",").map((s) => s.trim()).filter(Boolean); break;
      case "--item-id": result.itemId = value; break;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Supabase 客户端（延迟导入）
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

  const baseUrl = env.AI_BASE_URL ?? "";
  const apiKey = env.AI_API_KEY ?? "";
  const model = env.AI_MODEL ?? "";
  const { ANALYSIS_PROMPT_VERSION, ANALYSIS_SCHEMA_VERSION } = await import("@/lib/ai/schema");
  const promptVersion = ANALYSIS_PROMPT_VERSION;
  const schemaVersion = ANALYSIS_SCHEMA_VERSION;
  const timeoutMs = Number(env.AI_REQUEST_TIMEOUT_MS) || 60_000;
  const maxRetries = Number(env.AI_MAX_RETRIES) || 2;
  const maxInputChars = Number(env.AI_MAX_INPUT_CHARS) || 12_000;
  const temperature = Number(env.AI_TEMPERATURE) || 0.2;
  const defaultLimit = Number(env.AI_ANALYSIS_BATCH_SIZE) || 10;
  const limit = cli.limit > 0 ? cli.limit : defaultLimit;

  if (!cli.dryRun && (!baseUrl || !apiKey || !model)) {
    console.error("[analyze:items] 真实分析需要 AI_BASE_URL / AI_API_KEY / AI_MODEL（dry-run 可缺省）。");
    process.exitCode = 1;
    return;
  }

  const supabase = cli.dryRun ? null : await createSupabaseClient(env);
  if (!cli.dryRun && !supabase) {
    console.error("[analyze:items] 缺少 Supabase 配置，无法真实分析。");
    process.exitCode = 1;
    return;
  }

  const { createAiProvider } = await import("@/lib/ai/provider");
  const provider = createAiProvider({
    tokenHub: { baseUrl, apiKey, model, timeoutMs, maxRetries, temperature },
    promptVersion,
    schemaVersion,
  });

  // -------------------------------------------------------------------------
  // 候选池
  // -------------------------------------------------------------------------
  type Candidate = {
    item: import("@/lib/ai/types").AnalysisItemRow;
    documents: import("@/lib/ai/types").AnalysisDocument[];
    snapshot: import("@/lib/ai/types").AnalysisSnapshot | null;
  };
  const candidates: Candidate[] = [];

  if (supabase) {
    const {
      selectItemsForAnalysis,
      getAnalysisDocuments,
      getLatestSnapshot,
    } = await import("@/lib/db/repositories/ai-analyses");
    const pool = await selectItemsForAnalysis(supabase, {
      sources: cli.sources,
      itemId: cli.itemId ?? undefined,
      poolLimit: Math.max(limit, 20),
      model,
      promptVersion,
    });
    for (const item of pool) {
      const [documents, snapshot] = await Promise.all([
        getAnalysisDocuments(supabase, item.id),
        getLatestSnapshot(supabase, item.id),
      ]);
      candidates.push({ item, documents, snapshot });
    }
  } else {
    const { ANALYSIS_FIXTURES } = await import("@/lib/ai/__fixtures__/analysis-items");
    const fixtures = cli.sources.length > 0
      ? ANALYSIS_FIXTURES.filter((f) => cli.sources.includes(f.item.source_slug))
      : ANALYSIS_FIXTURES;
    for (const f of fixtures) candidates.push({ item: f.item, documents: f.documents, snapshot: f.snapshot });
  }

  if (candidates.length === 0) {
    process.stdout.write(JSON.stringify({ timestamp: new Date().toISOString(), mode: cli.dryRun ? "dry-run" : "live", status: "no-candidates" }, null, 2) + "\n");
    return;
  }

  // -------------------------------------------------------------------------
  // 分析 + 评分
  // -------------------------------------------------------------------------
  const { analyzeItem } = await import("@/lib/ai/analyze-item");
  const { computeBasicScore } = await import("@/lib/scoring/basic-score");
  const { upsertBasicScore, updateLatestScore } = await import("@/lib/db/repositories/score-components");

  const results: Array<Record<string, unknown>> = [];
  let analyzed = 0;
  let success = 0;
  let skipped = 0;
  let failed = 0;
  let dryRunCount = 0;

  for (const c of candidates) {
    if (analyzed >= limit) break;
    analyzed++;
    const r = await analyzeItem(supabase, {
      item: c.item,
      documents: c.documents,
      snapshot: c.snapshot,
      provider,
      model,
      promptVersion,
      schemaVersion,
      maxInputChars,
      dryRun: cli.dryRun,
      force: cli.force,
    });

    const entry: Record<string, unknown> = {
      source: c.item.source_slug,
      item_type: c.item.item_type,
      title: c.item.title,
      status: r.status,
      char_count: r.charCount ?? null,
    };
    if ("reason" in r && r.reason) entry.reason = r.reason;
    if (r.status === "failed") entry.error = r.error;

    if (r.status === "success") {
      success++;
      // 完成 AI 分析后计算完整分并持久化
      if (!cli.dryRun && supabase) {
        const score = computeBasicScore({
          source: c.item.source_slug,
          itemType: c.item.item_type,
          title: c.item.title,
          description: c.item.description,
          topics: c.item.topics,
          createdAtSource: c.item.created_at_source,
          pushedAtSource: c.item.pushed_at_source,
          stars: c.snapshot?.stars ?? null,
          forks: c.snapshot?.forks ?? null,
          downloads: c.snapshot?.downloads ?? null,
          likes: c.snapshot?.likes ?? null,
          aiResult: r.result,
        });
        await upsertBasicScore(supabase, c.item.id, score);
        await updateLatestScore(supabase, c.item.id, score.total);
        entry.score_total = score.total;
        entry.score_has_ai = score.hasAi;
      }
    } else if (r.status === "skipped") {
      skipped++;
    } else if (r.status === "dry-run") {
      dryRunCount++;
    } else {
      failed++;
    }
    results.push(entry);
  }

  const output = {
    timestamp: new Date().toISOString(),
    mode: cli.dryRun ? "dry-run" : "live",
    status: failed > 0 && success === 0 ? "failed" : "success",
    config: {
      provider: env.AI_PROVIDER ?? "tencent",
      model,
      prompt_version: promptVersion,
      schema_version: schemaVersion,
      max_input_chars: maxInputChars,
      temperature,
      limit,
      force: cli.force,
    },
    stats: {
      candidates: candidates.length,
      processed: results.length,
      success,
      skipped,
      failed,
      dry_run: dryRunCount,
    },
    items: results,
    note: cli.dryRun ? "dry-run：未调用模型、未写数据库" : "已写入 ai_analyses 与 score_components",
  };

  process.stdout.write(JSON.stringify(output, null, 2) + "\n");
  if (output.status === "failed") process.exitCode = 1;
}

main().catch((err) => {
  process.stderr.write(`[analyze:items] 致命错误：${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
