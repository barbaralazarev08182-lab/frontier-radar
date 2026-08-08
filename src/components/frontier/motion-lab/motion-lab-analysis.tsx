"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type PatternId = "agents" | "local" | "interface";

type PatternEvidence = {
  rank: string;
  title: string;
  stat: string;
  marker?: "adjacent" | "wildcard";
};

type Pattern = {
  id: PatternId;
  number: string;
  meta: string;
  title: string;
  summary: string;
  why: string;
  signal: string;
  evidence: PatternEvidence[];
};

const PATTERNS: Pattern[] = [
  {
    id: "agents",
    number: "01",
    meta: "3 / 7 SIGNALS · STRONGEST CLUSTER",
    title: "AGENTS ARE MOVING DOWN THE STACK",
    summary: "Memory, orchestration and smaller runtimes are converging into infrastructure rather than isolated features.",
    why: "Three independent signals point in the same direction: the agent layer is becoming something products build on, not something they bolt on.",
    signal: "AVG MOMENTUM +255% · 9 SOURCE HITS",
    evidence: [
      { rank: "01", title: "Memory layer for agents", stat: "+382%" },
      { rank: "02", title: "Browser-native orchestration", stat: "+244%" },
      { rank: "05", title: "Tiny inference runtimes", stat: "+139%" },
    ],
  },
  {
    id: "local",
    number: "02",
    meta: "1 / 7 SIGNAL · EARLY FORMATION",
    title: "LOCAL IS BECOMING NATIVE",
    summary: "Local multimodal latency is crossing the line from impressive demo to something that can feel normal in a product.",
    why: "This is still a narrow signal, so it should not be presented as a broad trend yet. What matters is that the usability threshold appears to be moving.",
    signal: "MOMENTUM +198% · 5 SOURCE HITS",
    evidence: [
      { rank: "03", title: "Local multimodal models", stat: "+198%" },
    ],
  },
  {
    id: "interface",
    number: "03",
    meta: "3 / 7 SIGNALS · HIGH NOVELTY",
    title: "INTERFACES ARE BECOMING INSTRUMENTS",
    summary: "Motion, play and unusual interaction primitives are beginning to act like product structure instead of decoration.",
    why: "The cluster is less mature but more novel. Two of its three signals sit outside the normal feed, which is exactly why it is useful as a frontier pattern.",
    signal: "AVG NOVELTY 91 · 8 SOURCE HITS",
    evidence: [
      { rank: "04", title: "Interfaces generated as motion", stat: "+171%" },
      { rank: "06", title: "Playable research instrument", stat: "+112%", marker: "adjacent" },
      { rank: "07", title: "Strange interface primitive", stat: "N98", marker: "wildcard" },
    ],
  },
];

const ANALYSIS_FADE_START = 0.82;
const ANALYSIS_READY_START = 0.93;

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(value: number) {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
}

export function MotionLabAnalysis() {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [hovered, setHovered] = useState<PatternId | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);

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
        alpha = smoothstep((progress - ANALYSIS_FADE_START) / (ANALYSIS_READY_START - ANALYSIS_FADE_START));
        ready = progress >= ANALYSIS_READY_START;
      }

      section.style.setProperty("--analysis-alpha", alpha.toFixed(4));
      section.dataset.ready = ready ? "true" : "false";
      root.style.setProperty("--analysis-alpha", alpha.toFixed(4));
      root.dataset.analysis = ready ? "ready" : alpha > 0.002 ? "entering" : "off";
      if (ready && stateSpan) stateSpan.textContent = "ANALYSIS";

      if (wasReady && !ready) {
        setHovered(null);
        section.scrollTop = 0;
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
      className="motion-lab-analysis"
      data-hovered={hovered ?? "none"}
      aria-label="Today's analysis brief"
    >
      <div className="motion-lab-analysis-surface">
        <div className="motion-lab-analysis-foil" aria-hidden="true" />

        <div className="motion-lab-analysis-registration" aria-hidden="true">
          <span>FRONTIER RADAR / DAILY BRIEF</span>
          <span>ISSUE 008 · SIGNAL SET 07 · SYNTHESIS 03</span>
        </div>

        <header className="motion-lab-analysis-header">
          <div className="motion-lab-analysis-kicker">TODAY / SYNTHESIS</div>
          <h2>
            <span>TODAY&apos;S</span>
            <span>ANALYSIS</span>
          </h2>
          <div className="motion-lab-analysis-intro">
            <strong>07 SELECTED SIGNALS → 03 EMERGING DIRECTIONS</strong>
            <p>What today&apos;s seven discoveries say when they are read together instead of ranked apart.</p>
          </div>
        </header>

        <div className="motion-lab-analysis-grid">
          {PATTERNS.map((pattern) => (
            <article
              key={pattern.id}
              id={`analysis-pattern-${pattern.id}`}
              className={`motion-lab-pattern motion-lab-pattern-${pattern.id}`}
              data-pattern={pattern.id}
              onPointerEnter={() => setHovered(pattern.id)}
              onPointerLeave={() => setHovered(null)}
              onFocusCapture={() => setHovered(pattern.id)}
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHovered(null);
              }}
            >
              <div className="motion-lab-pattern-number" aria-hidden="true">{pattern.number}</div>

              <div className="motion-lab-pattern-body">
                <div className="motion-lab-pattern-meta">{pattern.meta}</div>
                <h3>{pattern.title}</h3>
                <p className="motion-lab-pattern-summary">{pattern.summary}</p>

                <div className="motion-lab-pattern-why">
                  <span>WHY THIS MATTERS</span>
                  <p>{pattern.why}</p>
                </div>
              </div>

              <div className="motion-lab-pattern-evidence-panel">
                <span className="motion-lab-pattern-evidence-label">FRONTIER EVIDENCE</span>
                <ol className="motion-lab-pattern-evidence" aria-label={`Evidence for ${pattern.title}`}>
                  {pattern.evidence.map((item) => (
                    <li key={item.rank} data-marker={item.marker ?? "core"}>
                      <strong>{item.rank}</strong>
                      <span>{item.title}</span>
                      {item.marker ? <em>{item.marker.toUpperCase()}</em> : null}
                      <b>{item.stat}</b>
                    </li>
                  ))}
                </ol>

                <div className="motion-lab-pattern-actions">
                  <span className="motion-lab-pattern-signal">{pattern.signal}</span>
                  <a className="motion-lab-pattern-explore" href={`/explore?pattern=${pattern.id}`}>
                    EXPLORE DIRECTION <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>

        <footer className="motion-lab-analysis-take">
          <span>TODAY&apos;S TAKE / 001</span>
          <strong>THE FRONTIER IS MOVING<br />FROM FEATURES TO SYSTEMS.</strong>
          <div className="motion-lab-analysis-take-meta">
            <span>07 SIGNALS</span>
            <span>03 PATTERNS</span>
            <span>01 DAILY BRIEF</span>
          </div>
        </footer>
      </div>
    </section>,
    mount,
  );
}
