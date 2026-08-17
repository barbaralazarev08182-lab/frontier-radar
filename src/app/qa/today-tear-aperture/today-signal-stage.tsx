"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Lane = "core" | "adjacent" | "wildcard";
type TransitionState = "idle" | "opening" | "closing";
type Signal = { rank:string; lane:Lane; topic:string; entity:string; thesis:string; score:number; source:string; age:string; summary:string; whyNow:string; whyYou?:string; build:string; sourceCount:number; code:boolean; demo:boolean };

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

export function TodaySignalStage() {
  const switchTimerRef = useRef<number | null>(null);
  const transitionTimerRef = useRef<number | null>(null);
  const [opened, setOpened] = useState(false);
  const [selectedRank, setSelectedRank] = useState("03");
  const [switching, setSwitching] = useState(false);
  const [transitionState, setTransitionState] = useState<TransitionState>("idle");
  const selectedIndex = useMemo(() => SIGNALS.findIndex((signal) => signal.rank === selectedRank), [selectedRank]);
  const selectedSignal = SIGNALS[selectedIndex] ?? SIGNALS[2]!;

  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      if (!opened && event.deltaY > 0) {
        event.preventDefault();
        openToday();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!opened && ["ArrowDown", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        openToday();
        return;
      }
      if (opened && event.key === "Escape") {
        event.preventDefault();
        closeToday();
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
      if (switchTimerRef.current !== null) window.clearTimeout(switchTimerRef.current);
      if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
    };
  }, [opened, selectedIndex]);

  function finishTransition() {
    if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = window.setTimeout(() => setTransitionState("idle"), 1080);
  }

  function openToday() {
    if (opened) return;
    setTransitionState("opening");
    setOpened(true);
    finishTransition();
  }

  function closeToday() {
    if (!opened) return;
    setTransitionState("closing");
    setOpened(false);
    finishTransition();
  }

  function choose(rank:string) {
    if (rank === selectedRank) return;
    setSwitching(true);
    setSelectedRank(rank);
    if (switchTimerRef.current !== null) window.clearTimeout(switchTimerRef.current);
    switchTimerRef.current = window.setTimeout(() => setSwitching(false), 700);
  }

  return (
    <section className="fr-stack" data-open={opened ? "true" : "false"} data-switching={switching ? "true" : "false"} data-transition={transitionState} data-selected-lane={selectedSignal.lane}>
      <div className="fr-stack-atmosphere" aria-hidden="true">
        <svg viewBox="0 0 1600 900" preserveAspectRatio="none">
          <g className="fr-stack-atmosphere__left">
            <path className="fr-stack-atmosphere__wire fr-stack-atmosphere__wire--major" d="M-120 790 C 40 510, 210 410, 430 430 C 610 448, 688 576, 748 770" />
            <path className="fr-stack-atmosphere__wire" d="M-90 850 C 88 548, 260 482, 445 505 C 590 523, 680 625, 720 846" />
            <path className="fr-stack-atmosphere__construction" d="M170 354 L170 720 M118 622 L262 622 M170 622 L282 522" />
            <circle className="fr-stack-atmosphere__node" cx="170" cy="622" r="4" />
            <circle className="fr-stack-atmosphere__node" cx="282" cy="522" r="3" />
            <circle className="fr-stack-atmosphere__node" cx="348" cy="690" r="4" />
          </g>

          <g className="fr-stack-atmosphere__orbit">
            <ellipse className="fr-stack-atmosphere__orbit-line" cx="1170" cy="250" rx="390" ry="205" />
            <ellipse className="fr-stack-atmosphere__orbit-line" cx="1170" cy="250" rx="305" ry="154" />
            <ellipse className="fr-stack-atmosphere__orbit-line" cx="1170" cy="250" rx="220" ry="106" />
            <ellipse className="fr-stack-atmosphere__orbit-line" cx="1170" cy="250" rx="138" ry="64" />
            <path className="fr-stack-atmosphere__trace" pathLength="1" d="M820 250 C 925 160, 1040 126, 1170 145 C 1300 164, 1408 232, 1505 356" />
            <circle className="fr-stack-atmosphere__beacon" cx="1417" cy="292" r="4.2" />
            <circle className="fr-stack-atmosphere__node" cx="1306" cy="206" r="2.6" />
            <circle className="fr-stack-atmosphere__node" cx="1016" cy="176" r="2.6" />
          </g>

          <g className="fr-stack-atmosphere__calibration">
            <path d="M1450 120 h72 M1486 84 v72 M88 390 h46 M111 367 v46" />
            <path d="M930 688 h58 M959 659 v58" />
          </g>

          <g className="fr-stack-atmosphere__ticks">
            {Array.from({ length: 9 }).map((_, index) => <line key={`l-${index}`} x1={24 + index * 13} y1={510} x2={24 + index * 13} y2={index % 3 === 0 ? 531 : 522} />)}
            {Array.from({ length: 8 }).map((_, index) => <line key={`r-${index}`} x1={1540} y1={590 + index * 17} x2={index % 3 === 0 ? 1562 : 1553} y2={590 + index * 17} />)}
          </g>
        </svg>
      </div>

      <div className="fr-cover-transition" data-state={transitionState} aria-hidden="true">
        {SIGNALS.map((signal) => <i key={signal.rank} data-lane={signal.lane} />)}
      </div>

      <div className="fr-stack-cover" aria-hidden={opened}>
        <div className="fr-stack-cover-copy">
          <span>FRONTIER RADAR / TODAY</span>
          <h1><span>FIND WHAT&apos;S </span><strong className="fr-cover-word-next">NEXT</strong><br/><span>BEFORE IT HAS</span><br/><span>A NAME</span><strong className="fr-cover-period">.</strong></h1>
          <p>Seven signals. One daily field of things worth noticing before they become obvious.</p>
        </div>
        <div className="fr-stack-cover-index" aria-hidden="true">
          {SIGNALS.map((signal) => (
            <div key={signal.rank} data-lane={signal.lane}>
              <b>{signal.rank}</b><span>{signal.entity}</span><em>{signal.topic}</em><i />
            </div>
          ))}
        </div>
        <div className="fr-stack-cover-foot"><span>07 SIGNALS / DAILY DISCOVERY</span><span>SCROLL TO OPEN TODAY</span></div>
      </div>

      <div className="fr-stack-live" aria-hidden={!opened}>
        <header className="fr-stack-live-head">
          <div>
            <button className="fr-stack-home" type="button" onClick={closeToday} aria-label="Back to Today cover"><span>← COVER</span><b>TODAY</b></button>
            <span>07 SIGNALS / DAILY DISCOVERY</span>
          </div>
          <div><span>J / K TO MOVE</span><span>ESC TO COVER</span><span>CLICK A SIGNAL TO OPEN</span></div>
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
                  <span className="fr-band-tail">
                    <span className="fr-band-score">{signal.score}</span>
                    <span className="fr-band-gate" aria-hidden="true"><span>{active ? "ACTIVE" : "OPEN"}</span><b>{active ? "—" : "↗"}</b></span>
                  </span>
                </button>

                <div className="fr-band-detail" aria-hidden={!active}>
                  <div className="fr-band-summary"><span>THE SIGNAL</span><p>{signal.summary}</p></div>
                  <div className="fr-band-why"><span>WHY NOW / {signal.rank}</span><p>{signal.whyNow}</p></div>
                  <aside className="fr-band-secondary">
                    {signal.whyYou ? <div className="fr-band-you"><span>WHY YOU</span><p>{signal.whyYou}</p></div> : null}
                    <div className="fr-band-build"><span>BUILD DIRECTION</span><p>{signal.build}</p></div>
                    <div className="fr-band-evidence">
                      <span>{LANE_LABEL[signal.lane]}</span><span>{signal.source}</span><span>{signal.sourceCount} SOURCE{signal.sourceCount === 1 ? "" : "S"}</span><span>SCORE {signal.score}</span><span>{signal.code ? "CODE" : "CODE —"}</span><span>{signal.demo ? "DEMO" : "DEMO —"}</span><span>{signal.age}</span>
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
