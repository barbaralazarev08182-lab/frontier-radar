"use client";

import { useEffect } from "react";

const HANDOFF_START = 0.66;
const HANDOFF_END = 0.86;

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(value: number) {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
}

export function MotionLabDirectHandoff() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".motion-lab-shell");
    const scroller = root?.querySelector<HTMLElement>(".motion-lab-scroller");
    if (!root || !scroller) return;

    let frame = 0;

    const sync = () => {
      frame = 0;
      const mode = root.dataset.mode;
      const travel = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
      const rawProgress = clamp(scroller.scrollTop / travel);

      let progress = 0;
      if (mode === "topic") progress = 1;
      else if (mode === "run") progress = smoothstep((rawProgress - HANDOFF_START) / (HANDOFF_END - HANDOFF_START));

      root.style.setProperty("--direct-handoff", progress.toFixed(4));
      root.style.setProperty("--direct-handoff-y", `${((1 - progress) * 100).toFixed(3)}svh`);

      if (progress <= 0.001) root.dataset.directHandoff = "off";
      else if (progress >= 0.999) root.dataset.directHandoff = "ready";
      else root.dataset.directHandoff = "active";
    };

    const requestSync = () => {
      if (!frame) frame = window.requestAnimationFrame(sync);
    };

    const observer = new MutationObserver(requestSync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-mode"] });
    scroller.addEventListener("scroll", requestSync, { passive: true });
    window.addEventListener("resize", requestSync);
    sync();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      scroller.removeEventListener("scroll", requestSync);
      window.removeEventListener("resize", requestSync);
      root.style.removeProperty("--direct-handoff");
      root.style.removeProperty("--direct-handoff-y");
      root.removeAttribute("data-direct-handoff");
    };
  }, []);

  return null;
}
