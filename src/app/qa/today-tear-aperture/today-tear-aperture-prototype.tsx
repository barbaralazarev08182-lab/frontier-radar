"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./today-tear-aperture.module.css";

type Lane = "core" | "adjacent" | "wildcard";

type SignalRecord = {
  rank: string;
  lane: Lane;
  topic: string;
  title: string;
  score: number;
  source: string;
  age: string;
  summary: string;
  whyNow: string;
  whyYou?: string;
  build: string;
  sourceCount: number;
  code: boolean;
  demo: boolean;
};

const SIGNALS: SignalRecord[] = [
  {
    rank: "01",
    lane: "core",
    topic: "LOCAL-FIRST",
    title: "Weyna — Local-first runtime dashboard for Node.js back ends",
    score: 75,
    source: "SHOW HN",
    age: "2H AGO",
    summary: "A local-first operations surface that keeps runtime state close to the developer instead of pushing every inspection loop into a hosted control plane.",
    whyNow: "Local-first tooling is moving from a privacy preference into infrastructure: observability, agent memory and developer control are beginning to converge in the same local runtime.",
    whyYou: "It intersects directly with developer tools, local-first systems and agent infrastructure without depending on a long-term personality claim.",
    build: "Combine local runtime telemetry, agent memory and project state into one inspectable development surface.",
    sourceCount: 3,
    code: true,
    demo: false,
  },
  {
    rank: "02",
    lane: "core",
    topic: "LICENSE-SEARCH",
    title: "A deliberately narrow business search tool",
    score: 76,
    source: "SHOW HN",
    age: "4H AGO",
    summary: "A focused search product that wins by narrowing the problem instead of adding another general-purpose discovery layer.",
    whyNow: "Narrow vertical search products are reappearing as teams look for reliable retrieval surfaces around domain-specific work instead of another generic answer engine.",
    whyYou: "The constraint is useful when evaluating where small AI tools can earn trust through deliberately limited scope.",
    build: "Turn one recurring business lookup workflow into a search surface with explicit sources, licensing boundaries and reusable saved queries.",
    sourceCount: 2,
    code: false,
    demo: true,
  },
  {
    rank: "03",
    lane: "core",
    topic: "LOCAL AUDIO",
    title: "LymeScribe — one computer on your network transcribes for the rest",
    score: 80,
    source: "SHOW HN",
    age: "5H AGO",
    summary: "A small local transcription node that makes one machine useful to the rest of a network without turning the workflow into a cloud service.",
    whyNow: "Local inference keeps becoming practical for narrow media tasks, shifting the product question from model quality to how a capability is shared across devices.",
    whyYou: "It connects multimodal models with local infrastructure and turns inference into a household or studio utility.",
    build: "Package local speech models as a network appliance with a simple queue, device discovery and private project history.",
    sourceCount: 2,
    code: true,
    demo: false,
  },
  {
    rank: "04",
    lane: "core",
    topic: "MOCK-API",
    title: "Mocktail — Free, open-source mock API server with a built-in dashboard",
    score: 81,
    source: "SHOW HN",
    age: "6H AGO",
    summary: "A self-hostable mock API server that keeps inspection and iteration close to the implementation loop.",
    whyNow: "Mocking is becoming part of agent-assisted development workflows, where fast local feedback matters more than another remote service dependency.",
    build: "Extend the mock server into an agent-aware development harness that can generate, replay and inspect API scenarios from project context.",
    sourceCount: 1,
    code: true,
    demo: false,
  },
  {
    rank: "05",
    lane: "core",
    topic: "LOCAL-FIRST",
    title: "TasmoShelf — local-first iOS / Android app for Tasmota devices",
    score: 75,
    source: "SHOW HN",
    age: "8H AGO",
    summary: "A mobile control surface for local devices that avoids making cloud identity the center of the product.",
    whyNow: "Local device software is quietly getting better as mobile clients, embedded hardware and private home networks become easier to compose.",
    whyYou: "The same local-first product grammar appears here in a different domain, making it useful as a comparison signal rather than a duplicate.",
    build: "Use the device-control pattern as a reference for a local-first control plane that can discover and orchestrate small developer services.",
    sourceCount: 2,
    code: true,
    demo: true,
  },
  {
    rank: "06",
    lane: "adjacent",
    topic: "OUTSIDE YOUR BUBBLE",
    title: "Hacker News minus the slop",
    score: 75,
    source: "SHOW HN",
    age: "11H AGO",
    summary: "A curation experiment that treats filtering quality as the product instead of adding another feed on top of the same source material.",
    whyNow: "As synthetic volume rises, discovery value increasingly comes from what a system excludes, how it explains selection and whether the filter itself can be trusted.",
    whyYou: "It is adjacent rather than core: the useful connection is the product-design question of how Frontier Radar itself should earn trust through selective curation.",
    build: "Prototype an inspectable filtering layer where every removed or promoted item can be traced back to a visible rule or evidence signal.",
    sourceCount: 3,
    code: false,
    demo: true,
  },
  {
    rank: "07",
    lane: "wildcard",
    topic: "WILDCARD",
    title: "Procedural Generated Graffiti Wall",
    score: 76,
    source: "SHOW HN",
    age: "13H AGO",
    summary: "A small procedural art system whose value is not direct product fit but the generative interaction pattern it exposes.",
    whyNow: "Generative systems become interesting again when output is shaped through rules, constraints and interaction rather than a single prompt-and-result loop.",
    whyYou: "This is intentionally outside the core profile. The useful bridge is procedural generation as an interface primitive, not graffiti as a domain interest.",
    build: "Borrow the procedural-control idea for an exploratory interface where users steer visual research spaces through constraints instead of filters alone.",
    sourceCount: 1,
    code: true,
    demo: true,
  },
];

const laneLabel: Record<Lane, string> = {
  core: "CORE SIGNAL",
  adjacent: "ADJACENT SIGNAL",
  wildcard: "WILDCARD SIGNAL",
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function TodayTearAperturePrototype() {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const shellRef = useRef<HTMLElement | null>(null);
  const [selectedRank, setSelectedRank] = useState("01");
  const [manualUntil, setManualUntil] = useState(0);

  const selected = useMemo(
    () => SIGNALS.find((signal) => signal.rank === selectedRank) ?? SIGNALS[0]!,
    [selectedRank],
  );

  useEffect(() => {
    const scroller = scrollerRef.current;
    const shell = shellRef.current;
    if (!scroller || !shell) return;

    let frame = 0;

    const update = () => {
      frame = 0;
      const travel = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
      const raw = clamp(scroller.scrollTop / travel);
      const tear = clamp(raw / 0.31);
      const focus = clamp((raw - 0.19) / 0.23);
      const settle = clamp((raw - 0.35) / 0.15);
      const weaveHint = clamp((raw - 0.86) / 0.12);

      shell.style.setProperty("--tear", tear.toFixed(4));
      shell.style.setProperty("--focus", focus.toFixed(4));
      shell.style.setProperty("--settle", settle.toFixed(4));
      shell.style.setProperty("--weave-hint", weaveHint.toFixed(4));
      shell.style.setProperty("--hero-x-1", `${(-tear * 56).toFixed(2)}vw`);
      shell.style.setProperty("--hero-x-2", `${(tear * 61).toFixed(2)}vw`);
      shell.style.setProperty("--hero-x-3", `${(-tear * 44).toFixed(2)}vw`);
      shell.style.setProperty("--hero-r-1", `${(-tear * 2.2).toFixed(2)}deg`);
      shell.style.setProperty("--hero-r-2", `${(tear * 2.8).toFixed(2)}deg`);
      shell.style.setProperty("--hero-r-3", `${(-tear * 3.4).toFixed(2)}deg`);
      shell.style.setProperty("--aperture-skew", `${(4.5 - settle * 3.2).toFixed(2)}deg`);

      if (Date.now() >= manualUntil && raw > 0.36 && raw < 0.91) {
        const local = clamp((raw - 0.36) / 0.52);
        const index = Math.min(SIGNALS.length - 1, Math.floor(local * SIGNALS.length));
        const rank = SIGNALS[index]?.rank;
        if (rank) setSelectedRank((current) => (current === rank ? current : rank));
      }
    };

    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    scroller.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      scroller.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [manualUntil]);

  function select(rank: string) {
    setSelectedRank(rank);
    setManualUntil(Date.now() + 5000);
  }

  return (
    <section
      ref={shellRef}
      className={styles.shell}
      data-today-r4="true"
      data-selected-rank={selected.rank}
      data-lane={selected.lane}
    >
      <div ref={scrollerRef} className={styles.scroller}>
        <div className={styles.track}>
          <div className={styles.stage}>
            <div className={styles.paperField} aria-hidden="true" />
            <div className={styles.crosshair} aria-hidden="true" />

            <header className={styles.meta}>
              <div>
                <strong>FR / TODAY R4</strong>
                <span>TEAR → APERTURE → WEAVE</span>
              </div>
              <div>
                <span>VISUAL PROTOTYPE</span>
                <span>FIXTURE DATA · TODAY UNCHANGED</span>
              </div>
            </header>

            <div className={styles.hero} aria-labelledby="today-r4-title">
              <p>PERSONAL FRONTIER INTELLIGENCE / DAILY RADAR</p>
              <h1 id="today-r4-title">
                <span className={styles.heroLine1}><i>FIND WHAT&apos;S NEXT</i></span>
                <span className={styles.heroLine2}><i>BEFORE IT HAS</i></span>
                <span className={styles.heroLine3}><i>A NAME.</i></span>
              </h1>
              <footer>
                <span>458 FOUND → 07 SELECTED → 01 FIELD</span>
                <span>SCROLL TO TEAR OPEN TODAY</span>
              </footer>
            </div>

            <div className={styles.tearLayer} aria-hidden="true">
              <span className={styles.tearA} />
              <span className={styles.tearB} />
              <span className={styles.tearC} />
            </div>

            <div className={styles.focusField}>
              <nav className={styles.signalFragments} aria-label="Today R4 fixture signals">
                {SIGNALS.map((signal) => (
                  <button
                    key={signal.rank}
                    type="button"
                    data-rank={signal.rank}
                    data-lane={signal.lane}
                    data-active={signal.rank === selected.rank ? "true" : "false"}
                    aria-pressed={signal.rank === selected.rank}
                    onClick={() => select(signal.rank)}
                  >
                    <b>{signal.rank}</b>
                    <span>{signal.topic}</span>
                    <em>{signal.score}</em>
                  </button>
                ))}
              </nav>

              <article key={selected.rank} className={styles.aperture} aria-live="polite">
                <div className={styles.apertureWash} aria-hidden="true" />
                <div className={styles.apertureRules} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>

                <div className={styles.apertureHeader}>
                  <div>
                    <span>{selected.rank} / {laneLabel[selected.lane]}</span>
                    <strong>{selected.topic}</strong>
                  </div>
                  <div className={styles.scoreBlock}>
                    <span>FR SCORE</span>
                    <strong>{selected.score}</strong>
                  </div>
                </div>

                <div className={styles.apertureBody}>
                  <div className={styles.primaryCopy}>
                    <h2>{selected.title}</h2>
                    <p>{selected.summary}</p>
                  </div>

                  <div className={styles.intelligenceCopy}>
                    <section className={styles.whyNow}>
                      <span>WHY NOW</span>
                      <strong>{selected.whyNow}</strong>
                    </section>
                    {selected.whyYou ? (
                      <section className={styles.whyYou}>
                        <span>WHY YOU</span>
                        <p>{selected.whyYou}</p>
                      </section>
                    ) : null}
                  </div>

                  <aside className={styles.measurements} aria-label="Signal evidence measurements">
                    <div>
                      <span>SOURCE</span>
                      <strong>{selected.source}</strong>
                      <small>{selected.age}</small>
                    </div>
                    <div>
                      <span>EVIDENCE</span>
                      <strong>{selected.sourceCount} SOURCE{selected.sourceCount === 1 ? "" : "S"}</strong>
                      <small>{selected.code ? "CODE" : "—"} / {selected.demo ? "DEMO" : "—"}</small>
                    </div>
                    <div className={styles.ruler} aria-hidden="true">
                      {Array.from({ length: 21 }, (_, index) => (
                        <i key={index} data-on={index * 5 <= selected.score ? "true" : "false"} />
                      ))}
                    </div>
                  </aside>
                </div>

                <div className={styles.buildLine}>
                  <span>BUILD DIRECTION</span>
                  <strong>{selected.build}</strong>
                </div>
              </article>
            </div>

            <div className={styles.stageReadout} aria-hidden="true">
              <span>TEAR</span>
              <b>{selected.rank}</b>
              <span>APERTURE</span>
              <i />
              <span>WEAVE</span>
            </div>

            <div className={styles.weaveHint} aria-hidden="true">
              <span>07 SIGNALS</span>
              <strong>→ SYNTHESIS</strong>
              <span>CONTINUE TO SIGNAL WEAVE</span>
            </div>
          </div>
        </div>
      </div>
      <style jsx global>{`body:has([data-today-r4="true"]) { overflow: hidden; }`}</style>
    </section>
  );
}
