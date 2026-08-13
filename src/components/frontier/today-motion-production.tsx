"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MotionLab } from "@/components/frontier/motion-lab/motion-lab";
import { MotionLabDirectHandoff } from "@/components/frontier/motion-lab/motion-lab-direct-handoff";
import { TodaySignalWeave } from "@/components/frontier/today-signal-weave";
import { TodayStageScrollController } from "@/components/frontier/today-stage-scroll-controller";
import type { EditorialSignal } from "@/components/frontier/today-editorial";
import type { DailySynthesisSignalInput, DailySynthesisSnapshot } from "@/lib/ai/daily-synthesis";
import { trackFeedback } from "@/lib/personalization/browser";
import { observeQualifiedDwell } from "@/lib/personalization/qualified-dwell";

type ResolveSynthesisAction = () => Promise<DailySynthesisSnapshot | null>;
type LoadSynthesisAction = () => Promise<DailySynthesisSnapshot | null>;

interface TodayMotionProductionProps {
  dateLabel: string;
  dataLabel: string;
  totalDiscoveries: number;
  signals: EditorialSignal[];
  synthesisSignals: DailySynthesisSignalInput[];
  initialSnapshot: DailySynthesisSnapshot | null;
  resolveSynthesisAction: ResolveSynthesisAction | null;
  loadSynthesisAction: LoadSynthesisAction | null;
}

const SOURCE_LABEL: Record<string, string> = {
  github: "GITHUB",
  huggingface: "HUGGING FACE",
  hackernews: "SHOW HN",
  producthunt: "PRODUCT HUNT",
  arxiv: "ARXIV",
};

const SYNTHESIS_POLL_INTERVAL_MS = 2_500;
const SYNTHESIS_POLL_WINDOW_MS = 120_000;
const SYNTHESIS_GENERATION_RETRY_DELAY_MS = 12_000;
const SYNTHESIS_MAX_GENERATION_ATTEMPTS = 2;
const SYNTHESIS_WARMUP_SCROLL_PROGRESS = 0;

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
  loadSynthesisAction,
}: TodayMotionProductionProps) {
  const [stage, setStage] = useState<HTMLElement | null>(null);
  const [snapshot, setSnapshot] = useState<DailySynthesisSnapshot | null>(initialSnapshot);
  const [synthesisUnavailable, setSynthesisUnavailable] = useState(false);
  const requestedRef = useRef(false);

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

      const open = () => {
        trackFeedback(signal.id, "open_detail", undefined, signal.metadata);
        window.location.assign(`/project/${encodeURIComponent(signal.id)}`);
      };
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
      const stopDwell = observeQualifiedDwell(card, signal.id, signal.metadata);
      cleanups.push(() => {
        card.removeEventListener("click", onClick);
        card.removeEventListener("keydown", onKeyDown);
        stopDwell();
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
    if (snapshot || (!resolveSynthesisAction && !loadSynthesisAction)) return;
    const root = document.querySelector<HTMLElement>(".motion-lab-shell");
    const scroller = root?.querySelector<HTMLElement>(".motion-lab-scroller");
    if (!root || !scroller) return;

    let frame = 0;
    let generationRetryTimer = 0;
    let pollTimer = 0;
    let generationAttempts = 0;
    let pollStartedAt = 0;
    let started = false;
    let disposed = false;

    const markUnavailable = () => {
      if (!disposed) setSynthesisUnavailable(true);
    };

    const schedulePoll = () => {
      if (disposed || !loadSynthesisAction) return;
      if (Date.now() - pollStartedAt >= SYNTHESIS_POLL_WINDOW_MS) {
        if (!resolveSynthesisAction || generationAttempts >= SYNTHESIS_MAX_GENERATION_ATTEMPTS) {
          markUnavailable();
        }
        return;
      }
      window.clearTimeout(pollTimer);
      pollTimer = window.setTimeout(pollPersistedSnapshot, SYNTHESIS_POLL_INTERVAL_MS);
    };

    const pollPersistedSnapshot = () => {
      if (disposed || !loadSynthesisAction) return;
      void loadSynthesisAction()
        .then((result) => {
          if (disposed) return;
          if (result) {
            setSynthesisUnavailable(false);
            setSnapshot(result);
            return;
          }
          schedulePoll();
        })
        .catch(() => {
          if (!disposed) schedulePoll();
        });
    };

    const launchGeneration = () => {
      if (
        disposed ||
        !resolveSynthesisAction ||
        requestedRef.current ||
        generationAttempts >= SYNTHESIS_MAX_GENERATION_ATTEMPTS
      ) {
        return;
      }

      requestedRef.current = true;
      generationAttempts += 1;

      void resolveSynthesisAction()
        .then((result) => {
          if (disposed) return;
          requestedRef.current = false;
          if (result) {
            setSynthesisUnavailable(false);
            setSnapshot(result);
            return;
          }

          if (generationAttempts < SYNTHESIS_MAX_GENERATION_ATTEMPTS) {
            window.clearTimeout(generationRetryTimer);
            generationRetryTimer = window.setTimeout(
              launchGeneration,
              SYNTHESIS_GENERATION_RETRY_DELAY_MS
            );
            return;
          }

          markUnavailable();
        })
        .catch(() => {
          if (disposed) return;
          requestedRef.current = false;
          if (generationAttempts < SYNTHESIS_MAX_GENERATION_ATTEMPTS) {
            window.clearTimeout(generationRetryTimer);
            generationRetryTimer = window.setTimeout(
              launchGeneration,
              SYNTHESIS_GENERATION_RETRY_DELAY_MS
            );
            return;
          }

          markUnavailable();
        });
    };

    const maybeStart = () => {
      frame = 0;
      if (disposed || started) return;

      const travel = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
      const progress = scroller.scrollTop / travel;
      if (progress < SYNTHESIS_WARMUP_SCROLL_PROGRESS) return;

      started = true;
      pollStartedAt = Date.now();
      pollPersistedSnapshot();
      launchGeneration();
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(maybeStart);
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });
    maybeStart();
    return () => {
      disposed = true;
      requestedRef.current = false;
      scroller.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      window.clearTimeout(generationRetryTimer);
      window.clearTimeout(pollTimer);
    };
  }, [loadSynthesisAction, resolveSynthesisAction, snapshot]);

  const synthesisActionsDisabled = !resolveSynthesisAction && !loadSynthesisAction;
  const canEnterWeave = Boolean(snapshot) || synthesisUnavailable || synthesisActionsDisabled;

  return (
    <>
      <MotionLab />
      <TodayStageScrollController canEnterWeave={canEnterWeave} />
      <MotionLabDirectHandoff />
      {stage
        ? createPortal(
            <div className="motion-lab-analysis today-production-analysis">
              {snapshot ? (
                <TodaySignalWeave
                  signals={synthesisSignals}
                  initialSnapshot={snapshot}
                  resolveSynthesisAction={null}
                />
              ) : synthesisUnavailable ? (
                <section
                  className="today-synthesis-pending"
                  data-synthesis-state="unavailable"
                  aria-live="polite"
                >
                  <div className="today-synthesis-pending-grid" aria-hidden="true" />
                  <div className="today-synthesis-pending-copy">
                    <span>FR / TODAY&apos;S SYNTHESIS</span>
                    <strong>SYNTHESIS UNAVAILABLE</strong>
                    <p>Today&apos;s 7 remain the record. Open any signal to investigate it; synthesis can retry on a later visit.</p>
                  </div>
                </section>
              ) : (
                <section
                  className="today-synthesis-pending"
                  data-synthesis-state="pending"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <div className="today-synthesis-pending-grid" aria-hidden="true" />
                  <div className="today-synthesis-pending-copy">
                    <span>FR / TODAY&apos;S SYNTHESIS</span>
                    <strong>{String(synthesisSignals.length).padStart(2, "0")} SIGNALS → SYNTHESIS</strong>
                    <p>Preparing today&apos;s signal relationships…</p>
                  </div>
                </section>
              )}
            </div>,
            stage
          )
        : null}
    </>
  );
}
