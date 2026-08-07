import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Code, Play, Radar } from "lucide-react";
import { loadProjectDetail } from "@/lib/feed/project-detail";
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

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("zh-CN", { year: "numeric", month: "short", day: "numeric" });
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await loadProjectDetail(id);
  if (!detail) notFound();

  const { item, entity, evidence, whyNow } = detail;

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      <Link
        href="/today"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Daily Radar
      </Link>

      <header className="space-y-5 border-b border-border/70 pb-7">
        <div className="flex flex-wrap items-center gap-2">
          <SourceBadge source={item.source} />
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Project Intelligence</span>
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

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {item.author ? <span>{item.author}</span> : null}
          {entity.firstSeenAt ? <span>最早发现 {formatDate(entity.firstSeenAt)}</span> : null}
          {entity.hasCodeAnywhere ? <span className="inline-flex items-center gap-1"><Code className="h-3 w-3" /> Code</span> : null}
          {entity.hasDemoAnywhere ? <span className="inline-flex items-center gap-1"><Play className="h-3 w-3" /> Demo</span> : null}
        </div>

        <TrackedSourceLink
          itemId={item.id}
          href={item.canonicalUrl}
          metadata={{ surface: "project_detail", source: item.source, content_type: item.contentType }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background"
        >
          打开主项目 <ArrowUpRight className="h-4 w-4" />
        </TrackedSourceLink>
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
          {evidence.map((entry) => (
            <div key={entry.itemId} className="rounded-xl border border-border/80 bg-card p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{SOURCE_LABEL[entry.source] ?? entry.source}</span>
                <span className="font-mono text-[10px] uppercase text-muted-foreground">{entry.contentType}</span>
              </div>
              <p className="line-clamp-2 text-sm text-muted-foreground">{entry.title}</p>
              <TrackedSourceLink
                itemId={entry.itemId}
                href={entry.url}
                metadata={{ surface: "project_detail", source: entry.source, content_type: entry.contentType }}
                className="mt-3 inline-flex text-xs font-medium text-primary hover:underline"
              >
                打开来源 ↗
              </TrackedSourceLink>
            </div>
          ))}
        </div>
      </section>

      {item.possibleUses.length > 0 ? (
        <section className="rounded-xl border border-violet-500/15 bg-violet-500/[0.035] p-5">
          <p className="mb-3 font-mono text-[10px] font-semibold tracking-[0.14em] text-violet-300">BUILD ON THIS</p>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            {item.possibleUses.slice(0, 5).map((idea, index) => (
              <div key={idea} className="flex gap-3">
                <span className="font-mono text-xs text-violet-300">{String(index + 1).padStart(2, "0")}</span>
                <p>{idea}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
