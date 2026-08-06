import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FeedQueryError, FeedUnconfiguredError, getDataMode, getFeedProvider } from "@/lib/feed/provider";
import { buildExploreUrl, parseFeedQuery, type SearchParamValue } from "@/lib/feed/query-params";
import type { FeedResult } from "@/lib/feed/types";
import { FEED_PAGE_SIZE } from "@/lib/feed/types";
import { ItemCard } from "@/components/frontier/item-card";
import { DataModeBadge } from "@/components/frontier/data-mode-badge";
import { FilterBar } from "@/components/frontier/filter-bar";
import { EmptyState } from "@/components/frontier/empty-state";
import { FeedErrorState } from "@/components/frontier/feed-error";

export const dynamic = "force-dynamic";
export const metadata = { title: "Explore · Frontier Radar" };

interface ExplorePageProps {
  searchParams: Promise<Record<string, SearchParamValue>>;
}

function computeTagChips(feed: FeedResult, limit: number): string[] {
  const freq = new Map<string, number>();
  for (const item of feed.items) {
    for (const tag of item.tags.slice(0, 5)) {
      freq.set(tag, (freq.get(tag) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag);
}

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const sp = await searchParams;
  const query = parseFeedQuery(sp);
  const mode = getDataMode();

  let feed: FeedResult | null = null;
  let error: { kind: "unconfigured" | "query"; message: string } | null = null;
  try {
    const provider = getFeedProvider();
    feed = await provider.getFeed(query);
  } catch (err) {
    error =
      err instanceof FeedUnconfiguredError
        ? { kind: "unconfigured", message: err.message }
        : { kind: "query", message: err instanceof FeedQueryError || err instanceof Error ? err.message : String(err) };
  }

  const showDetails = process.env.NODE_ENV !== "production";
  const totalPages = feed ? Math.max(1, Math.ceil(feed.total / FEED_PAGE_SIZE)) : 1;
  const tagChips = feed ? computeTagChips(feed, 6) : [];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Explore</h1>
          <DataModeBadge mode={mode} />
        </div>
        <p className="text-sm text-muted-foreground">
          按来源、类型、标签与关键词浏览全部前沿内容。
        </p>
      </header>

      <FilterBar query={query} total={feed?.total ?? 0} />

      {tagChips.length > 0 ? (
        <nav className="flex flex-wrap items-center gap-2">
          {tagChips.map((tag) => (
            <Link
              key={tag}
              href={buildExploreUrl("/explore", { ...query, tag, page: 1 })}
              className="rounded border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
            >
              {tag}
            </Link>
          ))}
        </nav>
      ) : null}

      {error ? (
        <FeedErrorState kind={error.kind} message={error.message} showDetails={showDetails} />
      ) : feed === null ? null : feed.items.length === 0 ? (
        <EmptyState
          title="没有匹配的内容"
          description="当前筛选条件没有命中任何条目，尝试放宽来源、类型或关键词。"
          hint={
            mode === "supabase"
              ? "提示：若数据库尚无内容，请先运行采集与 AI 分析脚本"
              : null
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {feed.items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* 服务端分页 */}
      {feed && feed.items.length > 0 && totalPages > 1 ? (
        <nav className="flex items-center justify-between border-t border-border pt-4 text-sm">
          <span className="text-xs text-muted-foreground">
            第 {query.page} / {totalPages} 页
          </span>
          <span className="flex gap-2">
            {query.page > 1 ? (
              <Link
                href={buildExploreUrl("/explore", { ...query, page: query.page - 1 })}
                className="inline-flex items-center gap-1 rounded border border-border px-3 py-1.5 hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" /> 上一页
              </Link>
            ) : null}
            {query.page < totalPages ? (
              <Link
                href={buildExploreUrl("/explore", { ...query, page: query.page + 1 })}
                className="inline-flex items-center gap-1 rounded border border-border px-3 py-1.5 hover:bg-muted"
              >
                下一页 <ChevronRight className="h-4 w-4" />
              </Link>
            ) : null}
          </span>
        </nav>
      ) : null}
    </div>
  );
}
