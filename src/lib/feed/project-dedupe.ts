import type { FeedResult } from "./types";
import { clusterProjectFeed } from "./project-entities";

/**
 * 兼容旧调用方：现在去重由 Project Entity 聚类实现。
 * 若调用方只需要去重后的 Feed，直接取聚类后的主条目；
 * Today 则会进一步读取 entities，保留跨来源证据。
 */
export function dedupeProjectFeed(feed: FeedResult): FeedResult {
  return clusterProjectFeed(feed).feed;
}
