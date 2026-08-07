import { INTEREST_PROFILE, type InterestKey } from "@/config/interest-profile";
import type { FeedResult, FrontierFeedItem } from "./types";

export type DiscoveryLane = "core" | "adjacent" | "wildcard";

export interface DiscoveryMixResult {
  feed: FeedResult;
  lanes: Map<string, DiscoveryLane>;
  coreInterests: InterestKey[];
}

function itemCorpus(item: FrontierFeedItem): string {
  return [
    item.title,
    item.description ?? "",
    item.summaryZh ?? "",
    item.novelty ?? "",
    item.whyItMatters ?? "",
    item.source,
    item.contentType,
    ...item.tags,
  ]
    .join(" ")
    .toLowerCase();
}

export function interestKeysForItem(item: FrontierFeedItem): InterestKey[] {
  const text = itemCorpus(item);
  const keys: InterestKey[] = [];
  for (const [key, entry] of Object.entries(INTEREST_PROFILE) as Array<
    [InterestKey, (typeof INTEREST_PROFILE)[InterestKey]]
  >) {
    if (entry.keywords.some((keyword) => text.includes(keyword.toLowerCase()))) {
      keys.push(key);
    }
  }
  return keys;
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

  // 冷启动：从已经通过 Discovery Score 排到前面的内容反推当天“核心方向”。
  const weights = new Map<InterestKey, number>();
  items.slice(0, 8).forEach((item, index) => {
    const rankWeight = 1 / (1 + index * 0.35);
    for (const key of interestKeysForItem(item)) {
      const prior = INTEREST_PROFILE[key].weight;
      weights.set(key, (weights.get(key) ?? 0) + rankWeight * prior);
    }
  });

  return [...weights.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key]) => key);
}

function overlapCount(keys: InterestKey[], core: Set<InterestKey>): number {
  return keys.reduce((count, key) => count + (core.has(key) ? 1 : 0), 0);
}

function outsideCount(keys: InterestKey[], core: Set<InterestKey>): number {
  return keys.reduce((count, key) => count + (!core.has(key) ? 1 : 0), 0);
}

function quality(item: FrontierFeedItem): number {
  return item.score ?? 0;
}

function isActionable(item: FrontierFeedItem): boolean {
  return (
    item.contentType === "repo" ||
    item.contentType === "space" ||
    item.contentType === "product" ||
    item.hasDemo === "yes" ||
    item.hasCode === "yes"
  );
}

function businessDay(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function stableJitter(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000) / 1000;
}

function chooseAdjacent(
  items: FrontierFeedItem[],
  excluded: Set<string>,
  core: Set<InterestKey>
): FrontierFeedItem | null {
  const scored = items
    .map((item, index) => {
      if (excluded.has(item.id)) return null;
      const keys = interestKeysForItem(item);
      const shared = overlapCount(keys, core);
      const outside = outsideCount(keys, core);
      if (shared < 1 || outside < 1 || quality(item) < 45) return null;

      const actionBonus = isActionable(item) ? 6 : 0;
      return {
        item,
        score: quality(item) + shared * 4 + outside * 8 + actionBonus - index * 0.45,
      };
    })
    .filter((entry): entry is { item: FrontierFeedItem; score: number } => entry !== null)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.item ?? null;
}

function chooseWildcard(
  items: FrontierFeedItem[],
  excluded: Set<string>,
  core: Set<InterestKey>,
  dominantSources: Set<string>
): FrontierFeedItem | null {
  const day = businessDay();

  const rank = (requireZeroOverlap: boolean, qualityFloor: number) =>
    items
      .map((item, index) => {
        if (excluded.has(item.id) || quality(item) < qualityFloor) return null;
        if (!isActionable(item) || item.contentType === "paper" || item.contentType === "dataset") return null;

        const keys = interestKeysForItem(item);
        const shared = overlapCount(keys, core);
        if (requireZeroOverlap && shared > 0) return null;

        const sourceBonus = dominantSources.has(item.source) ? 0 : 7;
        const noveltyBonus = Math.min(8, keys.length * 1.5);
        const jitter = stableJitter(`${day}:${item.id}`) * 6;
        return {
          item,
          score: quality(item) + sourceBonus + noveltyBonus + jitter - index * 0.25,
        };
      })
      .filter((entry): entry is { item: FrontierFeedItem; score: number } => entry !== null)
      .sort((a, b) => b.score - a.score);

  return rank(true, 55)[0]?.item ?? rank(false, 50)[0]?.item ?? null;
}

function chooseCoreItems(
  items: FrontierFeedItem[],
  excluded: Set<string>,
  core: Set<InterestKey>,
  count: number
): FrontierFeedItem[] {
  const selected: FrontierFeedItem[] = [];
  const sourceCounts = new Map<string, number>();
  const signatureCounts = new Map<string, number>();

  const tryPick = (strict: boolean) => {
    for (const item of items) {
      if (selected.length >= count) break;
      if (excluded.has(item.id) || selected.some((entry) => entry.id === item.id)) continue;

      const keys = interestKeysForItem(item);
      const shared = overlapCount(keys, core);
      if (strict && core.size > 0 && shared === 0) continue;

      const sourceCount = sourceCounts.get(item.source) ?? 0;
      if (strict && sourceCount >= 3) continue;

      const signature = keys.filter((key) => core.has(key)).sort().slice(0, 2).join("+") || item.contentType;
      const signatureCount = signatureCounts.get(signature) ?? 0;
      if (strict && signatureCount >= 2) continue;

      selected.push(item);
      sourceCounts.set(item.source, sourceCount + 1);
      signatureCounts.set(signature, signatureCount + 1);
    }
  };

  tryPick(true);
  if (selected.length < count) tryPick(false);
  return selected.slice(0, count);
}

/**
 * 7 条 Daily Radar 的固定探索配比：5 Core + 1 Adjacent + 1 Wildcard。
 *
 * - Core：延续当前排序/个性化，但限制来源与主题重复。
 * - Adjacent：至少命中一个核心兴趣，同时引入一个新方向。
 * - Wildcard：优先与核心兴趣不重叠，但必须先达到公共质量门槛且可行动。
 *
 * 输入顺序仍然重要：上游的 Discovery Score + Personal Match 负责质量与偏好，
 * 本层只做“防信息茧房”的后处理，不把低质量候选硬塞进 Today。
 */
export function buildDiscoveryMix(
  feed: FeedResult,
  strongestInterests: Array<{ key: InterestKey; weight: number }>,
  limit = 7
): DiscoveryMixResult {
  if (feed.items.length === 0 || limit <= 0) {
    return { feed: { ...feed, items: [] }, lanes: new Map(), coreInterests: [] };
  }

  if (limit < 3 || feed.items.length < 5) {
    const items = feed.items.slice(0, limit);
    return {
      feed: { ...feed, items },
      lanes: new Map(items.map((item) => [item.id, "core" as const])),
      coreInterests: inferCoreInterests(items, strongestInterests),
    };
  }

  const coreInterests = inferCoreInterests(feed.items, strongestInterests);
  const coreSet = new Set(coreInterests);
  const excluded = new Set<string>();
  const lanes = new Map<string, DiscoveryLane>();

  // 第一名保持上游个性化/公共排序的冠军，不为多样性牺牲最强推荐。
  const first = feed.items[0]!;
  excluded.add(first.id);
  lanes.set(first.id, "core");

  const dominantSources = new Set<string>([first.source]);
  const wildcard = chooseWildcard(feed.items, excluded, coreSet, dominantSources);
  if (wildcard) {
    excluded.add(wildcard.id);
    lanes.set(wildcard.id, "wildcard");
  }

  const adjacent = chooseAdjacent(feed.items, excluded, coreSet);
  if (adjacent) {
    excluded.add(adjacent.id);
    lanes.set(adjacent.id, "adjacent");
  }

  const remainingCoreCount = Math.max(0, Math.min(4, limit - 1 - (adjacent ? 1 : 0) - (wildcard ? 1 : 0)));
  const coreRest = chooseCoreItems(feed.items, excluded, coreSet, remainingCoreCount);
  for (const item of coreRest) {
    excluded.add(item.id);
    lanes.set(item.id, "core");
  }

  const buckets = {
    core: [first, ...coreRest],
    adjacent: adjacent ? [adjacent] : [],
    wildcard: wildcard ? [wildcard] : [],
  };

  const layout: DiscoveryLane[] = ["core", "core", "adjacent", "core", "wildcard", "core", "core"];
  const mixed: FrontierFeedItem[] = [];
  for (const lane of layout) {
    if (mixed.length >= limit) break;
    const item = buckets[lane].shift();
    if (item) mixed.push(item);
  }

  // 候选不足时按上游顺序补齐，补位统一视为 Core。
  for (const item of feed.items) {
    if (mixed.length >= limit) break;
    if (mixed.some((entry) => entry.id === item.id)) continue;
    mixed.push(item);
    lanes.set(item.id, "core");
  }

  return {
    feed: { ...feed, items: mixed.slice(0, limit) },
    lanes,
    coreInterests,
  };
}
