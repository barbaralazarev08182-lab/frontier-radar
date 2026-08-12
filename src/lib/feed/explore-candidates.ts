import { INTEREST_PROFILE, type InterestKey } from "@/config/interest-profile";
import type { DiscoveryExplanation } from "./discovery-explanations";
import { interestKeysForItem } from "./discovery-mix";
import type { ProjectEntity } from "./project-entities";
import type { FrontierFeedItem } from "./types";

export type ExploreLens = "for-you" | "adjacent" | "rising" | "new" | "wildcard";

export interface ExploreCandidate {
  id: string;
  itemId: string;
  title: string;
  summary: string;
  whyNow: string | null;
  whyYou: string | null;
  score: number | null;
  source: FrontierFeedItem["source"];
  contentType: FrontierFeedItem["contentType"];
  canonicalUrl: string;
  tags: string[];
  sourceEvidence: FrontierFeedItem["source"][];
  sourceCount: number;
  crossSource: boolean;
  hasCode: boolean;
  hasDemo: boolean;
  metricLabel: string | null;
  lensScores: Record<ExploreLens, number>;
  dominantLens: ExploreLens;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function compact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function metricLabel(item: FrontierFeedItem): string | null {
  if (item.metrics.stars != null) return `${compact(item.metrics.stars)} stars`;
  if (item.metrics.downloads != null) return `${compact(item.metrics.downloads)} downloads`;
  if (item.metrics.likes != null) return `${compact(item.metrics.likes)} likes`;
  if (item.metrics.forks != null) return `${compact(item.metrics.forks)} forks`;
  return null;
}

function itemAgeDays(item: FrontierFeedItem): number {
  const timestamps = [item.updatedAt, item.publishedAt]
    .filter((value): value is string => Boolean(value))
    .map((value) => Date.parse(value))
    .filter(Number.isFinite);
  if (timestamps.length === 0) return 45;
  const latest = Math.max(...timestamps);
  return Math.max(0, (Date.now() - latest) / 86_400_000);
}

function recencyScore(item: FrontierFeedItem): number {
  return clamp(Math.exp(-itemAgeDays(item) / 24) * 100);
}

function noveltyProxy(item: FrontierFeedItem): number {
  const explicit = item.novelty ? 28 : 0;
  const tags = Math.min(28, item.tags.length * 5);
  const build = item.possibleUses.length > 0 ? 14 : 0;
  const demo = item.hasDemo === "yes" || item.hasCode === "yes" ? 12 : 0;
  return clamp(22 + explicit + tags + build + demo);
}

function stableJitter(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000) / 1000;
}

function inferCoreInterests(
  items: FrontierFeedItem[],
  strongestInterests: Array<{ key: InterestKey; weight: number }>
): InterestKey[] {
  const explicit = strongestInterests
    .filter((entry) => entry.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((entry) => entry.key);
  if (explicit.length > 0) return explicit;

  const weights = new Map<InterestKey, number>();
  items.slice(0, 8).forEach((item, index) => {
    const rankWeight = 1 / (1 + index * 0.35);
    for (const key of interestKeysForItem(item)) {
      weights.set(key, (weights.get(key) ?? 0) + rankWeight * INTEREST_PROFILE[key].weight);
    }
  });

  return [...weights.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key]) => key);
}

function dominantLens(scores: Record<ExploreLens, number>): ExploreLens {
  return (Object.entries(scores) as Array<[ExploreLens, number]>).sort((a, b) => b[1] - a[1])[0]![0];
}

export function buildExploreCandidates(
  items: FrontierFeedItem[],
  entities: Map<string, ProjectEntity>,
  explanations: Map<string, DiscoveryExplanation>,
  strongestInterests: Array<{ key: InterestKey; weight: number }>,
  limit = 20
): ExploreCandidate[] {
  const pool = items.slice(0, Math.max(1, limit));
  const coreInterests = inferCoreInterests(pool, strongestInterests);
  const core = new Set(coreInterests);
  const denominator = Math.max(1, pool.length - 1);

  return pool.map((item, index) => {
    const entity = entities.get(item.id) ?? null;
    const explanation = explanations.get(item.id);
    const keys = interestKeysForItem(item);
    const shared = keys.filter((key) => core.has(key)).length;
    const outside = keys.filter((key) => !core.has(key)).length;
    const overlap = core.size > 0 ? shared / core.size : 0.5;
    const edgeAffinity = shared > 0 && outside > 0 ? 1 : shared > 0 ? 0.45 : outside > 0 ? 0.28 : 0.12;
    const distance = core.size > 0 ? (shared === 0 ? 1 : clamp(1 - overlap, 0.12, 0.8)) : 0.5;
    const base = clamp(item.score ?? 35);
    const rank = clamp((1 - index / denominator) * 100);
    const recency = recencyScore(item);
    const novelty = noveltyProxy(item);
    const actionable = item.hasCode === "yes" || item.hasDemo === "yes" || item.contentType === "product" ? 100 : 35;

    const lensScores: Record<ExploreLens, number> = {
      "for-you": clamp(base * 0.44 + rank * 0.36 + overlap * 100 * 0.2),
      adjacent: clamp(base * 0.35 + edgeAffinity * 100 * 0.3 + novelty * 0.2 + recency * 0.15),
      rising: clamp(base * 0.66 + recency * 0.24 + actionable * 0.1),
      new: clamp(base * 0.25 + recency * 0.7 + novelty * 0.05),
      wildcard: clamp(base * 0.35 + distance * 100 * 0.32 + novelty * 0.23 + stableJitter(item.id) * 10),
    };

    return {
      id: entity?.id ?? item.id,
      itemId: item.id,
      title: entity?.primary.title ?? item.title,
      summary:
        item.summaryZh ??
        item.description ??
        item.whyItMatters ??
        "这个项目已经进入 Radar，但结构化分析仍在补全。",
      whyNow: explanation?.whyNow ?? null,
      whyYou: explanation?.whyYou ?? null,
      score: item.score,
      source: item.source,
      contentType: item.contentType,
      canonicalUrl: item.canonicalUrl,
      tags: item.tags.slice(0, 5),
      sourceEvidence: entity?.sources ?? [item.source],
      sourceCount: entity?.sources.length ?? 1,
      crossSource: entity?.crossSource ?? false,
      hasCode: entity?.hasCodeAnywhere ?? item.hasCode === "yes",
      hasDemo: entity?.hasDemoAnywhere ?? item.hasDemo === "yes",
      metricLabel: metricLabel(item),
      lensScores,
      dominantLens: dominantLens(lensScores),
    };
  });
}
