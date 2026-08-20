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
    const getStack = () =>
      document.querySelector<HTMLElement>(".today-r27-production .fr-stack");

    const ensureGlassLayer = () => {
      const stack = getStack();
      if (!stack) return null;

      const bands = Array.from(stack.querySelectorAll<HTMLElement>(".fr-band"));
      const activeIndex = bands.findIndex((band) => band.dataset.active === "true");

      bands.forEach((band, index) => {
        const existing = band.querySelector<HTMLElement>(".fr-glass-reflection-layer");
        const shouldHaveGlass =
          stack.dataset.open === "true" && index === activeIndex && activeIndex >= 0 && activeIndex <= 4;

        if (!shouldHaveGlass && existing) existing.remove();
      });

      if (stack.dataset.open !== "true" || activeIndex < 0 || activeIndex > 4) return null;

      const activeBand = bands[activeIndex];
      if (!activeBand) return null;

      let layer = activeBand.querySelector<HTMLElement>(".fr-glass-reflection-layer");

      if (!layer) {
        layer = document.createElement("div");
        layer.className = "fr-glass-reflection-layer";
        layer.setAttribute("aria-hidden", "true");
        /* Insert first so legacy :last-child selectors keep targeting the real
           card content / action rail instead of the decorative glass layer. */
        activeBand.prepend(layer);
      }

      return activeBand;
    };

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaY) < WHEEL_DELTA_THRESHOLD) return;

      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;

      const stack = getStack();
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
      requestAnimationFrame(ensureGlassLayer);
    };

    const setGlassPosition = (clientX: number, clientY: number) => {
      const activeBand = ensureGlassLayer();
      if (!activeBand) return;

      const rect = activeBand.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const x = clamp01((clientX - rect.left) / rect.width);
      const y = clamp01((clientY - rect.top) / rect.height);
      const nx = (x - 0.5) * 2;
      const ny = (y - 0.5) * 2;

      /* Real glass behavior: the reflection pattern stays attached to the whole
         pane and only shifts a little when the viewing angle changes. */
      const shiftX = nx * 18;
      const shiftY = ny * 9;
      const angle = -0.8 + nx * 0.48 - ny * 0.12;
      const strength = 0.9 + (1 - Math.abs(nx) * 0.22) * 0.07;

      activeBand.style.setProperty("--glass-shift-x", `${shiftX.toFixed(1)}px`);
      activeBand.style.setProperty("--glass-shift-y", `${shiftY.toFixed(1)}px`);
      activeBand.style.setProperty("--glass-angle", `${angle.toFixed(2)}deg`);
      activeBand.style.setProperty("--glass-strength", strength.toFixed(3));
      activeBand.dataset.glassActive = "true";
    };

    const resetGlass = () => {
      const activeBand = ensureGlassLayer();
      if (!activeBand) return;
      activeBand.style.setProperty("--glass-shift-x", "0px");
      activeBand.style.setProperty("--glass-shift-y", "0px");
      activeBand.style.setProperty("--glass-angle", "-0.8deg");
      activeBand.style.setProperty("--glass-strength", ".94");
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

    const stack = getStack();
    const observer = stack
      ? new MutationObserver(() => requestAnimationFrame(ensureGlassLayer))
      : null;

    if (stack && observer) {
      observer.observe(stack, {
        attributes: true,
        subtree: true,
        attributeFilter: ["data-active", "data-open"],
      });
    }

    requestAnimationFrame(ensureGlassLayer);

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("blur", resetGlass);
    document.addEventListener("mouseleave", resetGlass);

    return () => {
      observer?.disconnect();
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("blur", resetGlass);
      document.removeEventListener("mouseleave", resetGlass);
      if (glassFrameRef.current !== null) cancelAnimationFrame(glassFrameRef.current);
      document
        .querySelectorAll<HTMLElement>(".fr-glass-reflection-layer")
        .forEach((layer) => layer.remove());
    };
  }, []);

  return null;
}
