/**
 * 单条目 AI 分析编排（阶段 1.5）。
 *
 * 流程：准备输入 → 幂等去重（input_hash）→ 调用 Provider → 持久化 ai_analyses。
 * dry-run：不写数据库、不调用模型（去重检查也跳过）。
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AnalysisDocument,
  AnalysisItemRow,
  AnalysisSnapshot,
  ItemAnalysisResult,
} from "./types";
import { prepareAnalysisInput } from "./prepare-input";
import type { AiProvider } from "./provider";
import { hasSuccessfulAnalysis, insertAiAnalysis } from "@/lib/db/repositories/ai-analyses";
import { insertAiUsageEvent } from "@/lib/db/repositories/ai-usage";

export interface AnalyzeItemParams {
  item: AnalysisItemRow;
  documents: AnalysisDocument[];
  snapshot: AnalysisSnapshot | null;
  provider: AiProvider;
  model: string;
  promptVersion: string;
  schemaVersion: string;
  maxInputChars: number;
  dryRun: boolean;
  force: boolean;
}

export type AnalyzeItemResult =
  | { status: "skipped"; reason: string; inputHash?: string; charCount?: number }
  | { status: "dry-run"; inputHash: string; charCount: number }
  | { status: "success"; inputHash: string; charCount: number; analysisId: string; latencyMs: number; result: ItemAnalysisResult }
  | { status: "failed"; inputHash: string; charCount: number; error: string };

export async function analyzeItem(
  supabase: SupabaseClient | null,
  params: AnalyzeItemParams
): Promise<AnalyzeItemResult> {
  const { item, provider, model, promptVersion, schemaVersion } = params;
  const prepared = prepareAnalysisInput(item, params.documents, params.snapshot, {
    maxInputChars: params.maxInputChars,
  });

  // 幂等去重：非 dry-run 且非 force 时，命中相同输入指纹的成功记录则跳过
  if (!params.dryRun && !params.force && supabase) {
    const duplicated = await hasSuccessfulAnalysis(supabase, {
      itemId: item.id,
      model,
      promptVersion,
      inputHash: prepared.inputHash,
    });
    if (duplicated) {
      return { status: "skipped", reason: "相同 input_hash 已有成功分析", inputHash: prepared.inputHash, charCount: prepared.charCount };
    }
  }

  if (params.dryRun) {
    // 不调用模型、不写数据库
    return { status: "dry-run", inputHash: prepared.inputHash, charCount: prepared.charCount };
  }

  try {
    const output = await provider.analyzeItem(prepared);

    if (!supabase) {
      return { status: "failed", inputHash: prepared.inputHash, charCount: prepared.charCount, error: "缺少 Supabase，无法持久化" };
    }

    const analysisId = await insertAiAnalysis(supabase, {
      item_id: item.id,
      analysis_type: "summary",
      provider: output.provider,
      model: output.model,
      prompt_version: output.promptVersion,
      schema_version: output.schemaVersion,
      input_hash: output.inputHash,
      result: output.result,
      status: "success",
      error_message: null,
      token_usage: output.tokenUsage?.totalTokens ?? null,
      estimated_cost: output.estimatedCost,
      latency_ms: output.latencyMs,
    });

    // Usage telemetry is deliberately separate from the intelligence result.
    // Failure to write observability data must never turn a valid analysis into a product failure.
    await insertAiUsageEvent(supabase, {
      analysis_id: analysisId,
      item_id: item.id,
      source: item.source_slug,
      provider: output.provider,
      model: output.model,
      prompt_tokens: output.tokenUsage?.promptTokens ?? null,
      completion_tokens: output.tokenUsage?.completionTokens ?? null,
      total_tokens: output.tokenUsage?.totalTokens ?? null,
      model_call_count: output.modelCallCount,
      repair_count: output.repairCount,
    }).catch(() => {});

    return { status: "success", inputHash: prepared.inputHash, charCount: prepared.charCount, analysisId, latencyMs: output.latencyMs, result: output.result };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    // failed 记录保存简短错误，不保存完整 Prompt
    if (supabase) {
      await insertAiAnalysis(supabase, {
        item_id: item.id,
        analysis_type: "summary",
        provider: provider.slug,
        model,
        prompt_version: promptVersion,
        schema_version: schemaVersion,
        input_hash: prepared.inputHash,
        result: null,
        status: "failed",
        error_message: errorMessage.slice(0, 500),
        token_usage: null,
        estimated_cost: null,
        latency_ms: 0,
      }).catch(() => {});
    }

    return { status: "failed", inputHash: prepared.inputHash, charCount: prepared.charCount, error: errorMessage };
  }
}
