import Link from "next/link";
import { FeedQueryError, FeedUnconfiguredError, getDataMode, getFeedProvider } from "@/lib/feed/provider";
import type { FeedQuery, FeedResult } from "@/lib/feed/types";
import { ItemCard } from "@/components/frontier/item-card";
import { DataModeBadge } from "@/components/frontier/data-mode-badge";
import { EmptyState } from "@/components/frontier/empty-state";
import { FeedErrorState } from "@/components/frontier/feed-error";

export const dynamic = "force-dynamic";
export const metadata = { title: "Today · Frontier Radar" };

/** 统计最常见的标签（不调用 AI，纯当前页统计）。 */
function computeTopTags(feed: FeedResult, limit: number): Array<{ tag: string; count: number }> {
  const freq = new Map<string, number>();
  for (const item of feed.items) {
    for (const tag of item.tags.slice(0, 5)) {
      freq.set(tag, (freq.get(tag) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));
}

export default async function TodayPage() {
  const mode = getDataMode();
  const query: FeedQuery = { q: null, source: null, type: null, tag: null, sort: "score", page: 1 };

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
  const today = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const topTags = feed ? computeTopTags(feed, 6) : [];

  return (
    <div className="space-y-6">
      {/* 顶部区域 */}
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Frontier Radar</h1>
          <DataModeBadge mode={mode} />
        </div>
        <p className="text-sm text-muted-foreground">{today}</p>
        <p className="text-sm text-muted-foreground">
          每天用十分钟了解真正值得关注的 AI、机器学习和创意项目。
        </p>
        {feed && !error ? (
          <p className="text-xs text-muted-foreground">本页 {feed.items.length} 条</p>
        ) : null}
      </header>

      {error ? (
        <FeedErrorState kind={error.kind} message={error.message} showDetails={showDetails} />
      ) : feed === null ? null : feed.items.length === 0 ? (
        <EmptyState
          title="数据库已连接，但暂无内容"
          description="采集与 AI 分析尚未运行，或当前筛选没有命中任何条目。"
          hint={
            mode === "supabase"
              ? "提示：运行 npm run collect:github / collect:huggingface / collect:arxiv 与 npm run analyze:items 生成内容"
              : null
          }
        />
      ) : (
        <>
          {/* 趋势标签 */}
          {topTags.length > 0 ? (
            <nav className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">趋势：</span>
              {topTags.map(({ tag, count }) => (
                <Link
                  key={tag}
                  href={`/explore?tag=${encodeURIComponent(tag)}`}
                  className="rounded border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
                >
                  {tag}
                  <span className="ml-1 tabular-nums text-muted-foreground/70">{count}</span>
                </Link>
              ))}
            </nav>
          ) : null}

          {/* 今日精选卡片 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {feed.items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
