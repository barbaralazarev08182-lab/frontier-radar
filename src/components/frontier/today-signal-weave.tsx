"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type {
  DailySynthesisSignalInput,
  DailySynthesisSnapshot,
  SynthesisFormation,
} from "@/lib/ai/daily-synthesis";
import styles from "./today-signal-weave.module.css";
import polish from "./today-signal-weave-polish.module.css";

type ResolveSynthesisAction = () => Promise<DailySynthesisSnapshot | null>;

interface TodaySignalWeaveProps {
  signals: DailySynthesisSignalInput[];
  initialSnapshot: DailySynthesisSnapshot | null;
  resolveSynthesisAction: ResolveSynthesisAction | null;
}

const SIGNAL_Y = [112, 194, 278, 365, 452, 535, 618];
const SIGNAL_TOP = [15, 26, 38, 50, 62, 74, 86];
const PATTERN_Y: Record<number, number[]> = {
  1: [350],
  2: [245, 470],
  3: [188, 348, 514],
};
const PATTERN_TOP: Record<number, number[]> = {
  1: [50],
  2: [35, 66],
  3: [22, 49, 73],
};

const FORMATION_LABEL: Record<SynthesisFormation, string> = {
  strong: "STRONGEST CLUSTER",
  emerging: "EARLY FORMATION",
  novel: "HIGH NOVELTY",
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function threadPath(sourceY: number, targetY: number, rank: number) {
  const bend = targetY - sourceY;
  const wave = ((rank % 3) - 1) * 24;
  const midY = sourceY + bend * 0.56 + wave;
  return `M 225 ${sourceY} C 382 ${sourceY}, 458 ${midY}, 606 ${midY} C 754 ${midY}, 842 ${targetY}, 968 ${targetY}`;
}

function confidenceLabel(value: number) {
  return `${Math.round(value * 100)}% CONFIDENCE`;
}

export function TodaySignalWeave({
  signals,
  initialSnapshot,
  resolveSynthesisAction,
}: TodaySignalWeaveProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const requestedRef = useRef(false);
  const [snapshot, setSnapshot] = useState<DailySynthesisSnapshot | null>(initialSnapshot);
  const [hoveredPattern, setHoveredPattern] = useState<string | null>(null);
  const [hoveredSignal, setHoveredSignal] = useState<string | null>(null);
  const [pinnedPattern, setPinnedPattern] = useState<string | null>(null);

  useEffect(() => {
    if (snapshot || !resolveSynthesisAction || requestedRef.current) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || requestedRef.current) return;
        requestedRef.current = true;
        observer.disconnect();
        void resolveSynthesisAction()
          .then((result) => {
            if (result) setSnapshot(result);
          })
          .catch(() => {});
      },
      { rootMargin: "135% 0px 135% 0px", threshold: 0 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [resolveSynthesisAction, snapshot]);

  const signalById = useMemo(
    () => new Map(signals.map((signal) => [signal.id, signal])),
    [signals]
  );

  const patternBySignal = useMemo(() => {
    const map = new Map<string, string>();
    for (const pattern of snapshot?.patterns ?? []) {
      for (const signalId of pattern.signalIds) map.set(signalId, pattern.id);
    }
    return map;
  }, [snapshot]);

  if (!snapshot) {
    return <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />;
  }

  const patterns = snapshot.patterns;
  const patternY = PATTERN_Y[patterns.length] ?? PATTERN_Y[3]!;
  const patternTop = PATTERN_TOP[patterns.length] ?? PATTERN_TOP[3]!;
  const patternIndex = new Map(patterns.map((pattern, index) => [pattern.id, index]));
  const hoveredSignalPattern = hoveredSignal ? patternBySignal.get(hoveredSignal) ?? null : null;
  const activePatternId = pinnedPattern ?? hoveredPattern ?? hoveredSignalPattern;
  const activePattern = activePatternId
    ? patterns.find((pattern) => pattern.id === activePatternId) ?? null
    : null;

  return (
    <section
      className={styles.analysis}
      aria-label="Today's signal synthesis"
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = clamp((event.clientX - rect.left) / Math.max(1, rect.width));
        const y = clamp((event.clientY - rect.top) / Math.max(1, rect.height));
        event.currentTarget.style.setProperty("--weave-mx", `${(x * 100).toFixed(2)}%`);
        event.currentTarget.style.setProperty("--weave-my", `${(y * 100).toFixed(2)}%`);
        event.currentTarget.style.setProperty("--weave-parallax-x", `${((x - 0.5) * 6).toFixed(2)}px`);
        event.currentTarget.style.setProperty("--weave-parallax-y", `${((y - 0.5) * 6).toFixed(2)}px`);
      }}
      onPointerLeave={(event) => {
        event.currentTarget.style.setProperty("--weave-mx", "52%");
        event.currentTarget.style.setProperty("--weave-my", "42%");
        event.currentTarget.style.setProperty("--weave-parallax-x", "0px");
        event.currentTarget.style.setProperty("--weave-parallax-y", "0px");
        setHoveredPattern(null);
        setHoveredSignal(null);
      }}
    >
      <div className={`${styles.ambient} ${polish.ambientParallax}`} aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />

      <header className={styles.header}>
        <div className={styles.brand}>
          <span>FR / TODAY&apos;S SYNTHESIS</span>
          <strong>
            {String(signals.length).padStart(2, "0")} SIGNALS → {String(patterns.length).padStart(2, "0")} DIRECTIONS
          </strong>
        </div>
        <div className={styles.instruction}>
          <span>MOVE THROUGH A SIGNAL</span>
          <i />
          <span>CLICK A DIRECTION TO PIN</span>
        </div>
      </header>

      <div className={styles.canvas}>
        <svg
          className={`${styles.svg} ${polish.svgParallax}`}
          viewBox="0 0 1200 720"
          role="img"
          aria-label={`${signals.length} signals weaving into ${patterns.length} emerging directions`}
        >
          <defs>
            <linearGradient id="prodWeaveSilver" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#65717d" stopOpacity="0.12" />
              <stop offset="45%" stopColor="#8aa0b6" stopOpacity="0.34" />
              <stop offset="100%" stopColor="#26313a" stopOpacity="0.56" />
            </linearGradient>
            <linearGradient id="prodWeaveBlue" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8fb4ff" stopOpacity="0.26" />
              <stop offset="100%" stopColor="#4267ff" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="prodWeaveOrange" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ffba8e" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ff6a3d" stopOpacity="0.9" />
            </linearGradient>
            <filter id="prodWeaveGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g className={styles.axis} aria-hidden="true">
            <path d="M 225 76 L 225 650" />
            <path d="M 968 112 L 968 584" />
          </g>

          {signals.map((signal, index) => {
            const targetPattern = patternBySignal.get(signal.id);
            const targetIndex = targetPattern ? patternIndex.get(targetPattern) ?? 0 : 0;
            const targetY = patternY[targetIndex] ?? patternY[0]!;
            const sourceY = SIGNAL_Y[index] ?? 112 + index * 82;
            const active = activePatternId === targetPattern;
            const dimmed = Boolean(activePatternId && !active);
            const signalActive = hoveredSignal === signal.id;
            const accent = signal.lane === "adjacent" ? styles.blue : signal.lane === "wildcard" ? styles.orange : "";
            const path = threadPath(sourceY, targetY, index);
            const threadDelay = `${-(index * 0.83 + 0.2)}s`;

            return (
              <g
                key={signal.id}
                className={`${styles.thread} ${polish.threadFx} ${accent} ${active ? styles.threadActive : ""} ${dimmed ? styles.dimmed : ""} ${signalActive ? styles.signalActive : ""}`}
                data-lane={signal.lane}
                data-active={active ? "true" : "false"}
                data-dimmed={dimmed ? "true" : "false"}
                data-signal-active={signalActive ? "true" : "false"}
                onPointerEnter={() => setHoveredSignal(signal.id)}
                onPointerLeave={() => setHoveredSignal(null)}
                onClick={() => targetPattern && setPinnedPattern((current) => current === targetPattern ? null : targetPattern)}
              >
                <path className={styles.threadGlow} d={path} />
                <path className={styles.threadRibbon} d={path} />
                <path
                  className={polish.threadSheen}
                  d={path}
                  pathLength="100"
                  style={{ "--thread-delay": threadDelay } as CSSProperties}
                />
                <path
                  className={styles.threadPulse}
                  d={path}
                  pathLength="100"
                  style={{ "--thread-delay": threadDelay } as CSSProperties}
                />
                <path className={styles.threadHit} d={path} />
              </g>
            );
          })}

          <g className={styles.hubs} aria-hidden="true">
            {patterns.map((pattern, index) => {
              const hubActive = activePatternId === pattern.id;
              return (
                <g
                  key={pattern.id}
                  className={`${styles.hub} ${polish.hubFx} ${hubActive ? styles.hubActive : ""}`}
                  data-active={hubActive ? "true" : "false"}
                  transform={`translate(968 ${patternY[index] ?? patternY[0]})`}
                >
                  <circle r="8" />
                  <circle className={`${styles.hubRing} ${polish.hubRingFix}`} r="24" />
                  <circle className={polish.hubReception} r="12" />
                </g>
              );
            })}
          </g>
        </svg>

        <div className={styles.signalLayer}>
          {signals.map((signal, index) => {
            const assignedPattern = patternBySignal.get(signal.id) ?? null;
            const dimmed = Boolean(activePatternId && assignedPattern !== activePatternId);
            const active = assignedPattern === activePatternId;
            return (
              <button
                key={signal.id}
                type="button"
                className={`${styles.signal} ${dimmed ? styles.signalDimmed : ""} ${active ? styles.signalPatternActive : ""}`}
                data-lane={signal.lane}
                style={{ "--signal-top": `${SIGNAL_TOP[index] ?? 15 + index * 11}%` } as CSSProperties}
                onPointerEnter={() => setHoveredSignal(signal.id)}
                onPointerLeave={() => setHoveredSignal(null)}
                onFocus={() => setHoveredSignal(signal.id)}
                onBlur={() => setHoveredSignal(null)}
                onClick={() => assignedPattern && setPinnedPattern((current) => current === assignedPattern ? null : assignedPattern)}
              >
                <strong>{String(signal.rank).padStart(2, "0")}</strong>
                <span>{signal.title}</span>
                {signal.lane !== "core" ? <em>{signal.lane === "adjacent" ? "ADJACENT" : "WILDCARD"}</em> : null}
              </button>
            );
          })}
        </div>

        <div className={styles.patternLayer}>
          {patterns.map((pattern, index) => {
            const dimmed = Boolean(activePatternId && activePatternId !== pattern.id);
            const selected = activePatternId === pattern.id;
            return (
              <button
                key={pattern.id}
                type="button"
                className={`${styles.pattern} ${dimmed ? styles.patternDimmed : ""} ${selected ? styles.patternActive : ""}`}
                data-formation={pattern.formation}
                style={{ "--pattern-top": `${patternTop[index] ?? 50}%` } as CSSProperties}
                aria-pressed={pinnedPattern === pattern.id}
                onPointerEnter={() => setHoveredPattern(pattern.id)}
                onPointerMove={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  const x = clamp((event.clientX - rect.left) / Math.max(1, rect.width));
                  const y = clamp((event.clientY - rect.top) / Math.max(1, rect.height));
                  event.currentTarget.style.setProperty("--pattern-sheen-x", `${(x * 100).toFixed(2)}%`);
                  event.currentTarget.style.setProperty("--pattern-sheen-y", `${(y * 100).toFixed(2)}%`);
                }}
                onPointerLeave={(event) => {
                  event.currentTarget.style.setProperty("--pattern-sheen-x", "52%");
                  event.currentTarget.style.setProperty("--pattern-sheen-y", "34%");
                  setHoveredPattern(null);
                }}
                onFocus={() => setHoveredPattern(pattern.id)}
                onBlur={() => setHoveredPattern(null)}
                onClick={() => setPinnedPattern((current) => current === pattern.id ? null : pattern.id)}
              >
                <span className={styles.patternIndex}>{String(index + 1).padStart(2, "0")}</span>
                <span className={styles.patternCopy}>
                  <small>{FORMATION_LABEL[pattern.formation]}</small>
                  <strong>{pattern.short}</strong>
                  <em>{pattern.signalIds.length} / {signals.length} · {confidenceLabel(pattern.confidence)}</em>
                </span>
                <i aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>

      <aside className={styles.readout} data-open={activePattern ? "true" : "false"} aria-live="polite">
        {activePattern ? (
          <>
            <div className={styles.readoutHead}>
              <span>{activePattern.index} / {FORMATION_LABEL[activePattern.formation]}</span>
              <button type="button" onClick={() => setPinnedPattern(null)} aria-label="Clear pinned direction">×</button>
            </div>
            <div className={`${styles.readoutMain} ${polish.readoutMainGuard}`}>
              <h2 className={polish.readoutTitleGuard}>{activePattern.title}</h2>
              <p>{activePattern.summary}</p>
            </div>
            <div className={`${styles.readoutFoot} ${polish.readoutFootGuard}`}>
              <div className={styles.evidence}>
                {activePattern.signalIds.map((signalId) => {
                  const signal = signalById.get(signalId);
                  return signal ? <span key={signalId}>{String(signal.rank).padStart(2, "0")} {signal.title}</span> : null;
                })}
              </div>
              <div className={styles.why}>
                <strong>WHY</strong>
                <span>{activePattern.why}</span>
              </div>
              <Link href="/explore">EXPLORE DIRECTION <b>↗</b></Link>
            </div>
          </>
        ) : (
          <div className={styles.readoutIdle}>
            <span>THE WEAVE IS LIVE</span>
            <strong>Follow any thread. The relationship is the analysis.</strong>
          </div>
        )}
      </aside>
    </section>
  );
}
