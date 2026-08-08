import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight, Compass, Orbit } from "lucide-react";
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
import { SignalHero } from "@/components/frontier/signal-hero";
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

function bentoClass(index: number, lane: DiscoveryLane): string {
  const span =
    index === 0
      ? "md:col-span-12"
      : index === 1
        ? "md:col-span-7"
        : index === 2
          ? "md:col-span-5"
          : index === 3
            ? "md:col-span-5"
            : index === 4
              ? "md:col-span-7"
              : index === 5
                ? "md:col-span-7"
                : "md:col-span-5";

  const offset =
    lane === "wildcard"
      ? "md:translate-y-5 md:rotate-[0.75deg]"
      : lane === "adjacent"
        ? "md:-translate-y-2 md:-rotate-[0.35deg]"
        : "";

  return `${span} ${offset}`;
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
          // Persistent Project Entity is incremental. Runtime clustering remains
          // the safety net if materialization is unavailable.
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
  const compactDate = new Date().toLocaleDateString("en-CA", { month: "2-digit", day: "2-digit", year: "2-digit" });
  const topTags = feed ? computeTopTags(feed, 6) : [];
  const heroSignals = feed
    ? feed.items.map((item) => ({
        id: item.id,
        title: item.title,
        source: item.source,
        score: item.score,
        lane: discoveryLanes.get(item.id) ?? "core",
      }))
    : [];

  return (
    <div className="space-y-8 md:space-y-12">
      {!error && feed && feed.items.length > 0 ? (
        <SignalHero
          date={compactDate}
          signals={heroSignals}
          personalizationApplied={personalizationApplied}
          personalizationSignals={personalizationSignals}
          personalizationMode={personalizationMode}
        />
      ) : (
        <header className="radar-panel-strong radar-grid rounded-[1.75rem] p-7">
          <p className="radar-kicker">Frontier Radar · Today</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Daily signal field</h1>
          <p className="mt-3 text-sm text-muted-foreground">{today}</p>
        </header>
      )}

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
          <div id="today-signals" className="scroll-mt-24 space-y-5">
            <div className="signal-command-bar flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3.5 sm:px-5">
              <div className="flex items-center gap-2 border-r border-white/[0.08] pr-3">
                <Orbit className="h-4 w-4 text-cyan-200" />
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-white/70">Signal map</span>
              </div>
              <DataModeBadge mode={mode} />
              <span className="font-mono text-[9px] uppercase tracking-[0.13em] text-white/34">{today}</span>
              <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.13em] text-white/34">Ranked / personalized / cross-source confirmed</span>
            </div>

            {topTags.length > 0 ? (
              <nav className="flex flex-wrap items-center gap-2">
                <span className="mr-1 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">
                  <Compass className="h-3.5 w-3.5 text-cyan-300" /> Active frequencies
                </span>
                {topTags.map(({ tag, count }, index) => (
                  <Link
                    key={tag}
                    href={`/explore?tag=${encodeURIComponent(tag)}`}
                    className="signal-frequency group rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1.5 text-[10px] text-white/50 transition hover:border-cyan-200/25 hover:bg-cyan-200/[0.06] hover:text-cyan-50"
                  >
                    <span className="mr-1.5 font-mono text-[8px] text-white/25">0{index + 1}</span>
                    {tag}
                    <span className="ml-1.5 font-mono tabular-nums text-white/28 group-hover:text-cyan-100/50">{count}</span>
                  </Link>
                ))}
              </nav>
            ) : null}
          </div>

          <section className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="radar-kicker">Detected objects · 07</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white md:text-3xl">Today&apos;s signal constellation</h2>
              </div>
              <p className="max-w-md text-right text-[10px] leading-5 text-white/34">
                卡片尺寸表达今日注意力权重；Adjacent 与 Wildcard 故意偏离栅格，让推荐算法本身成为视觉语言。
              </p>
            </div>

            <div className="signal-bento-grid grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-5">
              {feed.items.map((item, index) => {
                const explanation = explanations.get(item.id);
                const lane = discoveryLanes.get(item.id) ?? "core";
                return (
                  <div key={item.id} className={bentoClass(index, lane)}>
                    <ItemCard
                      item={item}
                      featured={index === 0}
                      rank={index + 1}
                      discoveryLane={lane}
                      projectEntity={projectEntities.get(item.id) ?? null}
                      whyNow={explanation?.whyNow ?? null}
                      whyYou={explanation?.whyYou ?? null}
                    />
                  </div>
                );
              })}
            </div>
          </section>

          <div className="flex justify-end border-t border-white/[0.07] pt-6">
            <Link
              href="/explore"
              className="group inline-flex items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.035] px-4 py-2 text-xs font-medium text-white/55 transition hover:border-cyan-200/25 hover:bg-cyan-200/[0.06] hover:text-cyan-50"
            >
              Open full spectrum
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
