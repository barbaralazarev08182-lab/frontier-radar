"use client";

import { useEffect } from "react";

const WHEEL_THRESHOLD = 72;
const WHEEL_COOLDOWN_MS = 260;
const WHEEL_IDLE_RESET_MS = 150;

function normalizedDelta(event: WheelEvent): number {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * window.innerHeight;
  return event.deltaY;
}

export function ExploreWheelNavigator() {
  useEffect(() => {
    let accumulated = 0;
    let lastSwitchAt = 0;
    let resetTimer: number | null = null;

    const resetAccumulatorSoon = () => {
      if (resetTimer != null) window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        accumulated = 0;
        resetTimer = null;
      }, WHEEL_IDLE_RESET_MS);
    };

    const onWheel = (event: WheelEvent) => {
      if (window.innerWidth <= 900 || event.ctrlKey) return;

      const field = document.querySelector<HTMLElement>('.lf4[data-focus="pinned"]');
      const canvas = field?.querySelector<HTMLElement>(".lf4-canvas");
      const target = event.target;
      if (!field || !canvas || !(target instanceof Node) || !canvas.contains(target)) return;

      if (target instanceof Element && target.closest("a, button, input, textarea, select")) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;

      const delta = normalizedDelta(event);
      if (delta === 0) return;

      event.preventDefault();
      accumulated += delta;
      resetAccumulatorSoon();

      const now = performance.now();
      if (Math.abs(accumulated) < WHEEL_THRESHOLD || now - lastSwitchAt < WHEEL_COOLDOWN_MS) return;

      const key = accumulated > 0 ? "ArrowDown" : "ArrowUp";
      accumulated = 0;
      lastSwitchAt = now;
      window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    };

    document.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      document.removeEventListener("wheel", onWheel);
      if (resetTimer != null) window.clearTimeout(resetTimer);
    };
  }, []);

  return null;
}
