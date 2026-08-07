import type { FeedResult, FrontierFeedItem } from "./types";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "app",
  "for",
  "from",
  "hn",
  "new",
  "of",
  "open",
  "product",
  "show",
  "source",
  "the",
  "tool",
  "with",
]);

function canonicalUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const parts = url.pathname.split("/").filter(Boolean);

    // GitHub 的 owner/repo 是最稳定的跨来源项目身份。
    if (host === "github.com" && parts.length >= 2) {
      return `github.com/${parts[0]!.toLowerCase()}/${parts[1]!.replace(/\.git$/i, "").toLowerCase()}`;
    }

    // Hugging Face Space 同样按 owner/name 归一化。
    if (host === "huggingface.co" && parts[0] === "spaces" && parts.length >= 3) {
      return `huggingface.co/spaces/${parts[1]!.toLowerCase()}/${parts[2]!.toLowerCase()}`;
    }

    // 普通产品页去掉 query/hash/尾斜杠，避免 UTM 导致重复。
    const path = url.pathname.replace(/\/+$/, "") || "/";
    return `${host}${path}`.toLowerCase();
  } catch {
    return null;
  }
}

function titleTokens(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

function similarTitle(a: FrontierFeedItem, b: FrontierFeedItem): boolean {
  // 同来源不靠标题去重，避免误伤同品牌下的不同项目。
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

/**
 * Today 的轻量跨来源实体去重。
 * 输入已经按公共分/个性化分排序，因此重复项目保留排位最高的那一条。
 */
export function dedupeProjectFeed(feed: FeedResult): FeedResult {
  const kept: FrontierFeedItem[] = [];
  const seenUrls = new Set<string>();

  for (const item of feed.items) {
    const urlKey = canonicalUrl(item.canonicalUrl);
    if (urlKey && seenUrls.has(urlKey)) continue;
    if (kept.some((existing) => similarTitle(existing, item))) continue;

    kept.push(item);
    if (urlKey) seenUrls.add(urlKey);
  }

  return {
    ...feed,
    items: kept,
  };
}
