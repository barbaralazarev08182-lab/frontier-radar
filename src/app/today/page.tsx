import { cookies } from "next/headers";
import { FeedQueryError, FeedUnconfiguredError, getDataMode, getFeedProvider } from "@/lib/feed/provider";
import type { FeedQuery, FeedResult, FrontierFeedItem } from "@/lib/feed/types";
import {
  clusterProjectFeed,
  promoteCrossSourceEvidence,
  type ProjectEntity,
} from "@/lib/feed/project-entities";
import { tryLoadPersistentProjectFeed } from "@/lib/feed/persistent-project-entities";
import { tryLoadDailySynthesis } from "@/lib/feed/daily-synthesis";
import type { DailySynthesisSignalInput } from "@/lib/ai/daily-synthesis";
import {
  getDiscoveryExplanations,
  type DiscoveryExplanation,
} from "@/lib/feed/discovery-explanations";
import {
  buildDiscoveryMix,
  type DiscoveryLane,
} from "@/lib/feed/discovery-mix";
import type { InterestKey } from "@/config/interest-profile";
import { EmptyState } from "@/components/frontier/empty-state";
import { FeedErrorState } from "@/components/frontier/feed-error";
import type { EditorialSignal } from "@/components/frontier/today-editorial";
import { TodayMotionProduction } from "@/components/frontier/today-motion-production";
import { VISITOR_COOKIE } from "@/lib/personalization/constants";
import { personalizeFeed } from "@/lib/personalization/server";
import { loadTodaySynthesis, resolveTodaySynthesis } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Today · Frontier Radar" };

const DAILY_RADAR_LIMIT = 7;

function compact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function metricLabel(item: FrontierFeedItem): string | null {
  if (item.metrics.stars != null) return `${compact(item.metrics.stars)} stars`;
  if (item.metrics.downloads != null) return `${compact(item.metrics.downloads)} downloads`;
  if (item.metrics.likes != null) return `${compact(item.metrics.likes)} likes`;
  if (item.metrics.forks != null) return `${compact(item.metrics.forks)} forks`;
  return null;
}

function businessDateShanghai(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function TodayPage() {
  const mode = getDataMode();
  const query: FeedQuery = { q: null, source: null, type: null, tag: null, sort: "score", page: 1 };

  let feed: FeedResult | null = null;
  let error: { kind: "unconfigured" | "query"; message: string } | null = null;
  let strongestInterests: Array<{ key: InterestKey; weight: number }> = [];
  let explanations = new Map<string, DiscoveryExplanation>();
  let discoveryLanes = new Map<string, DiscoveryLane>();
  let projectEntities = new Map<string, ProjectEntity>();
  let totalDiscoveries = 0;

  try {
    const provider = getFeedProvider();
    feed = await provider.getFeed(query);
    totalDiscoveries = feed.total;

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
          // Persistent entities remain an incremental sidecar. Runtime clustering is the fallback.
        }
      }

      const confirmed = promoteCrossSourceEvidence(clustered);
      projectEntities = confirmed.entities;

      const mixed = buildDiscoveryMix(confirmed.feed, strongestInterests, DAILY_RADAR_LIMIT);
      feed = mixed.feed;
      discoveryLanes = mixed.lanes;
      explanations = await getDiscoveryExplanations(feed.items, strongestInterests);
    }
  } catch (err) {
    error =
      err instanceof FeedUnconfiguredError
        ? { kind: "unconfigured", message: err.message }
        : { kind: "query", message: err instanceof FeedQueryError || err instanceof Error ? err.message : String(err) };
  }

  const showDetails = process.env.NODE_ENV !== "production";

  if (error) {
    return <FeedErrorState kind={error.kind} message={error.message} showDetails={showDetails} />;
  }

  if (feed === null) return null;

  if (feed.items.length === 0) {
    return (
      <EmptyState
        title="数据库已连接，但暂无内容"
        description="采集与 AI 分析尚未运行，或当前筛选没有命中任何条目。"
        hint={
          mode === "supabase"
            ? "自动采集任务会持续补充 GitHub、Hugging Face、Show HN、Product Hunt 与 arXiv 内容"
            : null
        }
      />
    );
  }

  const signals: EditorialSignal[] = feed.items.map((item, index) => {
    const lane = discoveryLanes.get(item.id) ?? "core";
    const explanation = explanations.get(item.id);
    const entity = projectEntities.get(item.id);

    return {
      id: item.id,
      title: item.title,
      summary: item.summaryZh ?? item.description ?? "这个项目正在进入雷达，但结构化分析仍在补全。",
      score: item.score,
      source: item.source,
      contentType: item.contentType,
      canonicalUrl: item.canonicalUrl,
      author: item.author,
      tags: item.tags.slice(0, 4),
      lane,
      whyNow: explanation?.whyNow ?? null,
      whyYou: explanation?.whyYou ?? null,
      buildIdea: item.possibleUses[0] ?? null,
      metricsLabel: metricLabel(item),
      crossSource: entity?.crossSource ?? false,
      sourceCount: entity?.sources.length ?? 1,
      hasCode: entity?.hasCodeAnywhere ?? item.hasCode === "yes",
      hasDemo: entity?.hasDemoAnywhere ?? item.hasDemo === "yes",
      metadata: {
        rank: index + 1,
        lane,
        surface: "today",
        algorithm_variant: "daily-radar-mix-v1",
        source: item.source,
        content_type: item.contentType,
      },
    };
  });

  const editionDate = businessDateShanghai();
  const synthesisSignals: DailySynthesisSignalInput[] = signals.slice(0, DAILY_RADAR_LIMIT).map((signal, index) => ({
    id: signal.id,
    rank: index + 1,
    title: signal.title,
    summary: signal.summary,
    tags: signal.tags,
    lane: signal.lane,
    whyNow: signal.whyNow,
    score: signal.score,
  }));
  const synthesisSignalIds = synthesisSignals.map((signal) => signal.id);

  const initialSynthesis = mode === "supabase"
    ? await tryLoadDailySynthesis(editionDate, synthesisSignalIds)
    : null;
  const resolveSynthesisAction = mode === "supabase"
    ? resolveTodaySynthesis.bind(null, editionDate, synthesisSignals)
    : null;
  const loadSynthesisAction = mode === "supabase"
    ? loadTodaySynthesis.bind(null, editionDate, synthesisSignalIds)
    : null;

  const dateLabel = new Date()
    .toLocaleDateString("en-GB", {
      timeZone: "Asia/Shanghai",
      day: "2-digit",
      month: "short",
      year: "numeric",
      weekday: "long",
    })
    .toUpperCase();

  return (
    <div className="today-production-shell">
      <TodayMotionProduction
        dateLabel={dateLabel}
        dataLabel={mode === "supabase" ? "LIVE DATA" : "DEMO DATA"}
        totalDiscoveries={totalDiscoveries}
        signals={signals}
        synthesisSignals={synthesisSignals}
        initialSnapshot={initialSynthesis}
        resolveSynthesisAction={resolveSynthesisAction}
        loadSynthesisAction={loadSynthesisAction}
      />
    </div>
  );
}
