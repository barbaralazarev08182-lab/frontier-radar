/**
 * Fixture Feed Provider（阶段 1.6）。
 *
 * 使用固定演示数据，不访问数据库。
 * 与 Supabase provider 共享同一套筛选 / 排序 / 分页语义，便于页面行为一致。
 */

import { FIXTURES } from "./fixtures";
import type {
  FeedProvider,
} from "./provider";
import type {
  FeedQuery,
  FeedResult,
  FrontierFeedItem,
} from "./types";
import { FEED_PAGE_SIZE } from "./types";

/** 搜索命中检查：title / description / summaryZh / tags。 */
function matchesSearch(item: FrontierFeedItem, q: string): boolean {
  const needle = q.toLowerCase();
  return (
    item.title.toLowerCase().includes(needle) ||
    (item.description ?? "").toLowerCase().includes(needle) ||
    (item.summaryZh ?? "").toLowerCase().includes(needle) ||
    item.tags.some((t) => t.toLowerCase().includes(needle))
  );
}

function filterItems(items: FrontierFeedItem[], query: FeedQuery): FrontierFeedItem[] {
  return items.filter((item) => {
    if (query.source && item.source !== query.source) return false;
    if (query.type && item.contentType !== query.type) return false;
    if (query.tag && !item.tags.includes(query.tag.toLowerCase())) return false;
    if (query.q && !matchesSearch(item, query.q)) return false;
    return true;
  });
}

/** 与 Supabase provider 相同的排序语义：score 空值排在最后。 */
function sortItems(items: FrontierFeedItem[], query: FeedQuery): FrontierFeedItem[] {
  const sorted = [...items];
  switch (query.sort) {
    case "newest":
      sorted.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
      break;
    case "updated":
      sorted.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
      break;
    case "score":
    default:
      sorted.sort((a, b) => {
        const sa = a.score ?? -1;
        const sb = b.score ?? -1;
        if (sb !== sa) return sb - sa;
        return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
      });
      break;
  }
  return sorted;
}

export class FixtureFeedProvider implements FeedProvider {
  readonly mode = "fixture" as const;

  async getFeed(query: FeedQuery): Promise<FeedResult> {
    // 固定顺序处理：筛选 → 排序 → 分页
    const filtered = filterItems(FIXTURES, query);
    const sorted = sortItems(filtered, query);

    const total = sorted.length;
    const page = Math.max(1, query.page);
    const start = (page - 1) * FEED_PAGE_SIZE;
    const items = sorted
      .slice(start, start + FEED_PAGE_SIZE)
      .map((item) => ({ ...item, isFixture: true }));

    return {
      items,
      total,
      page,
      pageSize: FEED_PAGE_SIZE,
      query,
    };
  }
}
