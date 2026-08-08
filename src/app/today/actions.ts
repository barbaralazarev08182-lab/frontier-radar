"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  DAILY_SYNTHESIS_PROMPT_VERSION,
  computeDailySelectionHash,
  type DailySynthesisSignalInput,
  type DailySynthesisSnapshot,
} from "@/lib/ai/daily-synthesis";
import { generateDailySynthesis } from "@/lib/ai/generate-daily-synthesis";
import { TokenHubClient } from "@/lib/ai/tokenhub-client";
import {
  findDailySynthesis,
  upsertDailySynthesisFailure,
  upsertDailySynthesisSuccess,
} from "@/lib/db/repositories/daily-synthesis";

function positiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Resolve the synthesis for one server-selected Today set.
 * Intended to be bound to trusted server-generated signal inputs before being
 * handed to a client component. Repeated calls for the same ordered selection
 * hit the persisted selection-hash cache instead of calling the model again.
 */
export async function resolveTodaySynthesis(
  editionDate: string,
  signals: DailySynthesisSignalInput[]
): Promise<DailySynthesisSnapshot | null> {
  if (signals.length < 1 || signals.length > 7) return null;

  const signalIds = signals.map((signal) => signal.id);
  if (new Set(signalIds).size !== signalIds.length) return null;

  const selectionHash = computeDailySelectionHash(signalIds);
  const supabase = createAdminClient();

  try {
    const cached = await findDailySynthesis(supabase, {
      editionDate,
      selectionHash,
      promptVersion: DAILY_SYNTHESIS_PROMPT_VERSION,
    });
    if (cached) return cached;
  } catch {
    // A missing rollout migration should not make /today unusable.
    return null;
  }

  const baseUrl = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;
  if (!baseUrl || !apiKey || !model) return null;

  const client = new TokenHubClient({
    baseUrl,
    apiKey,
    model,
    timeoutMs: positiveNumber(process.env.AI_REQUEST_TIMEOUT_MS, 60_000),
    maxRetries: positiveNumber(process.env.AI_MAX_RETRIES, 2),
    temperature: 0.15,
  });

  const started = Date.now();
  try {
    const output = await generateDailySynthesis(client, { editionDate, signals });
    await upsertDailySynthesisSuccess(supabase, {
      snapshot: output.snapshot,
      provider: "tencent",
      model,
      promptVersion: output.promptVersion,
      tokenUsage: output.tokenUsage?.totalTokens ?? null,
      latencyMs: output.latencyMs,
    });
    return output.snapshot;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await upsertDailySynthesisFailure(supabase, {
      editionDate,
      selectionHash,
      signalIds,
      provider: "tencent",
      model,
      promptVersion: DAILY_SYNTHESIS_PROMPT_VERSION,
      errorMessage: message,
      latencyMs: Date.now() - started,
    }).catch(() => {});
    return null;
  }
}
