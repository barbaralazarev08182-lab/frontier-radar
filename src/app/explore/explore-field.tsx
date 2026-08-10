"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Heart, MousePointer2, Radar, Search, Sparkles, ThumbsDown, X } from "lucide-react";
import { TrackedDetailLink } from "@/components/frontier/tracked-detail-link";
import { trackFeedback } from "@/lib/personalization/browser";
import type { ExploreCandidate, ExploreLens } from "@/lib/feed/explore-candidates";

const LENSES: Array<{ id: ExploreLens; label: string; short: string; note: string }> = [
  { id: "for-you", label: "FOR YOU", short: "YOU", note: "CORE MATCH" },
  { id: "adjacent", label: "ADJACENT", short: "ADJ", note: "NEAR EDGE" },
  { id: "rising", label: "RISING", short: "RISE", note: "MOMENTUM" },
  { id: "new", label: "NEW", short: "NEW", note: "JUST SEEN" },
  { id: "wildcard", label: "WILDCARD", short: "WILD", note: "OUTSIDE BUBBLE" },
];

const POSITIONS = [
  [12, 18, -5], [28, 12, 3], [76, 16, -2], [90, 28, 5], [14, 43, 2],
  [88, 52, -4], [22, 68, -2], [72, 72, 4], [42, 82, 2], [92, 78, -3],
  [8, 84, 4], [42, 18, -2], [64, 8, 2], [6, 58, -4], [60, 88, 3],
  [34, 58, 4], [80, 90, -3], [52, 10, 1], [96, 62, 3], [18, 92, -2],
] as const;

type FieldStyle = CSSProperties & Record<`--${string}`, string | number>;

function scoreLabel(score: number | null): string {
  return score == null ? "—" : Math.round(score).toString();
}

function lensFallback(kind: "now" | "you", lens: ExploreLens, personalized: boolean): string {
  if (kind === "now") {
    if (lens === "adjacent") return "它正好位于核心兴趣与新方向的交界，适合现在跨出去一步。";
    if (lens === "rising") return "公共 Frontier Score 与近期信号把它推到了这一轮扫描前排。";
    if (lens === "new") return "它仍处在较新的发现窗口，适合现在检查，而不是等它变成共识。";
    if (lens === "wildcard") return "它的质量与新颖性已经越过探索门槛，值得打破一次惯性。";
    return "它目前同时满足质量、时效与可行动性的基础门槛。";
  }

  if (lens === "adjacent") return "它与你的兴趣仍有语义连接，但已经开始把 Radar 推向外侧。";
  if (lens === "wildcard") return "它被刻意放在兴趣中心之外，用来防止 Radar 越学越窄。";
  return personalized
    ? "你的历史行为已经影响排序，它目前靠近你的兴趣中心。"
    : "当前仍是冷启动，Radar 主要依据公共质量、时效与可行动性排序。";
}

function sourceLabel(source: string): string {
  if (source === "huggingface") return "HUGGING FACE";
  if (source === "hackernews") return "SHOW HN";
  if (source === "producthunt") return "PRODUCT HUNT";
  return source.toUpperCase();
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

  const focus = ordered.find((candidate) => candidate.itemId === focusId) ?? ordered[0] ?? null;
  const isSearching = searchOpen || query.trim().length > 0;
  const activeLens = LENSES.find((entry) => entry.id === lens) ?? LENSES[0]!;

  useEffect(() => {
    if (!focus) return;
    const startedAt = Date.now();
    return () => {
      const dwellMs = Date.now() - startedAt;
      if (dwellMs < 1200) return;
      trackFeedback(focus.itemId, "dwell", dwellMs, {
        surface: "explore",
        algorithm_variant: `explore-frontier-field-v1:${lens}`,
        source: focus.source,
        content_type: focus.contentType,
        measurement: "focus_dwell",
      });
    };
  }, [focus, lens]);

  useEffect(() => {
    if (!searchOpen) return;

    // Search is an instrument mode, not another vertical page section: freeze document scroll
    // while the fixed-height dock filters the already-visible field beneath it.
    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = body.style.overflow;

    root.style.overflow = "hidden";
    body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setQuery("");
      setSearchOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      root.style.overflow = previousRootOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, [searchOpen]);

  const rankById = useMemo(() => new Map(ordered.map((candidate, index) => [candidate.itemId, index])), [ordered]);

  function chooseLens(next: ExploreLens) {
    setLens(next);
    const top = [...available].sort((a, b) => b.lensScores[next] - a.lensScores[next])[0];
    if (top) setFocusId(top.itemId);
  }

  function feedback(candidate: ExploreCandidate, eventType: "interested" | "not_interested") {
    trackFeedback(candidate.itemId, eventType, undefined, {
      surface: "explore",
      algorithm_variant: `explore-frontier-field-v1:${lens}`,
      source: candidate.source,
      content_type: candidate.contentType,
    });

    if (eventType === "interested") {
      setLiked((current) => new Set(current).add(candidate.itemId));
      return;
    }

    setSuppressed((current) => new Set(current).add(candidate.itemId));
  }

  function stepFocus(delta: number) {
    if (!focus || ordered.length < 2) return;
    const index = ordered.findIndex((candidate) => candidate.itemId === focus.itemId);
    const next = (index + delta + ordered.length) % ordered.length;
    setFocusId(ordered[next]!.itemId);
  }

  function resetField() {
    setSuppressed(new Set());
    setLiked(new Set());
    setQuery("");
    setSearchOpen(false);
    setFocusId(candidates[0]?.itemId ?? null);
  }

  function closeSearch() {
    setQuery("");
    setSearchOpen(false);
  }

  return (
    <section
      className="explore-field-shell"
      data-lens={lens}
      data-searching={isSearching ? "true" : "false"}
    >
      <div className="explore-control-surface">
        <header className="explore-field-header">
          <div className="explore-field-kicker">
            <span>FRONTIER RADAR / EXPLORE</span>
            <span>{dataLabel}</span>
          </div>

          <div className="explore-field-heading-row">
            <div>
              <h1>CURRENT FRONTIER</h1>
              <p>Move from what you already care about toward what you did not know you should care about.</p>
            </div>
            <button
              className="explore-search-trigger"
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-expanded={searchOpen}
            >
              <span className="explore-search-trigger-icon"><Search aria-hidden /></span>
              <span className="explore-search-trigger-copy">
                <strong>SEARCH FRONTIER</strong>
                <small>LIVE SCAN</small>
              </span>
              <span className="explore-search-trigger-led" aria-hidden />
            </button>
          </div>

          <div className="explore-field-stats" aria-label="Explore scan status">
            <span><strong>{ordered.length}</strong> active signals</span>
            <span><strong>{totalDiscoveries}</strong> discoveries in range</span>
            <span>{personalized ? "PERSONAL GRAVITY ACTIVE" : "COLD-START GRAVITY"}</span>
          </div>

          {searchOpen ? (
            <div className="explore-search-panel" role="search" aria-label="Search current frontier scan">
              <div className="explore-search-panel-label">
                <span>FRONTIER SCAN</span>
                <strong>{String(ordered.length).padStart(2, "0")}</strong>
              </div>
              <Search aria-hidden />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search this frontier scan"
                aria-label="Search this frontier scan"
              />
              <div className="explore-search-readout" aria-hidden>
                <span>{activeLens.label}</span>
                <strong>{query.trim() ? "FILTERING" : "READY"}</strong>
              </div>
              <button className="explore-search-close" type="button" onClick={closeSearch} aria-label="Close search">
                <X aria-hidden />
              </button>
            </div>
          ) : null}
        </header>

        <nav className="explore-lens-strip" aria-label="Discovery lens">
          <div className="explore-lens-title">
            <Radar aria-hidden />
            <span>
              <strong>RADAR LENS</strong>
              <small>RETUNE HOW THE FIELD IS RANKED</small>
            </span>
          </div>
          <div className="explore-lens-options">
            {LENSES.map((entry) => (
              <button
                type="button"
                key={entry.id}
                data-lens-id={entry.id}
                onClick={() => chooseLens(entry.id)}
                className={lens === entry.id ? "is-active" : ""}
                aria-pressed={lens === entry.id}
                title={`${entry.label} — ${entry.note}`}
              >
                <strong className="explore-lens-full">{entry.label}</strong>
                <strong className="explore-lens-short">{entry.short}</strong>
                <small>{entry.note}</small>
              </button>
            ))}
          </div>
          <button className="explore-lens-reset" type="button" onClick={resetField}>
            RESET SCAN
          </button>
        </nav>
      </div>

      <div className="explore-field-stage" aria-label="Frontier discovery field">
        <div className="explore-field-scan" aria-hidden />
        <div className="explore-field-axis explore-field-axis-x" aria-hidden>SEMANTIC DISTANCE →</div>
        <div className="explore-field-axis explore-field-axis-y" aria-hidden>SIGNAL PRESSURE</div>

        {ordered.map((candidate) => {
          const rank = rankById.get(candidate.itemId) ?? 99;
          const isFocus = candidate.itemId === focus?.itemId;
          const preset = POSITIONS[rank % POSITIONS.length]!;
          const tier = rank < 5 ? "near" : rank < 12 ? "mid" : "far";
          const style: FieldStyle = {
            "--field-x": isFocus ? "57%" : `${preset[0]}%`,
            "--field-y": isFocus ? "47%" : `${preset[1]}%`,
            "--field-tilt": isFocus ? "-1deg" : `${preset[2]}deg`,
            "--field-delay": `${Math.min(rank, 12) * 18}ms`,
            "--field-strength": `${Math.round(candidate.lensScores[lens]) / 100}`,
          };

          return (
            <article
              key={candidate.itemId}
              className={`explore-signal explore-signal-${tier}${isFocus ? " is-focus" : ""}${liked.has(candidate.itemId) ? " is-liked" : ""}`}
              style={style}
              data-dominant={candidate.dominantLens}
            >
              {isFocus ? (
                <div className="explore-focus-card">
                  <div className="explore-focus-meta">
                    <span>{sourceLabel(candidate.source)}</span>
                    <span>{candidate.contentType.toUpperCase()}</span>
                    <span>{candidate.crossSource ? `${candidate.sourceCount} SOURCES` : "SINGLE SIGNAL"}</span>
                    <strong>{scoreLabel(candidate.score)}</strong>
                  </div>
                  <h2>{candidate.title}</h2>
                  <p className="explore-focus-summary">{candidate.summary}</p>
                  <div className="explore-focus-reasons">
                    <div>
                      <span>WHY NOW</span>
                      <p>{candidate.whyNow ?? lensFallback("now", lens, personalized)}</p>
                    </div>
                    <div>
                      <span>WHY YOU</span>
                      <p>{candidate.whyYou ?? lensFallback("you", lens, personalized)}</p>
                    </div>
                  </div>
                  <div className="explore-focus-evidence">
                    <Radar aria-hidden />
                    <span>{candidate.sourceEvidence.map(sourceLabel).join(" · ")}</span>
                    {candidate.metricLabel ? <span>{candidate.metricLabel}</span> : null}
                  </div>
                  <div className="explore-focus-tags">
                    {candidate.tags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}
                  </div>
                  <div className="explore-focus-stepper">
                    <button type="button" onClick={() => stepFocus(-1)}>← PREVIOUS SIGNAL</button>
                    <span>{String((rankById.get(candidate.itemId) ?? 0) + 1).padStart(2, "0")} / {String(ordered.length).padStart(2, "0")}</span>
                    <button type="button" onClick={() => stepFocus(1)}>NEXT SIGNAL →</button>
                  </div>
                  <div className="explore-focus-actions">
                    <button
                      type="button"
                      className={liked.has(candidate.itemId) ? "is-active" : ""}
                      onClick={() => feedback(candidate, "interested")}
                    >
                      <Heart aria-hidden /> MORE LIKE THIS
                    </button>
                    <button type="button" onClick={() => feedback(candidate, "not_interested")}>
                      <ThumbsDown aria-hidden /> LESS LIKE THIS
                    </button>
                    <TrackedDetailLink
                      itemId={candidate.itemId}
                      href={`/project/${candidate.itemId}`}
                      className="explore-open-intelligence"
                      metadata={{
                        surface: "explore",
                        algorithm_variant: `explore-frontier-field-v1:${lens}`,
                        source: candidate.source,
                        content_type: candidate.contentType,
                      }}
                    >
                      OPEN INTELLIGENCE <ArrowUpRight aria-hidden />
                    </TrackedDetailLink>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="explore-signal-button"
                  onClick={() => setFocusId(candidate.itemId)}
                  aria-label={`Inspect ${candidate.title}`}
                >
                  <span className="explore-signal-index">{String(rank + 1).padStart(2, "0")}</span>
                  <strong>{candidate.title}</strong>
                  <span>{Math.round(candidate.lensScores[lens])} / {sourceLabel(candidate.source)}</span>
                  <span className="explore-signal-affordance"><MousePointer2 aria-hidden /> INSPECT</span>
                </button>
              )}
            </article>
          );
        })}

        {ordered.length === 0 ? (
          <div className="explore-field-empty">
            <Sparkles aria-hidden />
            <strong>No signals match this local scan.</strong>
            <button type="button" onClick={resetField}>RESET FIELD</button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
