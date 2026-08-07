import { createAdminClient } from "@/lib/supabase/admin";
import { INTEREST_PROFILE, type InterestKey } from "@/config/interest-profile";
import type { FeedResult, FrontierFeedItem } from "@/lib/feed/types";
import {
  FEATURE_VECTOR_VERSION,
  cosineSimilarity,
  strongestVectorInterests,
  vectorizeFeedItem,
} from "./vector";

interface UserEventRow {
  item_id: string;
  event_type: string;
  dwell_ms: number | null;
  created_at: string;
}

interface ProfileItemRow {
  item_id: string;
  title: string;
  description: string | null;
  source_slug: string;
  content_type: string;
  tags: unknown;
}

interface StoredInterestVectorRow {
  vector_version: string;
  interest_vector: unknown;
  event_count: number;
}

export interface PersonalizationResult {
  feed: FeedResult;
  applied: boolean;
  mode: "vector" | "rules" | null;
  signalCount: number;
  strongestInterests: Array<{ key: InterestKey; weight: number }>;
}

function isUuid(value: string | null | undefined): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((x): x is string => typeof x === "string")
    : [];
}

function numberArray(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map((entry) => Number(entry)).filter((entry) => Number.isFinite(entry));
  }
  if (typeof value === "string" && value.startsWith("{") && value.endsWith("}")) {
    return value
      .slice(1, -1)
      .split(",")
      .map((entry) => Number(entry))
      .filter((entry) => Number.isFinite(entry));
  }
  return [];
}

function buildCorpus(parts: Array<string | null | undefined>): string {
  return parts.filter((x): x is string => typeof x === "string" && x.length > 0).join(" ").toLowerCase();
}

function matchInterestKeys(corpus: string): InterestKey[] {
  const keys: InterestKey[] = [];
  for (const [key, entry] of Object.entries(INTEREST_PROFILE) as Array<
    [InterestKey, (typeof INTEREST_PROFILE)[InterestKey]]
  >) {
    if (entry.keywords.some((keyword) => corpus.includes(keyword.toLowerCase()))) {
      keys.push(key);
    }
  }
  return keys;
}

function eventStrength(event: UserEventRow): number {
  switch (event.event_type) {
    case "interested":
      return 4;
    case "not_interested":
      return -5;
    case "open_source":
      return 2;
    case "open_detail":
      return 1;
    case "dwell":
      return Math.min(2, Math.max(0, (event.dwell_ms ?? 0) / 30_000));
    default:
      return 0;
  }
}

function recencyMultiplier(createdAt: string): number {
  const t = Date.parse(createdAt);
  if (!Number.isFinite(t)) return 1;
  const ageDays = Math.max(0, (Date.now() - t) / 86_400_000);
  return Math.pow(0.5, ageDays / 30);
}

function itemCorpus(item: FrontierFeedItem): string {
  return buildCorpus([
    item.title,
    item.description,
    item.summaryZh,
    item.whyItMatters,
    item.source,
    item.contentType,
    ...item.tags,
  ]);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function rankWithInterestVector(
  feed: FeedResult,
  vector: number[]
): FeedResult {
  const scored = feed.items.map((item, index) => {
    const similarity = cosineSimilarity(vector, vectorizeFeedItem(item));
    const base = item.score ?? 35;
    return {
      item,
      index,
      rankScore: base + clamp(similarity, -1, 1) * 28,
    };
  });

  scored.sort((a, b) => b.rankScore - a.rankScore || a.index - b.index);
  return { ...feed, items: scored.map((entry) => entry.item) };
}

async function personalizeWithRules(
  feed: FeedResult,
  visitorId: string
): Promise<PersonalizationResult> {
  const supabase = createAdminClient();
  const { data: eventData, error: eventError } = await supabase
    .from("user_events")
    .select("item_id, event_type, dwell_ms, created_at")
    .eq("visitor_id", visitorId)
    .order("created_at", { ascending: false })
    .limit(120);

  if (eventError) throw eventError;
  const events = (eventData ?? []) as UserEventRow[];
  if (events.length === 0) {
    return { feed, applied: false, mode: null, signalCount: 0, strongestInterests: [] };
  }

  const itemIds = [...new Set(events.map((event) => event.item_id))];
  const { data: profileData, error: profileError } = await supabase
    .from("frontier_feed_v1")
    .select("item_id, title, description, source_slug, content_type, tags")
    .in("item_id", itemIds);

  if (profileError) throw profileError;
  const rows = (profileData ?? []) as ProfileItemRow[];
  const rowById = new Map(rows.map((row) => [row.item_id, row]));
  const categoryWeights = new Map<InterestKey, number>();

  for (const event of events) {
    const row = rowById.get(event.item_id);
    if (!row) continue;
    const strength = eventStrength(event) * recencyMultiplier(event.created_at);
    if (strength === 0) continue;

    const corpus = buildCorpus([
      row.title,
      row.description,
      row.source_slug,
      row.content_type,
      ...stringArray(row.tags),
    ]);
    const keys = matchInterestKeys(corpus);
    for (const key of keys) {
      categoryWeights.set(key, (categoryWeights.get(key) ?? 0) + strength);
    }
  }

  if (categoryWeights.size === 0) {
    return { feed, applied: false, mode: null, signalCount: events.length, strongestInterests: [] };
  }

  const scored = feed.items.map((item, index) => {
    const keys = matchInterestKeys(itemCorpus(item));
    const categorySignal = keys.reduce((sum, key) => sum + (categoryWeights.get(key) ?? 0), 0);
    const personalizationBoost = clamp(categorySignal * 2.5, -20, 20);
    const base = item.score ?? 35;
    return { item, index, rankScore: base + personalizationBoost };
  });

  scored.sort((a, b) => b.rankScore - a.rankScore || a.index - b.index);

  const strongestInterests = [...categoryWeights.entries()]
    .filter(([, weight]) => weight > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, weight]) => ({ key, weight: Math.round(weight * 100) / 100 }));

  return {
    feed: { ...feed, items: scored.map((entry) => entry.item) },
    applied: true,
    mode: "rules",
    signalCount: events.length,
    strongestInterests,
  };
}

export async function personalizeFeed(
  feed: FeedResult,
  visitorId: string | null | undefined
): Promise<PersonalizationResult> {
  if (!isUuid(visitorId) || feed.items.length === 0) {
    return { feed, applied: false, mode: null, signalCount: 0, strongestInterests: [] };
  }

  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase
      .from("user_interest_vectors")
      .select("vector_version, interest_vector, event_count")
      .eq("visitor_id", visitorId)
      .maybeSingle();

    if (!error && data) {
      const row = data as StoredInterestVectorRow;
      const vector = numberArray(row.interest_vector);
      if (row.vector_version === FEATURE_VECTOR_VERSION && vector.some((value) => value !== 0)) {
        return {
          feed: rankWithInterestVector(feed, vector),
          applied: true,
          mode: "vector",
          signalCount: row.event_count,
          strongestInterests: strongestVectorInterests(vector),
        };
      }
    }
  } catch {
    // 继续走旧规则层。
  }

  try {
    return await personalizeWithRules(feed, visitorId);
  } catch {
    return { feed, applied: false, mode: null, signalCount: 0, strongestInterests: [] };
  }
}
