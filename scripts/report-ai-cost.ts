import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

interface AnalysisRow {
  status: "success" | "failed";
  token_usage: number | null;
  created_at: string;
}

interface UsageRow {
  source: string;
  provider: string;
  model: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  model_call_count: number;
  repair_count: number;
  created_at: string;
}

interface Bucket {
  analyses: number;
  modelCalls: number;
  repairs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  pricedAnalyses: number;
  estimatedCost: number;
}

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = { ...process.env } as Record<string, string>;
  for (const file of [".env.local", ".env"]) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      if (env[key] !== undefined) continue;
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  }
  return env;
}

function cliValue(name: string): string | null {
  const prefix = `--${name}=`;
  const exact = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return exact ? exact.slice(prefix.length) : null;
}

function finiteNumber(value: string | undefined | null): number | null {
  if (value == null || value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function emptyBucket(): Bucket {
  return {
    analyses: 0,
    modelCalls: 0,
    repairs: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    pricedAnalyses: 0,
    estimatedCost: 0,
  };
}

function addUsage(
  bucket: Bucket,
  row: UsageRow,
  pricing: { inputPerMillion: number | null; outputPerMillion: number | null }
): void {
  bucket.analyses += 1;
  bucket.modelCalls += row.model_call_count ?? 0;
  bucket.repairs += row.repair_count ?? 0;
  bucket.promptTokens += row.prompt_tokens ?? 0;
  bucket.completionTokens += row.completion_tokens ?? 0;
  bucket.totalTokens += row.total_tokens ?? 0;

  if (
    pricing.inputPerMillion != null &&
    pricing.outputPerMillion != null &&
    row.prompt_tokens != null &&
    row.completion_tokens != null
  ) {
    bucket.pricedAnalyses += 1;
    bucket.estimatedCost +=
      (row.prompt_tokens / 1_000_000) * pricing.inputPerMillion +
      (row.completion_tokens / 1_000_000) * pricing.outputPerMillion;
  }
}

function roundedBucket(bucket: Bucket): Bucket & { repairRate: number | null; averageTokensPerAnalysis: number | null } {
  return {
    ...bucket,
    estimatedCost: Number(bucket.estimatedCost.toFixed(6)),
    repairRate: bucket.analyses > 0 ? Number((bucket.repairs / bucket.analyses).toFixed(4)) : null,
    averageTokensPerAnalysis:
      bucket.analyses > 0 ? Math.round(bucket.totalTokens / bucket.analyses) : null,
  };
}

async function main(): Promise<void> {
  const env = loadEnv();
  const days = Math.max(1, Math.floor(finiteNumber(cliValue("days")) ?? 30));
  const inputPerMillion = finiteNumber(
    cliValue("input-cost-per-1m") ?? env.AI_INPUT_COST_PER_1M_TOKENS
  );
  const outputPerMillion = finiteNumber(
    cliValue("output-cost-per-1m") ?? env.AI_OUTPUT_COST_PER_1M_TOKENS
  );
  const currency = cliValue("currency") ?? env.AI_COST_CURRENCY ?? "UNSPECIFIED";
  const pricing = { inputPerMillion, outputPerMillion };

  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("report:ai-cost requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }

  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const supabase = createClient(url, key);

  const [analysisQuery, usageQuery] = await Promise.all([
    supabase
      .from("ai_analyses")
      .select("status,token_usage,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: true }),
    supabase
      .from("ai_usage_events")
      .select(
        "source,provider,model,prompt_tokens,completion_tokens,total_tokens,model_call_count,repair_count,created_at"
      )
      .gte("created_at", since)
      .order("created_at", { ascending: true }),
  ]);

  if (analysisQuery.error) throw new Error(`query ai_analyses failed: ${analysisQuery.error.message}`);
  if (usageQuery.error) {
    throw new Error(
      `query ai_usage_events failed: ${usageQuery.error.message}. Apply the AI-COST-02 migration first.`
    );
  }

  const analyses = (analysisQuery.data ?? []) as AnalysisRow[];
  const usage = (usageQuery.data ?? []) as UsageRow[];
  const success = analyses.filter((row) => row.status === "success").length;
  const failed = analyses.filter((row) => row.status === "failed").length;
  const legacyTotalTokens = analyses.reduce((sum, row) => sum + (row.token_usage ?? 0), 0);

  const total = emptyBucket();
  const bySource = new Map<string, Bucket>();
  const byModel = new Map<string, Bucket>();
  const byDay = new Map<string, Bucket>();

  for (const row of usage) {
    addUsage(total, row, pricing);
    const source = bySource.get(row.source) ?? emptyBucket();
    addUsage(source, row, pricing);
    bySource.set(row.source, source);

    const modelKey = `${row.provider}/${row.model}`;
    const model = byModel.get(modelKey) ?? emptyBucket();
    addUsage(model, row, pricing);
    byModel.set(modelKey, model);

    const dayKey = row.created_at.slice(0, 10);
    const day = byDay.get(dayKey) ?? emptyBucket();
    addUsage(day, row, pricing);
    byDay.set(dayKey, day);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    window: { days, since },
    pricing: {
      configured: inputPerMillion != null && outputPerMillion != null,
      currency,
      inputPerMillionTokens: inputPerMillion,
      outputPerMillionTokens: outputPerMillion,
      note:
        inputPerMillion != null && outputPerMillion != null
          ? "Estimated cost uses configured token rates; provider invoices remain the billing source of truth."
          : "Token rates are not configured, so cost is left unestimated rather than guessed.",
    },
    analysisRecords: {
      total: analyses.length,
      success,
      failed,
      legacyTotalTokens,
    },
    observabilityCoverage: {
      usageEvents: usage.length,
      successfulAnalyses: success,
      ratio: success > 0 ? Number((usage.length / success).toFixed(4)) : null,
      note: "Analyses created before AI-COST-02 do not have backfilled prompt/completion usage events.",
    },
    observedUsage: roundedBucket(total),
    bySource: Object.fromEntries(
      [...bySource.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => [key, roundedBucket(value)])
    ),
    byModel: Object.fromEntries(
      [...byModel.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => [key, roundedBucket(value)])
    ),
    byDay: Object.fromEntries(
      [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => [key, roundedBucket(value)])
    ),
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`[report:ai-cost] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
