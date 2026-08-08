"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type AnalysisPhase = "entry" | "agents" | "local" | "interface" | "final";

type Evidence = {
  rank: string;
  title: string;
  stat: string;
  marker?: "adjacent" | "wildcard";
};

const SIGNALS = [
  { rank: "01", title: "Memory layer for agents", cluster: "agents" },
  { rank: "02", title: "Browser-native orchestration", cluster: "agents" },
  { rank: "03", title: "Local multimodal models", cluster: "local" },
  { rank: "04", title: "Interfaces generated as motion", cluster: "interface" },
  { rank: "05", title: "Tiny inference runtimes", cluster: "agents" },
  { rank: "06", title: "Playable research instrument", cluster: "interface", marker: "ADJACENT" },
  { rank: "07", title: "Strange interface primitive", cluster: "interface", marker: "WILDCARD" },
] as const;

const AGENT_EVIDENCE: Evidence[] = [
  { rank: "01", title: "Memory layer for agents", stat: "+382%" },
  { rank: "02", title: "Browser-native orchestration", stat: "+244%" },
  { rank: "05", title: "Tiny inference runtimes", stat: "+139%" },
];

const LOCAL_EVIDENCE: Evidence[] = [
  { rank: "03", title: "Local multimodal models", stat: "+198%" },
];

const INTERFACE_EVIDENCE: Evidence[] = [
  { rank: "04", title: "Interfaces generated as motion", stat: "+171%" },
  { rank: "06", title: "Playable research instrument", stat: "+112%", marker: "adjacent" },
  { rank: "07", title: "Strange interface primitive", stat: "N98", marker: "wildcard" },
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

function phaseForProgress(progress: number): AnalysisPhase {
  if (progress < 0.13) return "entry";
  if (progress < 0.38) return "agents";
  if (progress < 0.61) return "local";
  if (progress < 0.86) return "interface";
  return "final";
}

function EvidenceList({ items }: { items: Evidence[] }) {
  return (
    <ol className="synth-evidence">
      {items.map((item) => (
        <li key={item.rank} data-marker={item.marker ?? "core"}>
          <strong>{item.rank}</strong>
          <span>{item.title}</span>
          {item.marker ? <em>{item.marker.toUpperCase()}</em> : null}
          <b>{item.stat}</b>
        </li>
      ))}
    </ol>
  );
}

export function MotionLabAnalysis() {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [phase, setPhase] = useState<AnalysisPhase>("entry");
  const sectionRef = useRef<HTMLElement | null>(null);
  const phaseRef = useRef<AnalysisPhase>("entry");

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
      if (ready && stateSpan) stateSpan.textContent = "SYNTHESIS";

      if (wasReady && !ready) {
        section.scrollTop = 0;
        phaseRef.current = "entry";
        setPhase("entry");
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
      className="motion-lab-analysis synth-analysis"
      data-phase={phase}
      aria-label="Today's synthesis analysis"
      onScroll={(event) => {
        const node = event.currentTarget;
        const travel = Math.max(1, node.scrollHeight - node.clientHeight);
        const progress = clamp(node.scrollTop / travel);
        node.style.setProperty("--synth-progress", progress.toFixed(4));
        const nextPhase = phaseForProgress(progress);
        if (nextPhase !== phaseRef.current) {
          phaseRef.current = nextPhase;
          setPhase(nextPhase);
        }
      }}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = clamp((event.clientX - rect.left) / Math.max(1, rect.width));
        const y = clamp((event.clientY - rect.top) / Math.max(1, rect.height));
        event.currentTarget.style.setProperty("--px", x.toFixed(4));
        event.currentTarget.style.setProperty("--py", y.toFixed(4));
        event.currentTarget.style.setProperty("--pdx", `${((x - 0.5) * 2).toFixed(4)}`);
        event.currentTarget.style.setProperty("--pdy", `${((y - 0.5) * 2).toFixed(4)}`);
      }}
      onPointerLeave={(event) => {
        event.currentTarget.style.setProperty("--px", ".5");
        event.currentTarget.style.setProperty("--py", ".5");
        event.currentTarget.style.setProperty("--pdx", "0");
        event.currentTarget.style.setProperty("--pdy", "0");
      }}
    >
      <div className="synth-fixed" aria-hidden="true">
        <div className="synth-fixed-grid" />
        <div className="synth-fixed-scan" />
        <div className="synth-fixed-label">
          <span>FR / ANALYSIS ENGINE</span>
          <strong>{phase === "entry" ? "07 → 03" : phase === "final" ? "TAKE / 001" : `PATTERN / ${phase === "agents" ? "01" : phase === "local" ? "02" : "03"}`}</strong>
        </div>
        <div className="synth-fixed-progress">
          <span>ENTRY</span><i /><span>01</span><i /><span>02</span><i /><span>03</span><i /><span>TAKE</span>
        </div>
      </div>

      <div className="synth-flow">
        <section className="synth-entry synth-panel" aria-labelledby="synth-entry-title">
          <div className="synth-entry-copy">
            <span className="synth-kicker">TODAY / SYNTHESIS</span>
            <h2 id="synth-entry-title"><span>07 SIGNALS.</span><span>03 DIRECTIONS.</span></h2>
            <p>Do not read today&apos;s discoveries apart. Watch the relationships become the story.</p>
          </div>

          <div className="synth-loom" aria-label="Seven signals regrouping into three directions">
            {SIGNALS.map((signal) => (
              <div key={signal.rank} className="synth-loom-row" data-cluster={signal.cluster}>
                <strong>{signal.rank}</strong>
                <span>{signal.title}</span>
                {signal.marker ? <em>{signal.marker}</em> : null}
                <i aria-hidden="true" />
              </div>
            ))}
            <div className="synth-loom-destination synth-loom-destination-agents">01</div>
            <div className="synth-loom-destination synth-loom-destination-local">02</div>
            <div className="synth-loom-destination synth-loom-destination-interface">03</div>
          </div>
        </section>

        <section className="synth-scene synth-scene-agents synth-panel" aria-labelledby="synth-agents-title">
          <div className="synth-visual synth-stack" aria-hidden="true">
            <div className="synth-stack-spine"><span>INFRASTRUCTURE</span></div>
            <div className="synth-stack-layer synth-stack-memory"><b>01</b><span>MEMORY</span><i>STATE / CONTEXT / RECALL</i></div>
            <div className="synth-stack-layer synth-stack-orchestration"><b>02</b><span>ORCHESTRATION</span><i>TOOLS / BROWSER / ACTION</i></div>
            <div className="synth-stack-layer synth-stack-runtime"><b>05</b><span>RUNTIME</span><i>EDGE / INFERENCE / EXECUTION</i></div>
            <div className="synth-stack-caption">VISIBLE FEATURES ↑<br />SYSTEM LAYER ↓</div>
          </div>

          <div className="synth-copy">
            <div className="synth-scene-meta"><span>01 / STRONGEST CLUSTER</span><strong>3 / 7 SIGNALS</strong></div>
            <h3 id="synth-agents-title">AGENTS ARE<br />MOVING DOWN<br />THE STACK.</h3>
            <p className="synth-summary">Agent innovation is shifting beneath the visible product layer — toward memory, orchestration and runtime infrastructure.</p>
            <EvidenceList items={AGENT_EVIDENCE} />
            <div className="synth-why"><span>WHY IT MATTERS</span><p>The agent layer is becoming something products build on, not another feature they bolt on.</p></div>
            <div className="synth-actions"><span>AVG MOMENTUM +255%</span><a href="/explore?pattern=agents">OPEN DIRECTION <b>↗</b></a></div>
          </div>
        </section>

        <section className="synth-scene synth-scene-local synth-panel" aria-labelledby="synth-local-title">
          <div className="synth-local-label"><span>FORMATION</span><strong>EARLY</strong><i><b /><b /><b /><b /><b /><b /><b /></i></div>

          <div className="synth-visual synth-local-core" aria-hidden="true">
            <div className="synth-latency-ring ring-1"><span>198</span></div>
            <div className="synth-latency-ring ring-2"><span>112</span></div>
            <div className="synth-latency-ring ring-3"><span>68</span></div>
            <div className="synth-latency-ring ring-4"><span>31</span></div>
            <div className="synth-core-mark"><b>03</b><span>LOCAL</span></div>
            <small>NATIVE THRESHOLD</small>
          </div>

          <div className="synth-copy">
            <div className="synth-scene-meta"><span>02 / EMERGING</span><strong>1 / 7 SIGNAL</strong></div>
            <h3 id="synth-local-title">LOCAL IS<br />BECOMING<br />NATIVE.</h3>
            <p className="synth-summary">Local multimodal latency is crossing the line from impressive demo to something that can feel normal inside a product.</p>
            <EvidenceList items={LOCAL_EVIDENCE} />
            <div className="synth-why"><span>WHY IT MATTERS</span><p>When local AI becomes immediate, trust, privacy, latency and product form all change at once.</p></div>
            <div className="synth-actions"><span>MOMENTUM +198%</span><a href="/explore?pattern=local">TRACK SIGNAL <b>↗</b></a></div>
          </div>
        </section>

        <section className="synth-scene synth-scene-interface synth-panel" aria-labelledby="synth-interface-title">
          <div className="synth-visual synth-instrument" aria-hidden="true">
            <div className="synth-membrane"><span>04</span></div>
            <div className="synth-string synth-string-06"><b>06</b><span>ADJACENT</span></div>
            <div className="synth-shard"><b>07</b><span>WILDCARD</span></div>
            <div className="synth-ripple ripple-a" />
            <div className="synth-ripple ripple-b" />
            <small>MOVE / BEND / INTERROGATE</small>
          </div>

          <div className="synth-copy">
            <div className="synth-scene-meta"><span>03 / HIGH NOVELTY</span><strong>3 / 7 SIGNALS</strong></div>
            <h3 id="synth-interface-title">INTERFACES<br />ARE BECOMING<br />INSTRUMENTS.</h3>
            <p className="synth-summary">Motion, play and unusual interaction primitives are beginning to act like product structure instead of decoration.</p>
            <EvidenceList items={INTERFACE_EVIDENCE} />
            <div className="synth-why"><span>WHY IT MATTERS</span><p>The interface is shifting from passive surface to active medium — something navigated, manipulated and felt.</p></div>
            <div className="synth-actions"><span>AVG NOVELTY 91</span><a href="/explore?pattern=interface">ENTER FIELD <b>↗</b></a></div>
          </div>
        </section>

        <section className="synth-final synth-panel" aria-labelledby="synth-final-title">
          <div className="synth-final-marks" aria-hidden="true">
            <div className="synth-final-mark mark-stack"><i /><i /><i /><span>01</span></div>
            <div className="synth-final-mark mark-core"><i /><span>02</span></div>
            <div className="synth-final-mark mark-instrument"><i /><i /><span>03</span></div>
          </div>
          <span className="synth-kicker">TODAY&apos;S TAKE / 001</span>
          <h3 id="synth-final-title">THE FRONTIER<br />IS MOVING FROM<br /><em>FEATURES</em> TO <em>SYSTEMS.</em></h3>
          <div className="synth-final-meta"><span>07 SIGNALS</span><span>03 PATTERNS</span><span>01 DAILY SYNTHESIS</span></div>
          <a className="synth-final-cta" href="/explore">EXPLORE THE FRONTIER <b>↗</b></a>
        </section>
      </div>
    </section>,
    mount,
  );
}
