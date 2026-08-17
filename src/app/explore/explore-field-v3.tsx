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

const MAX_PLOTTED = 16;
const FAN = {
  cx: 72,
  cy: 612,
  minR: 82,
  maxR: 558,
  startAngle: -75,
  endAngle: -8,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function dateMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function ageDays(value: string | null | undefined): number | null {
  const parsed = dateMs(value);
  if (parsed === null) return null;
  return Math.max(0, (Date.now() - parsed) / 86_400_000);
}

function chooseWindowDays(items: ExploreCandidate[]): 7 | 14 | 30 | 90 {
  const ages = items
    .map((item) => ageDays(item.firstSeenAt))
    .filter((value): value is number => value !== null);
  if (ages.length === 0) return 30;
  const oldest = Math.max(...ages);
  if (oldest <= 5) return 7;
  if (oldest <= 10) return 14;
  if (oldest <= 24) return 30;
  return 90;
}

function markInterval(windowDays: number): number {
  if (windowDays <= 7) return 1;
  if (windowDays <= 14) return 2;
  if (windowDays <= 30) return 5;
  return 14;
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

function lensFallback(kind: "now" | "you", lens: ExploreLens, personalized: boolean): string {
  if (kind === "now") {
    if (lens === "adjacent") return "Close enough to connect with your current interests, far enough to expand them.";
    if (lens === "rising") return "Its public Frontier Score and recency place it near the front of this scan.";
    if (lens === "new") return "It surfaced inside the current discovery window before consensus has formed.";
    if (lens === "wildcard") return "Quality and novelty clear the exploration threshold despite sitting outside your center.";
    return "It currently clears the quality, freshness, and actionability threshold for this scan.";
  }
  if (lens === "adjacent") return "It connects to your current interest profile while pushing toward an adjacent topic.";
  if (lens === "wildcard") return "It is deliberately surfaced outside your center so the Radar does not become narrow.";
  return personalized
    ? "Your prior interactions contribute to this ranking, so it currently sits close to your interest center."
    : "This scan is still in cold start, so ranking is driven mainly by public quality, freshness, and actionability.";
}

function polar(radius: number, angle: number): [number, number] {
  const radians = (angle * Math.PI) / 180;
  return [FAN.cx + radius * Math.cos(radians), FAN.cy + radius * Math.sin(radians)];
}

function radiusForAge(age: number, windowDays: number): number {
  const progress = 1 - clamp(age / windowDays, 0, 1);
  return FAN.minR + progress * (FAN.maxR - FAN.minR);
}

function guideLabel(age: number): string {
  if (age <= 0.01) return "TODAY";
  return `${Math.max(1, Math.round(age))}D AGO`;
}

interface FanPoint {
  candidate: ExploreCandidate;
  rank: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  nodeRadius: number;
  marks: Array<{ x: number; y: number; age: number }>;
  beforeWindow: boolean;
}

export function ExploreFieldV3({
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
  const [focusId, setFocusId] = useState<string | null>(null);
  const [suppressed, setSuppressed] = useState<Set<string>>(() => new Set());
  const [liked, setLiked] = useState<Set<string>>(() => new Set());
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  const available = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return candidates.filter((candidate) => {
      if (suppressed.has(candidate.itemId)) return false;
      if (!normalized) return true;
      return [candidate.title, candidate.summary, ...candidate.tags].join(" ").toLowerCase().includes(normalized);
    });
  }, [candidates, query, suppressed]);

  const ordered = useMemo(
    () => [...available].sort((a, b) => b.lensScores[lens] - a.lensScores[lens] || (b.score ?? 0) - (a.score ?? 0)),
    [available, lens]
  );

  const plotted = ordered.slice(0, MAX_PLOTTED);
  const focus = plotted.find((candidate) => candidate.itemId === focusId) ?? plotted[0] ?? null;
  const activeLens = LENSES.find((entry) => entry.id === lens) ?? LENSES[0]!;
  const windowDays = useMemo(() => chooseWindowDays(plotted), [plotted]);
  const interval = markInterval(windowDays);

  const fanPoints = useMemo<FanPoint[]>(() => {
    const denominator = Math.max(1, plotted.length - 1);
    return plotted.map((candidate, rank) => {
      const angle = FAN.startAngle + (FAN.endAngle - FAN.startAngle) * (rank / denominator);
      const rawAge = ageDays(candidate.firstSeenAt);
      const effectiveAge = rawAge ?? windowDays / 2;
      const startRadius = radiusForAge(effectiveAge, windowDays);
      const [startX, startY] = polar(startRadius, angle);
      const [endX, endY] = polar(FAN.maxR, angle);
      const score = clamp(candidate.score ?? 35, 0, 100);
      const nodeRadius = 4.4 + Math.sqrt(score) * 0.72;
      const marks: Array<{ x: number; y: number; age: number }> = [];
      let markAge = Math.floor((Math.min(effectiveAge, windowDays) - 0.001) / interval) * interval;
      for (; markAge > 0; markAge -= interval) {
        const [x, y] = polar(radiusForAge(markAge, windowDays), angle);
        marks.push({ x, y, age: markAge });
      }
      return {
        candidate,
        rank,
        startX,
        startY,
        endX,
        endY,
        nodeRadius,
        marks,
        beforeWindow: effectiveAge > windowDays,
      };
    });
  }, [interval, plotted, windowDays]);

  const guides = useMemo(() => [windowDays, windowDays * 2 / 3, windowDays / 3, 0], [windowDays]);

  useEffect(() => {
    if (!focus) return;
    const node = document.querySelector<HTMLElement>(".lf3-detail");
    if (!node) return;
    return observeQualifiedDwell(node, focus.itemId, {
      surface: "explore",
      algorithm_variant: `explore-lieflat-l1-adaptive:${lens}`,
      source: focus.source,
      content_type: focus.contentType,
    });
  }, [focus, lens]);

  function chooseLens(next: ExploreLens) {
    setLens(next);
    setFocusId(null);
  }

  function feedback(candidate: ExploreCandidate, eventType: "interested" | "not_interested") {
    trackFeedback(candidate.itemId, eventType, undefined, {
      surface: "explore",
      algorithm_variant: `explore-lieflat-l1-adaptive:${lens}`,
      source: candidate.source,
      content_type: candidate.contentType,
    });
    if (eventType === "interested") {
      setLiked((current) => new Set(current).add(candidate.itemId));
      return;
    }
    setSuppressed((current) => new Set(current).add(candidate.itemId));
    setFocusId(null);
  }

  function resetScan() {
    setSuppressed(new Set());
    setLiked(new Set());
    setQuery("");
    setSearchOpen(false);
    setFocusId(null);
  }

  return (
    <section className="lf3" data-lens={lens}>
      <header className="lf3-hero">
        <div className="lf3-kicker">
          <span>02 EXPLORE</span>
          <span>L1 LAUNCH FAN</span>
          <span>{dataLabel}</span>
          <span>{windowDays}D ADAPTIVE WINDOW</span>
        </div>
        <div className="lf3-hero-line">
          <h1>THE FRONTIER IS MOVING</h1>
          <div className="lf3-meta" aria-label="Explore scan metadata">
            <div><strong>{ordered.length}</strong><span>CANDIDATES</span></div>
            <div><strong>{totalDiscoveries}</strong><span>DISCOVERIES</span></div>
          </div>
        </div>
        <p>Signals begin where Radar first saw them. The time window expands only when the real candidate history needs it.</p>
      </header>

      <div className="lf3-controls">
        <div className="lf3-lenses" aria-label="Discovery lens">
          {LENSES.map((entry) => (
            <button
              type="button"
              key={entry.id}
              className={lens === entry.id ? "is-active" : ""}
              onClick={() => chooseLens(entry.id)}
              aria-pressed={lens === entry.id}
              title={entry.note}
            >
              <i aria-hidden /> {entry.label}
            </button>
          ))}
        </div>
        <div className="lf3-search-wrap">
          {searchOpen ? (
            <label className="lf3-search">
              <Search aria-hidden />
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this scan" aria-label="Search this scan" />
              <button type="button" onClick={() => { setQuery(""); setSearchOpen(false); }} aria-label="Close search"><X aria-hidden /></button>
            </label>
          ) : (
            <button className="lf3-search-trigger" type="button" onClick={() => setSearchOpen(true)}><Search aria-hidden /> SEARCH THIS SCAN</button>
          )}
          <button className="lf3-reset" type="button" onClick={resetScan}>RESET</button>
        </div>
      </div>

      <div className="lf3-layout">
        <aside className="lf3-ranking" aria-label="Top signals in current lens">
          <div className="lf3-section-label">TOP · {activeLens.label}</div>
          <ol>
            {plotted.slice(0, 7).map((candidate, index) => (
              <li key={candidate.itemId} className={candidate.itemId === focus?.itemId ? "is-active" : ""}>
                <button type="button" onClick={() => setFocusId(candidate.itemId)}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{candidate.title}</strong>
                  <em>{scoreLabel(candidate.score)}</em>
                </button>
              </li>
            ))}
          </ol>
          <p>Lens changes order. Global Score stays fixed.</p>
        </aside>

        <figure className="lf3-figure">
          <div className="lf3-figure-head">
            <div>
              <strong>EMERGENCE / NOW</strong>
              <span>{windowDays}-day window · one spoke per signal · node area = Global Score</span>
            </div>
            <div className="lf3-time" aria-hidden><span>EARLIER</span><i /><span>NOW</span></div>
          </div>

          <svg className="lf3-fan" viewBox="0 0 860 650" role="img" aria-label={`Launch Fan showing when current frontier signals emerged over an adaptive ${windowDays}-day window`}>
            {guides.map((age) => {
              const radius = radiusForAge(age, windowDays);
              const [x1, y1] = polar(radius, FAN.startAngle);
              const [x2, y2] = polar(radius, FAN.endAngle);
              return (
                <g key={age} className="lf3-guide">
                  <path d={`M${x1} ${y1} A${radius} ${radius} 0 0 1 ${x2} ${y2}`} fill="none" />
                  <text x={x1} y={y1 - 9}>{guideLabel(age)}</text>
                </g>
              );
            })}

            {fanPoints.map((point) => {
              const selected = point.candidate.itemId === focus?.itemId;
              return (
                <g
                  key={point.candidate.itemId}
                  className={`lf3-signal${selected ? " is-focus" : ""}`}
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
                  <line className="lf3-spoke" x1={point.startX} y1={point.startY} x2={point.endX} y2={point.endY} pathLength={1} style={{ animationDelay: `${point.rank * 35}ms` }} />
                  {point.marks.map((mark, index) => (
                    <circle key={`${point.candidate.itemId}-${mark.age}`} className="lf3-tick" cx={mark.x} cy={mark.y} r={1.5 + (index % 2) * .35} />
                  ))}
                  <circle className="lf3-launch" cx={point.startX} cy={point.startY} r={point.nodeRadius}>
                    <title>{`${point.candidate.title} · first seen ${firstSeenLabel(point.candidate.firstSeenAt)} · Global Score ${scoreLabel(point.candidate.score)}`}</title>
                  </circle>
                  {point.beforeWindow ? <circle className="lf3-before" cx={point.startX} cy={point.startY} r={point.nodeRadius + 4} /> : null}
                  <circle className="lf3-now" cx={point.endX} cy={point.endY} r={selected ? 4.5 : 2.1} />
                  {selected ? (
                    <g className="lf3-focus-label" transform={`translate(${point.startX + 14} ${point.startY - 3})`}>
                      <text>{point.candidate.title}</text>
                      <text y="15">SCORE {scoreLabel(point.candidate.score)} · {firstSeenLabel(point.candidate.firstSeenAt)}</text>
                    </g>
                  ) : null}
                </g>
              );
            })}
          </svg>

          <figcaption>
            <span>Position = first seen · endpoint = now</span>
            <span>Adaptive window prevents recent signals being crushed into one edge</span>
          </figcaption>
        </figure>

        {focus ? (
          <aside className="lf3-detail" aria-label={`Selected signal: ${focus.title}`}>
            <div className="lf3-section-label">SELECTED SIGNAL</div>
            <div className="lf3-source"><span>{sourceLabel(focus.source)}</span><span>{focus.contentType.toUpperCase()}</span></div>
            <h2>{focus.title}</h2>
            <p className="lf3-summary">{focus.summary}</p>
            <dl className="lf3-stats">
              <div><dt>FIRST SEEN</dt><dd>{firstSeenLabel(focus.firstSeenAt)}</dd></div>
              <div><dt>GLOBAL SCORE</dt><dd>{scoreLabel(focus.score)} / 100</dd></div>
              <div><dt>{activeLens.label} MATCH</dt><dd>{Math.round(focus.lensScores[lens])} / 100</dd></div>
            </dl>
            <div className="lf3-reason"><span>WHY NOW</span><p>{focus.whyNow ?? lensFallback("now", lens, personalized)}</p></div>
            <div className="lf3-reason"><span>WHY YOU</span><p>{focus.whyYou ?? lensFallback("you", lens, personalized)}</p></div>
            <div className="lf3-actions">
              <TrackedDetailLink
                itemId={focus.itemId}
                href={`/project/${focus.itemId}`}
                className="lf3-open"
                metadata={{ surface: "explore", algorithm_variant: `explore-lieflat-l1-adaptive:${lens}`, source: focus.source, content_type: focus.contentType }}
              >
                OPEN INTELLIGENCE <ArrowUpRight aria-hidden />
              </TrackedDetailLink>
              <div className="lf3-secondary">
                <SaveButton item={{ id: focus.itemId, title: focus.title, source: focus.source, contentType: focus.contentType, summary: focus.summary, score: focus.score, tags: focus.tags }} className="lf3-save" />
                <button type="button" className={liked.has(focus.itemId) ? "is-active" : ""} onClick={() => feedback(focus, "interested")}><Heart aria-hidden /> MORE</button>
                <button type="button" onClick={() => feedback(focus, "not_interested")}><ThumbsDown aria-hidden /> LESS</button>
              </div>
            </div>
          </aside>
        ) : (
          <aside className="lf3-detail lf3-empty"><strong>No signal matches this scan.</strong><button type="button" onClick={resetScan}>RESET</button></aside>
        )}
      </div>

      <footer className="lf3-footer">
        <span>L1 LAUNCH FAN · LIEFLAT CHARTS · POLYFORM NONCOMMERCIAL 1.0.0</span>
        <span>NO SEMANTIC COORDINATES · NO FAKE PRESSURE AXIS · GLOBAL SCORE UNCHANGED BY LENS</span>
      </footer>
    </section>
  );
}
