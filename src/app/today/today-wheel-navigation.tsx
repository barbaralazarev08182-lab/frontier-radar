"use client";

import { useEffect, useRef } from "react";

const WHEEL_SWITCH_COOLDOWN_MS = 620;
const WHEEL_DELTA_THRESHOLD = 6;

export function TodayWheelNavigation() {
  const lastMoveAtRef = useRef(0);

  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaY) < WHEEL_DELTA_THRESHOLD) return;

      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;

      const stack = document.querySelector<HTMLElement>(".today-r27-production .fr-stack");
      if (!stack || stack.dataset.open !== "true") return;

      event.preventDefault();

      const now = performance.now();
      if (now - lastMoveAtRef.current < WHEEL_SWITCH_COOLDOWN_MS) return;

      const bands = Array.from(stack.querySelectorAll<HTMLElement>(".fr-band"));
      const activeIndex = bands.findIndex((band) => band.dataset.active === "true");
      if (activeIndex < 0) return;

      const direction = event.deltaY > 0 ? 1 : -1;
      const nextIndex = Math.max(0, Math.min(bands.length - 1, activeIndex + direction));
      if (nextIndex === activeIndex) return;

      const nextButton = bands[nextIndex]?.querySelector<HTMLButtonElement>(".fr-band-head");
      if (!nextButton) return;

      lastMoveAtRef.current = now;
      nextButton.click();
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  return null;
}
