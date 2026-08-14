import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { loadProjectDetail, type ProjectScoreDetail } from "@/lib/feed/project-detail";
import type { MomentumHistory } from "@/lib/scoring/momentum-history";
import { TrackedSourceLink } from "@/components/frontier/tracked-source-link";
import "./project-research-mode.css";

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

const STAGES = [
  ["01", "CAPTURE"],
  ["02", "EVIDENCE"],
  ["03", "INTERROGATION"],
  ["04", "RESOLUTION"],
  ["05", "BUILD"],
] as const;

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
      note: `${evidenceCount} evidence records support the signal across more than one source.`,
    };
  }

  if (crossSource) {
    return {
      label: "CONFIRMED / MULTI-SOURCE",
      note: `${evidenceCount} evidence records reduce the chance that this is only a single-feed anomaly.`,
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

function ScoreTickRows({ scores }: { scores: ProjectScoreDetail[] }) {
  const rows = scores.slice(0, 8);
  if (rows.length === 0) {
    return <p className="pr-empty">Score components are not available for this project yet.</p>;
  }

  const rowHeight = 46;
  const width = 760;
  const height = 42 + rows.length * rowHeight;
  const tickStart = 255;
  const tickGap = 19;

  return (
    <div className="pr-score-visual">
      <div className="pr-score-caption">
        <strong>NORMALIZED SCORE FIELD</strong>
        <span>F5 TICK ROWS ADAPTATION · ONE TICK = 5 NORMALIZED SCORE POINTS · EXACT VALUE AT RIGHT</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Normalized score dimensions shown as Lieflat tick rows">
        {rows.map((entry, index) => {
          const score = Math.max(0, Math.min(100, Number(entry.score)));
          const filled = Math.floor(score / 5);
          const y = 34 + index * rowHeight;
          return (
            <g key={entry.dimension}>
              <text className="pr-score-rank" x="4" y={y + 4}>{String(index + 1).padStart(2, "0")}</text>
              <text className="pr-score-label" x="38" y={y + 4}>{SCORE_LABEL[entry.dimension] ?? entry.dimension}</text>
              <line className="pr-score-baseline" x1={tickStart - 5} x2={tickStart + tickGap * 19 + 8} y1={y} y2={y} />
              {Array.from({ length: 20 }, (_, tick) => (
                <line
                  key={tick}
                  className={tick < filled ? "pr-score-tick is-filled" : "pr-score-tick"}
                  x1={tickStart + tick * tickGap}
                  x2={tickStart + tick * tickGap}
                  y1={y - (tick % 5 === 4 ? 7 : 5)}
                  y2={y + (tick % 5 === 4 ? 7 : 5)}
                />
              ))}
              <text className="pr-score-value" x="728" y={y + 5} textAnchor="end">{Math.round(score)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function StageLabel({ number, name, thesis }: { number: string; name: string; thesis: string }) {
  return (
    <header className="pr-section-label">
      <span>{number}</span>
      <strong>{name}</strong>
      <p>{thesis}</p>
    </header>
  );
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

  const interrogationNodes = caseBlocks.length > 0
    ? caseBlocks
    : [{ label: "ANALYSIS STATUS", kind: "OPEN QUESTION", copy: "The structured intelligence layer is still being generated." }];
  const buildNodes = possibleUses.length > 0
    ? possibleUses
    : ["Build directions have not been generated for this project yet."];

  return (
    <div className="pr-shell">
      <nav className="pr-stage-nav" aria-label="Project Intelligence stages">
        <Link href="/today" className="pr-back"><ArrowLeft aria-hidden /> DAILY RADAR</Link>
        <div className="pr-stage-links">
          {STAGES.map(([number, label]) => (
            <a key={label} href={`#${label.toLowerCase()}`}><span>{number}</span>{label}</a>
          ))}
        </div>
        <span className="pr-mode">RESEARCH MODE</span>
      </nav>

      <main className="pr-document">
        <section id="capture" className="pr-section pr-capture">
          <div className="pr-capture-main">
            <div className="pr-kicker">
              <span>03 PROJECT · INTELLIGENCE</span>
              <span>{SOURCE_LABEL[item.source] ?? item.source}</span>
              <span>{item.contentType.toUpperCase()}</span>
              {firstSeen ? <span>FIRST SEEN {firstSeen}</span> : null}
            </div>
            <h1>{item.title}</h1>
            <p className="pr-deck">{summary}</p>
            <div className="pr-capture-actions">
              <TrackedSourceLink
                itemId={item.id}
                href={item.canonicalUrl}
                metadata={{ surface: "project_intelligence", source: item.source, content_type: item.contentType }}
                className="pr-primary-action"
              >
                OPEN PROJECT <ArrowUpRight aria-hidden />
              </TrackedSourceLink>
              <Link href={`/idea-lab?from=${encodeURIComponent(item.id)}`} className="pr-secondary-action">SEND TO IDEA LAB</Link>
            </div>
          </div>

          <aside className="pr-verdict">
            <span className="pr-eyebrow">FRONTIER VERDICT</span>
            <strong className="pr-verdict-score">{item.score == null ? "—" : Math.round(item.score)}</strong>
            <h2>{read.label}</h2>
            <p>{read.note}</p>
            <dl>
              <div><dt>EVIDENCE</dt><dd>{evidence.length}</dd></div>
              <div><dt>SOURCES</dt><dd>{entity.sources.length}</dd></div>
              <div><dt>CODE</dt><dd>{entity.hasCodeAnywhere ? "YES" : "—"}</dd></div>
              <div><dt>DEMO</dt><dd>{entity.hasDemoAnywhere ? "YES" : "—"}</dd></div>
            </dl>
          </aside>
        </section>

        <section id="evidence" className="pr-section pr-ledger-section">
          <StageLabel number="02" name="EVIDENCE" thesis="What is directly traceable, and how much confirmation actually exists?" />
          <div className="pr-section-body">
            <div className="pr-section-intro">
              <strong>{evidence.length} evidence record{evidence.length === 1 ? "" : "s"} · {entity.sources.length} source{entity.sources.length === 1 ? "" : "s"}</strong>
              <p>{entity.crossSource
                ? "This Project has cross-source confirmation. Every record below remains independently verifiable."
                : "This is currently a single-source signal. The sparse ledger is intentional; absence of confirmation is part of the evidence state."}</p>
            </div>

            <div className="pr-evidence-ledger">
              {orderedEvidence.length > 0 ? orderedEvidence.map((entry, index) => {
                const momentum = momentumLines(entry.source, entry.momentum);
                return (
                  <article key={entry.itemId} className="pr-evidence-row">
                    <span className="pr-row-number">{String(index + 1).padStart(2, "0")}</span>
                    <div className="pr-row-meta">
                      <strong>{SOURCE_LABEL[entry.source] ?? entry.source}</strong>
                      <span>{entry.contentType.toUpperCase()}</span>
                      <span>{formatDate(entry.publishedAt ?? entry.updatedAt) ?? "DATE N/A"}</span>
                    </div>
                    <div className="pr-row-copy">
                      <h3>{entry.title}</h3>
                      <div className="pr-momentum">
                        {momentum.length > 0
                          ? momentum.map((line) => <span key={line}>{line}</span>)
                          : <span>NO VERIFIED MULTI-SNAPSHOT MOMENTUM YET</span>}
                      </div>
                    </div>
                    <TrackedSourceLink
                      itemId={entry.itemId}
                      href={entry.url}
                      metadata={{ surface: "project_intelligence_evidence", source: entry.source, content_type: entry.contentType }}
                      className="pr-verify"
                    >VERIFY ↗</TrackedSourceLink>
                  </article>
                );
              }) : (
                <p className="pr-empty">Evidence is still being collected.</p>
              )}
            </div>
          </div>
        </section>

        <section id="interrogation" className="pr-section pr-ledger-section">
          <StageLabel number="03" name="INTERROGATION" thesis="Separate what was observed from what Frontier Radar infers or still questions." />
          <div className="pr-section-body">
            <div className="pr-question-ledger">
              {interrogationNodes.map((entry, index) => (
                <article key={`${entry.label}-${index}`} className="pr-question-row">
                  <span className={`pr-kind pr-kind-${entry.kind.toLowerCase().replace(" ", "-")}`}>{entry.kind}</span>
                  <h3>{entry.label}</h3>
                  <p>{entry.copy}</p>
                  <span className="pr-row-number">{String(index + 1).padStart(2, "0")}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="resolution" className="pr-section pr-resolution">
          <StageLabel number="04" name="RESOLUTION" thesis="How the normalized scoring dimensions support the current verdict." />
          <div className="pr-section-body pr-resolution-body">
            <div>
              <ScoreTickRows scores={scores} />
              {scores.some((entry) => entry.rationale) ? (
                <div className="pr-score-notes">
                  <strong>SCORING NOTES</strong>
                  {scores.slice(0, 8).map((entry) => entry.rationale ? (
                    <p key={entry.dimension}><span>{SCORE_LABEL[entry.dimension] ?? entry.dimension}</span>{entry.rationale}</p>
                  ) : null)}
                </div>
              ) : null}
            </div>
            <aside className="pr-resolution-verdict">
              <span>FRONTIER VERDICT</span>
              <strong>{read.label}</strong>
              <p>{read.note}</p>
              <dl>
                <div><dt>RADAR</dt><dd>{item.score == null ? "—" : Math.round(item.score)}</dd></div>
                <div><dt>SOURCES</dt><dd>{entity.sources.length}</dd></div>
                <div><dt>EVIDENCE</dt><dd>{evidence.length}</dd></div>
              </dl>
            </aside>
          </div>
        </section>

        <section id="build" className="pr-section pr-ledger-section pr-build">
          <StageLabel number="05" name="BUILD" thesis="Turn the signal into a concrete direction without pretending the product has built it for you." />
          <div className="pr-section-body">
            <div className="pr-build-ledger">
              {buildNodes.map((idea, index) => (
                <article key={`${idea}-${index}`} className="pr-build-row">
                  <span className="pr-row-number">{String(index + 1).padStart(2, "0")}</span>
                  <strong>{index === 0 ? "USE IT" : index === 1 ? "EXTEND IT" : index === 2 ? "COMBINE IT" : "BUILD DIRECTION"}</strong>
                  <p>{idea}</p>
                  <Link href={`/idea-lab?from=${encodeURIComponent(item.id)}`}>IDEA LAB ↗</Link>
                </article>
              ))}
            </div>

            <footer className="pr-source-ledger">
              <span>TRACEABLE SOURCE LEDGER</span>
              <div>
                {orderedEvidence.slice(0, 5).map((entry) => (
                  <TrackedSourceLink
                    key={entry.itemId}
                    itemId={entry.itemId}
                    href={entry.url}
                    metadata={{ surface: "project_intelligence_ledger", source: entry.source, content_type: entry.contentType }}
                  >
                    {SOURCE_LABEL[entry.source] ?? entry.source} ↗
                  </TrackedSourceLink>
                ))}
              </div>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}
