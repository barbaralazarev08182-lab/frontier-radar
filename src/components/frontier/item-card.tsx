import { ArrowUpRight, Code, Play, Radar, Sparkles } from "lucide-react";
import type { FrontierFeedItem } from "@/lib/feed/types";
import type { DiscoveryLane } from "@/lib/feed/discovery-mix";
import type { ProjectEntity } from "@/lib/feed/project-entities";
import type { FeedbackMetadata } from "@/lib/personalization/browser";
import { getRadarSignals } from "@/lib/feed/radar-signals";
import { SourceBadge } from "./source-badge";
import { ScoreBadge } from "./score-badge";
import { MetricRow } from "./metric-row";
import { FeedbackActions } from "./feedback-actions";
import { TrackedSourceLink } from "./tracked-source-link";
import { TrackedDetailLink } from "./tracked-detail-link";
import { RecommendationObserver } from "./recommendation-observer";

const TYPE_LABEL: Record<string, string> = {
  repo: "Repository",
  model: "Model",
  dataset: "Dataset",
  space: "Space",
  paper: "Paper",
  product: "Project",
};

const SOURCE_LABEL: Record<string, string> = {
  github: "GitHub",
  huggingface: "Hugging Face",
  hackernews: "Show HN",
  producthunt: "Product Hunt",
  arxiv: "arXiv",
};

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "复现：简单",
  medium: "复现：中等",
  hard: "复现：困难",
  unknown: "复现：未知",
};

const LANE_LABEL: Record<DiscoveryLane, string> = {
  core: "CORE",
  adjacent: "ADJACENT",
  wildcard: "WILDCARD",
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

function signalClass(signal: string): string {
  if (signal === "IDEA SPARK") return "border-violet-400/20 bg-violet-400/[0.07] text-violet-200";
  if (signal === "RISING") return "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-200";
  if (signal === "NEW") return "border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-200";
  return "border-white/[0.06] bg-white/[0.025] text-muted-foreground";
}

function laneClass(lane: DiscoveryLane): string {
  if (lane === "adjacent") return "border-amber-400/20 bg-amber-400/[0.055] text-amber-200";
  if (lane === "wildcard") return "border-fuchsia-400/20 bg-fuchsia-400/[0.055] text-fuchsia-200";
  return "border-cyan-400/15 bg-cyan-400/[0.045] text-cyan-200/85";
}

interface ItemCardProps {
  item: FrontierFeedItem;
  featured?: boolean;
  rank?: number;
  discoveryLane?: DiscoveryLane;
  projectEntity?: ProjectEntity | null;
  whyNow?: string | null;
  whyYou?: string | null;
}

/** 单个项目发现卡片。Today 额外展示探索分层、推荐解释与跨来源 Project Intelligence。 */
export function ItemCard({
  item,
  featured = false,
  rank,
  discoveryLane,
  projectEntity = null,
  whyNow = null,
  whyYou = null,
}: ItemCardProps) {
  const noAnalysis = !item.summaryZh && !item.whyItMatters;
  const displayText = noAnalysis ? item.description : item.summaryZh;
  const date = formatDate(item.updatedAt ?? item.publishedAt);
  const radarSignals = getRadarSignals(item, featured ? 4 : 3);
  const buildIdeas = item.possibleUses.slice(0, featured ? 2 : 1);
  const trackingMetadata: FeedbackMetadata = {
    rank,
    lane: discoveryLane,
    surface: discoveryLane ? "today" : "explore",
    algorithm_variant: discoveryLane ? "daily-radar-mix-v1" : "explore-v1",
    source: item.source,
    content_type: item.contentType,
  };
  const crossSourceEntity = projectEntity?.crossSource ? projectEntity : null;
  const hasCode = projectEntity?.hasCodeAnywhere ?? item.hasCode === "yes";
  const hasDemo = projectEntity?.hasDemoAnywhere ?? item.hasDemo === "yes";

  return (
    <article
      className={[
        "group relative isolate flex h-full flex-col gap-4 overflow-hidden rounded-2xl border border-white/[0.075] bg-card/70 shadow-[0_22px_70px_-48px_rgba(0,0,0,1)] backdrop-blur-sm transition-all duration-300",
        "hover:-translate-y-0.5 hover:border-cyan-300/15 hover:bg-card/90 hover:shadow-[0_28px_85px_-48px_rgba(8,145,178,0.24)]",
        featured ? "p-5 sm:p-6 md:min-h-[22rem] md:p-7" : "p-4 sm:p-5",
      ].join(" ")}
    >
      <div
        aria-hidden
        className={[
          "absolute inset-x-0 top-0 h-px",
          featured
            ? "bg-gradient-to-r from-cyan-300/50 via-violet-300/20 to-transparent"
            : "bg-gradient-to-r from-white/10 via-white/[0.03] to-transparent",
        ].join(" ")}
      />
      {featured ? (
        <div aria-hidden className="absolute -right-20 -top-24 -z-10 h-72 w-72 rounded-full bg-cyan-400/[0.04] blur-3xl" />
      ) : null}

      {discoveryLane && typeof rank === "number" ? (
        <RecommendationObserver itemId={item.id} metadata={trackingMetadata} />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {typeof rank === "number" ? (
          <span className={featured ? "font-mono text-base font-semibold tabular-nums text-foreground/75" : "font-mono text-xs font-semibold tabular-nums text-muted-foreground"}>
            {String(rank).padStart(2, "0")}
          </span>
        ) : null}
        {discoveryLane ? (
          <span className={`rounded-full border px-2 py-0.5 font-mono text-[9px] font-semibold tracking-[0.12em] ${laneClass(discoveryLane)}`}>
            {LANE_LABEL[discoveryLane]}
          </span>
        ) : null}
        <SourceBadge source={item.source} />
        <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70">
          {TYPE_LABEL[item.contentType] ?? item.contentType}
        </span>
        <span className="ml-auto">
          <ScoreBadge score={item.score} />
        </span>
      </div>

      {radarSignals.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {radarSignals.map((signal) => (
            <span
              key={signal}
              className={`rounded-full border px-2 py-0.5 font-mono text-[9px] font-semibold tracking-[0.08em] ${signalClass(signal)}`}
            >
              {signal}
            </span>
          ))}
        </div>
      ) : null}

      <div className={featured ? "max-w-4xl space-y-3" : "space-y-2.5"}>
        <h3 className={featured ? "text-balance text-2xl font-semibold leading-[1.12] tracking-[-0.025em] md:text-3xl" : "text-balance text-lg font-semibold leading-snug tracking-tight"}>
          <TrackedDetailLink
            itemId={item.id}
            href={`/project/${item.id}`}
            className="transition-colors hover:text-cyan-200"
            metadata={trackingMetadata}
          >
            {item.title}
          </TrackedDetailLink>
        </h3>

        {noAnalysis ? (
          <>
            {item.description ? (
              <p className={`${featured ? "line-clamp-4 text-[15px] leading-7" : "line-clamp-3 text-sm leading-6"} text-muted-foreground`}>
                {item.description}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">（无描述）</p>
            )}
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground/55">
              Structured analysis pending · ranked by project and growth signals
            </p>
          </>
        ) : (
          <>
            <p className={`${featured ? "line-clamp-3 text-[15px] leading-7 md:text-base" : "line-clamp-2 text-sm leading-6"} text-foreground/88`}>
              {displayText}
            </p>
            {item.whyItMatters ? (
              <div className="flex gap-2.5 border-l border-violet-300/20 pl-3 text-xs leading-relaxed text-muted-foreground">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-300" />
                <p className={featured ? "line-clamp-3" : "line-clamp-2"}>
                  <span className="font-medium text-foreground/80">为什么值得看：</span>
                  {item.whyItMatters}
                </p>
              </div>
            ) : null}
          </>
        )}
      </div>

      {crossSourceEntity ? (
        <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/[0.035] p-3.5">
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            <Radar className="h-3.5 w-3.5 text-cyan-300" />
            <span className="font-mono text-[9px] font-semibold tracking-[0.14em] text-cyan-200">
              PROJECT INTELLIGENCE
            </span>
            <span className="text-[10px] text-muted-foreground">
              {crossSourceEntity.sources.length} 个来源
              {crossSourceEntity.firstSeenAt ? ` · 最早 ${formatDate(crossSourceEntity.firstSeenAt)}` : ""}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {crossSourceEntity.evidence.map((evidence) => (
              <TrackedSourceLink
                key={evidence.itemId}
                itemId={evidence.itemId}
                href={evidence.url}
                metadata={{
                  ...trackingMetadata,
                  source: evidence.source,
                  content_type: evidence.contentType,
                }}
                className="rounded-full border border-white/[0.07] bg-black/10 px-2.5 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:border-cyan-300/20 hover:text-foreground"
              >
                {SOURCE_LABEL[evidence.source] ?? evidence.source}
                {evidence.contentType === "repo" ? " · Code" : evidence.contentType === "space" ? " · Demo" : ""}
              </TrackedSourceLink>
            ))}
          </div>
          {crossSourceEntity.matchConfidence === "title" ? (
            <p className="mt-2 text-[9px] text-muted-foreground/55">跨来源关联依据：项目名称高度匹配</p>
          ) : null}
        </div>
      ) : null}

      {whyNow || whyYou ? (
        <div className="grid gap-2 md:grid-cols-2">
          {whyNow ? (
            <div className="rounded-xl border border-emerald-400/10 bg-emerald-400/[0.025] p-3">
              <p className="mb-1.5 font-mono text-[9px] font-semibold tracking-[0.14em] text-emerald-300">WHY NOW</p>
              <p className="text-xs leading-relaxed text-muted-foreground">{whyNow}</p>
            </div>
          ) : null}
          {whyYou ? (
            <div className="rounded-xl border border-violet-400/10 bg-violet-400/[0.025] p-3">
              <p className="mb-1.5 font-mono text-[9px] font-semibold tracking-[0.14em] text-violet-300">WHY YOU</p>
              <p className="text-xs leading-relaxed text-muted-foreground">{whyYou}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {buildIdeas.length > 0 ? (
        <div className="rounded-xl border border-violet-400/10 bg-violet-400/[0.025] p-3.5">
          <p className="mb-1.5 font-mono text-[9px] font-semibold tracking-[0.14em] text-violet-300">
            BUILD ON THIS
          </p>
          <div className="space-y-1 text-xs leading-relaxed text-muted-foreground">
            {buildIdeas.map((idea) => (
              <p key={idea}>→ {idea}</p>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] text-muted-foreground">
        {item.author ? <span className="text-foreground/65">{item.author}</span> : null}
        {date ? <span>{date}</span> : null}
        {hasCode ? (
          <span className="inline-flex items-center gap-1">
            <Code className="h-3 w-3 text-cyan-300/75" /> 有代码
          </span>
        ) : null}
        {hasDemo ? (
          <span className="inline-flex items-center gap-1">
            <Play className="h-3 w-3 text-violet-300/80" /> 有 Demo
          </span>
        ) : null}
        {!featured ? <span>{DIFFICULTY_LABEL[item.reproductionDifficulty]}</span> : null}
        <MetricRow item={item} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-3.5">
        <span className="flex flex-wrap gap-1.5">
          {item.tags.slice(0, featured ? 5 : 4).map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-white/[0.045] bg-white/[0.025] px-1.5 py-0.5 text-[10px] text-muted-foreground/80"
            >
              {tag}
            </span>
          ))}
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <FeedbackActions itemId={item.id} metadata={trackingMetadata} />
          <TrackedDetailLink
            itemId={item.id}
            href={`/project/${item.id}`}
            className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
            metadata={trackingMetadata}
          >
            查看情报
          </TrackedDetailLink>
          <TrackedSourceLink
            itemId={item.id}
            href={item.canonicalUrl}
            className="inline-flex items-center gap-1 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.06] px-2.5 py-1.5 text-[11px] font-medium text-cyan-100 transition-colors hover:border-cyan-300/30 hover:bg-cyan-300/[0.09]"
            metadata={trackingMetadata}
          >
            打开项目
            <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </TrackedSourceLink>
        </span>
      </div>
    </article>
  );
}
