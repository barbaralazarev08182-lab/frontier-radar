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
  { rank:"01", lane:"core", topic:"LOCAL-FIRST", entity:"Weyna", thesis:"Local-first runtime dashboard for Node.js back ends.", score:75, source:"SHOW HN", age:"2H AGO", summary:"A local-first operations surface that keeps runtime state close to the developer instead of pushing every inspection loop into a hosted control plane.", whyNow:"Local-first tooling is moving from a privacy preference into infrastructure: observability, agent memory and developer control are beginning to converge in the same local runtime.", whyYou:"It intersects directly with developer tools, local-first systems and agent infrastructure without depending on a long-term personality claim.", build:"Combine local runtime telemetry, agent memory and project state into one inspectable development surface.", sourceCount:3, code:true, demo:false },
  { rank:"02", lane:"core", topic:"LICENSE-SEARCH", entity:"Narrow Search", thesis:"A deliberately narrow business search tool.", score:76, source:"SHOW HN", age:"4H AGO", summary:"A focused search product that wins by narrowing the problem instead of adding another general-purpose discovery layer.", whyNow:"Narrow vertical search products are reappearing as teams look for reliable retrieval surfaces around domain-specific work instead of another generic answer engine.", whyYou:"The constraint is useful when evaluating where small AI tools can earn trust through deliberately limited scope.", build:"Turn one recurring business lookup workflow into a search surface with explicit sources, licensing boundaries and reusable saved queries.", sourceCount:2, code:false, demo:true },
  { rank:"03", lane:"core", topic:"LOCAL AUDIO", entity:"LymeScribe", thesis:"One computer on your network transcribes for the rest.", score:80, source:"SHOW HN", age:"5H AGO", summary:"A small local transcription node that makes one machine useful to the rest of a network without turning the workflow into a cloud service.", whyNow:"Local inference keeps becoming practical for narrow media tasks, shifting the product question from model quality to how a capability is shared across devices.", whyYou:"It connects multimodal models with local infrastructure and turns inference into a household or studio utility.", build:"Package local speech models as a network appliance with a simple queue, device discovery and private project history.", sourceCount:2, code:true, demo:false },
  { rank:"04", lane:"core", topic:"MOCK API", entity:"Mocktail", thesis:"Free, open-source mock API server with a built-in dashboard.", score:81, source:"SHOW HN", age:"6H AGO", summary:"A self-hostable mock API server that keeps inspection and iteration close to the implementation loop.", whyNow:"Mocking is becoming part of agent-assisted development workflows, where fast local feedback matters more than another remote service dependency.", build:"Extend the mock server into an agent-aware development harness that can generate, replay and inspect API scenarios from project context.", sourceCount:1, code:true, demo:false },
  { rank:"05", lane:"core", topic:"LOCAL-FIRST", entity:"TasmoShelf", thesis:"Local-first iOS / Android control for Tasmota devices.", score:75, source:"SHOW HN", age:"8H AGO", summary:"A mobile control surface for local devices that avoids making cloud identity the center of the product.", whyNow:"Local device software is quietly getting better as mobile clients, embedded hardware and private home networks become easier to compose.", whyYou:"The same local-first product grammar appears here in a different domain, making it useful as a comparison signal rather than a duplicate.", build:"Use the device-control pattern as a reference for a local-first control plane that can discover and orchestrate small developer services.", sourceCount:2, code:true, demo:true },
  { rank:"06", lane:"adjacent", topic:"OUTSIDE YOUR BUBBLE", entity:"HN minus the slop", thesis:"Filtering quality becomes the product, not another feed.", score:75, source:"SHOW HN", age:"11H AGO", summary:"A curation experiment that treats filtering quality as the product instead of adding another feed on top of the same source material.", whyNow:"As synthetic volume rises, discovery value increasingly comes from what a system excludes, how it explains selection and whether the filter itself can be trusted.", whyYou:"It is adjacent rather than core: the useful connection is the product-design question of how Frontier Radar itself should earn trust through selective curation.", build:"Prototype an inspectable filtering layer where every removed or promoted item can be traced back to a visible rule or evidence signal.", sourceCount:3, code:false, demo:true },
  { rank:"07", lane:"wildcard", topic:"WILDCARD", entity:"Procedural Graffiti", thesis:"A generative wall shaped by rules, constraints and interaction.", score:76, source:"SHOW HN", age:"13H AGO", summary:"A small procedural art system whose value is not direct product fit but the generative interaction pattern it exposes.", whyNow:"Generative systems become interesting again when output is shaped through rules, constraints and interaction rather than a single prompt-and-result loop.", whyYou:"This is intentionally outside the core profile. The useful bridge is procedural generation as an interface primitive, not graffiti as a domain interest.", build:"Borrow the procedural-control idea for an exploratory interface where users steer visual research spaces through constraints instead of filters alone.", sourceCount:1, code:true, demo:true },
];

const LANE_LABEL: Record<Lane,string> = { core:"CORE", adjacent:"ADJACENT", wildcard:"WILDCARD" };
const LANE_COUNTS = SIGNALS.reduce<Record<Lane, number>>((acc, signal) => {
  acc[signal.lane] += 1;
  return acc;
}, { core:0, adjacent:0, wildcard:0 });

export function TodaySignalStage() {
  const timerRef = useRef<number | null>(null);
  const [opened, setOpened] = useState(false);
  const [selectedRank, setSelectedRank] = useState("03");
  const [switching, setSwitching] = useState(false);
  const selectedIndex = useMemo(() => SIGNALS.findIndex((signal) => signal.rank === selectedRank), [selectedRank]);
  const selected = SIGNALS[selectedIndex] ?? SIGNALS[2]!;

  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      if (!opened && event.deltaY > 0) {
        event.preventDefault();
        setOpened(true);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!opened && ["ArrowDown", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        setOpened(true);
        return;
      }
      if (!opened) return;
      const key = event.key.toLowerCase();
      if (key === "j" || event.key === "ArrowDown") {
        event.preventDefault();
        choose(SIGNALS[Math.min(SIGNALS.length - 1, selectedIndex + 1)]!.rank);
      }
      if (key === "k" || event.key === "ArrowUp") {
        event.preventDefault();
        choose(SIGNALS[Math.max(0, selectedIndex - 1)]!.rank);
      }
    };
    window.addEventListener("wheel", onWheel, { passive:false });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [opened, selectedIndex]);

  function choose(rank: string) {
    if (rank === selectedRank) return;
    setSwitching(true);
    setSelectedRank(rank);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setSwitching(false), 680);
  }

  return (
    <section className="fr-stack" data-open={opened ? "true" : "false"} data-switching={switching ? "true" : "false"} data-selected-lane={selected.lane}>
      <aside className="fr-edge fr-edge-left" aria-hidden="true">
        <span className="fr-edge-kicker">DAILY / 07</span>
        <div className="fr-edge-track">
          {SIGNALS.map((signal) => <i key={signal.rank} data-active={signal.rank === selectedRank ? "true" : "false"} data-lane={signal.lane} />)}
        </div>
        <span className="fr-edge-caption">FRONTIER<br/>RADAR</span>
      </aside>

      <aside className="fr-edge fr-edge-right" aria-hidden="true">
        <div className="fr-edge-lanes">
          <span>{String(LANE_COUNTS.core).padStart(2,"0")} CORE</span>
          <span data-lane="adjacent">{String(LANE_COUNTS.adjacent).padStart(2,"0")} ADJ</span>
          <span data-lane="wildcard">{String(LANE_COUNTS.wildcard).padStart(2,"0")} WILD</span>
        </div>
        <div className="fr-edge-current">
          <b>{selected.rank}</b>
          <span>{selected.topic}</span>
          <small>{selected.source} · {selected.age}</small>
        </div>
      </aside>

      <div className="fr-stack-cover" aria-hidden={opened}>
        <div className="fr-stack-cover-copy">
          <span>FRONTIER RADAR / TODAY</span>
          <h1>FIND WHAT&apos;S NEXT<br/>BEFORE IT HAS<br/>A NAME.</h1>
          <p>Seven signals. One daily field of things worth noticing before they become obvious.</p>
        </div>
        <div className="fr-stack-cover-index" aria-hidden="true">
          {SIGNALS.map((signal) => (
            <div key={signal.rank} data-lane={signal.lane}>
              <b>{signal.rank}</b><span>{signal.entity}</span><em>{signal.topic}</em>
            </div>
          ))}
        </div>
        <div className="fr-stack-cover-foot"><span>07 SIGNALS / DAILY DISCOVERY</span><span>SCROLL TO OPEN TODAY</span></div>
      </div>

      <div className="fr-stack-live" aria-hidden={!opened}>
        <header className="fr-stack-live-head">
          <div><b>TODAY</b><span>07 SIGNALS / DAILY DISCOVERY</span></div>
          <div><span>J / K TO MOVE</span><span>CLICK A SIGNAL TO OPEN</span></div>
        </header>

        <main className="fr-stack-bands">
          {SIGNALS.map((signal) => {
            const active = signal.rank === selectedRank;
            return (
              <section className="fr-band" data-active={active ? "true" : "false"} data-lane={signal.lane} key={signal.rank}>
                <button className="fr-band-head" type="button" onClick={() => choose(signal.rank)} aria-expanded={active}>
                  <span className="fr-band-rank">{signal.rank}</span>
                  <span className="fr-band-entity">{signal.entity}</span>
                  <span className="fr-band-thesis">{signal.thesis}</span>
                  <span className="fr-band-topic">{signal.topic}</span>
                  <span className="fr-band-score">{signal.score}</span>
                </button>

                <div className="fr-band-detail" aria-hidden={!active}>
                  <div className="fr-band-primary">
                    <div className="fr-band-summary"><span>THE SIGNAL</span><p>{signal.summary}</p></div>
                    <div className="fr-band-why"><span>WHY NOW / {signal.rank}</span><p>{signal.whyNow}</p></div>
                  </div>
                  <aside className="fr-band-secondary">
                    {signal.whyYou ? <div className="fr-band-you"><span>WHY YOU</span><p>{signal.whyYou}</p></div> : null}
                    <div className="fr-band-build"><span>BUILD DIRECTION</span><p>{signal.build}</p></div>
                    <div className="fr-band-evidence">
                      <span>{LANE_LABEL[signal.lane]}</span>
                      <span>{signal.source}</span>
                      <span>{signal.sourceCount} SOURCE{signal.sourceCount === 1 ? "" : "S"}</span>
                      <span>SCORE {signal.score}</span>
                      <span>{signal.code ? "CODE" : "CODE —"}</span>
                      <span>{signal.demo ? "DEMO" : "DEMO —"}</span>
                      <span>{signal.age}</span>
                    </div>
                  </aside>
                </div>
              </section>
            );
          })}
        </main>
      </div>
    </section>
  );
}
