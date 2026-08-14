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

const MAX_PLOTTED = 24;
const MAX_GROUPS = 6;
const APERTURE_HEIGHT = 132;
const APERTURE_GAP = 12;
const APERTURE_X = 34;
const APERTURE_WIDTH = 718;
const APERTURE_PATH_X = APERTURE_X + APERTURE_WIDTH + 18;
const CANVAS = {
  width: 1280,
  height: 620,
  rowTop: 46,
  rowBottom: 574,
  titleX: 388,
  stemX: 414,
  bendX1: 680,
  bendX2: 820,
  hubX: 1010,
  groupLabelX: 1050,
};

function normalizeTag(tag: string): string {
  return tag.trim().replace(/\s+/g, " ").toLowerCase();
}

function displayTag(tag: string): string {
  return tag.replace(/[-_]+/g, " ").toUpperCase();
}

function truncateTitle(title: string, max = 46): string {
  return title.length <= max ? title : `${title.slice(0, max - 1).trimEnd()}…`;
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

function firstSeenLabel(value: string | null | undefined): string {
  if (!value) return "UNKNOWN";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "UNKNOWN";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(parsed)).toUpperCase();
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

interface TagGroup {
  id: string;
  label: string;
  count: number;
}

interface ColonnadeRow {
  candidate: ExploreCandidate;
  rank: number;
  groupId: string;
  y: number;
  groupY: number;
}

function buildTagAssignments(candidates: ExploreCandidate[]): {
  groups: TagGroup[];
  assignment: Map<string, string>;
} {
  const counts = new Map<string, { count: number; label: string }>();

  for (const candidate of candidates) {
    const seen = new Set<string>();
    for (const raw of candidate.tags) {
      const id = normalizeTag(raw);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const current = counts.get(id);
      counts.set(id, { count: (current?.count ?? 0) + 1, label: current?.label ?? raw.trim() });
    }
  }

  const selected = [...counts.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
    .slice(0, MAX_GROUPS)
    .map(([id, value]) => ({ id, label: displayTag(value.label), count: 0 }));

  const selectedIds = new Set(selected.map((group) => group.id));
  const assignment = new Map<string, string>();
  let otherCount = 0;
  let untaggedCount = 0;

  for (const candidate of candidates) {
    const normalizedTags = candidate.tags
      .map((raw, index) => ({ id: normalizeTag(raw), index }))
      .filter((entry) => Boolean(entry.id));
    const matching = normalizedTags
      .filter((entry) => selectedIds.has(entry.id))
      .sort((a, b) => {
        const aCount = counts.get(a.id)?.count ?? 0;
        const bCount = counts.get(b.id)?.count ?? 0;
        return bCount - aCount || a.index - b.index;
      });

    const groupId = matching[0]?.id ?? (normalizedTags.length > 0 ? "__other__" : "__untagged__");
    assignment.set(candidate.itemId, groupId);
    if (groupId === "__other__") {
      otherCount += 1;
    } else if (groupId === "__untagged__") {
      untaggedCount += 1;
    } else {
      const group = selected.find((entry) => entry.id === groupId);
      if (group) group.count += 1;
    }
  }

  const groups = selected.filter((group) => group.count > 0);
  if (otherCount > 0) groups.push({ id: "__other__", label: "OTHER TAGS", count: otherCount });
  if (untaggedCount > 0) groups.push({ id: "__untagged__", label: "UNTAGGED", count: untaggedCount });

  return { groups, assignment };
}

export function ExploreFieldV4({
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
  const [hoverId, setHoverId] = useState<string | null>(null);
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
  const activeLens = LENSES.find((entry) => entry.id === lens) ?? LENSES[0]!;
  const focus = plotted.find((candidate) => candidate.itemId === focusId) ?? null;
  const focusRank = focus ? plotted.findIndex((candidate) => candidate.itemId === focus.itemId) : -1;
  const activeId = focusId ?? hoverId;
  const tagModel = buildTagAssignments(plotted);
  const focusGroupId = focus ? (tagModel.assignment.get(focus.itemId) ?? "__other__") : null;
  const focusGroupLabel = focusGroupId
    ? (tagModel.groups.find((group) => group.id === focusGroupId)?.label ?? "UNTAGGED")
    : null;

  const groupY = new Map<string, number>();
  const groupCount = Math.max(1, tagModel.groups.length);
  const groupTop = 82;
  const groupBottom = 538;
  tagModel.groups.forEach((group, index) => {
    groupY.set(
      group.id,
      groupCount === 1
        ? (groupTop + groupBottom) / 2
        : groupTop + (groupBottom - groupTop) * (index / (groupCount - 1))
    );
  });

  const denominator = Math.max(1, plotted.length - 1);
  const baseY = (rank: number) => plotted.length === 1
    ? (CANVAS.rowTop + CANVAS.rowBottom) / 2
    : CANVAS.rowTop + (CANVAS.rowBottom - CANVAS.rowTop) * (rank / denominator);

  const apertureHalf = APERTURE_HEIGHT / 2;
  const focusY = focusRank >= 0
    ? Math.max(
      CANVAS.rowTop + apertureHalf,
      Math.min(CANVAS.rowBottom - apertureHalf, baseY(focusRank))
    )
    : null;

  const rows: ColonnadeRow[] = plotted.map((candidate, rank) => {
    let y = baseY(rank);
    if (focusY != null && focusRank >= 0) {
      if (rank === focusRank) {
        y = focusY;
      } else if (rank < focusRank) {
        const end = focusY - apertureHalf - APERTURE_GAP;
        y = focusRank <= 1
          ? CANVAS.rowTop
          : CANVAS.rowTop + (end - CANVAS.rowTop) * (rank / (focusRank - 1));
      } else {
        const start = focusY + apertureHalf + APERTURE_GAP;
        const after = plotted.length - focusRank - 1;
        y = after <= 1
          ? CANVAS.rowBottom
          : start + (CANVAS.rowBottom - start) * ((rank - focusRank - 1) / (after - 1));
      }
    }

    const groupId = tagModel.assignment.get(candidate.itemId) ?? "__other__";
    return {
      candidate,
      rank,
      groupId,
      y,
      groupY: groupY.get(groupId) ?? CANVAS.height / 2,
    };
  });

  useEffect(() => {
    if (!focus) return;
    const node = document.querySelector<HTMLElement>(".lf4-aperture-body");
    if (!node) return;
    return observeQualifiedDwell(node, focus.itemId, {
      surface: "explore",
      algorithm_variant: `explore-lieflat-l12-tag-colonnade:${lens}`,
      source: focus.source,
      content_type: focus.contentType,
    });
  }, [focus, lens]);

  useEffect(() => {
    const navigate = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFocusId(null);
        setHoverId(null);
        return;
      }
      if (!focusId || (event.target instanceof HTMLInputElement) || (event.target instanceof HTMLTextAreaElement)) return;
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      const current = plotted.findIndex((candidate) => candidate.itemId === focusId);
      if (current < 0) return;
      event.preventDefault();
      const delta = event.key === "ArrowUp" ? -1 : 1;
      const next = Math.max(0, Math.min(plotted.length - 1, current + delta));
      setFocusId(plotted[next]?.itemId ?? focusId);
      setHoverId(null);
    };
    window.addEventListener("keydown", navigate);
    return () => window.removeEventListener("keydown", navigate);
  }, [focusId, plotted]);

  function chooseLens(next: ExploreLens) {
    setLens(next);
    setFocusId(null);
    setHoverId(null);
  }

  function feedback(candidate: ExploreCandidate, eventType: "interested" | "not_interested") {
    trackFeedback(candidate.itemId, eventType, undefined, {
      surface: "explore",
      algorithm_variant: `explore-lieflat-l12-tag-colonnade:${lens}`,
      source: candidate.source,
      content_type: candidate.contentType,
    });
    if (eventType === "interested") {
      setLiked((current) => new Set(current).add(candidate.itemId));
      return;
    }
    setSuppressed((current) => new Set(current).add(candidate.itemId));
    setFocusId(null);
    setHoverId(null);
  }

  function resetScan() {
    setSuppressed(new Set());
    setLiked(new Set());
    setQuery("");
    setSearchOpen(false);
    setFocusId(null);
    setHoverId(null);
  }

  return (
    <section className="lf4 lf4-viewport" data-lens={lens} data-focus={focus ? "pinned" : "idle"}>
      <header className="lf4-hero lf4-hero-compact">
        <div className="lf4-kicker">
          <span>02 EXPLORE · FRONTIER FIELD</span>
          <span>L12 TYPE COLONNADE</span>
          <span>{dataLabel}</span>
        </div>
        <div className="lf4-compact-line">
          <div className="lf4-compact-thesis">
            <h1>READ THE FIELD AS RECORDS.</h1>
            <p>One record, one hairline, one metadata-derived tag family. Lens changes rank; Global Score stays global.</p>
          </div>
          <div className="lf4-hero-meta">
            <div><strong>{plotted.length}</strong><span>RECORDS</span></div>
            <div><strong>{tagModel.groups.length}</strong><span>TAG FAMILIES</span></div>
            <div><strong>{totalDiscoveries}</strong><span>DISCOVERIES</span></div>
          </div>
        </div>
      </header>

      <div className="lf4-controls">
        <div className="lf4-lenses" aria-label="Discovery lens">
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
        <div className="lf4-tools">
          {searchOpen ? (
            <label className="lf4-search">
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
            <button className="lf4-tool" type="button" onClick={() => setSearchOpen(true)}>
              <Search aria-hidden /> SEARCH
            </button>
          )}
          <button className="lf4-tool" type="button" onClick={resetScan}>RESET</button>
        </div>
      </div>

      <figure className="lf4-canvas">
        <div className="lf4-canvas-head">
          <div>
            <strong>RANK · {activeLens.label}</strong>
            <span>G = Global Score · L = current Lens score</span>
          </div>
          <div>
            <strong>SHARED TAG FAMILIES</strong>
            <span>{focus ? "↑ / ↓ switches focus · Esc releases" : "hover to inspect · click to open a focus aperture"}</span>
          </div>
        </div>

        <svg
          className="lf4-colonnade"
          viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`Type Colonnade of ${plotted.length} Explore candidates ranked by ${activeLens.label} and connected to tags already present on each record`}
          onClick={(event) => {
            const target = event.target;
            if (target instanceof Element && (target.closest(".lf4-row") || target.closest(".lf4-aperture"))) return;
            setFocusId(null);
            setHoverId(null);
          }}
        >
          <line className="lf4-spine" x1={CANVAS.stemX} y1={28} x2={CANVAS.stemX} y2={592} />
          <line className="lf4-hub-spine" x1={CANVAS.hubX} y1={38} x2={CANVAS.hubX} y2={582} />

          {rows.map((row) => {
            const selected = row.candidate.itemId === focusId;
            const active = row.candidate.itemId === activeId;
            const lensScore = Math.round(row.candidate.lensScores[lens]);
            const pathStart = selected ? APERTURE_PATH_X : CANVAS.stemX + 9;
            const bendOne = selected ? 842 : CANVAS.bendX1;
            const bendTwo = selected ? 900 : CANVAS.bendX2;
            const path = `M ${pathStart} ${row.y} C ${bendOne} ${row.y} ${bendTwo} ${row.groupY} ${CANVAS.hubX - 12} ${row.groupY}`;
            const groupLabel = tagModel.groups.find((group) => group.id === row.groupId)?.label ?? "UNTAGGED";
            return (
              <g
                key={row.candidate.itemId}
                className={`lf4-row${active ? " is-active" : ""}${selected ? " is-selected" : ""}`}
                role="button"
                tabIndex={0}
                aria-label={`Rank ${row.rank + 1}: ${row.candidate.title}. Global Score ${scoreLabel(row.candidate.score)}. ${activeLens.label} score ${lensScore}.`}
                onMouseEnter={() => setHoverId(row.candidate.itemId)}
                onMouseLeave={() => setHoverId((current) => current === row.candidate.itemId ? null : current)}
                onFocus={() => setHoverId(row.candidate.itemId)}
                onBlur={() => setHoverId((current) => current === row.candidate.itemId ? null : current)}
                onClick={() => {
                  setFocusId((current) => current === row.candidate.itemId ? null : row.candidate.itemId);
                  setHoverId(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setFocusId((current) => current === row.candidate.itemId ? null : row.candidate.itemId);
                    setHoverId(null);
                  }
                }}
              >
                {!selected ? (
                  <>
                    <rect className="lf4-hit" x={34} y={row.y - 10} width={390} height={20} rx={2} />
                    <text className="lf4-rank" x={42} y={row.y + 4}>{String(row.rank + 1).padStart(2, "0")}</text>
                    <text className="lf4-score" x={82} y={row.y + 4}>
                      <tspan>G {scoreLabel(row.candidate.score)}</tspan>
                      <tspan x={126}>L {lensScore}</tspan>
                    </text>
                    <g>
                      <title>{row.candidate.title}</title>
                      <text className="lf4-title" x={CANVAS.titleX} y={row.y + (active ? -1 : 4)} textAnchor="end">
                        {truncateTitle(row.candidate.title)}
                      </text>
                      {active ? (
                        <text className="lf4-inline-readout" x={CANVAS.titleX} y={row.y + 10} textAnchor="end">
                          INSPECT · {sourceLabel(row.candidate.source)} · {groupLabel} · {firstSeenLabel(row.candidate.firstSeenAt)}
                        </text>
                      ) : null}
                    </g>
                    <rect className="lf4-record-mark" x={CANVAS.stemX - 3} y={row.y - 2.2} width={7} height={4.4} rx={1} />
                  </>
                ) : null}
                <path className="lf4-thread" d={path} pathLength={1} style={{ animationDelay: `${row.rank * 18}ms` }} />
                <circle className="lf4-endpoint" cx={CANVAS.hubX - 12} cy={row.groupY} r={2.2} />
              </g>
            );
          })}

          {tagModel.groups.map((group, index) => {
            const y = groupY.get(group.id) ?? CANVAS.height / 2;
            const active = rows.some((row) => row.groupId === group.id && row.candidate.itemId === activeId);
            const radius = 6 + Math.sqrt(group.count) * 4.2;
            return (
              <g key={group.id} className={`lf4-group${active ? " is-active" : ""}`}>
                <circle
                  className="lf4-group-dot"
                  cx={CANVAS.hubX}
                  cy={y}
                  r={radius}
                  style={{ animationDelay: `${520 + index * 65}ms` }}
                >
                  <title>{`${group.label} · ${group.count} records`}</title>
                </circle>
                <line className="lf4-group-rule" x1={CANVAS.hubX + radius + 7} y1={y} x2={CANVAS.groupLabelX - 8} y2={y} />
                <text className="lf4-group-name" x={CANVAS.groupLabelX} y={y - 2}>{group.label}</text>
                <text className="lf4-group-count" x={CANVAS.groupLabelX} y={y + 14}>{group.count} RECORD{group.count === 1 ? "" : "S"}</text>
              </g>
            );
          })}

          {focus && focusY != null ? (
            <foreignObject
              className="lf4-sheet lf4-aperture"
              x={APERTURE_X}
              y={focusY - apertureHalf}
              width={APERTURE_WIDTH}
              height={APERTURE_HEIGHT}
              aria-label={`Pinned signal: ${focus.title}`}
            >
              <div className="lf4-aperture-body">
                <div className="lf4-aperture-kicker">
                  <span>PINNED · {String(focusRank + 1).padStart(2, "0")}</span>
                  <span>{sourceLabel(focus.source)}</span>
                  <span>{focus.contentType.toUpperCase()}</span>
                  <span>{firstSeenLabel(focus.firstSeenAt)}</span>
                  <button type="button" onClick={() => setFocusId(null)} aria-label="Release pinned signal">
                    <X aria-hidden />
                  </button>
                </div>
                <div className="lf4-aperture-grid">
                  <div className="lf4-aperture-copy">
                    <h2>{focus.title}</h2>
                    <p>{focus.summary}</p>
                  </div>
                  <div className="lf4-aperture-scores">
                    <span><b>G {scoreLabel(focus.score)}</b> GLOBAL</span>
                    <span><b>L {Math.round(focus.lensScores[lens])}</b> {activeLens.label}</span>
                    <span><b>{focusGroupLabel ?? "UNTAGGED"}</b> TAG</span>
                  </div>
                </div>
                <div className="lf4-aperture-bottom">
                  <div className="lf4-aperture-reason">
                    <span>WHY NOW</span>
                    <p>{focus.whyNow ?? lensFallback("now", lens, personalized)}</p>
                  </div>
                  <div className="lf4-aperture-reason">
                    <span>WHY YOU</span>
                    <p>{focus.whyYou ?? lensFallback("you", lens, personalized)}</p>
                  </div>
                  <div className="lf4-aperture-actions">
                    <TrackedDetailLink
                      itemId={focus.itemId}
                      href={`/project/${focus.itemId}`}
                      className="lf4-open"
                      metadata={{
                        surface: "explore",
                        algorithm_variant: `explore-lieflat-l12-tag-colonnade:${lens}`,
                        source: focus.source,
                        content_type: focus.contentType,
                      }}
                    >
                      OPEN <ArrowUpRight aria-hidden />
                    </TrackedDetailLink>
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
                      className="lf4-save"
                    />
                    <button
                      type="button"
                      className={liked.has(focus.itemId) ? "is-active" : ""}
                      onClick={() => feedback(focus, "interested")}
                    >
                      <Heart aria-hidden /> MORE
                    </button>
                    <button type="button" onClick={() => feedback(focus, "not_interested") }>
                      <ThumbsDown aria-hidden /> LESS
                    </button>
                  </div>
                </div>
              </div>
            </foreignObject>
          ) : null}
        </svg>

        <figcaption>
          <span>{focus ? "FOCUS APERTURE · click another record or use ↑ / ↓ · Esc releases" : "HOVER TO INSPECT · CLICK TO FOCUS · OPEN FOR FULL INTELLIGENCE"}</span>
          <span>No semantic coordinates · Lens changes rank only.</span>
        </figcaption>

        {plotted.length === 0 ? (
          <div className="lf4-zero">
            <strong>NO SIGNAL MATCHES THIS SCAN.</strong>
            <button type="button" onClick={resetScan}>RESET</button>
          </div>
        ) : null}
      </figure>

      <footer className="lf4-footer">
        <span>L12 TYPE COLONNADE · LIEFLAT CHARTS · POLYFORM NONCOMMERCIAL 1.0.0</span>
        <span>TAG ASSIGNMENT ≠ SEMANTIC EMBEDDING · GLOBAL SCORE ≠ PERSONAL MATCH</span>
      </footer>
    </section>
  );
}
