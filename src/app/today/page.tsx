import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight } from "lucide-react";
import { FeedQueryError, FeedUnconfiguredError, getDataMode, getFeedProvider } from "@/lib/feed/provider";
import type { FeedQuery, FeedResult } from "@/lib/feed/types";
import {
  clusterProjectFeed,
  promoteCrossSourceEvidence,
  type ProjectEntity,
} from "@/lib/feed/project-entities";
import { tryLoadPersistentProjectFeed } from "@/lib/feed/persistent-project-entities";
import {
  getDiscoveryExplanations,
  type DiscoveryExplanation,
} from "@/lib/feed/discovery-explanations";
import {
  buildDiscoveryMix,
  type DiscoveryLane,
} from "@/lib/feed/discovery-mix";
import type { InterestKey } from "@/config/interest-profile";
import { ItemCard } from "@/components/frontier/item-card";
import { DataModeBadge } from "@/components/frontier/data-mode-badge";
import { EmptyState } from "@/components/frontier/empty-state";
import { FeedErrorState } from "@/components/frontier/feed-error";
import { VISITOR_COOKIE } from "@/lib/personalization/constants";
import { personalizeFeed } from "@/lib/personalization/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Today · Frontier Radar" };

const DAILY_RADAR_LIMIT = 7;

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
  let strongestInterests: Array<{ key: InterestKey; weight: number }> = [];
  let explanations = new Map<string, DiscoveryExplanation>();
  let discoveryLanes = new Map<string, DiscoveryLane>();
  let projectEntities = new Map<string, ProjectEntity>();

  try {
    const provider = getFeedProvider();
    feed = await provider.getFeed(query);

    if (feed) {
      const cookieStore = await cookies();
      const visitorId = cookieStore.get(VISITOR_COOKIE)?.value ?? null;
      const personalized = await personalizeFeed(feed, visitorId);
      strongestInterests = personalized.strongestInterests;

      let clustered = clusterProjectFeed(personalized.feed);
      if (mode === "supabase") {
        try {
          clustered = (await tryLoadPersistentProjectFeed(personalized.feed)) ?? clustered;
        } catch {
          // Project persistence is an incremental rollout. Runtime clustering remains
          // the safety net if the migration is not applied or materialization fails.
        }
      }
      const confirmed = promoteCrossSourceEvidence(clustered);
      projectEntities = confirmed.entities;

      const mixed = buildDiscoveryMix(confirmed.feed, strongestInterests, DAILY_RADAR_LIMIT);
      feed = mixed.feed;
      discoveryLanes = mixed.lanes;

      personalizationApplied = personalized.applied;
      personalizationSignals = personalized.signalCount;
      personalizationMode = personalized.mode;
      explanations = await getDiscoveryExplanations(feed.items, strongestInterests);
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

  const topTags = feed ? computeTopTags(feed, 5) : [];

  return (
    <div className="space-y-8">
      <header className="space-y-5 border-b border-border/70 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Frontier Radar</h1>
            <DataModeBadge mode={mode} />
          </div>
          <p className="font-mono text-xs text-muted-foreground">{today}</p>
        </div>

        <div className="max-w-2xl space-y-2">
          <p className="text-lg font-medium tracking-tight md:text-xl">
            7 things worth your attention today.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            5 个核心兴趣 + 1 个相邻探索 + 1 个高质量随机发现。跨平台同时出现会作为温和确认信号，但不会压过真正的兴趣匹配与 Idea Spark。
          </p>
        </div>

        {feed && !error ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>Daily Radar · {feed.items.length} picks</span>
            <span>5 Core · 1 Adjacent · 1 Wildcard</span>
            {personalizationApplied ? (
              <span>
                {personalizationMode === "vector" ? "兴趣向量推荐" : "规则个性化"}
                · 已学习 {personalizationSignals} 条近期反馈
              </span>
            ) : (
              <span>你的反馈会逐渐改变 Core，同时保留探索位</span>
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
              ? "自动采集任务会持续补充 GitHub、Hugging Face、Show HN、Product Hunt 与 arXiv 内容"
              : null
          }
        />
      ) : (
        <>
          {topTags.length > 0 ? (
            <nav className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Today signals</span>
              {topTags.map(({ tag, count }) => (
                <Link
                  key={tag}
                  href={`/explore?tag=${encodeURIComponent(tag)}`}
                  className="rounded-full border border-border/80 bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {tag}
                  <span className="ml-1 font-mono tabular-nums text-muted-foreground/70">{count}</span>
                </Link>
              ))}
            </nav>
          ) : null}

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {feed.items.map((item, index) => {
              const explanation = explanations.get(item.id);
              return (
                <div key={item.id} className={index === 0 ? "md:col-span-2" : undefined}>
                  <ItemCard
                    item={item}
                    featured={index === 0}
                    rank={index + 1}
                    discoveryLane={discoveryLanes.get(item.id) ?? "core"}
                    projectEntity={projectEntities.get(item.id) ?? null}
                    whyNow={explanation?.whyNow ?? null}
                    whyYou={explanation?.whyYou ?? null}
                  />
                </div>
              );
            })}
          </section>

          <div className="flex justify-end border-t border-border/70 pt-4">
            <Link
              href="/explore"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Explore all discoveries
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
