"use client";

import { useMemo, useState } from "react";
import styles from "./signal-focus.module.css";

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
  metric: string;
  code: boolean;
  demo: boolean;
  crossSource: boolean;
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
    whyNow: "Local-first tooling is moving from a privacy preference into infrastructure: observability, agent memory and developer control are starting to converge in the same local runtime.",
    whyYou: "It intersects directly with developer tools, local-first systems and agent infrastructure without depending on a long-term personality claim.",
    build: "Combine local runtime telemetry, agent memory and project state into one inspectable local development surface.",
    sourceCount: 3,
    metric: "EARLY SIGNAL",
    code: true,
    demo: false,
    crossSource: true,
  },
  {
    rank: "02",
    lane: "core",
    topic: "LICENSE-SEARCH",
    title: "A deliberately narrow business search tool",
    score: 76,
    source: "SHOW HN",
    age: "4H AGO",
    summary: "A focused search product that wins by narrowing the problem rather than adding a general-purpose discovery layer.",
    whyNow: "Narrow vertical search products are reappearing as teams look for reliable retrieval surfaces around domain-specific work instead of another generic answer engine.",
    whyYou: "The product constraint is useful if you are evaluating where small AI tools can earn trust through a deliberately limited scope.",
    build: "Turn one recurring business lookup workflow into a search surface with explicit sources, licensing boundaries and reusable saved queries.",
    sourceCount: 2,
    metric: "NICHE PRODUCT",
    code: false,
    demo: true,
    crossSource: false,
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
    whyNow: "Local inference keeps becoming practical for narrow media tasks, and the interesting product question is shifting from model quality to how a capability is shared across devices.",
    whyYou: "It connects multimodal models with local infrastructure and gives a concrete example of turning inference into a household or studio utility.",
    build: "Package local speech models as a network appliance with a simple queue, device discovery and private project history.",
    sourceCount: 2,
    metric: "LOCAL INFERENCE",
    code: true,
    demo: false,
    crossSource: false,
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
    metric: "PRODUCT SIGNAL",
    code: true,
    demo: false,
    crossSource: false,
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
    whyYou: "The same local-first product grammar appears here in a very different domain, which makes it useful as a comparison signal rather than a duplicate.",
    build: "Use the device-control pattern as a reference for a local-first control plane that can discover and orchestrate small developer services.",
    sourceCount: 2,
    metric: "PATTERN MATCH",
    code: true,
    demo: true,
    crossSource: false,
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
    whyNow: "As synthetic volume rises, the value of a discovery surface increasingly comes from what it excludes, how it explains selection and whether the filter itself can be trusted.",
    whyYou: "It is adjacent rather than core: the useful connection is the product-design question of how Frontier Radar itself should earn trust through selective curation.",
    build: "Prototype an inspectable filtering layer where every removed or promoted item can be traced back to a visible rule or evidence signal.",
    sourceCount: 3,
    metric: "ADJACENT",
    code: false,
    demo: true,
    crossSource: true,
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
    whyNow: "Generative systems are becoming interesting again when the output is shaped through rules, constraints and interaction rather than a single prompt-and-result loop.",
    whyYou: "This is intentionally outside the core profile. The useful bridge is procedural generation as an interface primitive, not graffiti as a domain interest.",
    build: "Borrow the procedural-control idea for an exploratory interface where users can steer visual research spaces through constraints instead of filters alone.",
    sourceCount: 1,
    metric: "WILDCARD",
    code: true,
    demo: true,
    crossSource: false,
  },
];

function laneLabel(lane: Lane) {
  if (lane === "adjacent") return "ADJACENT";
  if (lane === "wildcard") return "WILDCARD";
  return "CORE";
}

export function SignalFocusPrototype() {
  const [selectedRank, setSelectedRank] = useState("01");
  const selected = useMemo(
    () => SIGNALS.find((signal) => signal.rank === selectedRank) ?? SIGNALS[0]!,
    [selectedRank],
  );
  const ticks = useMemo(() => Array.from({ length: 21 }, (_, index) => index * 5), []);

  return (
    <section
      className={styles.shell}
      data-signal-focus="true"
      data-selected-rank={selected.rank}
      data-lane={selected.lane}
    >
      <div className={styles.eyebrow}>
        <strong>GATE 17B-R3.1 / SIGNAL FOCUS</strong>
        <span>VISUAL PROTOTYPE · FIXTURE DATA · TODAY UNCHANGED</span>
      </div>

      <div className={styles.instrument}>
        <aside className={styles.signalIndex} aria-label="Today signal index">
          <div className={styles.indexHeader}>
            <span>TODAY / DAILY DISCOVERY</span>
            <strong>07 SIGNALS</strong>
          </div>

          <nav className={styles.indexList} aria-label="Signal Focus fixture states">
            {SIGNALS.map((signal) => (
              <button
                key={signal.rank}
                type="button"
                className={styles.indexRow}
                data-lane={signal.lane}
                data-active={signal.rank === selected.rank ? "true" : "false"}
                onClick={() => setSelectedRank(signal.rank)}
                aria-pressed={signal.rank === selected.rank}
              >
                <span className={styles.indexRank}>{signal.rank}</span>
                <span className={styles.indexText}>
                  <small>{signal.topic}</small>
                  <strong>{signal.title}</strong>
                </span>
                <span className={styles.indexScore}>{signal.score}</span>
              </button>
            ))}
          </nav>

          <div className={styles.indexFooter}>
            <span>SELECT A SIGNAL TO INSPECT</span>
            <b>01 → 07</b>
          </div>
        </aside>

        <main className={styles.focusSheet} aria-live="polite">
          <div className={styles.focusMeta}>
            <span>{selected.rank} / {laneLabel(selected.lane)} SIGNAL</span>
            <span>{selected.topic}</span>
          </div>

          <div key={`focus-${selected.rank}`} className={styles.focusContent}>
            <header className={styles.titleBlock}>
              <h1>{selected.title}</h1>
              <p>{selected.summary}</p>
            </header>

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

            <section className={styles.buildDirection}>
              <span>BUILD DIRECTION</span>
              <strong>{selected.build}</strong>
            </section>
          </div>
        </main>

        <aside className={styles.evidenceRail} aria-label="Evidence rail">
          <div key={`rail-${selected.rank}`} className={styles.railInner}>
            <div className={styles.scoreReadout}>
              <div>
                <span>FR SCORE</span>
                <strong>{selected.score}</strong>
              </div>
              <small>0–100 DISCOVERY SCORE</small>
            </div>

            <div className={styles.scoreTicks} aria-hidden="true">
              {ticks.map((tick) => (
                <i key={tick} data-on={tick <= selected.score ? "true" : "false"} />
              ))}
            </div>

            <div className={styles.railSection}>
              <span>SOURCE</span>
              <strong>{selected.source}</strong>
              <small>{selected.age}</small>
            </div>

            <div className={styles.railSection}>
              <span>EVIDENCE TRACE</span>
              <div className={styles.sourceCount} aria-label={`${selected.sourceCount} contributing sources`}>
                {Array.from({ length: selected.sourceCount }, (_, index) => (
                  <i key={index} />
                ))}
                <b>{selected.sourceCount} SOURCE{selected.sourceCount === 1 ? "" : "S"}</b>
              </div>
              <small>{selected.metric}</small>
            </div>

            <dl className={styles.capabilities}>
              <div><dt>CODE</dt><dd>{selected.code ? "YES" : "—"}</dd></div>
              <div><dt>DEMO</dt><dd>{selected.demo ? "YES" : "—"}</dd></div>
              <div><dt>CROSS-SOURCE</dt><dd>{selected.crossSource ? "YES" : "—"}</dd></div>
            </dl>

            <div className={styles.railFooter}>
              <span>{laneLabel(selected.lane)} / {selected.rank}</span>
              <b>FOCUS STATE</b>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
