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
import { ProjectTrajectory } from "@/components/frontier/project-trajectory";

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
  return date.toLocaleDateString("zh-CN", { year: "numeric", month: "short", day: "numeric" });
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
    <div className="mx-auto max-w-6xl space-y-7 pb-12 md:space-y-9">
      <div>
        <Link href="/today" className="group inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-cyan-200">
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" /> Back to Daily Radar
        </Link>
      </div>

      <header className="radar-panel-strong radar-grid relative overflow-hidden rounded-[1.75rem] px-5 py-6 sm:px-7 md:px-8 md:py-8">
        <div aria-hidden className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-cyan-400/[0.045] blur-3xl" />
        <div aria-hidden className="absolute -bottom-32 left-1/4 h-72 w-72 rounded-full bg-violet-500/[0.035] blur-3xl" />

        <div className="relative space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <SourceBadge source={item.source} />
            <span className="radar-kicker">Project intelligence</span>
            {entity.crossSource ? (
              <span className="rounded-full border border-cyan-300/15 bg-cyan-300/[0.05] px-2.5 py-1 font-mono text-[9px] font-semibold tracking-[0.1em] text-cyan-200">
                {entity.sources.length} sources
              </span>
            ) : null}
            <span className="ml-auto"><ScoreBadge score={item.score} /></span>
          </div>

          <div className="max-w-4xl space-y-4">
            <h1 className="text-balance text-3xl font-semibold leading-[1.03] tracking-[-0.035em] md:text-5xl">{item.title}</h1>
            {item.summaryZh || item.description ? (
              <p className="max-w-3xl text-[15px] leading-7 text-muted-foreground md:text-base">{item.summaryZh ?? item.description}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
            {item.author ? <span className="text-foreground/70">{item.author}</span> : null}
            {firstSeen ? <span>最早发现 {firstSeen}</span> : null}
            {entity.hasCodeAnywhere ? <span className="inline-flex items-center gap-1"><Code className="h-3 w-3 text-cyan-300/80" /> Code</span> : null}
            {entity.hasDemoAnywhere ? <span className="inline-flex items-center gap-1"><Play className="h-3 w-3 text-violet-300/80" /> Demo</span> : null}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
            <TrackedSourceLink
              itemId={item.id}
              href={item.canonicalUrl}
              metadata={{ surface: "project_detail", source: item.source, content_type: item.contentType }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.07] px-3 py-2 text-sm font-medium text-cyan-100 transition-colors hover:border-cyan-300/30 hover:bg-cyan-300/[0.1]"
            >
              打开主项目 <ArrowUpRight className="h-4 w-4" />
            </TrackedSourceLink>
            {evidence.filter((entry) => entry.source === "hackernews" && entry.externalUrl?.includes("news.ycombinator.com")).slice(0, 1).map((entry) => (
              <TrackedSourceLink
                key={entry.itemId}
                itemId={entry.itemId}
                href={entry.externalUrl!}
                metadata={{ surface: "project_detail", source: entry.source, content_type: entry.contentType }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
              >
                HN 讨论 <ExternalLink className="h-3.5 w-3.5" />
              </TrackedSourceLink>
            ))}
          </div>
        </div>
      </header>

      {whyNow ? (
        <section className="rounded-2xl border border-emerald-300/12 bg-emerald-300/[0.025] p-5 sm:p-6">
          <p className="radar-kicker !text-emerald-300">Why now</p>
          <p className="mt-2 max-w-4xl text-sm leading-7 text-foreground/88">{whyNow}</p>
        </section>
      ) : null}

      <ProjectTrajectory evidence={evidence} />

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="radar-kicker">Evidence</p>
            <div className="mt-1.5 flex items-center gap-2">
              <Radar className="h-4 w-4 text-cyan-300" />
              <h2 className="text-lg font-semibold tracking-tight">Source evidence</h2>
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground">{evidence.length} evidence nodes</span>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {evidence.map((entry) => {
            const momentum = momentumLines(entry.source, entry.momentum);
            const discussion = entry.source === "hackernews" && entry.externalUrl?.includes("news.ycombinator.com") ? entry.externalUrl : null;
            return (
              <div key={entry.itemId} className="radar-panel rounded-2xl p-4 transition-colors hover:border-cyan-300/15">
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground/90">{SOURCE_LABEL[entry.source] ?? entry.source}</span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{entry.contentType}</span>
                </div>
                <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{entry.title}</p>
                {momentum.length > 0 ? (
                  <div className="mt-3 space-y-1 text-[11px] text-emerald-300/90">
                    {momentum.map((line) => <p key={line}>{line}</p>)}
                  </div>
                ) : (
                  <p className="mt-3 text-[10px] text-muted-foreground/65">正在积累 24h / 7d Momentum 快照</p>
                )}
                <div className="mt-4 flex flex-wrap gap-3 border-t border-white/[0.05] pt-3">
                  <TrackedSourceLink itemId={entry.itemId} href={entry.url} metadata={{ surface: "project_detail", source: entry.source, content_type: entry.contentType }} className="text-[11px] font-medium text-cyan-200 hover:text-cyan-100">打开来源 ↗</TrackedSourceLink>
                  {discussion ? <TrackedSourceLink itemId={entry.itemId} href={discussion} metadata={{ surface: "project_detail", source: entry.source, content_type: entry.contentType }} className="text-[11px] text-muted-foreground hover:text-foreground">查看讨论</TrackedSourceLink> : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {scores.length > 0 ? (
        <section className="space-y-4">
          <div>
            <p className="radar-kicker">Scoring</p>
            <div className="mt-1.5 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-emerald-300" /><h2 className="text-lg font-semibold tracking-tight">Discovery signals</h2></div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {scores.map((entry) => (
              <div key={entry.dimension} className="radar-panel rounded-xl p-3.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[11px] text-muted-foreground">{SCORE_LABEL[entry.dimension] ?? entry.dimension}</span>
                  <span className="font-mono text-lg font-semibold tabular-nums text-foreground">{Math.round(entry.score)}</span>
                </div>
                <div className="mt-2 h-px bg-gradient-to-r from-cyan-300/20 to-transparent" />
                {entry.rationale ? <p className="mt-2 line-clamp-3 text-[10px] leading-relaxed text-muted-foreground/70">{entry.rationale}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="radar-panel rounded-2xl p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-300" /><h2 className="text-lg font-semibold tracking-tight">What matters</h2></div>
          <div className="space-y-4 text-sm leading-7 text-muted-foreground">
            {item.whyItMatters ? <p><span className="font-medium text-foreground/90">Why it matters：</span>{item.whyItMatters}</p> : null}
            {problem ? <p><span className="font-medium text-foreground/90">解决什么：</span>{problem}</p> : null}
            {item.novelty ? <p><span className="font-medium text-foreground/90">新在哪：</span>{item.novelty}</p> : null}
            {targetUsers.length > 0 ? <p><span className="font-medium text-foreground/90">适合：</span>{targetUsers.join("、")}</p> : null}
            {limitations ? <p><span className="font-medium text-foreground/90">限制：</span>{limitations}</p> : null}
            {hypeRisk ? <p><span className="font-medium text-foreground/90">Hype Risk：</span>{hypeRisk}</p> : null}
          </div>
        </div>

        <div className="rounded-2xl border border-violet-300/12 bg-violet-300/[0.025] p-5 sm:p-6">
          <p className="radar-kicker !text-violet-300">Build on this</p>
          {possibleUses.length > 0 ? (
            <div className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
              {possibleUses.slice(0, 5).map((idea, index) => (
                <div key={idea} className="flex gap-3 border-b border-white/[0.045] pb-3 last:border-0 last:pb-0">
                  <span className="font-mono text-[10px] font-semibold text-violet-300">{String(index + 1).padStart(2, "0")}</span>
                  <p>{idea}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">当前分析还没有生成可延展用法。</p>
          )}
        </div>
      </section>
    </div>
  );
}
