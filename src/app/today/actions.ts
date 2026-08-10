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
 * hit the persisted selection-hash cache when it is available.
 *
 * Persistence is deliberately best-effort here: a transient Supabase/cache
 * failure must not discard a valid synthesis that can still power Signal Weave.
 */
export async function resolveTodaySynthesis(
  editionDate: string,
  signals: DailySynthesisSignalInput[]
): Promise<DailySynthesisSnapshot | null> {
  if (signals.length < 1 || signals.length > 7) return null;

  const signalIds = signals.map((signal) => signal.id);
  if (new Set(signalIds).size !== signalIds.length) return null;

  const selectionHash = computeDailySelectionHash(signalIds);

  let supabase: ReturnType<typeof createAdminClient> | null = null;
  try {
    supabase = createAdminClient();
    const cached = await findDailySynthesis(supabase, {
      editionDate,
      selectionHash,
      promptVersion: DAILY_SYNTHESIS_PROMPT_VERSION,
    });
    if (cached) return cached;
  } catch {
    // Cache/persistence availability is not a prerequisite for rendering the
    // current request. Continue to the model and return the validated snapshot
    // directly if generation succeeds.
  }

  const baseUrl = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;
  if (!baseUrl || !apiKey || !model) {
    const missing = [
      !baseUrl ? "AI_BASE_URL" : null,
      !apiKey ? "AI_API_KEY" : null,
      !model ? "AI_MODEL" : null,
    ].filter(Boolean).join(", ");

    if (supabase) {
      await upsertDailySynthesisFailure(supabase, {
        editionDate,
        selectionHash,
        signalIds,
        provider: "tencent",
        model: model ?? "unconfigured",
        promptVersion: DAILY_SYNTHESIS_PROMPT_VERSION,
        errorMessage: `Missing AI environment: ${missing}`,
        latencyMs: 0,
      }).catch(() => {});
    }
    return null;
  }

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

    if (supabase) {
      await upsertDailySynthesisSuccess(supabase, {
        snapshot: output.snapshot,
        provider: "tencent",
        model,
        promptVersion: output.promptVersion,
        tokenUsage: output.tokenUsage?.totalTokens ?? null,
        latencyMs: output.latencyMs,
      }).catch(() => {});
    }

    // A valid model result is sufficient for the live page even when its cache
    // cannot be written. Do not turn a persistence outage into a missing chapter.
    return output.snapshot;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (supabase) {
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
    }
    return null;
  }
}
