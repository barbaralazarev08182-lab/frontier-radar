import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Code,
  ExternalLink,
  Play,
  Radar,
  Sparkles,
} from "lucide-react";
import { loadProjectDetail } from "@/lib/feed/project-detail";
import type { MomentumHistory } from "@/lib/scoring/momentum-history";
import { SourceBadge } from "@/components/frontier/source-badge";
import { ScoreBadge } from "@/components/frontier/score-badge";
import { TrackedSourceLink } from "@/components/frontier/tracked-source-link";

export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<string, string> = {
  github: "GitHub",
  huggingface: "Hugging Face",
  hackernews: "Show HN",
  producthunt: "Product Hunt",
  arxiv: "arXiv",
};

const SCORE_LABEL: Record<string, string> = {
  freshness: "Freshness",
  interest_relevance: "Domain Relevance",
  momentum: "Momentum",
  project_health: "Project Health",
  novelty: "Novelty",
  idea_spark: "Idea Spark",
  tryability: "Tryability",
};

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function strArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    : [];
}

function compactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function momentumLines(source: string, history: MomentumHistory | null): string[] {
  if (!history) return [];
  const lines: string[] = [];
  const d24 = history.delta24h;
  const d7 = history.delta7d;

  if (source === "github") {
    if (d24?.stars != null) lines.push(`24h 窗口 +${compactNumber(d24.stars)} stars`);
    if (d7?.stars != null) lines.push(`7d 窗口 +${compactNumber(d7.stars)} stars`);
    if (d24?.forks != null && d24.forks > 0) lines.push(`24h +${compactNumber(d24.forks)} forks`);
  } else if (source === "huggingface") {
    if (d24?.downloads != null) lines.push(`24h 窗口 +${compactNumber(d24.downloads)} downloads`);
    if (d7?.downloads != null) lines.push(`7d 窗口 +${compactNumber(d7.downloads)} downloads`);
    if (d24?.likes != null && d24.likes > 0) lines.push(`24h +${compactNumber(d24.likes)} likes`);
  } else if (source === "hackernews") {
    if (d24?.engagements != null) lines.push(`24h 窗口 +${compactNumber(d24.engagements)} HN points`);
    if (d24?.comments != null) lines.push(`24h +${compactNumber(d24.comments)} comments`);
    if (d7?.engagements != null) lines.push(`7d 窗口 +${compactNumber(d7.engagements)} HN points`);
  }

  return lines;
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await loadProjectDetail(id);
  if (!detail) notFound();

  const { item, entity, evidence, scores, analysis, whyNow } = detail;
  const problem = str(analysis?.problem);
  const limitations = str(analysis?.limitations);
  const hypeRisk = str(analysis?.hypeRisk);
  const targetUsers = strArray(analysis?.targetUsers);
  const possibleUses = item.possibleUses;
  const firstSeen = formatDate(entity.firstSeenAt);

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      <div>
        <Link
          href="/today"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Daily Radar
        </Link>
      </div>

      <header className="space-y-5 border-b border-border/70 pb-7">
        <div className="flex flex-wrap items-center gap-2">
          <SourceBadge source={item.source} />
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Project Intelligence
          </span>
          {entity.crossSource ? (
            <span className="rounded-full border border-cyan-500/20 bg-cyan-500/[0.06] px-2 py-0.5 text-[10px] text-cyan-300">
              {entity.sources.length} sources
            </span>
          ) : null}
          <span className="ml-auto"><ScoreBadge score={item.score} /></span>
        </div>

        <div className="max-w-4xl space-y-3">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight md:text-5xl">{item.title}</h1>
          {item.summaryZh || item.description ? (
            <p className="max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">
              {item.summaryZh ?? item.description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {item.author ? <span>{item.author}</span> : null}
          {firstSeen ? <span>最早发现 {firstSeen}</span> : null}
          {entity.hasCodeAnywhere ? <span className="inline-flex items-center gap-1"><Code className="h-3 w-3" /> Code</span> : null}
          {entity.hasDemoAnywhere ? <span className="inline-flex items-center gap-1"><Play className="h-3 w-3" /> Demo</span> : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <TrackedSourceLink
            itemId={item.id}
            href={item.canonicalUrl}
            metadata={{ surface: "project_detail", source: item.source, content_type: item.contentType }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background"
          >
            打开主项目 <ArrowUpRight className="h-4 w-4" />
          </TrackedSourceLink>
          {evidence
            .filter((entry) => entry.source === "hackernews" && entry.externalUrl?.includes("news.ycombinator.com"))
            .slice(0, 1)
            .map((entry) => (
              <TrackedSourceLink
                key={entry.itemId}
                itemId={entry.itemId}
                href={entry.externalUrl!}
                metadata={{ surface: "project_detail", source: entry.source, content_type: entry.contentType }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                HN 讨论 <ExternalLink className="h-3.5 w-3.5" />
              </TrackedSourceLink>
            ))}
        </div>
      </header>

      {whyNow ? (
        <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5">
          <p className="mb-2 font-mono text-[10px] font-semibold tracking-[0.14em] text-emerald-300">WHY NOW</p>
          <p className="text-sm leading-relaxed text-foreground/90">{whyNow}</p>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Radar className="h-4 w-4 text-cyan-300" />
          <h2 className="text-lg font-semibold">Source Evidence</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {evidence.map((entry) => {
            const momentum = momentumLines(entry.source, entry.momentum);
            const discussion = entry.source === "hackernews" && entry.externalUrl?.includes("news.ycombinator.com")
              ? entry.externalUrl
              : null;
            return (
              <div key={entry.itemId} className="rounded-xl border border-border/80 bg-card p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{SOURCE_LABEL[entry.source] ?? entry.source}</span>
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">{entry.contentType}</span>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">{entry.title}</p>
                {momentum.length > 0 ? (
                  <div className="mt-3 space-y-1 text-xs text-emerald-300/90">
                    {momentum.map((line) => <p key={line}>{line}</p>)}
                  </div>
                ) : (
                  <p className="mt-3 text-[11px] text-muted-foreground">正在积累 24h / 7d Momentum 快照</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <TrackedSourceLink
                    itemId={entry.itemId}
                    href={entry.url}
                    metadata={{ surface: "project_detail", source: entry.source, content_type: entry.contentType }}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    打开来源 ↗
                  </TrackedSourceLink>
                  {discussion ? (
                    <TrackedSourceLink
                      itemId={entry.itemId}
                      href={discussion}
                      metadata={{ surface: "project_detail", source: entry.source, content_type: entry.contentType }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      查看讨论
                    </TrackedSourceLink>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {scores.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-300" />
            <h2 className="text-lg font-semibold">Discovery Signals</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {scores.map((entry) => (
              <div key={entry.dimension} className="rounded-lg border border-border/80 bg-card p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-xs text-muted-foreground">{SCORE_LABEL[entry.dimension] ?? entry.dimension}</span>
                  <span className="font-mono text-lg font-semibold tabular-nums">{Math.round(entry.score)}</span>
                </div>
                {entry.rationale ? <p className="mt-2 line-clamp-3 text-[10px] leading-relaxed text-muted-foreground/75">{entry.rationale}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border/80 bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-300" />
            <h2 className="text-lg font-semibold">What matters</h2>
          </div>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            {item.whyItMatters ? <p><span className="font-medium text-foreground">Why it matters：</span>{item.whyItMatters}</p> : null}
            {problem ? <p><span className="font-medium text-foreground">解决什么：</span>{problem}</p> : null}
            {item.novelty ? <p><span className="font-medium text-foreground">新在哪：</span>{item.novelty}</p> : null}
            {targetUsers.length > 0 ? <p><span className="font-medium text-foreground">适合：</span>{targetUsers.join("、")}</p> : null}
            {limitations ? <p><span className="font-medium text-foreground">限制：</span>{limitations}</p> : null}
            {hypeRisk ? <p><span className="font-medium text-foreground">Hype Risk：</span>{hypeRisk}</p> : null}
          </div>
        </div>

        <div className="rounded-xl border border-violet-500/15 bg-violet-500/[0.035] p-5">
          <p className="mb-3 font-mono text-[10px] font-semibold tracking-[0.14em] text-violet-300">BUILD ON THIS</p>
          {possibleUses.length > 0 ? (
            <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              {possibleUses.slice(0, 5).map((idea, index) => (
                <div key={idea} className="flex gap-3">
                  <span className="font-mono text-xs text-violet-300">{String(index + 1).padStart(2, "0")}</span>
                  <p>{idea}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">当前分析还没有生成可延展用法。</p>
          )}
        </div>
      </section>
    </div>
  );
}
