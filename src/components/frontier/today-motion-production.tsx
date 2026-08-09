"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MotionLab } from "@/components/frontier/motion-lab/motion-lab";
import { MotionLabDirectHandoff } from "@/components/frontier/motion-lab/motion-lab-direct-handoff";
import { TodaySignalWeave } from "@/components/frontier/today-signal-weave";
import type { EditorialSignal } from "@/components/frontier/today-editorial";
import type { DailySynthesisSignalInput, DailySynthesisSnapshot } from "@/lib/ai/daily-synthesis";

type ResolveSynthesisAction = () => Promise<DailySynthesisSnapshot | null>;

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
      void resolveSynthesisAction()
        .then((result) => {
          if (result) setSnapshot(result);
        })
        .catch(() => {});
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
    if (snapshot) return;
    const root = document.querySelector<HTMLElement>(".motion-lab-shell");
    const scroller = root?.querySelector<HTMLElement>(".motion-lab-scroller");
    if (!root || !scroller) return;

    const holdAtTodaySeven = () => {
      const travel = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
      const maxScrollTop = travel * 0.655;
      if (scroller.scrollTop > maxScrollTop) scroller.scrollTop = maxScrollTop;
    };

    scroller.addEventListener("scroll", holdAtTodaySeven, { passive: true });
    holdAtTodaySeven();
    return () => scroller.removeEventListener("scroll", holdAtTodaySeven);
  }, [snapshot]);

  useEffect(() => {
    const node = analysisRef.current;
    if (!node || !snapshot) return;
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
  }, [snapshot, stage]);

  return (
    <>
      <MotionLab />
      {snapshot ? <MotionLabDirectHandoff /> : null}
      {stage && snapshot
        ? createPortal(
            <div ref={analysisRef} className="motion-lab-analysis today-production-analysis">
              <TodaySignalWeave
                signals={synthesisSignals}
                initialSnapshot={snapshot}
                resolveSynthesisAction={null}
              />
            </div>,
            stage
          )
        : null}
    </>
  );
}
