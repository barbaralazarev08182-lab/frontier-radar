import type { FeedResult, FrontierFeedItem, FeedSource, FeedContentType } from "./types";

const STOP_WORDS = new Set([
  "a", "an", "and", "app", "for", "from", "hn", "new", "of", "open",
  "product", "show", "source", "the", "tool", "with",
]);

export type ProjectMatchReason = "exact_url" | "title_match" | "primary";

export interface ProjectEvidence {
  itemId: string;
  source: FeedSource;
  contentType: FeedContentType;
  title: string;
  url: string;
  score: number | null;
  publishedAt: string | null;
  updatedAt: string | null;
  hasCode: FrontierFeedItem["hasCode"];
  hasDemo: FrontierFeedItem["hasDemo"];
  matchReason: ProjectMatchReason;
}

export interface ProjectEntity {
  id: string;
  primary: FrontierFeedItem;
  evidence: ProjectEvidence[];
  sources: FeedSource[];
  firstSeenAt: string | null;
  latestSeenAt: string | null;
  crossSource: boolean;
  hasCodeAnywhere: boolean;
  hasDemoAnywhere: boolean;
  matchConfidence: "single" | "url" | "title";
}

export interface ProjectEntityFeed {
  feed: FeedResult;
  entities: Map<string, ProjectEntity>;
}

export function canonicalProjectUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const parts = url.pathname.split("/").filter(Boolean);
    if (host === "github.com" && parts.length >= 2) {
      return `github.com/${parts[0]!.toLowerCase()}/${parts[1]!.replace(/\.git$/i, "").toLowerCase()}`;
    }
    if (host === "huggingface.co" && parts[0] === "spaces" && parts.length >= 3) {
      return `huggingface.co/spaces/${parts[1]!.toLowerCase()}/${parts[2]!.toLowerCase()}`;
    }
    const path = url.pathname.replace(/\/+$/, "") || "/";
    return `${host}${path}`.toLowerCase();
  } catch {
    return null;
  }
}

function titleTokens(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/^show hn:\s*/i, "")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

export function similarProjectTitle(a: FrontierFeedItem, b: FrontierFeedItem): boolean {
  if (a.source === b.source) return false;
  const aTokens = new Set(titleTokens(a.title));
  const bTokens = new Set(titleTokens(b.title));
  if (aTokens.size < 2 || bTokens.size < 2) return false;
  let intersection = 0;
  for (const token of aTokens) if (bTokens.has(token)) intersection++;
  const union = new Set([...aTokens, ...bTokens]).size;
  const jaccard = union > 0 ? intersection / union : 0;
  const smaller = Math.min(aTokens.size, bTokens.size);
  const containment = smaller > 0 ? intersection / smaller : 0;
  return jaccard >= 0.8 || (intersection >= 2 && containment === 1);
}

function timestamp(item: FrontierFeedItem, mode: "first" | "latest"): number | null {
  const values = [item.publishedAt, item.updatedAt]
    .filter((value): value is string => Boolean(value))
    .map((value) => Date.parse(value))
    .filter(Number.isFinite);
  if (values.length === 0) return null;
  return mode === "first" ? Math.min(...values) : Math.max(...values);
}

function isoOrNull(ms: number | null): string | null {
  return ms === null ? null : new Date(ms).toISOString();
}

function evidenceOf(item: FrontierFeedItem, matchReason: ProjectMatchReason): ProjectEvidence {
  return {
    itemId: item.id,
    source: item.source,
    contentType: item.contentType,
    title: item.title,
    url: item.canonicalUrl,
    score: item.score,
    publishedAt: item.publishedAt,
    updatedAt: item.updatedAt,
    hasCode: item.hasCode,
    hasDemo: item.hasDemo,
    matchReason,
  };
}

function buildEntity(entries: Array<{ item: FrontierFeedItem; reason: ProjectMatchReason }>): ProjectEntity {
  const primary = entries[0]!.item;
  const evidence = entries.map((entry, index) =>
    evidenceOf(entry.item, index === 0 ? "primary" : entry.reason)
  );
  const sources = [...new Set(evidence.map((entry) => entry.source))];
  const firstTimes = entries.map((entry) => timestamp(entry.item, "first")).filter((value): value is number => value !== null);
  const latestTimes = entries.map((entry) => timestamp(entry.item, "latest")).filter((value): value is number => value !== null);
  const matchedByUrl = evidence.some((entry) => entry.matchReason === "exact_url");
  const matchedByTitle = evidence.some((entry) => entry.matchReason === "title_match");

  return {
    id: primary.id,
    primary,
    evidence,
    sources,
    firstSeenAt: isoOrNull(firstTimes.length > 0 ? Math.min(...firstTimes) : null),
    latestSeenAt: isoOrNull(latestTimes.length > 0 ? Math.max(...latestTimes) : null),
    crossSource: sources.length > 1,
    hasCodeAnywhere: evidence.some((entry) => entry.hasCode === "yes" || entry.contentType === "repo"),
    hasDemoAnywhere: evidence.some((entry) => entry.hasDemo === "yes" || entry.contentType === "space"),
    matchConfidence: sources.length <= 1 ? "single" : matchedByUrl ? "url" : matchedByTitle ? "title" : "single",
  };
}

/** 聚合重复条目，但保留每个来源作为 Project Intelligence evidence。 */
export function clusterProjectFeed(feed: FeedResult): ProjectEntityFeed {
  const clusters: Array<Array<{ item: FrontierFeedItem; reason: ProjectMatchReason }>> = [];

  for (const item of feed.items) {
    const itemUrl = canonicalProjectUrl(item.canonicalUrl);
    let target: Array<{ item: FrontierFeedItem; reason: ProjectMatchReason }> | null = null;
    let reason: ProjectMatchReason = "primary";

    for (const cluster of clusters) {
      for (const existing of cluster) {
        const existingUrl = canonicalProjectUrl(existing.item.canonicalUrl);
        if (itemUrl && existingUrl && itemUrl === existingUrl) {
          target = cluster;
          reason = "exact_url";
          break;
        }
        if (similarProjectTitle(existing.item, item)) {
          target = cluster;
          reason = "title_match";
          break;
        }
      }
      if (target) break;
    }

    if (target) target.push({ item, reason });
    else clusters.push([{ item, reason: "primary" }]);
  }

  const entities = clusters.map(buildEntity);
  return {
    feed: { ...feed, items: entities.map((entity) => entity.primary) },
    entities: new Map(entities.map((entity) => [entity.primary.id, entity])),
  };
}

/**
 * 多来源同时出现是外部确认信号，但不能覆盖 Personal Match / Idea Spark。
 * 因此这里只允许一个高可信跨来源实体最多向前移动 1 位，而且前后公共分差不能太大。
 */
export function promoteCrossSourceEvidence(input: ProjectEntityFeed): ProjectEntityFeed {
  const items = [...input.feed.items];

  for (let index = 1; index < items.length; index++) {
    const item = items[index]!;
    const entity = input.entities.get(item.id);
    if (!entity?.crossSource) continue;

    const evidenceStrength =
      (entity.matchConfidence === "url" ? 2 : 1) +
      (entity.sources.length >= 3 ? 2 : 1) +
      (entity.hasCodeAnywhere ? 1 : 0) +
      (entity.hasDemoAnywhere ? 1 : 0);
    if (evidenceStrength < 3 || (item.score ?? 0) < 50) continue;

    const previous = items[index - 1]!;
    const previousEntity = input.entities.get(previous.id);
    if (previousEntity?.crossSource) continue;

    const scoreGap = (previous.score ?? 0) - (item.score ?? 0);
    if (scoreGap > 8) continue;

    items[index - 1] = item;
    items[index] = previous;
  }

  return {
    feed: { ...input.feed, items },
    entities: input.entities,
  };
}
