import type { SupabaseClient } from "@supabase/supabase-js";
import {
  FEATURE_KEYS,
  FEATURE_VECTOR_VERSION,
  addScaledVector,
  l2Normalize,
  vectorizeItem,
} from "./vector";

interface UserEventRow {
  item_id: string;
  event_type: string;
  dwell_ms: number | null;
  created_at: string;
}

interface FeedVectorRow {
  item_id: string;
  title: string;
  description: string | null;
  summary_zh: string | null;
  why_it_matters: string | null;
  source_slug: string;
  content_type: string;
  tags: unknown;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

export function feedbackStrength(eventType: string, dwellMs: number | null): number {
  switch (eventType) {
    case "interested":
      return 4;
    case "not_interested":
      return -5;
    case "open_source":
      return 2;
    case "open_detail":
      return 1;
    case "dwell":
      return Math.min(2, Math.max(0, (dwellMs ?? 0) / 30_000));
    default:
      return 0;
  }
}

function recencyMultiplier(createdAt: string): number {
  const timestamp = Date.parse(createdAt);
  if (!Number.isFinite(timestamp)) return 1;
  const ageDays = Math.max(0, (Date.now() - timestamp) / 86_400_000);
  return Math.pow(0.5, ageDays / 30);
}

/**
 * 根据最近行为重建用户兴趣向量。
 * 不做增量累加，避免重复点击、权重规则变化后产生不可逆漂移。
 */
export async function rebuildUserInterestVector(
  supabase: SupabaseClient,
  visitorId: string
): Promise<{ eventCount: number; vector: number[] }> {
  const { data: eventData, error: eventError } = await supabase
    .from("user_events")
    .select("item_id, event_type, dwell_ms, created_at")
    .eq("visitor_id", visitorId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (eventError) throw eventError;
  const events = (eventData ?? []) as UserEventRow[];
  if (events.length === 0) return { eventCount: 0, vector: FEATURE_KEYS.map(() => 0) };

  const itemIds = [...new Set(events.map((event) => event.item_id))];
  const { data: itemData, error: itemError } = await supabase
    .from("frontier_feed_v1")
    .select(
      "item_id, title, description, summary_zh, why_it_matters, source_slug, content_type, tags"
    )
    .in("item_id", itemIds);

  if (itemError) throw itemError;
  const rows = (itemData ?? []) as FeedVectorRow[];
  const rowById = new Map(rows.map((row) => [row.item_id, row]));
  const vectorById = new Map<string, number[]>();

  for (const row of rows) {
    const vector = vectorizeItem({
      title: row.title,
      description: row.description,
      summaryZh: row.summary_zh,
      whyItMatters: row.why_it_matters,
      source: row.source_slug,
      contentType: row.content_type,
      tags: stringArray(row.tags),
    });
    vectorById.set(row.item_id, vector);
  }

  // 顺便缓存已经参与过反馈的内容向量；后续换 embedding 模型时只需升级 version。
  if (rows.length > 0) {
    const now = new Date().toISOString();
    const cachedRows = rows.map((row) => ({
      item_id: row.item_id,
      vector_version: FEATURE_VECTOR_VERSION,
      dimensions: FEATURE_KEYS,
      feature_vector: vectorById.get(row.item_id) ?? FEATURE_KEYS.map(() => 0),
      updated_at: now,
    }));
    const { error: cacheError } = await supabase
      .from("item_feature_vectors")
      .upsert(cachedRows, { onConflict: "item_id" });
    if (cacheError) throw cacheError;
  }

  const aggregate = FEATURE_KEYS.map(() => 0);
  let positiveEventCount = 0;
  let negativeEventCount = 0;

  for (const event of events) {
    if (!rowById.has(event.item_id)) continue;
    const itemVector = vectorById.get(event.item_id);
    if (!itemVector) continue;

    const rawStrength = feedbackStrength(event.event_type, event.dwell_ms);
    if (rawStrength > 0) positiveEventCount++;
    if (rawStrength < 0) negativeEventCount++;
    if (rawStrength === 0) continue;

    addScaledVector(
      aggregate,
      itemVector,
      rawStrength * recencyMultiplier(event.created_at)
    );
  }

  const interestVector = l2Normalize(aggregate);
  const { error: profileError } = await supabase.from("user_interest_vectors").upsert(
    {
      visitor_id: visitorId,
      vector_version: FEATURE_VECTOR_VERSION,
      dimensions: FEATURE_KEYS,
      interest_vector: interestVector,
      event_count: events.length,
      positive_event_count: positiveEventCount,
      negative_event_count: negativeEventCount,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "visitor_id" }
  );
  if (profileError) throw profileError;

  return { eventCount: events.length, vector: interestVector };
}
