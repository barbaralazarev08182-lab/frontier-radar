import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DAILY_SYNTHESIS_SCHEMA_VERSION,
  isDailySynthesisSnapshot,
  type DailySynthesisSnapshot,
} from "@/lib/ai/daily-synthesis";

export interface DailySynthesisRow {
  id: string;
  edition_date: string;
  selection_hash: string;
  signal_ids: string[];
  provider: string;
  model: string;
  prompt_version: string;
  schema_version: string;
  payload: unknown;
  status: "success" | "failed";
  error_message: string | null;
  token_usage: number | null;
  latency_ms: number | null;
  created_at: string;
  updated_at: string;
}

export async function findDailySynthesis(
  supabase: SupabaseClient,
  params: { editionDate: string; selectionHash: string; promptVersion?: string }
): Promise<DailySynthesisSnapshot | null> {
  let query = supabase
    .from("daily_synthesis_snapshots")
    .select("*")
    .eq("edition_date", params.editionDate)
    .eq("selection_hash", params.selectionHash)
    .eq("status", "success")
    .eq("schema_version", DAILY_SYNTHESIS_SCHEMA_VERSION)
    .order("created_at", { ascending: false })
    .limit(1);

  if (params.promptVersion) query = query.eq("prompt_version", params.promptVersion);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`读取 daily_synthesis_snapshots 失败: ${error.message}`);
  if (!data) return null;

  const row = data as DailySynthesisRow;
  if (!isDailySynthesisSnapshot(row.payload)) return null;
  if (row.payload.selectionHash !== params.selectionHash) return null;
  if (row.payload.editionDate !== params.editionDate) return null;
  return row.payload;
}

export async function upsertDailySynthesisSuccess(
  supabase: SupabaseClient,
  params: {
    snapshot: DailySynthesisSnapshot;
    provider: string;
    model: string;
    promptVersion: string;
    tokenUsage?: number | null;
    latencyMs?: number | null;
  }
): Promise<void> {
  const { snapshot } = params;
  if (!isDailySynthesisSnapshot(snapshot)) {
    throw new Error("daily synthesis payload 不符合契约");
  }

  const { error } = await supabase.from("daily_synthesis_snapshots").upsert(
    {
      edition_date: snapshot.editionDate,
      selection_hash: snapshot.selectionHash,
      signal_ids: snapshot.signalIds,
      provider: params.provider,
      model: params.model,
      prompt_version: params.promptVersion,
      schema_version: snapshot.schemaVersion,
      payload: snapshot,
      status: "success",
      error_message: null,
      token_usage: params.tokenUsage ?? null,
      latency_ms: params.latencyMs ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "edition_date,selection_hash,prompt_version" }
  );

  if (error) throw new Error(`写入 daily_synthesis_snapshots 失败: ${error.message}`);
}

export async function upsertDailySynthesisFailure(
  supabase: SupabaseClient,
  params: {
    editionDate: string;
    selectionHash: string;
    signalIds: string[];
    provider: string;
    model: string;
    promptVersion: string;
    errorMessage: string;
    latencyMs?: number | null;
  }
): Promise<void> {
  const { error } = await supabase.from("daily_synthesis_snapshots").upsert(
    {
      edition_date: params.editionDate,
      selection_hash: params.selectionHash,
      signal_ids: params.signalIds,
      provider: params.provider,
      model: params.model,
      prompt_version: params.promptVersion,
      schema_version: DAILY_SYNTHESIS_SCHEMA_VERSION,
      payload: null,
      status: "failed",
      error_message: params.errorMessage.slice(0, 500),
      token_usage: null,
      latency_ms: params.latencyMs ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "edition_date,selection_hash,prompt_version" }
  );

  if (error) throw new Error(`写入 daily_synthesis_snapshots failure 失败: ${error.message}`);
}
