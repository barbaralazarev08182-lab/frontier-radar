/**
 * Supabase Feed Provider（阶段 1.6）。
 *
 * 只读查询 frontier_feed_v1 View（服务端执行，anon key，不触达 service role）。
 * 缺配置时抛 FeedUnconfiguredError（页面显示清晰错误，不悄悄回退 fixture）。
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { FeedQueryError, FeedUnconfiguredError, type FeedProvider } from "./provider";
import { resolvePublishableKey, resolveSupabaseUrl } from "@/lib/env/supabase-keys";
import type {
  FeedContentType,
  FeedQuery,
  FeedResult,
  FeedSource,
  FrontierFeedItem,
} from "./types";
import { FEED_PAGE_SIZE } from "./types";

/** View 行结构（与 0008_frontier_feed_view.sql 对应） */
export interface FeedViewRow {
  item_id: string;
  source_slug: string;
  content_type: string;
  title: string;
  canonical_url: string;
  author: string | null;
  description: string | null;
  published_at: string | null;
  updated_at: string | null;
  latest_score: number | null;
  analysis_result: Record<string, unknown> | null;
  analysis_created_at: string | null;
  summary_zh: string | null;
  why_it_matters: string | null;
  tags: unknown;
  tags_text: string | null;
  metrics: Record<string, unknown> | null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function strArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

function enumValue<T extends string>(v: unknown, allowed: T[], fallback: T): T {
  return typeof v === "string" && (allowed as string[]).includes(v) ? (v as T) : fallback;
}

function toFeedSource(slug: string): FeedSource {
  return enumValue<FeedSource>(
    slug,
    ["github", "huggingface", "hackernews", "arxiv"],
    "github"
  );
}

function toFeedType(t: string): FeedContentType {
  return enumValue<FeedContentType>(
    t,
    ["repo", "model", "dataset", "space", "paper", "product"],
    "repo"
  );
}

/** 把 View 行映射为统一 Feed 类型。无 AI 分析时回退 description 与 unknown。 */
export function mapFeedRow(row: FeedViewRow): FrontierFeedItem {
  const a = row.analysis_result;
  const metrics: FrontierFeedItem["metrics"] = {};
  if (row.metrics && typeof row.metrics === "object") {
    for (const key of ["stars", "forks", "downloads", "likes"] as const) {
      const v = row.metrics[key];
      if (typeof v === "number") metrics[key] = v;
    }
  }

  return {
    id: row.item_id,
    source: toFeedSource(row.source_slug),
    contentType: toFeedType(row.content_type),
    title: row.title,
    canonicalUrl: row.canonical_url,
    author: str(row.author),
    description: str(row.description),
    publishedAt: str(row.published_at),
    updatedAt: str(row.updated_at),
    score: row.latest_score === null ? null : Number(row.latest_score),
    summaryZh: typeof a?.summaryZh === "string" ? a.summaryZh : null,
    novelty: typeof a?.novelty === "string" ? a.novelty : null,
    whyItMatters:
      typeof a?.whyItMatters === "string" ? a.whyItMatters : str(row.why_it_matters),
    targetUsers: strArray(a?.targetUsers),
    possibleUses: strArray(a?.possibleUses),
    hasCode: enumValue<FrontierFeedItem["hasCode"]>(
      a?.hasCode,
      ["yes", "no", "unknown"],
      "unknown"
    ),
    hasDemo: enumValue<FrontierFeedItem["hasDemo"]>(
      a?.hasDemo,
      ["yes", "no", "unknown"],
      "unknown"
    ),
    reproductionDifficulty: enumValue<FrontierFeedItem["reproductionDifficulty"]>(
      a?.reproductionDifficulty,
      ["easy", "medium", "hard", "unknown"],
      "unknown"
    ),
    tags: strArray(row.tags),
    metrics,
  };
}

function buildSupabaseClient(): SupabaseClient {
  const url = resolveSupabaseUrl();
  const publishableKey = resolvePublishableKey();
  if (!url || !publishableKey) {
    throw new FeedUnconfiguredError(
      "数据模式为 supabase，但未配置 NEXT_PUBLIC_SUPABASE_URL 与 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY（或旧变量 NEXT_PUBLIC_SUPABASE_ANON_KEY）。请配置环境变量，或在开发环境设置 FRONTIER_DATA_MODE=fixture。"
    );
  }
  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export class SupabaseFeedProvider implements FeedProvider {
  readonly mode = "supabase" as const;
  private readonly supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase ?? buildSupabaseClient();
  }

  async getFeed(query: FeedQuery): Promise<FeedResult> {
    let q = this.supabase
      .from("frontier_feed_v1")
      .select("*", { count: "exact" });

    if (query.source) q = q.eq("source_slug", query.source);
    if (query.type) q = q.eq("content_type", query.type);
    if (query.tag) q = q.contains("tags", [query.tag.toLowerCase()]);
    if (query.q) {
      const needle = query.q.replace(/%/g, "\\%");
      q = q.or(
        `title.ilike.%${needle}%,description.ilike.%${needle}%,summary_zh.ilike.%${needle}%,tags_text.ilike.%${needle}%`
      );
    }

    switch (query.sort) {
      case "newest":
        q = q.order("published_at", { ascending: false });
        break;
      case "updated":
        q = q.order("updated_at", { ascending: false });
        break;
      case "score":
      default:
        q = q
          .order("analysis_created_at", { ascending: false, nullsFirst: false })
          .order("latest_score", { ascending: false, nullsFirst: false });
        break;
    }

    const start = (query.page - 1) * FEED_PAGE_SIZE;
    q = q.range(start, start + FEED_PAGE_SIZE - 1);

    let data: unknown;
    let count: number | null;
    try {
      const res = await q;
      data = res.data;
      count = res.count;
      if (res.error) throw res.error;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new FeedQueryError(`数据库查询失败: ${message}`);
    }

    const items = (Array.isArray(data) ? data : []).map((row) =>
      mapFeedRow(row as FeedViewRow)
    );

    return {
      items,
      total: typeof count === "number" ? count : items.length,
      page: query.page,
      pageSize: FEED_PAGE_SIZE,
      query,
    };
  }
}
