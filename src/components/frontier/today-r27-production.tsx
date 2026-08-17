"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import { useRouter } from "next/navigation";
import type { EditorialSignal, EditorialLane } from "@/components/frontier/today-editorial";
import { trackFeedback } from "@/lib/personalization/browser";
import { observeQualifiedDwell } from "@/lib/personalization/qualified-dwell";

type TransitionState = "idle" | "opening" | "closing";

interface TodayR27ProductionProps {
  dateLabel: string;
  dataLabel: string;
  totalDiscoveries: number;
  signals: EditorialSignal[];
}

const SOURCE_LABEL: Record<string, string> = {
  github: "GITHUB",
  huggingface: "HUGGING FACE",
  hackernews: "SHOW HN",
  producthunt: "PRODUCT HUNT",
  arxiv: "ARXIV",
};

const LANE_LABEL: Record<EditorialLane, string> = {
  core: "CORE",
  adjacent: "ADJACENT",
  wildcard: "WILDCARD",
};

const LANE_ORDER: Record<EditorialLane, number> = {
  core: 0,
  adjacent: 1,
  wildcard: 2,
};

function sourceLabel(source: string) {
  return SOURCE_LABEL[source] ?? source.toUpperCase();
}

function topicLabel(signal: EditorialSignal) {
  if (signal.lane === "adjacent") return "OUTSIDE YOUR BUBBLE";
  if (signal.lane === "wildcard") return "WILDCARD";
  return signal.tags[0]?.toUpperCase() ?? sourceLabel(signal.source);
}

function scoreLabel(score: number | null) {
  return score == null ? "--" : String(Math.round(score));
}

function thesisFrom(signal: EditorialSignal) {
  const copy = signal.summary.trim();
  if (!copy) return signal.title;
  const sentence = copy.match(/^(.+?[.!?。！？])(?:\s|$)/)?.[1] ?? copy;
  if (sentence.length <= 150) return sentence;
  return `${sentence.slice(0, 147).trimEnd()}…`;
}

function averageScore(signals: EditorialSignal[]) {
  const values = signals.map((signal) => signal.score).filter((value): value is number => typeof value === "number");
  if (values.length === 0) return "--";
  return String(Math.round(values.reduce((sum, value) => sum + value, 0) / values.length));
}

function projectPath(signal: EditorialSignal) {
  return `/project/${encodeURIComponent(signal.id)}`;
}

export function TodayR27Production({ dateLabel, dataLabel, totalDiscoveries, signals }: TodayR27ProductionProps) {
  const router = useRouter();
  const visibleSignals = useMemo(
    () => signals.slice(0, 7).sort((a, b) => LANE_ORDER[a.lane] - LANE_ORDER[b.lane]),
    [signals],
  );
  const [opened, setOpened] = useState(false);
  const [selectedRank, setSelectedRank] = useState("03");
  const [switching, setSwitching] = useState(false);
  const [transitionState, setTransitionState] = useState<TransitionState>("idle");
  const switchTimerRef = useRef<number | null>(null);
  const transitionTimerRef = useRef<number | null>(null);

  const selectedIndex = useMemo(() => {
    const index = visibleSignals.findIndex((_, signalIndex) => String(signalIndex + 1).padStart(2, "0") === selectedRank);
    return index >= 0 ? index : Math.min(2, Math.max(0, visibleSignals.length - 1));
  }, [selectedRank, visibleSignals]);
  const selectedSignal = visibleSignals[selectedIndex] ?? visibleSignals[0];

  useEffect(() => {
    if (visibleSignals.length === 0) return;
    const currentIndex = visibleSignals.findIndex((_, signalIndex) => String(signalIndex + 1).padStart(2, "0") === selectedRank);
    if (currentIndex >= 0) return;
    setSelectedRank(String(Math.min(3, visibleSignals.length)).padStart(2, "0"));
  }, [selectedRank, visibleSignals]);

  useEffect(() => {
    if (!selectedSignal) return;
    router.prefetch(projectPath(selectedSignal));
  }, [router, selectedSignal]);

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
      if (!opened || visibleSignals.length === 0) return;
      const key = event.key.toLowerCase();
      if (key === "j" || event.key === "ArrowDown") {
        event.preventDefault();
        choose(String(Math.min(visibleSignals.length, selectedIndex + 2)).padStart(2, "0"));
      }
      if (key === "k" || event.key === "ArrowUp") {
        event.preventDefault();
        choose(String(Math.max(1, selectedIndex)).padStart(2, "0"));
      }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      if (switchTimerRef.current !== null) window.clearTimeout(switchTimerRef.current);
      if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
    };
  }, [opened, selectedIndex, visibleSignals.length]);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".today-r27-production .fr-stack");
    if (!root) return;
    const bands = Array.from(root.querySelectorAll<HTMLElement>(".fr-band"));
    const cleanups: Array<() => void> = [];

    bands.forEach((band, index) => {
      const signal = visibleSignals[index];
      if (!signal) return;
      cleanups.push(observeQualifiedDwell(band, signal.id, { ...signal.metadata, rank: index + 1 }));
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [visibleSignals]);

  function finishTransition() {
    if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = window.setTimeout(() => setTransitionState("idle"), 1120);
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

  function choose(rank: string) {
    if (rank === selectedRank) return;
    setSwitching(true);
    setSelectedRank(rank);
    if (switchTimerRef.current !== null) window.clearTimeout(switchTimerRef.current);
    switchTimerRef.current = window.setTimeout(() => setSwitching(false), 700);
  }

  function openProject(signal: EditorialSignal, rank: string) {
    trackFeedback(signal.id, "open_detail", undefined, { ...signal.metadata, rank: Number(rank) });
    router.push(projectPath(signal));
  }

  function handleBandClick(event: ReactMouseEvent<HTMLButtonElement>, signal: EditorialSignal, rank: string) {
    const target = event.target instanceof Element ? event.target : null;
    const gateClicked = Boolean(target?.closest(".fr-band-gate"));
    const active = opened && rank === selectedRank;

    if (active && gateClicked) {
      event.preventDefault();
      openProject(signal, rank);
      return;
    }

    if (!opened) {
      setSelectedRank(rank);
      openToday();
      return;
    }

    choose(rank);
  }

  const selectedRankNumber = String(selectedIndex + 1).padStart(2, "0");
  const currentReadout = selectedSignal
    ? `CURRENT / ${selectedRankNumber} / ${selectedSignal.title.toUpperCase()} / ${topicLabel(selectedSignal)} / ${scoreLabel(selectedSignal.score)}`
    : "CURRENT / TODAY";
  const statsReadout = `${dataLabel} / ${String(visibleSignals.length).padStart(2, "0")} SIGNALS / ${totalDiscoveries} SCANNED / AVG ${averageScore(visibleSignals)}`;
  const rootStyle = {
    "--signal-count": Math.max(1, visibleSignals.length),
    "--collapsed-count": Math.max(0, visibleSignals.length - 1),
  } as CSSProperties;

  return (
    <div className="today-r27-production">
      <section
        className="fr-stack"
        data-open={opened ? "true" : "false"}
        data-switching={switching ? "true" : "false"}
        data-transition={transitionState}
        data-selected-lane={selectedSignal?.lane ?? "core"}
        style={rootStyle}
      >
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

        <div className="fr-stack-cover" aria-hidden={opened}>
          <div className="fr-stack-cover-copy">
            <span>FRONTIER RADAR / TODAY</span>
            <h1><span>FIND WHAT&apos;S </span><strong className="fr-cover-word-next">NEXT</strong><br/><span>BEFORE IT HAS</span><br/><span>A NAME</span><strong className="fr-cover-period">.</strong></h1>
            <p>Seven signals. One daily field of things worth noticing before they become obvious.</p>
          </div>
          <div className="fr-stack-cover-foot"><span>{String(visibleSignals.length).padStart(2, "0")} SIGNALS / DAILY DISCOVERY</span><span>{dateLabel} · SCROLL TO OPEN TODAY</span></div>
        </div>

        <div className="fr-stack-shared" aria-label="Today signal stack" data-current={currentReadout} data-stats={statsReadout}>
          <header className="fr-stack-live-head">
            <div>
              <button className="fr-stack-home" type="button" onClick={closeToday} aria-label="Back to Today cover"><span>← COVER</span><b>TODAY</b></button>
              <span>{String(visibleSignals.length).padStart(2, "0")} SIGNALS / DAILY DISCOVERY</span>
            </div>
            <div><span>J / K TO MOVE</span><span>ESC TO COVER</span><span>CLICK A SIGNAL TO OPEN</span></div>
          </header>

          <main className="fr-stack-bands">
            {visibleSignals.map((signal, index) => {
              const rank = String(index + 1).padStart(2, "0");
              const active = opened && rank === selectedRank;
              return (
                <section className="fr-band" data-active={active ? "true" : "false"} data-lane={signal.lane} key={signal.id}>
                  <button
                    className="fr-band-head"
                    type="button"
                    onMouseEnter={() => router.prefetch(projectPath(signal))}
                    onFocus={() => router.prefetch(projectPath(signal))}
                    onClick={(event) => handleBandClick(event, signal, rank)}
                    aria-expanded={active}
                  >
                    <span className="fr-band-rank">{rank}</span>
                    <span className="fr-band-entity">{signal.title}</span>
                    <span className="fr-band-thesis">{thesisFrom(signal)}</span>
                    <span className="fr-band-topic">{topicLabel(signal)}</span>
                    <span className="fr-band-tail">
                      <span className="fr-band-score">{scoreLabel(signal.score)}</span>
                      <span className="fr-band-gate"><span>{active ? "ENTER" : "OPEN"}</span><b>↗</b></span>
                    </span>
                  </button>

                  <div className="fr-band-detail" aria-hidden={!active}>
                    <div className="fr-band-summary"><span>THE SIGNAL</span><p>{signal.summary}</p></div>
                    <div className="fr-band-why"><span>{signal.whyNow ? `WHY NOW / ${rank}` : `CONTEXT / ${rank}`}</span><p>{signal.whyNow ?? signal.summary}</p></div>
                    <aside className="fr-band-secondary">
                      {signal.whyYou ? <div className="fr-band-you"><span>WHY YOU</span><p>{signal.whyYou}</p></div> : <div />}
                      {signal.buildIdea ? <div className="fr-band-build"><span>BUILD DIRECTION</span><p>{signal.buildIdea}</p></div> : null}
                      <div className="fr-band-evidence">
                        <span>{LANE_LABEL[signal.lane]}</span>
                        <span>{sourceLabel(signal.source)}</span>
                        <span>{signal.sourceCount} SOURCE{signal.sourceCount === 1 ? "" : "S"}</span>
                        <span>SCORE {scoreLabel(signal.score)}</span>
                        <span>{signal.hasCode ? "CODE" : "NO CODE"}</span>
                        <span>{signal.hasDemo ? "DEMO" : "NO DEMO"}</span>
                        {signal.metricsLabel ? <span>{signal.metricsLabel.toUpperCase()}</span> : null}
                      </div>
                    </aside>
                  </div>
                </section>
              );
            })}
          </main>
        </div>
      </section>
    </div>
  );
}