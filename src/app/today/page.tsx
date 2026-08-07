import Link from "next/link";
import { cookies } from "next/headers";
import { FeedQueryError, FeedUnconfiguredError, getDataMode, getFeedProvider } from "@/lib/feed/provider";
import type { FeedQuery, FeedResult } from "@/lib/feed/types";
import { ItemCard } from "@/components/frontier/item-card";
import { DataModeBadge } from "@/components/frontier/data-mode-badge";
import { EmptyState } from "@/components/frontier/empty-state";
import { FeedErrorState } from "@/components/frontier/feed-error";
import { VISITOR_COOKIE } from "@/lib/personalization/constants";
import { personalizeFeed } from "@/lib/personalization/server";

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
  let personalizationApplied = false;
  let personalizationSignals = 0;
  let personalizationMode: "vector" | "rules" | null = null;

  try {
    const provider = getFeedProvider();
    feed = await provider.getFeed(query);

    if (feed) {
      const cookieStore = await cookies();
      const visitorId = cookieStore.get(VISITOR_COOKIE)?.value ?? null;
      const personalized = await personalizeFeed(feed, visitorId);
      feed = personalized.feed;
      personalizationApplied = personalized.applied;
      personalizationSignals = personalized.signalCount;
      personalizationMode = personalized.mode;
    }
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
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Frontier Radar</h1>
          <DataModeBadge mode={mode} />
        </div>
        <p className="text-sm text-muted-foreground">{today}</p>
        <p className="text-sm text-muted-foreground">
          发现值得你点开的新科技项目、AI 应用、工具与实验。
        </p>
        {feed && !error ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>本页 {feed.items.length} 条</span>
            {personalizationApplied ? (
              <span>
                {personalizationMode === "vector" ? "兴趣向量推荐" : "规则个性化"}
                · 已学习 {personalizationSignals} 条近期反馈
              </span>
            ) : (
              <span>点“感兴趣 / 不感兴趣”，排序会逐渐学习你的偏好</span>
            )}
          </div>
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
