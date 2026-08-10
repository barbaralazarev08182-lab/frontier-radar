import { cookies } from "next/headers";
import { FeedQueryError, FeedUnconfiguredError, getDataMode, getFeedProvider } from "@/lib/feed/provider";
import type { FeedResult } from "@/lib/feed/types";
import { parseFeedQuery, type SearchParamValue } from "@/lib/feed/query-params";
import { clusterProjectFeed, promoteCrossSourceEvidence } from "@/lib/feed/project-entities";
import { tryLoadPersistentProjectFeed } from "@/lib/feed/persistent-project-entities";
import { getDiscoveryExplanations, type DiscoveryExplanation } from "@/lib/feed/discovery-explanations";
import { buildExploreCandidates } from "@/lib/feed/explore-candidates";
import { personalizeFeed } from "@/lib/personalization/server";
import { VISITOR_COOKIE } from "@/lib/personalization/constants";
import { EmptyState } from "@/components/frontier/empty-state";
import { FeedErrorState } from "@/components/frontier/feed-error";
import { ExploreField } from "./explore-field";
import "./explore-field.css";
import "./explore-refinement.css";
import "./explore-bold-pass.css";
import "./explore-composition-reset.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Explore · Frontier Radar" };

interface ExplorePageProps {
  searchParams: Promise<Record<string, SearchParamValue>>;
}

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const search = await searchParams;
  const query = { ...parseFeedQuery(search), page: 1 };
  const mode = getDataMode();

  let feed: FeedResult | null = null;
  let error: { kind: "unconfigured" | "query"; message: string } | null = null;
  let candidates = [] as ReturnType<typeof buildExploreCandidates>;
  let totalDiscoveries = 0;
  let personalizedApplied = false;

  try {
    const provider = getFeedProvider();
    feed = await provider.getFeed(query);
    totalDiscoveries = feed.total;

    const cookieStore = await cookies();
    const visitorId = cookieStore.get(VISITOR_COOKIE)?.value ?? null;
    const personalized = await personalizeFeed(feed, visitorId);
    personalizedApplied = personalized.applied;

    let clustered = clusterProjectFeed(personalized.feed);
    if (mode === "supabase") {
      try {
        clustered = (await tryLoadPersistentProjectFeed(personalized.feed)) ?? clustered;
      } catch {
        // Persistent Project Entities are a sidecar; runtime clustering remains the safe fallback.
      }
    }

    const confirmed = promoteCrossSourceEvidence(clustered);
    const strongestInterests = personalized.strongestInterests;
    let explanations = new Map<string, DiscoveryExplanation>();
    try {
      explanations = await getDiscoveryExplanations(confirmed.feed.items.slice(0, 24), strongestInterests);
    } catch {
      // Explore remains usable without explanation rows.
    }

    candidates = buildExploreCandidates(
      confirmed.feed.items,
      confirmed.entities,
      explanations,
      strongestInterests,
      24
    );
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

  if (candidates.length === 0) {
    return (
      <EmptyState
        title="当前扫描没有可探索信号"
        description="Radar 已连接，但这一轮候选不足。稍后重新扫描，或检查采集与分析任务。"
        hint={mode === "supabase" ? "Explore 会复用现有 ingestion、scoring 与 personalization 数据。" : null}
      />
    );
  }

  return (
    <ExploreField
      candidates={candidates}
      totalDiscoveries={totalDiscoveries}
      dataLabel={mode === "supabase" ? "LIVE DATA" : "DEMO DATA"}
      personalized={personalizedApplied}
    />
  );
}
