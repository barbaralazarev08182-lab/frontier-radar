/**
 * Feed 统一类型（阶段 1.6）。
 *
 * 页面只依赖此类型，不直接接触数据库原始行或 fixture 结构。
 * 数据来源由 FeedProvider 统一提供（fixture / supabase）。
 */

export type FeedSource =
  | "github"
  | "huggingface"
  | "arxiv"
  | "hackernews"
  | "producthunt";

export type FeedContentType =
  | "repo"
  | "model"
  | "dataset"
  | "space"
  | "paper"
  | "product";

export type AvailabilityStatus = "yes" | "no" | "unknown";
export type ReproductionDifficulty = "easy" | "medium" | "hard" | "unknown";

export interface FrontierFeedItem {
  id: string;
  source: FeedSource;
  contentType: FeedContentType;

  title: string;
  canonicalUrl: string;
  author: string | null;
  description: string | null;

  publishedAt: string | null;
  updatedAt: string | null;

  score: number | null;

  // AI 中文分析（可无）
  summaryZh: string | null;
  novelty: string | null;
  whyItMatters: string | null;

  targetUsers: string[];
  possibleUses: string[];

  hasCode: AvailabilityStatus;
  hasDemo: AvailabilityStatus;
  reproductionDifficulty: ReproductionDifficulty;

  tags: string[];

  metrics: {
    stars?: number | null;
    forks?: number | null;
    downloads?: number | null;
    likes?: number | null;
  };

  /** fixture 演示数据标记 */
  isFixture?: boolean;
}

export type FeedSort = "score" | "newest" | "updated";

export interface FeedQuery {
  q: string | null;
  source: FeedSource | null;
  type: FeedContentType | null;
  tag: string | null;
  sort: FeedSort;
  page: number;
}

export interface FeedResult {
  items: FrontierFeedItem[];
  total: number;
  page: number;
  pageSize: number;
  query: FeedQuery;
}

export const FEED_PAGE_SIZE = 20;

export const FEED_SOURCES: FeedSource[] = [
  "github",
  "huggingface",
  "hackernews",
  "producthunt",
  "arxiv",
];

export const FEED_CONTENT_TYPES: FeedContentType[] = [
  "repo",
  "model",
  "dataset",
  "space",
  "paper",
  "product",
];

export const FEED_SORTS: FeedSort[] = ["score", "newest", "updated"];
