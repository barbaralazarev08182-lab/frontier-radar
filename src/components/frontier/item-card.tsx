import { ArrowUpRight, Code, Play, Sparkles } from "lucide-react";
import type { FrontierFeedItem } from "@/lib/feed/types";
import { getRadarSignals } from "@/lib/feed/radar-signals";
import { SourceBadge } from "./source-badge";
import { ScoreBadge } from "./score-badge";
import { MetricRow } from "./metric-row";
import { FeedbackActions } from "./feedback-actions";
import { TrackedSourceLink } from "./tracked-source-link";

const TYPE_LABEL: Record<string, string> = {
  repo: "Repository",
  model: "Model",
  dataset: "Dataset",
  space: "Space",
  paper: "Paper",
  product: "Project",
};

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "复现：简单",
  medium: "复现：中等",
  hard: "复现：困难",
  unknown: "复现：未知",
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

function signalClass(signal: string): string {
  if (signal === "IDEA SPARK") return "border-violet-500/30 bg-violet-500/10 text-violet-300";
  if (signal === "RISING") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (signal === "NEW") return "border-sky-500/30 bg-sky-500/10 text-sky-300";
  return "border-border bg-muted/50 text-muted-foreground";
}

interface ItemCardProps {
  item: FrontierFeedItem;
  featured?: boolean;
  rank?: number;
  whyNow?: string | null;
  whyYou?: string | null;
}

/** 单个项目发现卡片。Explore 默认普通卡；Today 可附加个性化解释。 */
export function ItemCard({
  item,
  featured = false,
  rank,
  whyNow = null,
  whyYou = null,
}: ItemCardProps) {
  const noAnalysis = !item.summaryZh && !item.whyItMatters;
  const displayText = noAnalysis ? item.description : item.summaryZh;
  const date = formatDate(item.updatedAt ?? item.publishedAt);
  const radarSignals = getRadarSignals(item, featured ? 4 : 3);

  return (
    <article
      className={[
        "group relative flex flex-col gap-3 rounded-xl border border-border/80 bg-card transition-transform duration-200 hover:-translate-y-0.5",
        featured ? "p-6 md:min-h-72" : "p-4",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-center gap-2">
        {typeof rank === "number" ? (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {String(rank).padStart(2, "0")}
          </span>
        ) : null}
        <SourceBadge source={item.source} />
        <span className="text-[11px] text-muted-foreground">
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
              className={`rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide ${signalClass(signal)}`}
            >
              {signal}
            </span>
          ))}
        </div>
      ) : null}

      <h3 className={featured ? "text-xl font-semibold leading-tight tracking-tight md:text-2xl" : "text-base font-semibold leading-snug"}>
        <TrackedSourceLink
          itemId={item.id}
          href={item.canonicalUrl}
          className="hover:text-primary hover:underline"
        >
          {item.title}
        </TrackedSourceLink>
      </h3>

      {noAnalysis ? (
        <>
          {item.description ? (
            <p className={`${featured ? "line-clamp-4 text-base" : "line-clamp-3 text-sm"} text-muted-foreground`}>
              {item.description}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">（无描述）</p>
          )}
          <p className="text-[11px] text-muted-foreground">等待结构化分析 · 当前按项目与增长信号排序</p>
        </>
      ) : (
        <>
          <p className={`${featured ? "line-clamp-3 text-base" : "line-clamp-2 text-sm"} text-foreground`}>
            {displayText}
          </p>
          {item.whyItMatters ? (
            <div className="flex gap-2 rounded-lg bg-muted/35 p-2.5 text-xs text-muted-foreground">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p className={featured ? "line-clamp-3" : "line-clamp-2"}>
                <span className="font-medium text-foreground/80">为什么值得看：</span>
                {item.whyItMatters}
              </p>
            </div>
          ) : null}
        </>
      )}

      {whyNow || whyYou ? (
        <div className="grid gap-2 rounded-lg border border-border/60 bg-background/35 p-3 text-xs leading-relaxed md:grid-cols-2">
          {whyNow ? (
            <p className="text-muted-foreground">
              <span className="mr-1.5 font-mono text-[10px] font-semibold tracking-wider text-emerald-300">WHY NOW</span>
              {whyNow}
            </p>
          ) : null}
          {whyYou ? (
            <p className="text-muted-foreground">
              <span className="mr-1.5 font-mono text-[10px] font-semibold tracking-wider text-violet-300">WHY YOU</span>
              {whyYou}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
        {item.author ? <span>{item.author}</span> : null}
        {date ? <span>{date}</span> : null}
        {item.hasCode === "yes" ? (
          <span className="inline-flex items-center gap-1">
            <Code className="h-3 w-3" /> 有代码
          </span>
        ) : null}
        {item.hasDemo === "yes" ? (
          <span className="inline-flex items-center gap-1">
            <Play className="h-3 w-3" /> 有 Demo
          </span>
        ) : null}
        {!featured ? <span>{DIFFICULTY_LABEL[item.reproductionDifficulty]}</span> : null}
        <MetricRow item={item} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
        <span className="flex flex-wrap gap-1.5">
          {item.tags.slice(0, featured ? 5 : 4).map((tag) => (
            <span
              key={tag}
              className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <FeedbackActions itemId={item.id} />
          <TrackedSourceLink
            itemId={item.id}
            href={item.canonicalUrl}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            打开项目
            <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </TrackedSourceLink>
        </span>
      </div>
    </article>
  );
}
