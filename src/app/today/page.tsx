import Link from "next/link";
import { cookies } from "next/headers";
import { Activity, ArrowRight, Compass, Sparkles } from "lucide-react";
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
    <div className="space-y-7 md:space-y-9">
      <header className="radar-panel-strong radar-grid relative overflow-hidden rounded-[1.75rem] px-5 py-6 sm:px-7 md:px-8 md:py-8">
        <div aria-hidden className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-400/[0.055] blur-3xl" />
        <div aria-hidden className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-violet-500/[0.045] blur-3xl" />

        <div className="relative space-y-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="radar-kicker">Daily intelligence · 01</span>
              <DataModeBadge mode={mode} />
            </div>
            <p className="font-mono text-[11px] tracking-wide text-muted-foreground">{today}</p>
          </div>

          <div className="grid gap-7 md:grid-cols-[minmax(0,1fr)_18rem] md:items-end">
            <div className="max-w-3xl space-y-4">
              <h1 className="text-balance text-3xl font-semibold leading-[1.04] tracking-[-0.035em] text-foreground sm:text-4xl md:text-5xl">
                Your daily frontier brief.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-[15px]">
                从正在被构建的 AI、开发工具和新产品里，只留下今天真正值得你花注意力的 7 个信号。
                核心兴趣优先，同时保留相邻探索与意外发现。
              </p>
            </div>

            {feed && !error ? (
              <div className="grid grid-cols-3 gap-2 md:grid-cols-1">
                <div className="rounded-xl border border-white/[0.065] bg-black/10 px-3 py-3 md:flex md:items-center md:justify-between">
                  <span className="block text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Picks</span>
                  <span className="mt-1 block font-mono text-lg font-semibold tabular-nums text-foreground md:mt-0">{String(feed.items.length).padStart(2, "0")}</span>
                </div>
                <div className="rounded-xl border border-white/[0.065] bg-black/10 px-3 py-3 md:flex md:items-center md:justify-between">
                  <span className="block text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Mix</span>
                  <span className="mt-1 block font-mono text-sm font-semibold text-cyan-200 md:mt-0">5 / 1 / 1</span>
                </div>
                <div className="rounded-xl border border-white/[0.065] bg-black/10 px-3 py-3 md:flex md:items-center md:justify-between">
                  <span className="block text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Profile</span>
                  <span className="mt-1 block font-mono text-xs font-semibold text-violet-200 md:mt-0">
                    {personalizationApplied ? `${personalizationSignals} signals` : "learning"}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {feed && !error ? (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[0.065] pt-4 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-cyan-300" />
                5 Core · 1 Adjacent · 1 Wildcard
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-violet-300" />
                {personalizationApplied
                  ? `${personalizationMode === "vector" ? "兴趣向量" : "规则个性化"} · ${personalizationSignals} 条近期反馈`
                  : "你的反馈会逐渐改变 Core，但不会消灭探索位"}
              </span>
            </div>
          ) : null}
        </div>
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
            <nav className="radar-panel flex flex-wrap items-center gap-2 rounded-2xl px-4 py-3.5">
              <span className="mr-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <Compass className="h-3.5 w-3.5 text-cyan-300" /> Today signals
              </span>
              {topTags.map(({ tag, count }) => (
                <Link
                  key={tag}
                  href={`/explore?tag=${encodeURIComponent(tag)}`}
                  className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 text-[11px] text-muted-foreground transition-all hover:border-cyan-400/20 hover:bg-cyan-400/[0.04] hover:text-foreground"
                >
                  {tag}
                  <span className="ml-1 font-mono tabular-nums text-muted-foreground/60">{count}</span>
                </Link>
              ))}
            </nav>
          ) : null}

          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="radar-kicker">Ranked brief</p>
                <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-foreground md:text-2xl">Today&apos;s intelligence</h2>
              </div>
              <p className="max-w-md text-right text-[11px] leading-relaxed text-muted-foreground">
                公开 Discovery Score 决定基础质量；Personal Match 先于项目聚合，跨来源只做温和确认。
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
            </div>
          </section>

          <div className="flex justify-end border-t border-white/[0.06] pt-5">
            <Link
              href="/explore"
              className="group inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-cyan-200"
            >
              Explore all discoveries
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
