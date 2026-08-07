import type { SupabaseClient } from "@supabase/supabase-js";
import type { FeedResult } from "@/lib/feed/types";
import { cosineSimilarity } from "./vector";
import {
  parseNumericVector,
  SEMANTIC_EMBEDDING_DIMENSIONS,
  SEMANTIC_EMBEDDING_MODEL,
} from "./semantic-profile";

interface UserSemanticProfileRow {
  model: string;
  dimensions: number;
  embedding: unknown;
  event_count: number;
}

interface ItemSemanticEmbeddingRow {
  item_id: string;
  model: string;
  dimensions: number;
  embedding: unknown;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * 真正语义推荐层。返回 null 表示语义画像/内容 embedding 尚未准备好，调用方继续降级。
 */
export async function trySemanticPersonalization(
  supabase: SupabaseClient,
  feed: FeedResult,
  visitorId: string
): Promise<{ feed: FeedResult; signalCount: number; embeddedCandidates: number } | null> {
  const { data: profileData, error: profileError } = await supabase
    .from("user_semantic_profiles")
    .select("model, dimensions, embedding, event_count")
    .eq("visitor_id", visitorId)
    .maybeSingle();

  if (profileError || !profileData) return null;
  const profile = profileData as UserSemanticProfileRow;
  const userVector = parseNumericVector(profile.embedding);
  if (
    profile.model !== SEMANTIC_EMBEDDING_MODEL ||
    profile.dimensions !== SEMANTIC_EMBEDDING_DIMENSIONS ||
    userVector.length !== SEMANTIC_EMBEDDING_DIMENSIONS ||
    !userVector.some((value) => value !== 0)
  ) {
    return null;
  }

  const itemIds = feed.items.map((item) => item.id);
  const { data: embeddingData, error: embeddingError } = await supabase
    .from("item_semantic_embeddings")
    .select("item_id, model, dimensions, embedding")
    .eq("model", SEMANTIC_EMBEDDING_MODEL)
    .in("item_id", itemIds);

  if (embeddingError) return null;
  const rows = (embeddingData ?? []) as ItemSemanticEmbeddingRow[];
  const vectors = new Map<string, number[]>();
  for (const row of rows) {
    const vector = parseNumericVector(row.embedding);
    if (
      row.dimensions === SEMANTIC_EMBEDDING_DIMENSIONS &&
      vector.length === SEMANTIC_EMBEDDING_DIMENSIONS
    ) {
      vectors.set(row.item_id, vector);
    }
  }
  if (vectors.size === 0) return null;

  const scored = feed.items.map((item, index) => {
    const itemVector = vectors.get(item.id);
    const similarity = itemVector ? cosineSimilarity(userVector, itemVector) : 0;
    const base = item.score ?? 35;
    return {
      item,
      index,
      // 语义相似度是个性化主信号，但保留公共分作为质量/新鲜度先验。
      rankScore: base + clamp(similarity, -1, 1) * 36,
    };
  });

  scored.sort((a, b) => b.rankScore - a.rankScore || a.index - b.index);
  return {
    feed: { ...feed, items: scored.map((entry) => entry.item) },
    signalCount: profile.event_count,
    embeddedCandidates: vectors.size,
  };
}
