"use client";

import { useEffect } from "react";

const HERO_FREE_END = 0.275;
const HERO_RETURN = 0.255;
const DECK_STAGE = 0.350;
const OVERVIEW_STAGE = 0.620;
const WEAVE_STAGE = 0.860;
const WHEEL_THRESHOLD = 24;
const GESTURE_RELEASE_MS = 180;
const SNAP_DURATION_MS = 760;

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function easeInOutCubic(value: number) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

interface TodayStageScrollControllerProps {
  canEnterWeave: boolean;
}

export function TodayStageScrollController({ canEnterWeave }: TodayStageScrollControllerProps) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".motion-lab-shell");
    const scroller = root?.querySelector<HTMLElement>(".motion-lab-scroller");
    if (!root || !scroller) return;

    let accumulated = 0;
    let animationFrame = 0;
    let animationActive = false;
    let gestureArmed = true;
    let releaseTimer = 0;
    let lastWheelAt = 0;

    const progress = () => {
      const travel = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
      return clamp(scroller.scrollTop / travel);
    };

    const setSnapState = (value: "idle" | "moving") => {
      root.dataset.stageSnap = value;
    };

    const rearmAfterGesture = () => {
      window.clearTimeout(releaseTimer);
      releaseTimer = window.setTimeout(() => {
        if (animationActive) return;
        gestureArmed = true;
        accumulated = 0;
      }, GESTURE_RELEASE_MS);
    };

    const animateTo = (targetProgress: number) => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      const travel = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
      const from = scroller.scrollTop;
      const to = clamp(targetProgress) * travel;
      const distance = to - from;
      const started = performance.now();
      animationActive = true;
      gestureArmed = false;
      setSnapState("moving");

      const tick = (now: number) => {
        const t = clamp((now - started) / SNAP_DURATION_MS);
        const eased = easeInOutCubic(t);
        scroller.scrollTop = from + distance * eased;

        if (t < 1) {
          animationFrame = window.requestAnimationFrame(tick);
          return;
        }

        animationFrame = 0;
        animationActive = false;
        scroller.scrollTop = to;
        setSnapState("idle");

        if (performance.now() - lastWheelAt >= GESTURE_RELEASE_MS) {
          gestureArmed = true;
          accumulated = 0;
        } else {
          rearmAfterGesture();
        }
      };

      animationFrame = window.requestAnimationFrame(tick);
    };

    const nextTarget = (current: number, direction: 1 | -1) => {
      if (direction > 0) {
        if (current < DECK_STAGE - 0.018) return DECK_STAGE;
        if (current < OVERVIEW_STAGE - 0.018) return OVERVIEW_STAGE;
        if (canEnterWeave && current < WEAVE_STAGE - 0.018) return WEAVE_STAGE;
        return null;
      }

      if (current > OVERVIEW_STAGE + 0.018) return OVERVIEW_STAGE;
      if (current > DECK_STAGE + 0.018) return DECK_STAGE;
      if (current > HERO_RETURN + 0.010) return HERO_RETURN;
      return null;
    };

    const onWheel = (event: WheelEvent) => {
      if (root.dataset.mode !== "run") return;

      const current = progress();
      const inFinalWeave = root.dataset.directHandoff === "ready" || current >= WEAVE_STAGE - 0.006;
      const inHeroFreeScroll = current < HERO_FREE_END && event.deltaY < 0;
      const approachingMiddleFromHero = current >= HERO_FREE_END || (current >= HERO_FREE_END - 0.018 && event.deltaY > 0);

      if (inFinalWeave || inHeroFreeScroll || !approachingMiddleFromHero) return;

      event.preventDefault();
      event.stopPropagation();
      lastWheelAt = performance.now();

      if (animationActive || !gestureArmed) {
        rearmAfterGesture();
        return;
      }

      accumulated += event.deltaY;
      if (Math.abs(accumulated) < WHEEL_THRESHOLD) return;

      const direction: 1 | -1 = accumulated > 0 ? 1 : -1;
      accumulated = 0;
      const target = nextTarget(current, direction);
      if (target == null) return;

      animateTo(target);
    };

    scroller.addEventListener("wheel", onWheel, { passive: false });
    root.dataset.stageSnap = "idle";

    return () => {
      scroller.removeEventListener("wheel", onWheel);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(releaseTimer);
      root.removeAttribute("data-stage-snap");
    };
  }, [canEnterWeave]);

  return null;
}
