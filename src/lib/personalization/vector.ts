import { INTEREST_PROFILE, type InterestKey } from "@/config/interest-profile";
import type { FrontierFeedItem } from "@/lib/feed/types";

/**
 * 第一版内容向量：与默认兴趣画像一一对应。
 * 这是可解释的 feature embedding，不调用外部模型；以后可替换为 MiniLM/BGE。
 */
export const FEATURE_VECTOR_VERSION = "interest-keyword-v1";

export const FEATURE_KEYS: InterestKey[] = [
  "ai_creative_projects",
  "ai_integrations",
  "ai_games",
  "ai_ui_interaction",
  "small_open_source",
  "new_ai_capabilities",
  "ai_agents",
  "vibe_coding",
  "developer_tools",
  "multimodal",
  "product_design",
  "speech_audio",
  "speaker_recognition",
  "machine_learning",
  "computer_vision",
  "nlp_llm",
  "education_ai",
  "reinforcement_learning",
  "mlops",
  "quant_finance",
  "general_tech_news",
];

export interface VectorizableItem {
  title: string;
  description?: string | null;
  summaryZh?: string | null;
  whyItMatters?: string | null;
  source?: string | null;
  contentType?: string | null;
  tags?: string[] | null;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\s_\-/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function typeHints(source: string | null | undefined, contentType: string | null | undefined): string[] {
  const hints: string[] = [];
  if (source === "github") hints.push("open source", "side project", "developer tool");
  if (source === "huggingface") hints.push("open source");
  if (contentType === "repo") hints.push("open source", "prototype", "tool");
  if (contentType === "space") hints.push("demo", "interactive ai", "playground", "web app");
  if (contentType === "paper") hints.push("research paper");
  return hints;
}

export function buildItemCorpus(item: VectorizableItem): string {
  return normalizeText(
    [
      item.title,
      item.description ?? "",
      item.summaryZh ?? "",
      item.whyItMatters ?? "",
      ...(item.tags ?? []),
      ...typeHints(item.source, item.contentType),
    ].join(" ")
  );
}

/** 每个维度范围 0..1，值越大说明内容越符合该兴趣维度。 */
export function vectorizeItem(item: VectorizableItem): number[] {
  const corpus = buildItemCorpus(item);

  return FEATURE_KEYS.map((key) => {
    const entry = INTEREST_PROFILE[key];
    let hitCount = 0;
    for (const keyword of entry.keywords) {
      if (corpus.includes(normalizeText(keyword))) hitCount++;
    }
    if (hitCount === 0) return 0;

    // 第一次命中贡献最大；多关键词命中提供较小增益，避免关键词堆叠无限放大。
    const coverage = Math.min(1, 0.7 + 0.15 * (hitCount - 1));
    return Math.round(entry.weight * coverage * 10000) / 10000;
  });
}

export function vectorizeFeedItem(item: FrontierFeedItem): number[] {
  return vectorizeItem({
    title: item.title,
    description: item.description,
    summaryZh: item.summaryZh,
    whyItMatters: item.whyItMatters,
    source: item.source,
    contentType: item.contentType,
    tags: item.tags,
  });
}

export function addScaledVector(target: number[], source: number[], scale: number): void {
  const length = Math.min(target.length, source.length);
  for (let i = 0; i < length; i++) target[i] += source[i] * scale;
}

export function l2Normalize(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!Number.isFinite(norm) || norm === 0) return vector.map(() => 0);
  return vector.map((value) => value / norm);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  if (length === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function strongestVectorInterests(
  vector: number[],
  limit = 5
): Array<{ key: InterestKey; weight: number }> {
  return FEATURE_KEYS.map((key, index) => ({ key, weight: vector[index] ?? 0 }))
    .filter((entry) => entry.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit)
    .map((entry) => ({ ...entry, weight: Math.round(entry.weight * 1000) / 1000 }));
}
