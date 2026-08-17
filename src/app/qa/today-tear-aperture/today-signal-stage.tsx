"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Lane = "core" | "adjacent" | "wildcard";

type Signal = {
  rank: string;
  lane: Lane;
  topic: string;
  entity: string;
  thesis: string;
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

const SIGNALS: Signal[] = [
  {
    rank: "01", lane: "core", topic: "LOCAL-FIRST", entity: "Weyna",
    thesis: "Local-first runtime dashboard for Node.js back ends.", score: 75, source: "SHOW HN", age: "2H AGO",
    summary: "A local-first operations surface that keeps runtime state close to the developer instead of pushing every inspection loop into a hosted control plane.",
    whyNow: "Local-first tooling is moving from a privacy preference into infrastructure: observability, agent memory and developer control are beginning to converge in the same local runtime.",
    whyYou: "It intersects directly with developer tools, local-first systems and agent infrastructure without depending on a long-term personality claim.",
    build: "Combine local runtime telemetry, agent memory and project state into one inspectable development surface.", sourceCount: 3, code: true, demo: false,
  },
  {
    rank: "02", lane: "core", topic: "LICENSE-SEARCH", entity: "Narrow Search",
    thesis: "A deliberately narrow business search tool.", score: 76, source: "SHOW HN", age: "4H AGO",
    summary: "A focused search product that wins by narrowing the problem instead of adding another general-purpose discovery layer.",
    whyNow: "Narrow vertical search products are reappearing as teams look for reliable retrieval surfaces around domain-specific work instead of another generic answer engine.",
    whyYou: "The constraint is useful when evaluating where small AI tools can earn trust through deliberately limited scope.",
    build: "Turn one recurring business lookup workflow into a search surface with explicit sources, licensing boundaries and reusable saved queries.", sourceCount: 2, code: false, demo: true,
  },
  {
    rank: "03", lane: "core", topic: "LOCAL AUDIO", entity: "LymeScribe",
    thesis: "One computer on your network transcribes for the rest.", score: 80, source: "SHOW HN", age: "5H AGO",
    summary: "A small local transcription node that makes one machine useful to the rest of a network without turning the workflow into a cloud service.",
    whyNow: "Local inference keeps becoming practical for narrow media tasks, shifting the product question from model quality to how a capability is shared across devices.",
    whyYou: "It connects multimodal models with local infrastructure and turns inference into a household or studio utility.",
    build: "Package local speech models as a network appliance with a simple queue, device discovery and private project history.", sourceCount: 2, code: true, demo: false,
  },
  {
    rank: "04", lane: "core", topic: "MOCK API", entity: "Mocktail",
    thesis: "Free, open-source mock API server with a built-in dashboard.", score: 81, source: "SHOW HN", age: "6H AGO",
    summary: "A self-hostable mock API server that keeps inspection and iteration close to the implementation loop.",
    whyNow: "Mocking is becoming part of agent-assisted development workflows, where fast local feedback matters more than another remote service dependency.",
    build: "Extend the mock server into an agent-aware development harness that can generate, replay and inspect API scenarios from project context.", sourceCount: 1, code: true, demo: false,
  },
  {
    rank: "05", lane: "core", topic: "LOCAL-FIRST", entity: "TasmoShelf",
    thesis: "Local-first iOS / Android control for Tasmota devices.", score: 75, source: "SHOW HN", age: "8H AGO",
    summary: "A mobile control surface for local devices that avoids making cloud identity the center of the product.",
    whyNow: "Local device software is quietly getting better as mobile clients, embedded hardware and private home networks become easier to compose.",
    whyYou: "The same local-first product grammar appears here in a different domain, making it useful as a comparison signal rather than a duplicate.",
    build: "Use the device-control pattern as a reference for a local-first control plane that can discover and orchestrate small developer services.", sourceCount: 2, code: true, demo: true,
  },
  {
    rank: "06", lane: "adjacent", topic: "OUTSIDE YOUR BUBBLE", entity: "HN minus the slop",
    thesis: "Filtering quality becomes the product, not another feed.", score: 75, source: "SHOW HN", age: "11H AGO",
    summary: "A curation experiment that treats filtering quality as the product instead of adding another feed on top of the same source material.",
    whyNow: "As synthetic volume rises, discovery value increasingly comes from what a system excludes, how it explains selection and whether the filter itself can be trusted.",
    whyYou: "It is adjacent rather than core: the useful connection is the product-design question of how Frontier Radar itself should earn trust through selective curation.",
    build: "Prototype an inspectable filtering layer where every removed or promoted item can be traced back to a visible rule or evidence signal.", sourceCount: 3, code: false, demo: true,
  },
  {
    rank: "07", lane: "wildcard", topic: "WILDCARD", entity: "Procedural Graffiti",
    thesis: "A generative wall shaped by rules, constraints and interaction.", score: 76, source: "SHOW HN", age: "13H AGO",
    summary: "A small procedural art system whose value is not direct product fit but the generative interaction pattern it exposes.",
    whyNow: "Generative systems become interesting again when output is shaped through rules, constraints and interaction rather than a single prompt-and-result loop.",
    whyYou: "This is intentionally outside the core profile. The useful bridge is procedural generation as an interface primitive, not graffiti as a domain interest.",
    build: "Borrow the procedural-control idea for an exploratory interface where users steer visual research spaces through constraints instead of filters alone.", sourceCount: 1, code: true, demo: true,
  },
];

const LANE_LABEL: Record<Lane, string> = { core: "CORE", adjacent: "ADJACENT", wildcard: "WILDCARD" };

export function TodaySignalStage() {
  const rootRef = useRef<HTMLElement | null>(null);
  const switchTimer = useRef<number | null>(null);
  const commitTimer = useRef<number | null>(null);
  const [opened, setOpened] = useState(false);
  const [selectedRank, setSelectedRank] = useState("03");
  const [pendingRank, setPendingRank] = useState<string | null>(null);
  const [previewLane, setPreviewLane] = useState<Lane | null>(null);

  const selected = useMemo(() => SIGNALS.find((signal) => signal.rank === selectedRank) ?? SIGNALS[2]!, [selectedRank]);
  const pending = useMemo(() => SIGNALS.find((signal) => signal.rank === pendingRank) ?? null, [pendingRank]);

  useEffect(() => {
    const open = () => setOpened(true);
    const onWheel = (event: WheelEvent) => {
      if (opened || event.deltaY <= 0) return;
      event.preventDefault();
      open();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!opened && ["ArrowDown", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        open();
        return;
      }
      if (!opened) return;
      const index = SIGNALS.findIndex((signal) => signal.rank === selectedRank);
      if (event.key.toLowerCase() === "j" || event.key === "ArrowDown") {
        event.preventDefault();
        choose(SIGNALS[Math.min(SIGNALS.length - 1, index + 1)]!.rank);
      }
      if (event.key.toLowerCase() === "k" || event.key === "ArrowUp") {
        event.preventDefault();
        choose(SIGNALS[Math.max(0, index - 1)]!.rank);
      }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      if (switchTimer.current !== null) window.clearTimeout(switchTimer.current);
      if (commitTimer.current !== null) window.clearTimeout(commitTimer.current);
    };
  }, [opened, selectedRank]);

  function choose(rank: string) {
    if (rank === selectedRank || pendingRank) return;
    const next = SIGNALS.find((signal) => signal.rank === rank);
    if (!next) return;
    setPendingRank(rank);
    if (rootRef.current) rootRef.current.dataset.switching = "true";
    commitTimer.current = window.setTimeout(() => setSelectedRank(rank), 180);
    switchTimer.current = window.setTimeout(() => {
      setPendingRank(null);
      if (rootRef.current) rootRef.current.dataset.switching = "false";
    }, 620);
  }

  const fieldLane = pending?.lane ?? previewLane ?? selected.lane;

  return (
    <section
      ref={rootRef}
      className="fr-stage"
      data-open={opened ? "true" : "false"}
      data-lane={selected.lane}
      data-field-lane={fieldLane}
      data-switching="false"
    >
      <div className="fr-stage-cover" aria-hidden={opened}>
        <div className="fr-stage-cover-kicker">FRONTIER RADAR / TODAY</div>
        <h1>FIND WHAT&apos;S NEXT<br />BEFORE IT HAS<br />A NAME.</h1>
        <div className="fr-stage-cover-foot"><span>07 SIGNALS / DAILY DISCOVERY</span><span>SCROLL TO FOCUS</span></div>
      </div>

      <div className="fr-stage-live" aria-hidden={!opened}>
        <nav className="fr-stage-rail" aria-label="Today signals">
          <div className="fr-stage-rail-head">TODAY / 07</div>
          <div className="fr-stage-rail-list">
            {SIGNALS.map((signal) => (
              <button
                key={signal.rank}
                type="button"
                data-active={signal.rank === selected.rank ? "true" : "false"}
                data-lane={signal.lane}
                onMouseEnter={() => setPreviewLane(signal.lane)}
                onMouseLeave={() => setPreviewLane(null)}
                onFocus={() => setPreviewLane(signal.lane)}
                onBlur={() => setPreviewLane(null)}
                onClick={() => choose(signal.rank)}
                aria-pressed={signal.rank === selected.rank}
              >
                <b>{signal.rank}</b><span>{signal.topic}</span>
              </button>
            ))}
          </div>
          <div className="fr-stage-rail-foot">J / K TO MOVE<br />ONE SIGNAL AT A TIME</div>
        </nav>

        <main className="fr-stage-main">
          <div className="fr-stage-edition"><span>DAILY DISCOVERY</span><span>{selected.rank} / {LANE_LABEL[selected.lane]}</span></div>

          <article key={selected.rank} className="fr-stage-story">
            <header className="fr-stage-story-head">
              <p>{selected.topic}</p>
              <h2>{selected.entity}</h2>
              <h3>{selected.thesis}</h3>
              <p className="fr-stage-summary">{selected.summary}</p>
            </header>

            <section className="fr-stage-why">
              <div className="fr-stage-why-label">WHY NOW / {selected.rank}</div>
              <p>{selected.whyNow}</p>
            </section>

            {selected.whyYou ? (
              <details className="fr-stage-personal">
                <summary>FOR YOU ↗</summary>
                <p>{selected.whyYou}</p>
              </details>
            ) : null}
          </article>
        </main>

        <aside className="fr-stage-field" aria-label={`${LANE_LABEL[fieldLane]} lane`}>
          <div className="fr-stage-field-rank">{pending?.rank ?? selected.rank}</div>
          <div className="fr-stage-field-label">{LANE_LABEL[fieldLane]}<br />SIGNAL</div>
          <div className="fr-stage-field-pulse" aria-hidden="true" />
        </aside>

        <footer className="fr-stage-folio">
          <div className="fr-stage-build"><span>BUILD →</span><strong>{selected.build}</strong></div>
          <div className="fr-stage-evidence">
            <span>{selected.source}</span>
            <span>{selected.sourceCount} SOURCE{selected.sourceCount === 1 ? "" : "S"}</span>
            <span>SCORE {selected.score}</span>
            <span>{selected.code ? "CODE" : "CODE —"}</span>
            <span>{selected.demo ? "DEMO" : "DEMO —"}</span>
            <span>{selected.age}</span>
          </div>
        </footer>

        <div className="fr-stage-flash" aria-hidden="true" />
      </div>
    </section>
  );
}
