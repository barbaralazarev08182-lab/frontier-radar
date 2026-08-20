"use client";

import { useEffect, useRef } from "react";

const WHEEL_SWITCH_COOLDOWN_MS = 620;
const WHEEL_DELTA_THRESHOLD = 6;

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function TodayWheelNavigation() {
  const lastMoveAtRef = useRef(0);
  const glassFrameRef = useRef<number | null>(null);

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

    const setGlassPosition = (clientX: number, clientY: number) => {
      const stack = document.querySelector<HTMLElement>(".today-r27-production .fr-stack");
      if (!stack || stack.dataset.open !== "true") return;

      const bands = Array.from(stack.querySelectorAll<HTMLElement>(".fr-band"));
      const activeIndex = bands.findIndex((band) => band.dataset.active === "true");
      const activeBand = activeIndex >= 0 ? bands[activeIndex] : null;

      if (!activeBand || activeIndex > 4) return;

      const rect = activeBand.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const x = clamp01((clientX - rect.left) / rect.width);
      const y = clamp01((clientY - rect.top) / rect.height);
      const tilt = -10 + x * 14;
      const strength = 0.72 + (1 - Math.abs(x - 0.5) * 1.15) * 0.18;

      activeBand.style.setProperty("--glass-x", `${(x * 100).toFixed(2)}%`);
      activeBand.style.setProperty("--glass-y", `${(y * 100).toFixed(2)}%`);
      activeBand.style.setProperty("--glass-tilt", `${tilt.toFixed(2)}deg`);
      activeBand.style.setProperty("--glass-strength", strength.toFixed(3));
      activeBand.dataset.glassActive = "true";
    };

    const resetGlass = () => {
      const activeBand = document.querySelector<HTMLElement>(
        '.today-r27-production .fr-stack[data-open="true"] .fr-band[data-active="true"]',
      );
      if (!activeBand) return;
      activeBand.style.setProperty("--glass-x", "68%");
      activeBand.style.setProperty("--glass-y", "24%");
      activeBand.style.setProperty("--glass-tilt", "-2deg");
      activeBand.style.setProperty("--glass-strength", ".62");
      delete activeBand.dataset.glassActive;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      if (glassFrameRef.current !== null) cancelAnimationFrame(glassFrameRef.current);
      glassFrameRef.current = requestAnimationFrame(() => {
        glassFrameRef.current = null;
        setGlassPosition(event.clientX, event.clientY);
      });
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("blur", resetGlass);
    document.addEventListener("mouseleave", resetGlass);

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("blur", resetGlass);
      document.removeEventListener("mouseleave", resetGlass);
      if (glassFrameRef.current !== null) cancelAnimationFrame(glassFrameRef.current);
    };
  }, []);

  return null;
}
