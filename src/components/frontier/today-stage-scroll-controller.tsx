"use client";

import { useEffect, useRef } from "react";

const HERO_FREE_END = 0.275;
const HERO_RETURN = 0.255;
const COMPRESSION_STAGE = 0.350;
const TODAY_STAGE = 0.620;
const WEAVE_STAGE = 0.860;
const HERO_APPROACH = 0.018;
const WEAVE_APPROACH = 0.014;
const STAGE_EPSILON = 0.012;
const WHEEL_THRESHOLD = 28;
const GESTURE_END_MS = 260;
const POST_SNAP_COOLDOWN_MS = 190;
const SNAP_DURATION_MS = 820;

type ScrollStage = "hero" | "compression" | "today" | "weave";

interface SnapTarget {
  progress: number;
  stage: ScrollStage;
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function cinematicEase(value: number) {
  const x = clamp(value);
  let t = x;

  // Solve cubic-bezier(.16, 1, .3, 1) for the supplied time value.
  for (let index = 0; index < 6; index += 1) {
    const inverse = 1 - t;
    const sampledX = 3 * inverse * inverse * t * 0.16 + 3 * inverse * t * t * 0.3 + t * t * t;
    const slope = 3 * inverse * inverse * 0.16 + 6 * inverse * t * (0.3 - 0.16) + 3 * t * t * (1 - 0.3);
    if (Math.abs(slope) < 0.0001) break;
    t = clamp(t - (sampledX - x) / slope);
  }

  const inverse = 1 - t;
  return 3 * inverse * inverse * t + 3 * inverse * t * t + t * t * t;
}

function normalizedDelta(event: WheelEvent) {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * window.innerHeight;
  return event.deltaY;
}

interface TodayStageScrollControllerProps {
  canEnterWeave: boolean;
}

export function TodayStageScrollController({ canEnterWeave }: TodayStageScrollControllerProps) {
  const canEnterWeaveRef = useRef(canEnterWeave);
  const pendingWeaveIntentRef = useRef(false);
  const snapToWeaveRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const wasReady = canEnterWeaveRef.current;
    canEnterWeaveRef.current = canEnterWeave;
    if (wasReady || !canEnterWeave) return;

    const root = document.querySelector<HTMLElement>(".motion-lab-shell");
    const scroller = root?.querySelector<HTMLElement>(".motion-lab-scroller");
    if (!root || !scroller) return;

    if (root.dataset.scrollStage !== "today") {
      pendingWeaveIntentRef.current = false;
      root.removeAttribute("data-weave-intent");
      return;
    }

    // Mounting the resolved Weave can change the scroller's total height.
    // If the user already tried to enter Weave, honor that blocked intent as
    // soon as readiness arrives. Otherwise preserve the existing Today frame.
    const frame = window.requestAnimationFrame(() => {
      if (pendingWeaveIntentRef.current && snapToWeaveRef.current) {
        pendingWeaveIntentRef.current = false;
        root.removeAttribute("data-weave-intent");
        snapToWeaveRef.current();
        return;
      }

      const travel = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
      scroller.scrollTop = TODAY_STAGE * travel;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [canEnterWeave]);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".motion-lab-shell");
    const scroller = root?.querySelector<HTMLElement>(".motion-lab-scroller");
    if (!root || !scroller) return;

    let accumulated = 0;
    let accumulatedDirection: 1 | -1 | 0 = 0;
    let animationFrame = 0;
    let animationActive = false;
    let gestureArmed = true;
    let releaseTimer = 0;
    let lastWheelAt = 0;
    let cooldownUntil = 0;
    let currentStage: ScrollStage = "hero";

    const clearWeaveIntent = () => {
      pendingWeaveIntentRef.current = false;
      root.removeAttribute("data-weave-intent");
    };

    const progress = () => {
      const travel = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
      return clamp(scroller.scrollTop / travel);
    };

    const setStage = (stage: ScrollStage) => {
      currentStage = stage;
      root.dataset.scrollStage = stage;
      if (stage !== "today") clearWeaveIntent();
    };

    const stageForProgress = (current: number): ScrollStage => {
      if (canEnterWeaveRef.current && current >= WEAVE_STAGE - STAGE_EPSILON) return "weave";
      if (current >= TODAY_STAGE - STAGE_EPSILON) return "today";
      if (current >= COMPRESSION_STAGE - STAGE_EPSILON) return "compression";
      return "hero";
    };

    const resetIntent = () => {
      accumulated = 0;
      accumulatedDirection = 0;
    };

    const scheduleRearm = () => {
      window.clearTimeout(releaseTimer);
      const now = performance.now();
      const quietUntil = lastWheelAt + GESTURE_END_MS;
      const wait = Math.max(quietUntil, cooldownUntil) - now;

      if (animationActive || wait > 0) {
        releaseTimer = window.setTimeout(scheduleRearm, Math.max(16, wait));
        return;
      }

      resetIntent();
      gestureArmed = true;
    };

    const noteWheel = () => {
      lastWheelAt = performance.now();
      scheduleRearm();
    };

    const targetFor = (direction: 1 | -1): SnapTarget | null => {
      if (currentStage === "hero") {
        return direction > 0
          ? { progress: COMPRESSION_STAGE, stage: "compression" }
          : null;
      }

      if (currentStage === "compression") {
        return direction > 0
          ? { progress: TODAY_STAGE, stage: "today" }
          : { progress: HERO_RETURN, stage: "hero" };
      }

      if (currentStage === "today") {
        if (direction < 0) return { progress: COMPRESSION_STAGE, stage: "compression" };
        return canEnterWeaveRef.current
          ? { progress: WEAVE_STAGE, stage: "weave" }
          : null;
      }

      return direction < 0
        ? { progress: TODAY_STAGE, stage: "today" }
        : null;
    };

    const animateTo = (target: SnapTarget) => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      const travel = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
      const from = scroller.scrollTop;
      const to = clamp(target.progress) * travel;
      const distance = to - from;
      const started = performance.now();

      animationActive = true;
      gestureArmed = false;
      resetIntent();
      root.dataset.stageSnap = "moving";

      const tick = (now: number) => {
        const elapsed = clamp((now - started) / SNAP_DURATION_MS);
        scroller.scrollTop = from + distance * cinematicEase(elapsed);

        if (elapsed < 1) {
          animationFrame = window.requestAnimationFrame(tick);
          return;
        }

        animationFrame = 0;
        animationActive = false;
        scroller.scrollTop = to;
        cooldownUntil = performance.now() + POST_SNAP_COOLDOWN_MS;
        root.dataset.stageSnap = "idle";
        setStage(target.stage);
        scheduleRearm();
      };

      animationFrame = window.requestAnimationFrame(tick);
    };

    snapToWeaveRef.current = () => {
      if (currentStage !== "today" || !canEnterWeaveRef.current) return;
      clearWeaveIntent();
      animateTo({ progress: WEAVE_STAGE, stage: "weave" });
    };

    const onWheel = (event: WheelEvent) => {
      if (root.dataset.mode !== "run" || event.ctrlKey) return;

      const delta = normalizedDelta(event);
      if (Math.abs(delta) <= Math.abs(event.deltaX) || Math.abs(delta) < 0.01) return;

      const direction: 1 | -1 = delta > 0 ? 1 : -1;
      const current = progress();
      const travel = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
      const projected = clamp(current + delta / travel);
      const heroIsContinuous =
        currentStage === "hero" &&
        (direction < 0
          ? current <= HERO_FREE_END
          : projected < HERO_FREE_END - HERO_APPROACH);
      const weaveIsContinuous =
        currentStage === "weave" &&
        canEnterWeaveRef.current &&
        (direction > 0
          ? current >= WEAVE_STAGE - STAGE_EPSILON
          : projected > WEAVE_STAGE + WEAVE_APPROACH);

      // A completed snap keeps owning the physical gesture until its inertia
      // has gone quiet, even when the destination is a continuous region.
      if (animationActive || !gestureArmed) {
        event.preventDefault();
        event.stopImmediatePropagation();
        noteWheel();
        return;
      }

      if (heroIsContinuous) {
        setStage("hero");
        return;
      }

      if (weaveIsContinuous) {
        setStage("weave");
        return;
      }

      // Middle chapters own the wheel in capture phase so no descendant can
      // consume the same physical gesture a second time.
      event.preventDefault();
      event.stopImmediatePropagation();
      noteWheel();

      if (currentStage === "today" && direction < 0) clearWeaveIntent();

      if (accumulatedDirection !== 0 && accumulatedDirection !== direction) {
        accumulated = 0;
      }
      accumulatedDirection = direction;
      accumulated += delta;

      if (Math.abs(accumulated) < WHEEL_THRESHOLD) return;

      if (currentStage === "today" && direction > 0 && !canEnterWeaveRef.current) {
        pendingWeaveIntentRef.current = true;
        root.dataset.weaveIntent = "pending";
        resetIntent();
        return;
      }

      const target = targetFor(direction);
      resetIntent();
      if (!target) return;

      animateTo(target);
    };

    scroller.addEventListener("wheel", onWheel, { passive: false, capture: true });
    root.dataset.stageSnap = "idle";
    setStage(stageForProgress(progress()));

    return () => {
      scroller.removeEventListener("wheel", onWheel, { capture: true });
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(releaseTimer);
      snapToWeaveRef.current = null;
      pendingWeaveIntentRef.current = false;
      root.removeAttribute("data-weave-intent");
      root.removeAttribute("data-stage-snap");
      root.removeAttribute("data-scroll-stage");
    };
  }, []);

  return null;
}
