/**
 * Feed 查询参数解析（阶段 1.6）。
 *
 * Explore 页面使用 URL query parameters：
 *   q / source / type / tag / sort / page
 * 全部参数必须可复制、可刷新保持。
 * 非法值回退默认值，不报错。
 */

import {
  FEED_CONTENT_TYPES,
  FEED_SORTS,
  type FeedContentType,
  type FeedQuery,
  type FeedSort,
  type FeedSource,
} from "./types";

const MAX_Q_LENGTH = 100;
const MAX_TAG_LENGTH = 50;
const MAX_PAGE = 1000;

export type SearchParamValue = string | string[] | undefined;

function firstParam(value: SearchParamValue): string | null {
  if (value === undefined) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function asSource(value: string | null): FeedSource | null {
  if (value === "github" || value === "huggingface" || value === "arxiv") return value;
  return null;
}

function asType(value: string | null): FeedContentType | null {
  return FEED_CONTENT_TYPES.includes(value as FeedContentType) ? (value as FeedContentType) : null;
}

function asSort(value: string | null): FeedSort {
  return FEED_SORTS.includes(value as FeedSort) ? (value as FeedSort) : "score";
}

function asPage(value: string | null): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(Math.floor(n), MAX_PAGE);
}

/** 解析 URL searchParams 为规范化 FeedQuery（所有字段均带默认值）。 */
export function parseFeedQuery(
  searchParams: Record<string, SearchParamValue>
): FeedQuery {
  const q = firstParam(searchParams.q)?.trim().slice(0, MAX_Q_LENGTH) || null;
  const source = asSource(firstParam(searchParams.source));
  const type = asType(firstParam(searchParams.type));
  const tag = firstParam(searchParams.tag)?.trim().slice(0, MAX_TAG_LENGTH) || null;
  const sort = asSort(firstParam(searchParams.sort));
  const page = asPage(firstParam(searchParams.page));
  return { q, source, type, tag, sort, page };
}

/** 由 FeedQuery 构造 Explore URL（保持其他参数）。 */
export function buildExploreUrl(base: string, query: FeedQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.source) params.set("source", query.source);
  if (query.type) params.set("type", query.type);
  if (query.tag) params.set("tag", query.tag);
  if (query.sort !== "score") params.set("sort", query.sort);
  if (query.page > 1) params.set("page", String(query.page));
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
