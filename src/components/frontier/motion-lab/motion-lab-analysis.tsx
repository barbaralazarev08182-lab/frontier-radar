"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

type PatternId = "agents" | "local" | "interface";
type Marker = "ADJACENT" | "WILDCARD";

type Signal = {
  rank: string;
  title: string;
  pattern: PatternId;
  top: number;
  marker?: Marker;
};

type Pattern = {
  id: PatternId;
  index: string;
  eyebrow: string;
  title: string;
  short: string;
  summary: string;
  why: string;
  stat: string;
  top: number;
  evidence: string[];
};

type Thread = {
  rank: string;
  pattern: PatternId;
  d: string;
  accent?: "blue" | "orange";
  delay: string;
};

const SIGNALS: Signal[] = [
  { rank: "01", title: "Memory layer for agents", pattern: "agents", top: 15 },
  { rank: "02", title: "Browser-native orchestration", pattern: "agents", top: 26 },
  { rank: "03", title: "Local multimodal models", pattern: "local", top: 38 },
  { rank: "04", title: "Interfaces generated as motion", pattern: "interface", top: 50 },
  { rank: "05", title: "Tiny inference runtimes", pattern: "agents", top: 62 },
  { rank: "06", title: "Playable research instrument", pattern: "interface", top: 74, marker: "ADJACENT" },
  { rank: "07", title: "Strange interface primitive", pattern: "interface", top: 86, marker: "WILDCARD" },
];

const PATTERNS: Pattern[] = [
  {
    id: "agents",
    index: "01",
    eyebrow: "STRONGEST CLUSTER",
    title: "AGENTS ARE MOVING DOWN THE STACK",
    short: "AGENT INFRASTRUCTURE",
    summary: "Memory, orchestration and tiny runtimes are converging beneath the visible product layer.",
    why: "The agent layer is becoming infrastructure — something products build on, not another feature they bolt on.",
    stat: "3 / 7 · AVG MOMENTUM +255%",
    top: 22,
    evidence: ["01 MEMORY", "02 ORCHESTRATION", "05 RUNTIME"],
  },
  {
    id: "local",
    index: "02",
    eyebrow: "EARLY FORMATION",
    title: "LOCAL IS BECOMING NATIVE",
    short: "LOCAL / NATIVE",
    summary: "Local multimodal latency is crossing the threshold from impressive demo to immediate product behavior.",
    why: "One signal only — but if latency becomes invisible, trust, privacy and product form all change at once.",
    stat: "1 / 7 · MOMENTUM +198%",
    top: 49,
    evidence: ["03 LOCAL MULTIMODAL"],
  },
  {
    id: "interface",
    index: "03",
    eyebrow: "HIGH NOVELTY",
    title: "INTERFACES ARE BECOMING INSTRUMENTS",
    short: "INTERFACE / INSTRUMENT",
    summary: "Motion, play and strange interaction primitives are starting to behave like product structure, not decoration.",
    why: "The interface is shifting from passive surface to active medium — something navigated, manipulated and felt.",
    stat: "3 / 7 · AVG NOVELTY 91",
    top: 73,
    evidence: ["04 MOTION", "06 ADJACENT", "07 WILDCARD"],
  },
];

const THREADS: Thread[] = [
  { rank: "01", pattern: "agents", d: "M 225 112 C 385 112, 448 182, 585 198 C 728 215, 842 188, 968 188", delay: "-0.2s" },
  { rank: "02", pattern: "agents", d: "M 225 194 C 388 194, 462 202, 592 198 C 738 194, 846 188, 968 188", delay: "-1.6s" },
  { rank: "03", pattern: "local", d: "M 225 278 C 400 278, 455 338, 608 350 C 752 362, 855 348, 968 348", delay: "-2.8s" },
  { rank: "04", pattern: "interface", d: "M 225 365 C 396 365, 448 465, 598 505 C 744 544, 856 514, 968 514", delay: "-0.8s" },
  { rank: "05", pattern: "agents", d: "M 225 452 C 385 450, 438 270, 590 205 C 731 145, 851 188, 968 188", delay: "-3.7s" },
  { rank: "06", pattern: "interface", d: "M 225 535 C 398 535, 472 520, 610 516 C 756 512, 854 514, 968 514", accent: "blue", delay: "-2.1s" },
  { rank: "07", pattern: "interface", d: "M 225 618 C 364 620, 438 598, 520 548 C 674 454, 832 532, 968 514", accent: "orange", delay: "-4.4s" },
];

const ANALYSIS_FADE_START = 0.82;
const ANALYSIS_READY_START = 0.93;

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function MotionLabAnalysis() {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [hoveredPattern, setHoveredPattern] = useState<PatternId | null>(null);
  const [hoveredSignal, setHoveredSignal] = useState<string | null>(null);
  const [pinnedPattern, setPinnedPattern] = useState<PatternId | null>(null);
  const [showTake, setShowTake] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);

  const hoveredSignalPattern = hoveredSignal
    ? SIGNALS.find((signal) => signal.rank === hoveredSignal)?.pattern ?? null
    : null;
  const activePattern = pinnedPattern ?? hoveredPattern ?? hoveredSignalPattern;
  const activePatternData = activePattern ? PATTERNS.find((pattern) => pattern.id === activePattern) ?? null : null;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setMount(document.querySelector<HTMLElement>(".motion-lab-stage"));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = mount;
    const root = stage?.closest<HTMLElement>(".motion-lab-shell");
    const scroller = root?.querySelector<HTMLElement>(".motion-lab-scroller");
    const stateSpan = root?.querySelector<HTMLElement>(".motion-lab-hud dl > div:first-child dd span");
    if (!section || !root || !scroller) return;

    let frame = 0;
    let wasReady = false;

    const sync = () => {
      frame = 0;
      const mode = root.dataset.mode;
      const travel = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
      const progress = clamp(scroller.scrollTop / travel);

      let alpha = 0;
      let ready = false;

      if (mode === "topic") {
        alpha = 1;
        ready = true;
      } else if (mode === "run") {
        alpha = clamp((progress - ANALYSIS_FADE_START) / (ANALYSIS_READY_START - ANALYSIS_FADE_START));
        ready = progress >= ANALYSIS_READY_START;
      }

      section.style.setProperty("--analysis-alpha", alpha.toFixed(4));
      section.dataset.ready = ready ? "true" : "false";
      root.style.setProperty("--analysis-alpha", alpha.toFixed(4));
      root.dataset.analysis = ready ? "ready" : alpha > 0.002 ? "entering" : "off";
      if (ready && stateSpan) stateSpan.textContent = "WEAVE";

      if (wasReady && !ready) {
        section.scrollTop = 0;
        setPinnedPattern(null);
        setHoveredPattern(null);
        setHoveredSignal(null);
        setShowTake(false);
      }
      wasReady = ready;
    };

    const requestSync = () => {
      if (!frame) frame = window.requestAnimationFrame(sync);
    };

    const observer = new MutationObserver(requestSync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-mode"] });
    scroller.addEventListener("scroll", requestSync, { passive: true });
    window.addEventListener("resize", requestSync);
    sync();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      scroller.removeEventListener("scroll", requestSync);
      window.removeEventListener("resize", requestSync);
      root.style.removeProperty("--analysis-alpha");
      root.removeAttribute("data-analysis");
    };
  }, [mount]);

  if (!mount) return null;

  return createPortal(
    <section
      ref={sectionRef}
      className="motion-lab-analysis weave-analysis"
      data-active-pattern={activePattern ?? "all"}
      data-active-signal={hoveredSignal ?? "none"}
      data-take={showTake ? "true" : "false"}
      aria-label="Today's signal weave analysis"
      onScroll={(event) => {
        const node = event.currentTarget;
        const travel = Math.max(1, node.scrollHeight - node.clientHeight);
        const progress = clamp(node.scrollTop / travel);
        node.style.setProperty("--weave-scroll", progress.toFixed(4));
        setShowTake(progress > 0.58);
      }}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = clamp((event.clientX - rect.left) / Math.max(1, rect.width));
        const y = clamp((event.clientY - rect.top) / Math.max(1, rect.height));
        event.currentTarget.style.setProperty("--mx", `${(x * 100).toFixed(2)}%`);
        event.currentTarget.style.setProperty("--my", `${(y * 100).toFixed(2)}%`);
      }}
      onPointerLeave={(event) => {
        event.currentTarget.style.setProperty("--mx", "52%");
        event.currentTarget.style.setProperty("--my", "42%");
        setHoveredPattern(null);
        setHoveredSignal(null);
      }}
    >
      <div className="weave-scroll-space">
        <div className="weave-stage">
          <div className="weave-ambient" aria-hidden="true" />
          <div className="weave-grain" aria-hidden="true" />

          <header className="weave-header">
            <div className="weave-brand">
              <span>FR / TODAY&apos;S SYNTHESIS</span>
              <strong>07 SIGNALS → 03 DIRECTIONS</strong>
            </div>
            <div className="weave-instruction">
              <span>MOVE THROUGH A SIGNAL</span>
              <i />
              <span>CLICK A DIRECTION TO PIN</span>
            </div>
          </header>

          <div className="weave-canvas" aria-label="Interactive relationship map between today's seven signals and three emerging directions">
            <svg className="weave-svg" viewBox="0 0 1200 720" role="img" aria-label="Seven moving signal threads weaving into three emerging directions">
              <defs>
                <linearGradient id="weaveSilver" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#65717d" stopOpacity="0.12" />
                  <stop offset="45%" stopColor="#8aa0b6" stopOpacity="0.34" />
                  <stop offset="100%" stopColor="#26313a" stopOpacity="0.56" />
                </linearGradient>
                <linearGradient id="weaveBlue" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8fb4ff" stopOpacity="0.26" />
                  <stop offset="100%" stopColor="#4267ff" stopOpacity="0.9" />
                </linearGradient>
                <linearGradient id="weaveOrange" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ffba8e" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#ff6a3d" stopOpacity="0.9" />
                </linearGradient>
                <filter id="weaveGlow" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              <g className="weave-axis" aria-hidden="true">
                <path d="M 225 76 L 225 650" />
                <path d="M 968 112 L 968 584" />
              </g>

              {THREADS.map((thread) => (
                <g
                  key={thread.rank}
                  className="weave-thread"
                  data-pattern={thread.pattern}
                  data-signal={thread.rank}
                  data-accent={thread.accent ?? "silver"}
                  onPointerEnter={() => setHoveredSignal(thread.rank)}
                  onPointerLeave={() => setHoveredSignal(null)}
                  onClick={() => setPinnedPattern((current) => current === thread.pattern ? null : thread.pattern)}
                >
                  <path className="weave-thread-glow" d={thread.d} />
                  <path className="weave-thread-ribbon" d={thread.d} />
                  <path
                    className="weave-thread-pulse"
                    d={thread.d}
                    pathLength="100"
                    style={{ "--thread-delay": thread.delay } as CSSProperties}
                  />
                  <path className="weave-thread-hit" d={thread.d} />
                </g>
              ))}

              <g className="weave-hubs" aria-hidden="true">
                <g className="weave-hub" data-pattern="agents" transform="translate(968 188)"><circle r="8" /><circle className="weave-hub-ring" r="24" /></g>
                <g className="weave-hub" data-pattern="local" transform="translate(968 348)"><circle r="8" /><circle className="weave-hub-ring" r="24" /></g>
                <g className="weave-hub" data-pattern="interface" transform="translate(968 514)"><circle r="8" /><circle className="weave-hub-ring" r="24" /></g>
              </g>
            </svg>

            <div className="weave-signal-layer">
              {SIGNALS.map((signal) => (
                <button
                  key={signal.rank}
                  type="button"
                  className="weave-signal"
                  data-pattern={signal.pattern}
                  data-signal={signal.rank}
                  data-marker={signal.marker?.toLowerCase() ?? "core"}
                  style={{ "--signal-top": `${signal.top}%` } as CSSProperties}
                  onPointerEnter={() => setHoveredSignal(signal.rank)}
                  onPointerLeave={() => setHoveredSignal(null)}
                  onFocus={() => setHoveredSignal(signal.rank)}
                  onBlur={() => setHoveredSignal(null)}
                  onClick={() => setPinnedPattern((current) => current === signal.pattern ? null : signal.pattern)}
                >
                  <strong>{signal.rank}</strong>
                  <span>{signal.title}</span>
                  {signal.marker ? <em>{signal.marker}</em> : null}
                </button>
              ))}
            </div>

            <div className="weave-pattern-layer">
              {PATTERNS.map((pattern) => (
                <button
                  key={pattern.id}
                  type="button"
                  className="weave-pattern"
                  data-pattern={pattern.id}
                  style={{ "--pattern-top": `${pattern.top}%` } as CSSProperties}
                  aria-pressed={pinnedPattern === pattern.id}
                  onPointerEnter={() => setHoveredPattern(pattern.id)}
                  onPointerLeave={() => setHoveredPattern(null)}
                  onFocus={() => setHoveredPattern(pattern.id)}
                  onBlur={() => setHoveredPattern(null)}
                  onClick={() => setPinnedPattern((current) => current === pattern.id ? null : pattern.id)}
                >
                  <span className="weave-pattern-index">{pattern.index}</span>
                  <span className="weave-pattern-copy">
                    <small>{pattern.eyebrow}</small>
                    <strong>{pattern.short}</strong>
                    <em>{pattern.stat}</em>
                  </span>
                  <i aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>

          <aside className="weave-readout" data-open={activePatternData ? "true" : "false"} aria-live="polite">
            {activePatternData ? (
              <>
                <div className="weave-readout-head">
                  <span>{activePatternData.index} / {activePatternData.eyebrow}</span>
                  <button type="button" onClick={() => setPinnedPattern(null)} aria-label="Clear pinned direction">×</button>
                </div>
                <div className="weave-readout-main">
                  <h2>{activePatternData.title}</h2>
                  <p>{activePatternData.summary}</p>
                </div>
                <div className="weave-readout-foot">
                  <div className="weave-evidence">
                    {activePatternData.evidence.map((item) => <span key={item}>{item}</span>)}
                  </div>
                  <div className="weave-why"><strong>WHY</strong><span>{activePatternData.why}</span></div>
                  <a href={`/explore?pattern=${activePatternData.id}`}>EXPLORE DIRECTION <b>↗</b></a>
                </div>
              </>
            ) : (
              <div className="weave-readout-idle">
                <span>THE WEAVE IS LIVE</span>
                <strong>Follow any thread. The relationship is the analysis.</strong>
              </div>
            )}
          </aside>

          <div className="weave-take" aria-hidden={!showTake}>
            <span>TODAY&apos;S TAKE / 001</span>
            <strong>THE FRONTIER IS MOVING FROM FEATURES TO SYSTEMS.</strong>
            <i>07 SIGNALS / 03 PATTERNS / 01 DAILY BRIEF</i>
          </div>

          <div className="weave-scroll-cue" aria-hidden="true"><span>SCROLL TO RESOLVE</span><i /></div>
        </div>
      </div>
    </section>,
    mount,
  );
}
