import type { SupabaseClient } from "@supabase/supabase-js";
import { feedbackStrength } from "./profile";
import { addScaledVector, l2Normalize } from "./vector";

export const SEMANTIC_EMBEDDING_MODEL = "intfloat/multilingual-e5-small";
export const SEMANTIC_EMBEDDING_DIMENSIONS = 384;

interface UserEventRow {
  item_id: string;
  event_type: string;
  dwell_ms: number | null;
  created_at: string;
}

interface ItemEmbeddingRow {
  item_id: string;
  model: string;
  dimensions: number;
  embedding: unknown;
}

export function parseNumericVector(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map((entry) => Number(entry)).filter((entry) => Number.isFinite(entry));
  }
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
    (trimmed.startsWith("{") && trimmed.endsWith("}"))
  ) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((entry) => Number(entry.trim()))
      .filter((entry) => Number.isFinite(entry));
  }
  return [];
}

function recencyMultiplier(createdAt: string): number {
  const timestamp = Date.parse(createdAt);
  if (!Number.isFinite(timestamp)) return 1;
  const ageDays = Math.max(0, (Date.now() - timestamp) / 86_400_000);
  return Math.pow(0.5, ageDays / 30);
}

/**
 * 用真实语义 embedding 重建用户画像。
 * 只有已经生成 semantic embedding 的内容参与；其余事件继续由 keyword vector 层兜底。
 */
export async function rebuildUserSemanticProfile(
  supabase: SupabaseClient,
  visitorId: string
): Promise<{ eventCount: number; embeddedEventCount: number; vector: number[] | null }> {
  const { data: eventData, error: eventError } = await supabase
    .from("user_events")
    .select("item_id, event_type, dwell_ms, created_at")
    .eq("visitor_id", visitorId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (eventError) throw eventError;
  const events = (eventData ?? []) as UserEventRow[];
  if (events.length === 0) {
    return { eventCount: 0, embeddedEventCount: 0, vector: null };
  }

  const itemIds = [...new Set(events.map((event) => event.item_id))];
  const { data: embeddingData, error: embeddingError } = await supabase
    .from("item_semantic_embeddings")
    .select("item_id, model, dimensions, embedding")
    .eq("model", SEMANTIC_EMBEDDING_MODEL)
    .in("item_id", itemIds);

  if (embeddingError) throw embeddingError;
  const rows = (embeddingData ?? []) as ItemEmbeddingRow[];
  if (rows.length === 0) {
    return { eventCount: events.length, embeddedEventCount: 0, vector: null };
  }

  const vectorByItem = new Map<string, number[]>();
  for (const row of rows) {
    const vector = parseNumericVector(row.embedding);
    if (
      row.model === SEMANTIC_EMBEDDING_MODEL &&
      row.dimensions === SEMANTIC_EMBEDDING_DIMENSIONS &&
      vector.length === SEMANTIC_EMBEDDING_DIMENSIONS
    ) {
      vectorByItem.set(row.item_id, vector);
    }
  }

  const aggregate = Array.from({ length: SEMANTIC_EMBEDDING_DIMENSIONS }, () => 0);
  let embeddedEventCount = 0;
  let positiveEventCount = 0;
  let negativeEventCount = 0;

  for (const event of events) {
    const vector = vectorByItem.get(event.item_id);
    if (!vector) continue;
    const strength = feedbackStrength(event.event_type, event.dwell_ms);
    if (strength === 0) continue;

    embeddedEventCount++;
    if (strength > 0) positiveEventCount++;
    if (strength < 0) negativeEventCount++;
    addScaledVector(aggregate, vector, strength * recencyMultiplier(event.created_at));
  }

  if (embeddedEventCount === 0) {
    return { eventCount: events.length, embeddedEventCount: 0, vector: null };
  }

  const profile = l2Normalize(aggregate);
  if (!profile.some((value) => value !== 0)) {
    return { eventCount: events.length, embeddedEventCount, vector: null };
  }

  const { error: profileError } = await supabase.from("user_semantic_profiles").upsert(
    {
      visitor_id: visitorId,
      model: SEMANTIC_EMBEDDING_MODEL,
      dimensions: SEMANTIC_EMBEDDING_DIMENSIONS,
      embedding: profile,
      event_count: events.length,
      positive_event_count: positiveEventCount,
      negative_event_count: negativeEventCount,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "visitor_id" }
  );
  if (profileError) throw profileError;

  return { eventCount: events.length, embeddedEventCount, vector: profile };
}
