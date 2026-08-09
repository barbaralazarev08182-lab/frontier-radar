"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MotionLab } from "@/components/frontier/motion-lab/motion-lab";
import { MotionLabDirectHandoff } from "@/components/frontier/motion-lab/motion-lab-direct-handoff";
import { TodaySignalWeave } from "@/components/frontier/today-signal-weave";
import type { EditorialSignal } from "@/components/frontier/today-editorial";
import type { DailySynthesisSignalInput, DailySynthesisSnapshot } from "@/lib/ai/daily-synthesis";

type ResolveSynthesisAction = () => Promise<DailySynthesisSnapshot | null>;
type SynthesisStatus = "idle" | "loading" | "ready" | "unavailable";

interface TodayMotionProductionProps {
  dateLabel: string;
  dataLabel: string;
  totalDiscoveries: number;
  signals: EditorialSignal[];
  synthesisSignals: DailySynthesisSignalInput[];
  initialSnapshot: DailySynthesisSnapshot | null;
  resolveSynthesisAction: ResolveSynthesisAction | null;
}

const SOURCE_LABEL: Record<string, string> = {
  github: "GITHUB",
  huggingface: "HUGGING FACE",
  hackernews: "SHOW HN",
  producthunt: "PRODUCT HUNT",
  arxiv: "ARXIV",
};

function topicLabel(signal: EditorialSignal) {
  if (signal.lane === "adjacent") return "OUTSIDE YOUR BUBBLE";
  if (signal.lane === "wildcard") return "WILDCARD";
  return signal.tags[0]?.toUpperCase() ?? SOURCE_LABEL[signal.source] ?? signal.source.toUpperCase();
}

function scoreLabel(score: number | null) {
  return score == null ? "--" : String(Math.round(score));
}

function SynthesisPending({
  signals,
  status,
}: {
  signals: DailySynthesisSignalInput[];
  status: Exclude<SynthesisStatus, "ready">;
}) {
  const loading = status === "loading";
  const unavailable = status === "unavailable";

  return (
    <section className="today-synthesis-state" data-state={status} aria-label="Today's synthesis status">
      <div className="today-synthesis-state-ambient" aria-hidden="true" />
      <header className="today-synthesis-state-header">
        <div>
          <span>FR / TODAY&apos;S SYNTHESIS</span>
          <strong>{String(signals.length).padStart(2, "0")} SIGNALS → ANALYSIS</strong>
        </div>
        <span>{loading ? "RESOLVING RELATIONSHIPS" : unavailable ? "SYNTHESIS UNAVAILABLE" : "SYNTHESIS STANDBY"}</span>
      </header>

      <div className="today-synthesis-state-field">
        <div className="today-synthesis-state-signals">
          {signals.map((signal) => (
            <div key={signal.id} className="today-synthesis-state-signal" data-lane={signal.lane}>
              <strong>{String(signal.rank).padStart(2, "0")}</strong>
              <span>{signal.title}</span>
              <i aria-hidden="true" />
            </div>
          ))}
        </div>

        <div className="today-synthesis-state-copy">
          <span>RELATIONSHIP FIELD / {loading ? "RESOLVING" : unavailable ? "NO RESULT" : "WAITING"}</span>
          <h2>
            {loading
              ? "THE SIGNALS ARE LOOKING FOR SHAPE."
              : unavailable
                ? "TODAY’S 7 REMAIN THE BRIEF."
                : "THE ANALYSIS IS FORMING."}
          </h2>
          <p>
            {loading
              ? "The seven selected signals are being synthesized into evidence-backed directions."
              : unavailable
                ? "No verified synthesis is available for this selection yet. The system will not invent a pattern to fill the space."
                : "The final field is ready. Verified directions will appear here as soon as synthesis begins."}
          </p>
        </div>
      </div>

      <footer className="today-synthesis-state-footer">
        <span>REAL PATTERNS ONLY</span>
        <span>NO SYNTHETIC FALLBACK</span>
      </footer>
    </section>
  );
}

export function TodayMotionProduction({
  dateLabel,
  dataLabel,
  totalDiscoveries,
  signals,
  synthesisSignals,
  initialSnapshot,
  resolveSynthesisAction,
}: TodayMotionProductionProps) {
  const [stage, setStage] = useState<HTMLElement | null>(null);
  const [snapshot, setSnapshot] = useState<DailySynthesisSnapshot | null>(initialSnapshot);
  const [synthesisStatus, setSynthesisStatus] = useState<SynthesisStatus>(initialSnapshot ? "ready" : "idle");
  const requestedRef = useRef(false);
  const analysisRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const root = document.querySelector<HTMLElement>(".motion-lab-shell");
      const nextStage = root?.querySelector<HTMLElement>(".motion-lab-stage") ?? null;
      if (root) root.dataset.production = "true";
      setStage(nextStage);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".motion-lab-shell");
    if (!root) return;
    root.dataset.production = "true";

    const liveSignals = signals.slice(0, 7);
    const cards = Array.from(root.querySelectorAll<HTMLElement>(".motion-lab-signal"));
    const cleanups: Array<() => void> = [];

    cards.forEach((card, index) => {
      const signal = liveSignals[index];
      if (!signal) {
        card.style.display = "none";
        return;
      }

      card.style.removeProperty("display");
      card.dataset.itemId = signal.id;
      card.dataset.lane = signal.lane;
      card.setAttribute("role", "link");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", `Open signal ${index + 1}: ${signal.title}`);

      const rank = String(index + 1).padStart(2, "0");
      const topic = topicLabel(signal);
      const score = scoreLabel(signal.score);
      const source = SOURCE_LABEL[signal.source] ?? signal.source.toUpperCase();

      const rankNode = card.querySelector<HTMLElement>(".motion-lab-rank");
      const topicNode = card.querySelector<HTMLElement>(".motion-lab-topic");
      const titleNode = card.querySelector<HTMLElement>("h2");
      const scoreNode = card.querySelector<HTMLElement>(".motion-lab-score strong");
      const ageNode = card.querySelector<HTMLElement>(".motion-lab-age");
      if (rankNode) rankNode.textContent = rank;
      if (topicNode) topicNode.textContent = topic;
      if (titleNode) titleNode.textContent = signal.title;
      if (scoreNode) scoreNode.textContent = score;
      if (ageNode) ageNode.textContent = source;

      const deckTop = card.querySelectorAll<HTMLElement>(".motion-lab-deck-face-top span");
      const deckBottom = card.querySelectorAll<HTMLElement>(".motion-lab-deck-face-bottom span");
      const deckRank = card.querySelector<HTMLElement>(".motion-lab-deck-face > strong");
      if (deckTop[0]) deckTop[0].textContent = "INTEL BRIEF";
      if (deckTop[1]) deckTop[1].textContent = `FR / ${score}`;
      if (deckRank) deckRank.textContent = rank;
      if (deckBottom[0]) deckBottom[0].textContent = topic;
      if (deckBottom[1]) deckBottom[1].textContent = `${source} / SIGNAL`;

      const open = () => window.open(signal.canonicalUrl, "_blank", "noopener,noreferrer");
      const onClick = (event: MouseEvent) => {
        if (event.defaultPrevented) return;
        open();
      };
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        open();
      };
      card.addEventListener("click", onClick);
      card.addEventListener("keydown", onKeyDown);
      cleanups.push(() => {
        card.removeEventListener("click", onClick);
        card.removeEventListener("keydown", onKeyDown);
      });
    });

    const metaStrong = root.querySelector<HTMLElement>(".motion-lab-meta > div:first-child strong");
    const metaCopy = root.querySelector<HTMLElement>(".motion-lab-meta > div:first-child span");
    const metaRight = root.querySelectorAll<HTMLElement>(".motion-lab-meta > div:last-child span");
    if (metaStrong) metaStrong.textContent = "FR / DAILY EDITION";
    if (metaCopy) metaCopy.textContent = "PERSONAL FRONTIER INTELLIGENCE / TODAY";
    if (metaRight[0]) metaRight[0].textContent = dateLabel;
    if (metaRight[1]) metaRight[1].textContent = dataLabel;

    const deckReadout = root.querySelector<HTMLElement>(".motion-lab-deck-readout");
    const deckReadoutSpans = deckReadout?.querySelectorAll<HTMLElement>("span");
    const deckReadoutStrong = deckReadout?.querySelector<HTMLElement>("strong");
    if (deckReadoutSpans?.[0]) deckReadoutSpans[0].textContent = `${totalDiscoveries} SCANNED`;
    if (deckReadoutStrong) deckReadoutStrong.textContent = String(liveSignals.length).padStart(2, "0");
    if (deckReadoutSpans?.[1]) deckReadoutSpans[1].textContent = "SELECTED SIGNALS";

    const heroKicker = root.querySelector<HTMLElement>(".motion-lab-hero > p");
    const heroFooter = root.querySelectorAll<HTMLElement>(".motion-lab-hero-footer span");
    if (heroKicker) heroKicker.textContent = "PERSONAL FRONTIER INTELLIGENCE / DAILY RADAR";
    if (heroFooter[0]) heroFooter[0].textContent = `${totalDiscoveries} FOUND → ${String(liveSignals.length).padStart(2, "0")} SELECTED → 01 DAILY BRIEF`;
    if (heroFooter[1]) heroFooter[1].textContent = "TEAR · COMPRESS · HOLD · RELEASE";

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      root.removeAttribute("data-production");
    };
  }, [dataLabel, dateLabel, signals, totalDiscoveries]);

  useEffect(() => {
    if (snapshot || !resolveSynthesisAction || requestedRef.current) return;
    const root = document.querySelector<HTMLElement>(".motion-lab-shell");
    const scroller = root?.querySelector<HTMLElement>(".motion-lab-scroller");
    if (!root || !scroller) return;

    let frame = 0;
    const maybeResolve = () => {
      frame = 0;
      if (requestedRef.current) return;
      const travel = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
      const progress = scroller.scrollTop / travel;
      if (progress < 0.2) return;

      requestedRef.current = true;
      setSynthesisStatus("loading");
      void resolveSynthesisAction()
        .then((result) => {
          if (result) {
            setSnapshot(result);
            setSynthesisStatus("ready");
          } else {
            setSynthesisStatus("unavailable");
          }
        })
        .catch(() => setSynthesisStatus("unavailable"));
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(maybeResolve);
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });
    maybeResolve();
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [resolveSynthesisAction, snapshot]);

  useEffect(() => {
    const node = analysisRef.current;
    if (!node) return;
    const root = node.closest<HTMLElement>(".motion-lab-shell");
    const scroller = root?.querySelector<HTMLElement>(".motion-lab-scroller");
    if (!root || !scroller) return;

    const onWheel = (event: WheelEvent) => {
      if (root.dataset.directHandoff !== "ready") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.deltaY < 0) scroller.scrollTop += event.deltaY;
    };

    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [stage]);

  return (
    <>
      <MotionLab />
      <MotionLabDirectHandoff />
      {stage
        ? createPortal(
            <div
              ref={analysisRef}
              className="motion-lab-analysis today-production-analysis"
              data-synthesis-status={synthesisStatus}
            >
              {snapshot ? (
                <TodaySignalWeave
                  signals={synthesisSignals}
                  initialSnapshot={snapshot}
                  resolveSynthesisAction={null}
                />
              ) : (
                <SynthesisPending signals={synthesisSignals} status={synthesisStatus === "ready" ? "idle" : synthesisStatus} />
              )}
            </div>,
            stage
          )
        : null}
    </>
  );
}
