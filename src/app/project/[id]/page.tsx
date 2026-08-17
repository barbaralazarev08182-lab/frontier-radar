import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { loadProjectDetail } from "@/lib/feed/project-detail";
import type { MomentumHistory } from "@/lib/scoring/momentum-history";
import { TrackedSourceLink } from "@/components/frontier/tracked-source-link";
import { ProjectIntelligenceMotion } from "@/components/frontier/project-intelligence-motion";
import "./project-intelligence.css";

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
  interest_relevance: "Domain relevance",
  momentum: "Momentum",
  project_health: "Project health",
  novelty: "Novelty",
  idea_spark: "Idea spark",
  tryability: "Tryability",
};

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).toUpperCase();
}

function dateValue(value: string | null): number {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
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
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function momentumLines(source: string, history: MomentumHistory | null): string[] {
  if (!history) return [];
  const lines: string[] = [];
  const d24 = history.delta24h;
  const d7 = history.delta7d;

  if (source === "github") {
    if (d24?.stars != null) lines.push(`+${compactNumber(d24.stars)} stars / 24h`);
    if (d7?.stars != null) lines.push(`+${compactNumber(d7.stars)} stars / 7d`);
    if (d24?.forks != null && d24.forks > 0) lines.push(`+${compactNumber(d24.forks)} forks / 24h`);
  } else if (source === "huggingface") {
    if (d24?.downloads != null) lines.push(`+${compactNumber(d24.downloads)} downloads / 24h`);
    if (d7?.downloads != null) lines.push(`+${compactNumber(d7.downloads)} downloads / 7d`);
    if (d24?.likes != null && d24.likes > 0) lines.push(`+${compactNumber(d24.likes)} likes / 24h`);
  } else if (source === "hackernews") {
    if (d24?.engagements != null) lines.push(`+${compactNumber(d24.engagements)} HN points / 24h`);
    if (d24?.comments != null) lines.push(`+${compactNumber(d24.comments)} comments / 24h`);
    if (d7?.engagements != null) lines.push(`+${compactNumber(d7.engagements)} HN points / 7d`);
  }

  return lines;
}

function verdict(score: number | null, crossSource: boolean, evidenceCount: number): {
  label: string;
  note: string;
} {
  const value = score ?? 0;

  if (crossSource && value >= 80) {
    return {
      label: "HIGH-CONVICTION / MULTI-SOURCE",
      note: `${evidenceCount} evidence nodes support the signal across more than one source.`,
    };
  }

  if (crossSource) {
    return {
      label: "CONFIRMED / MULTI-SOURCE",
      note: `${evidenceCount} evidence nodes reduce the chance that this is only a single-feed anomaly.`,
    };
  }

  if (value >= 80) {
    return {
      label: "HIGH-PRIORITY / EARLY",
      note: "The radar score is strong, but cross-source confirmation is still limited.",
    };
  }

  return {
    label: "WATCH / EARLY SIGNAL",
    note: "Worth tracking, with more evidence still needed before treating it as a confirmed frontier shift.",
  };
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
  const possibleUses = item.possibleUses.slice(0, 5);
  const firstSeen = formatDate(entity.firstSeenAt);
  const summary = item.summaryZh ?? item.description ?? "结构化分析仍在补全。";
  const read = verdict(item.score, entity.crossSource, evidence.length);
  const orderedEvidence = [...evidence].sort((a, b) =>
    dateValue(a.publishedAt ?? a.updatedAt) - dateValue(b.publishedAt ?? b.updatedAt)
  );

  const caseBlocks = [
    whyNow ? { label: "WHY NOW", kind: "INFERENCE", copy: whyNow } : null,
    problem ? { label: "THE PROBLEM", kind: "OBSERVED", copy: problem } : null,
    item.novelty ? { label: "WHAT CHANGED", kind: "INFERENCE", copy: item.novelty } : null,
    item.whyItMatters ? { label: "WHY IT MATTERS", kind: "INFERENCE", copy: item.whyItMatters } : null,
    targetUsers.length > 0 ? { label: "WHO CAN USE IT", kind: "OBSERVED", copy: targetUsers.join(" · ") } : null,
    limitations ? { label: "LIMITS", kind: "OPEN QUESTION", copy: limitations } : null,
    hypeRisk ? { label: "HYPE RISK", kind: "OPEN QUESTION", copy: hypeRisk } : null,
  ].filter((entry): entry is { label: string; kind: string; copy: string } => entry !== null);

  const evidenceNodes = orderedEvidence.length > 0 ? orderedEvidence : [null];
  const interrogationNodes = caseBlocks.length > 0
    ? caseBlocks
    : [{ label: "ANALYSIS STATUS", kind: "OPEN QUESTION", copy: "The structured intelligence layer is still being generated." }];
  const buildNodes = possibleUses.length > 0
    ? possibleUses
    : ["Build directions have not been generated for this project yet."];

  return (
    <div className="project-intelligence-shell" data-pi-stage="0" data-pi-step="0">
      <ProjectIntelligenceMotion
        evidenceCount={evidenceNodes.length}
        caseCount={interrogationNodes.length}
        buildCount={buildNodes.length}
      />

      <Link href="/today" className="pi-back">
        <ArrowLeft className="h-3.5 w-3.5" /> Daily Radar
      </Link>

      <main className="pi-stage-viewport">
        <section className="pi-stage pi-stage-capture" data-pi-stage-panel="0" data-active="true">
          <div className="pi-capture-noise" aria-hidden="true" />
          <div className="pi-capture-copy">
            <div className="pi-kicker">
              <strong>FR / PROJECT INTELLIGENCE</strong>
              <span>{SOURCE_LABEL[item.source] ?? item.source}</span>
              <span>{item.contentType}</span>
              {firstSeen ? <span>FIRST SEEN {firstSeen}</span> : null}
            </div>
            <h1 className="pi-title">{item.title}</h1>
            <p className="pi-deck">{summary}</p>
          </div>

          <div className="pi-capture-object" aria-hidden="true">
            <div className="pi-capture-sheet pi-capture-sheet-4" />
            <div className="pi-capture-sheet pi-capture-sheet-3" />
            <div className="pi-capture-sheet pi-capture-sheet-2" />
            <div className="pi-capture-sheet pi-capture-sheet-1">
              <div className="pi-capture-topline">
                <span>FR / EVIDENCE DOSSIER</span>
                <span>{SOURCE_LABEL[item.source] ?? item.source}</span>
              </div>
              <strong>{String(evidence.length).padStart(2, "0")}</strong>
              <div className="pi-capture-bottomline">
                <span>EVIDENCE NODES</span>
                <span>{String(item.score == null ? "--" : Math.round(item.score))} / RADAR</span>
              </div>
            </div>
            <div className="pi-capture-flare" />
          </div>

          <aside className="pi-capture-verdict">
            <span className="pi-label">FRONTIER VERDICT</span>
            <p>{read.label}</p>
            <small>{read.note}</small>
            <div className="pi-status">
              <span>CODE {entity.hasCodeAnywhere ? "YES" : "—"}</span>
              <span>DEMO {entity.hasDemoAnywhere ? "YES" : "—"}</span>
              <span>SOURCES {entity.sources.length}</span>
              <span>SCORE {item.score == null ? "—" : Math.round(item.score)}</span>
            </div>
            <div className="pi-cta-row">
              <TrackedSourceLink
                itemId={item.id}
                href={item.canonicalUrl}
                metadata={{ surface: "project_intelligence", source: item.source, content_type: item.contentType }}
                className="pi-cta"
              >
                Open project <ArrowUpRight className="h-3.5 w-3.5" />
              </TrackedSourceLink>
              <Link href={`/idea-lab?from=${encodeURIComponent(item.id)}`} className="pi-cta secondary">
                Idea Lab
              </Link>
            </div>
          </aside>
        </section>

        <section className="pi-stage pi-stage-evidence" data-pi-stage-panel="1" data-active="false" aria-hidden="true">
          <div className="pi-stage-heading">
            <span>02 / EVIDENCE FILM</span>
            <strong>WHY SHOULD<br />YOU BELIEVE IT?</strong>
            <small>Each gesture advances one source node.</small>
          </div>
          <div className="pi-vanishing-grid" aria-hidden="true" />
          <div className="pi-evidence-tunnel">
            {evidenceNodes.map((entry, index) => {
              if (!entry) {
                return (
                  <article key="empty-evidence" className="pi-evidence-card" data-pi-evidence data-state={index === 0 ? "active" : "after"}>
                    <span className="pi-evidence-seq">01</span>
                    <div className="pi-source-meta">SOURCE PENDING</div>
                    <h2>Evidence is still being collected.</h2>
                  </article>
                );
              }
              const momentum = momentumLines(entry.source, entry.momentum);
              return (
                <article key={entry.itemId} className="pi-evidence-card" data-pi-evidence data-state={index === 0 ? "active" : "after"}>
                  <span className="pi-evidence-seq">{String(index + 1).padStart(2, "0")}</span>
                  <div className="pi-evidence-card-top">
                    <span>{formatDate(entry.publishedAt ?? entry.updatedAt) ?? "DATE N/A"}</span>
                    <span>{SOURCE_LABEL[entry.source] ?? entry.source} / {entry.contentType}</span>
                  </div>
                  <h2>{entry.title}</h2>
                  <div className="pi-momentum">
                    {momentum.length > 0 ? momentum.map((line) => <span key={line}>{line}</span>) : <span>momentum accumulating</span>}
                  </div>
                  <TrackedSourceLink
                    itemId={entry.itemId}
                    href={entry.url}
                    metadata={{ surface: "project_intelligence_evidence", source: entry.source, content_type: entry.contentType }}
                    className="pi-evidence-link"
                  >
                    Verify source ↗
                  </TrackedSourceLink>
                </article>
              );
            })}
          </div>
        </section>

        <section
          className="pi-stage pi-stage-interrogation"
          data-pi-stage-panel="2"
          data-active="false"
          data-active-label={interrogationNodes[0]?.label ?? "INTERROGATION"}
          aria-hidden="true"
        >
          <div className="pi-interrogation-chrome">
            <span>03 / INTERROGATION</span>
            <strong>FR / QUESTION THE SIGNAL</strong>
          </div>
          <div className="pi-interrogation-stack">
            {interrogationNodes.map((entry, index) => (
              <article
                key={`${entry.label}-${index}`}
                className="pi-interrogation-card"
                data-pi-case
                data-label={entry.label}
                data-state={index === 0 ? "active" : "after"}
              >
                <span className="pi-interrogation-kind">{entry.kind}</span>
                <h2>{entry.label}</h2>
                <p>{entry.copy}</p>
                <div className="pi-interrogation-stamp">FR / {String(index + 1).padStart(2, "0")}</div>
              </article>
            ))}
          </div>
        </section>

        <section className="pi-stage pi-stage-resolution" data-pi-stage-panel="3" data-active="false" aria-hidden="true">
          <div className="pi-resolution-heading">
            <span>04 / RADAR RESOLUTION</span>
            <strong>THE SIGNAL<br />RESOLVES.</strong>
          </div>
          <div className="pi-score-orbit" aria-label="Radar scoring dimensions">
            {scores.slice(0, 7).map((entry, index) => (
              <div key={entry.dimension} className="pi-score-shard">
                <span>{String(index + 1).padStart(2, "0")} / {SCORE_LABEL[entry.dimension] ?? entry.dimension}</span>
                <strong>{Math.round(entry.score)}</strong>
              </div>
            ))}
          </div>
          <div className="pi-resolution-core">
            <span>FRONTIER VERDICT</span>
            <strong>{read.label}</strong>
            <p>{read.note}</p>
            <div>
              <span>{entity.sources.length} SOURCES</span>
              <span>{evidence.length} EVIDENCE</span>
              <span>{item.score == null ? "—" : Math.round(item.score)} RADAR</span>
            </div>
          </div>
        </section>

        <section className="pi-stage pi-stage-build" data-pi-stage-panel="4" data-active="false" aria-hidden="true">
          <div className="pi-build-heading">
            <span>05 / BUILD</span>
            <strong>DON&apos;T JUST<br />UNDERSTAND IT.</strong>
            <small>Choose a direction and turn the signal into a move.</small>
          </div>
          <div className="pi-build-deck">
            {buildNodes.map((idea, index) => (
              <article key={`${idea}-${index}`} className="pi-build-card" data-pi-build data-state={index === 0 ? "active" : "after"}>
                <span className="pi-build-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="pi-build-mode">{index === 0 ? "USE IT" : index === 1 ? "EXTEND IT" : index === 2 ? "COMBINE IT" : "BUILD DIRECTION"}</span>
                <p>{idea}</p>
                <Link href={`/idea-lab?from=${encodeURIComponent(item.id)}`} className="pi-build-action">
                  Send to Idea Lab ↗
                </Link>
              </article>
            ))}
          </div>
          <div className="pi-source-ribbon">
            <span>TRACEABLE SOURCE LEDGER</span>
            {orderedEvidence.slice(0, 5).map((entry) => (
              <TrackedSourceLink
                key={entry.itemId}
                itemId={entry.itemId}
                href={entry.url}
                metadata={{ surface: "project_intelligence_ledger", source: entry.source, content_type: entry.contentType }}
                className="pi-source-ribbon-link"
              >
                {SOURCE_LABEL[entry.source] ?? entry.source} ↗
              </TrackedSourceLink>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}