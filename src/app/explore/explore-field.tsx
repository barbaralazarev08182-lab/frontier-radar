"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Heart, Search, ThumbsDown, X } from "lucide-react";
import { SaveButton } from "@/components/frontier/save-button";
import { TrackedDetailLink } from "@/components/frontier/tracked-detail-link";
import { trackFeedback } from "@/lib/personalization/browser";
import { observeQualifiedDwell } from "@/lib/personalization/qualified-dwell";
import type { ExploreCandidate, ExploreLens } from "@/lib/feed/explore-candidates";

const LENSES: Array<{ id: ExploreLens; label: string; note: string }> = [
  { id: "for-you", label: "FOR YOU", note: "Personal match" },
  { id: "adjacent", label: "ADJACENT", note: "Near your edge" },
  { id: "rising", label: "RISING", note: "Public momentum" },
  { id: "new", label: "NEW", note: "Recently surfaced" },
  { id: "wildcard", label: "WILDCARD", note: "Outside your center" },
];

const WINDOW_DAYS = 90;
const WINDOW_WEEKS = WINDOW_DAYS / 7;
const MAX_PLOTTED = 16;
const FAN = {
  cx: 62,
  cy: 506,
  minR: 78,
  maxR: 760,
  startAngle: -68,
  endAngle: -5,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function dateMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function ageDays(value: string | null | undefined): number {
  const parsed = dateMs(value);
  if (parsed === null) return WINDOW_DAYS / 2;
  return Math.max(0, (Date.now() - parsed) / 86_400_000);
}

function firstSeenLabel(value: string | null | undefined): string {
  const parsed = dateMs(value);
  if (parsed === null) return "UNKNOWN";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(parsed)).toUpperCase();
}

function scoreLabel(score: number | null): string {
  return score == null ? "—" : Math.round(score).toString();
}

function sourceLabel(source: string): string {
  if (source === "huggingface") return "HUGGING FACE";
  if (source === "hackernews") return "SHOW HN";
  if (source === "producthunt") return "PRODUCT HUNT";
  return source.toUpperCase();
}

function polar(radius: number, angle: number): [number, number] {
  const radians = (angle * Math.PI) / 180;
  return [FAN.cx + radius * Math.cos(radians), FAN.cy + radius * Math.sin(radians)];
}

function radiusForWeek(week: number): number {
  const progress = clamp(week / WINDOW_WEEKS, 0, 1);
  return FAN.minR + progress * (FAN.maxR - FAN.minR);
}

function lensFallback(kind: "now" | "you", lens: ExploreLens, personalized: boolean): string {
  if (kind === "now") {
    if (lens === "adjacent") return "Close enough to connect with your current interests, far enough to expand them.";
    if (lens === "rising") return "Its public Frontier Score and recency place it near the front of this scan.";
    if (lens === "new") return "It has surfaced inside the recent discovery window and is worth checking before consensus forms.";
    if (lens === "wildcard") return "Its quality and novelty clear the exploration threshold despite sitting outside your center.";
    return "It currently clears the quality, freshness, and actionability threshold for this scan.";
  }

  if (lens === "adjacent") return "It still connects to your interest profile, but pushes toward an adjacent topic.";
  if (lens === "wildcard") return "It is deliberately surfaced outside your center to keep the Radar from becoming narrow.";
  return personalized
    ? "Your prior interactions contribute to this ranking, so it currently sits close to your interest center."
    : "This scan is still in cold start, so ranking is driven mainly by public quality, freshness, and actionability.";
}

interface FanPoint {
  candidate: ExploreCandidate;
  rank: number;
  angle: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  currentRadius: number;
  weekMarks: Array<{ x: number; y: number; week: number }>;
  clampedToWindow: boolean;
}

export function ExploreField({
  candidates,
  totalDiscoveries,
  dataLabel,
  personalized,
}: {
  candidates: ExploreCandidate[];
  totalDiscoveries: number;
  dataLabel: string;
  personalized: boolean;
}) {
  const [lens, setLens] = useState<ExploreLens>("for-you");
  const [focusId, setFocusId] = useState<string | null>(candidates[0]?.itemId ?? null);
  const [suppressed, setSuppressed] = useState<Set<string>>(() => new Set());
  const [liked, setLiked] = useState<Set<string>>(() => new Set());
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  const available = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return candidates.filter((candidate) => {
      if (suppressed.has(candidate.itemId)) return false;
      if (!normalized) return true;
      return [candidate.title, candidate.summary, ...candidate.tags]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [candidates, query, suppressed]);

  const ordered = useMemo(
    () => [...available].sort((a, b) => b.lensScores[lens] - a.lensScores[lens] || (b.score ?? 0) - (a.score ?? 0)),
    [available, lens]
  );

  const plotted = ordered.slice(0, MAX_PLOTTED);
  const focus = plotted.find((candidate) => candidate.itemId === focusId) ?? plotted[0] ?? null;
  const activeLens = LENSES.find((entry) => entry.id === lens) ?? LENSES[0]!;

  const fanPoints = useMemo<FanPoint[]>(() => {
    const denominator = Math.max(1, plotted.length - 1);
    return plotted.map((candidate, rank) => {
      const angle = FAN.startAngle + (FAN.endAngle - FAN.startAngle) * (rank / denominator);
      const daysSinceSeen = ageDays(candidate.firstSeenAt);
      const clampedAge = Math.min(WINDOW_DAYS, daysSinceSeen);
      const launchWeek = (WINDOW_DAYS - clampedAge) / 7;
      const startRadius = radiusForWeek(launchWeek);
      const [startX, startY] = polar(startRadius, angle);
      const [endX, endY] = polar(FAN.maxR, angle);
      const score = clamp(candidate.score ?? 35, 0, 100);
      const currentRadius = 4.2 + Math.sqrt(score) * 0.72;
      const weekMarks: Array<{ x: number; y: number; week: number }> = [];
      const firstWholeWeek = Math.ceil(launchWeek + 0.001);
      for (let week = firstWholeWeek; week <= Math.floor(WINDOW_WEEKS); week++) {
        const [x, y] = polar(radiusForWeek(week), angle);
        weekMarks.push({ x, y, week });
      }
      return {
        candidate,
        rank,
        angle,
        startX,
        startY,
        endX,
        endY,
        currentRadius,
        weekMarks,
        clampedToWindow: daysSinceSeen > WINDOW_DAYS,
      };
    });
  }, [plotted]);

  useEffect(() => {
    if (!focus) return;
    const node = document.querySelector<HTMLElement>(".lf-explore-detail");
    if (!node) return;
    return observeQualifiedDwell(node, focus.itemId, {
      surface: "explore",
      algorithm_variant: `explore-lieflat-l1:${lens}`,
      source: focus.source,
      content_type: focus.contentType,
    });
  }, [focus, lens]);

  function chooseLens(next: ExploreLens) {
    setLens(next);
    const top = [...available].sort((a, b) => b.lensScores[next] - a.lensScores[next])[0];
    if (top) setFocusId(top.itemId);
  }

  function feedback(candidate: ExploreCandidate, eventType: "interested" | "not_interested") {
    trackFeedback(candidate.itemId, eventType, undefined, {
      surface: "explore",
      algorithm_variant: `explore-lieflat-l1:${lens}`,
      source: candidate.source,
      content_type: candidate.contentType,
    });

    if (eventType === "interested") {
      setLiked((current) => new Set(current).add(candidate.itemId));
      return;
    }

    setSuppressed((current) => new Set(current).add(candidate.itemId));
  }

  function resetScan() {
    setSuppressed(new Set());
    setLiked(new Set());
    setQuery("");
    setSearchOpen(false);
    setFocusId(candidates[0]?.itemId ?? null);
  }

  return (
    <section className="lf-explore" data-lens={lens}>
      <header className="lf-explore-hero">
        <div>
          <div className="lf-explore-kicker">
            <span>02 EXPLORE</span>
            <span>L1 LAUNCH FAN</span>
            <span>{dataLabel}</span>
          </div>
          <h1>THE FRONTIER IS MOVING.</h1>
          <p>
            Each signal starts where it first surfaced. Time runs outward. Node size is today&apos;s Global Score.
          </p>
        </div>

        <div className="lf-explore-hero-meta" aria-label="Explore scan metadata">
          <strong>{ordered.length}</strong>
          <span>CURRENT CANDIDATES</span>
          <strong>{totalDiscoveries}</strong>
          <span>DISCOVERIES IN RANGE</span>
        </div>
      </header>

      <div className="lf-explore-controls">
        <div className="lf-explore-lenses" aria-label="Discovery lens">
          {LENSES.map((entry) => (
            <button
              type="button"
              key={entry.id}
              className={lens === entry.id ? "is-active" : ""}
              onClick={() => chooseLens(entry.id)}
              aria-pressed={lens === entry.id}
              title={entry.note}
            >
              <span className="lf-lens-dot" aria-hidden />
              {entry.label}
            </button>
          ))}
        </div>

        <div className="lf-explore-search-wrap">
          {searchOpen ? (
            <label className="lf-explore-search">
              <Search aria-hidden />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search this scan"
                aria-label="Search this scan"
              />
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSearchOpen(false);
                }}
                aria-label="Close search"
              >
                <X aria-hidden />
              </button>
            </label>
          ) : (
            <button className="lf-search-trigger" type="button" onClick={() => setSearchOpen(true)}>
              <Search aria-hidden /> SEARCH THIS SCAN
            </button>
          )}
          <button className="lf-reset-trigger" type="button" onClick={resetScan}>RESET</button>
        </div>
      </div>

      <div className="lf-explore-layout">
        <aside className="lf-explore-ranking" aria-label="Top signals in current lens">
          <div className="lf-section-label">TOP SIGNALS · {activeLens.label}</div>
          <ol>
            {plotted.slice(0, 8).map((candidate, index) => (
              <li key={candidate.itemId} className={candidate.itemId === focus?.itemId ? "is-active" : ""}>
                <button type="button" onClick={() => setFocusId(candidate.itemId)}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{candidate.title}</strong>
                  <em>{scoreLabel(candidate.score)}</em>
                </button>
              </li>
            ))}
          </ol>
          <p className="lf-ranking-note">
            Ranked by the selected lens. Global Score stays unchanged.
          </p>
        </aside>

        <figure className="lf-explore-figure">
          <div className="lf-figure-head">
            <div>
              <strong>Signals, fanned out by emergence</strong>
              <span>90-day window · one spoke per signal · weekly time marks</span>
            </div>
            <div className="lf-time-direction" aria-hidden>
              <span>EARLIER</span><i /><span>NOW</span>
            </div>
          </div>

          <svg
            className="lf-launch-fan"
            viewBox="0 0 980 560"
            role="img"
            aria-label="Lieflat Launch Fan showing when current frontier signals emerged over the last 90 days"
          >
            {[0, 4.3, 8.6, WINDOW_WEEKS].map((week, index) => {
              const radius = radiusForWeek(week);
              const [x1, y1] = polar(radius, FAN.startAngle);
              const [x2, y2] = polar(radius, FAN.endAngle);
              const bigArc = FAN.endAngle - FAN.startAngle > 180 ? 1 : 0;
              const labels = ["90D AGO", "60D", "30D", "TODAY"];
              return (
                <g key={week} className="lf-week-guide">
                  <path
                    d={`M${x1} ${y1} A${radius} ${radius} 0 ${bigArc} 1 ${x2} ${y2}`}
                    fill="none"
                  />
                  <text x={x1} y={y1 - 10}>{labels[index]}</text>
                </g>
              );
            })}

            {fanPoints.map((point) => {
              const isFocus = point.candidate.itemId === focus?.itemId;
              const score = scoreLabel(point.candidate.score);
              return (
                <g
                  key={point.candidate.itemId}
                  className={`lf-fan-signal${isFocus ? " is-focus" : ""}`}
                  data-lens={point.candidate.dominantLens}
                  role="button"
                  tabIndex={0}
                  aria-label={`Inspect ${point.candidate.title}`}
                  onClick={() => setFocusId(point.candidate.itemId)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setFocusId(point.candidate.itemId);
                    }
                  }}
                >
                  <line
                    className="lf-fan-spoke"
                    x1={point.startX}
                    y1={point.startY}
                    x2={point.endX}
                    y2={point.endY}
                    pathLength={1}
                    style={{ animationDelay: `${point.rank * 45}ms` }}
                  />

                  {point.weekMarks.map((mark, index) => (
                    <circle
                      key={`${point.candidate.itemId}-${mark.week}`}
                      className="lf-fan-tick"
                      cx={mark.x}
                      cy={mark.y}
                      r={1.45 + ((point.rank + index) % 3) * 0.35}
                      style={{ animationDelay: `${180 + point.rank * 45 + index * 24}ms` }}
                    />
                  ))}

                  <circle
                    className="lf-fan-launch"
                    cx={point.startX}
                    cy={point.startY}
                    r={point.currentRadius}
                    style={{ animationDelay: `${120 + point.rank * 55}ms` }}
                  >
                    <title>{`${point.candidate.title} · first seen ${firstSeenLabel(point.candidate.firstSeenAt)} · Global Score ${score}`}</title>
                  </circle>

                  {point.clampedToWindow ? (
                    <circle className="lf-fan-before-window" cx={point.startX} cy={point.startY} r={point.currentRadius + 3.5} />
                  ) : null}

                  <circle className="lf-fan-now" cx={point.endX} cy={point.endY} r={isFocus ? 4.8 : 2.4} />

                  {point.rank < 7 ? (
                    <g className="lf-fan-label" transform={`translate(${point.endX + 10} ${point.endY})`}>
                      <text>{point.candidate.title}</text>
                      <text className="lf-fan-score" x="158">{score}</text>
                    </g>
                  ) : null}
                </g>
              );
            })}
          </svg>

          <figcaption>
            <span>L1 LAUNCH FAN · ADAPTED DIRECTLY FROM LIEFLAT CHARTS</span>
            <span>Position = first seen · node area = Global Score · dots = weekly time marks</span>
          </figcaption>
        </figure>

        {focus ? (
          <aside className="lf-explore-detail" aria-label={`Selected signal: ${focus.title}`}>
            <div className="lf-section-label">SELECTED SIGNAL</div>
            <div className="lf-detail-source-row">
              <span>{sourceLabel(focus.source)}</span>
              <span>{focus.contentType.toUpperCase()}</span>
              {focus.crossSource ? <span>{focus.sourceCount} SOURCES</span> : null}
            </div>

            <h2>{focus.title}</h2>
            <p className="lf-detail-summary">{focus.summary}</p>

            <dl className="lf-detail-stats">
              <div><dt>FIRST SEEN</dt><dd>{firstSeenLabel(focus.firstSeenAt)}</dd></div>
              <div><dt>GLOBAL SCORE</dt><dd>{scoreLabel(focus.score)} / 100</dd></div>
              <div><dt>{activeLens.label} MATCH</dt><dd>{Math.round(focus.lensScores[lens])} / 100</dd></div>
              {focus.metricLabel ? <div><dt>CURRENT METRIC</dt><dd>{focus.metricLabel}</dd></div> : null}
            </dl>

            <div className="lf-detail-reason">
              <span>WHY NOW</span>
              <p>{focus.whyNow ?? lensFallback("now", lens, personalized)}</p>
            </div>
            <div className="lf-detail-reason">
              <span>WHY YOU</span>
              <p>{focus.whyYou ?? lensFallback("you", lens, personalized)}</p>
            </div>

            <div className="lf-detail-tags">
              {focus.tags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}
            </div>

            <div className="lf-detail-actions">
              <TrackedDetailLink
                itemId={focus.itemId}
                href={`/project/${focus.itemId}`}
                className="lf-open-intelligence"
                metadata={{
                  surface: "explore",
                  algorithm_variant: `explore-lieflat-l1:${lens}`,
                  source: focus.source,
                  content_type: focus.contentType,
                }}
              >
                OPEN INTELLIGENCE <ArrowUpRight aria-hidden />
              </TrackedDetailLink>

              <div className="lf-detail-secondary-actions">
                <SaveButton
                  item={{
                    id: focus.itemId,
                    title: focus.title,
                    source: focus.source,
                    contentType: focus.contentType,
                    summary: focus.summary,
                    score: focus.score,
                    tags: focus.tags,
                  }}
                  className="lf-save-action"
                />
                <button
                  type="button"
                  className={liked.has(focus.itemId) ? "is-active" : ""}
                  onClick={() => feedback(focus, "interested")}
                >
                  <Heart aria-hidden /> MORE LIKE THIS
                </button>
                <button type="button" onClick={() => feedback(focus, "not_interested")}>
                  <ThumbsDown aria-hidden /> LESS LIKE THIS
                </button>
              </div>
            </div>
          </aside>
        ) : (
          <aside className="lf-explore-detail lf-explore-detail-empty">
            <strong>No signal matches this scan.</strong>
            <button type="button" onClick={resetScan}>RESET</button>
          </aside>
        )}
      </div>

      <footer className="lf-explore-footer">
        <div>
          <span>READING KEY</span>
          <p>Farther outward = later in the 90-day window. Larger launch node = stronger Global Score today.</p>
        </div>
        <div>
          <span>DATA CONTRACT</span>
          <p>No semantic coordinates. No decorative pressure axis. Lens changes ranking; it never mutates Global Score.</p>
        </div>
        <div>
          <span>LICENSE</span>
          <p>Lieflat Charts L1 Launch Fan · PolyForm Noncommercial 1.0.0 · adapted for this experiment.</p>
        </div>
      </footer>
    </section>
  );
}
