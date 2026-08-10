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
    whyNow ? { label: "INFERENCE / WHY NOW", copy: whyNow } : null,
    problem ? { label: "OBSERVED / PROBLEM", copy: problem } : null,
    item.novelty ? { label: "INFERENCE / WHAT CHANGED", copy: item.novelty } : null,
    item.whyItMatters ? { label: "INFERENCE / WHY IT MATTERS", copy: item.whyItMatters } : null,
    targetUsers.length > 0 ? { label: "OBSERVED / WHO CAN USE IT", copy: targetUsers.join(" · ") } : null,
    limitations ? { label: "OPEN QUESTION / LIMITS", copy: limitations } : null,
    hypeRisk ? { label: "OPEN QUESTION / HYPE RISK", copy: hypeRisk } : null,
  ].filter((entry): entry is { label: string; copy: string } => entry !== null);

  return (
    <div className="project-intelligence-shell">
      <ProjectIntelligenceMotion />
      <div className="pi-frame">
        <Link href="/today" className="pi-back">
          <ArrowLeft className="h-3.5 w-3.5" /> Daily Radar
        </Link>

        <header className="pi-hero" data-pi-motion data-pi-section="00">
          <div className="pi-hero-main">
            <div className="pi-kicker">
              <strong>FR / PROJECT INTELLIGENCE</strong>
              <span>{SOURCE_LABEL[item.source] ?? item.source}</span>
              <span>{item.contentType}</span>
              {firstSeen ? <span>FIRST SEEN {firstSeen}</span> : null}
            </div>

            <h1 className="pi-title">{item.title}</h1>
            <p className="pi-deck">{summary}</p>
          </div>

          <div className="pi-hero-object" aria-hidden="true">
            <div className="pi-object-sheet pi-object-sheet-back" />
            <div className="pi-object-sheet pi-object-sheet-mid" />
            <div className="pi-object-sheet pi-object-sheet-front">
              <div className="pi-object-topline">
                <span>FR / EVIDENCE DOSSIER</span>
                <span>{SOURCE_LABEL[item.source] ?? item.source}</span>
              </div>
              <strong>{String(evidence.length).padStart(2, "0")}</strong>
              <div className="pi-object-bottomline">
                <span>EVIDENCE NODES</span>
                <span>{read.label}</span>
              </div>
            </div>
            <div className="pi-object-scan" />
          </div>

          <aside className="pi-hero-aside">
            <span className="pi-label">FRONTIER VERDICT</span>
            <p className="pi-verdict">{read.label}</p>
            <p className="pi-verdict-note">{read.note}</p>

            <div className="pi-status" aria-label="project status">
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
                Send to Idea Lab
              </Link>
            </div>
          </aside>
        </header>

        <section className="pi-section" data-pi-motion data-pi-section="01">
          <div className="pi-section-rail">
            <span className="pi-section-index">01 / EVIDENCE</span>
            <h2 className="pi-section-title">Why the radar believes it.</h2>
            <p className="pi-section-note">
              Source nodes are shown as evidence, not decoration. Open any node to verify the original signal.
            </p>
          </div>

          <div className="pi-evidence-list">
            {orderedEvidence.map((entry) => {
              const eventDate = formatDate(entry.publishedAt ?? entry.updatedAt) ?? "DATE N/A";
              const momentum = momentumLines(entry.source, entry.momentum);
              return (
                <article key={entry.itemId} className="pi-evidence-row">
                  <time className="pi-evidence-date">{eventDate}</time>
                  <div>
                    <div className="pi-source-meta">
                      <span>{SOURCE_LABEL[entry.source] ?? entry.source}</span>
                      <span>{entry.contentType}</span>
                    </div>
                    <h3 className="pi-evidence-title">{entry.title}</h3>
                    <div className="pi-momentum">
                      {momentum.length > 0 ? momentum.map((line) => <span key={line}>{line}</span>) : <span>momentum accumulating</span>}
                    </div>
                  </div>
                  <TrackedSourceLink
                    itemId={entry.itemId}
                    href={entry.url}
                    metadata={{ surface: "project_intelligence_evidence", source: entry.source, content_type: entry.contentType }}
                    className="pi-evidence-link"
                  >
                    Verify ↗
                  </TrackedSourceLink>
                </article>
              );
            })}
          </div>
        </section>

        <section className="pi-section" data-pi-motion data-pi-section="02">
          <div className="pi-section-rail">
            <span className="pi-section-index">02 / THE CASE</span>
            <h2 className="pi-section-title">What actually matters.</h2>
            <p className="pi-section-note">
              Facts, inference and uncertainty are deliberately separated so the analysis can be challenged.
            </p>
          </div>

          <div className="pi-case-stack">
            {caseBlocks.length > 0 ? caseBlocks.map((entry) => (
              <div key={entry.label} className="pi-case-block">
                <span className="pi-label">{entry.label}</span>
                <div className="pi-case-copy">{entry.copy}</div>
              </div>
            )) : (
              <div className="pi-case-block">
                <span className="pi-label">ANALYSIS STATUS</span>
                <div className="pi-case-copy">The evidence is present, but the structured intelligence layer is still being generated.</div>
              </div>
            )}
          </div>
        </section>

        <section className="pi-section" data-pi-motion data-pi-section="03">
          <div className="pi-section-rail">
            <span className="pi-section-index">03 / RADAR READ</span>
            <h2 className="pi-section-title">Why it entered the frontier set.</h2>
            <p className="pi-section-note">
              Scores stay secondary: they explain the pick, but they are not the story.
            </p>
          </div>

          <div className="pi-score-strip">
            {scores.slice(0, 7).map((entry) => (
              <div key={entry.dimension} className="pi-score-cell">
                <span className="pi-score-name">{SCORE_LABEL[entry.dimension] ?? entry.dimension}</span>
                <div>
                  <strong className="pi-score-value">{Math.round(entry.score)}</strong>
                  {entry.rationale ? <p className="pi-score-rationale">{entry.rationale}</p> : null}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="pi-section" data-pi-motion data-pi-section="04">
          <div className="pi-section-rail">
            <span className="pi-section-index">04 / BUILD SURFACE</span>
            <h2 className="pi-section-title">What this lets you build next.</h2>
            <p className="pi-section-note">
              These are starting surfaces, not startup slogans. The goal is to turn a signal into a testable next move.
            </p>
          </div>

          <div className="pi-build-list">
            {possibleUses.length > 0 ? possibleUses.map((idea, index) => (
              <div key={idea} className="pi-build-row">
                <span className="pi-build-index">{String(index + 1).padStart(2, "0")}</span>
                <p className="pi-build-copy">{idea}</p>
                <span className="pi-build-tag">BUILD DIRECTION</span>
              </div>
            )) : (
              <div className="pi-build-row">
                <span className="pi-build-index">—</span>
                <p className="pi-build-copy">Build directions have not been generated for this project yet.</p>
                <span className="pi-build-tag">PENDING</span>
              </div>
            )}
          </div>
        </section>

        <section className="pi-section" data-pi-motion data-pi-section="05">
          <div className="pi-section-rail">
            <span className="pi-section-index">05 / SOURCE LEDGER</span>
            <h2 className="pi-section-title">The record underneath the judgment.</h2>
            <p className="pi-section-note">
              Every intelligence claim should remain traceable to an original project, post, paper or demo.
            </p>
          </div>

          <div className="pi-ledger">
            {orderedEvidence.map((entry) => (
              <div key={entry.itemId} className="pi-ledger-row">
                <span>{SOURCE_LABEL[entry.source] ?? entry.source}</span>
                <span>{formatDate(entry.publishedAt ?? entry.updatedAt) ?? "DATE N/A"}</span>
                <span className="pi-ledger-title">{entry.title}</span>
                <TrackedSourceLink
                  itemId={entry.itemId}
                  href={entry.url}
                  metadata={{ surface: "project_intelligence_ledger", source: entry.source, content_type: entry.contentType }}
                  className="pi-evidence-link"
                >
                  Source ↗
                </TrackedSourceLink>
              </div>
            ))}
          </div>
        </section>

        <footer className="pi-footer" data-pi-motion data-pi-section="06">
          <h2 className="pi-footer-title">Signal understood. Decide what to do with it.</h2>
          <div className="pi-footer-meta">
            <div>FR / PROJECT INTELLIGENCE</div>
            <div>{entity.sources.length} SOURCES / {evidence.length} EVIDENCE NODES</div>
            <div>DISCOVER → UNDERSTAND → BUILD</div>
          </div>
        </footer>
      </div>
    </div>
  );
}