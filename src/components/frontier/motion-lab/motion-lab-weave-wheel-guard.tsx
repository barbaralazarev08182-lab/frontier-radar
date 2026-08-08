"use client";

import { useEffect } from "react";

/**
 * Signal Weave is the terminal chapter of the Motion Lab sequence.
 * Once it owns the viewport, downward wheel input must not create another
 * hidden resolve state or move the outer scroller. Upward input is left alone
 * so the user can immediately return to TODAY'S 7.
 */
export function MotionLabWeaveWheelGuard() {
  useEffect(() => {
    let target: HTMLElement | null = null;

    const onWheel = (event: WheelEvent) => {
      if (!target || target.dataset.ready !== "true") return;

      if (event.deltaY > 0) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    const attach = () => {
      const next = document.querySelector<HTMLElement>(".weave-analysis");
      if (next === target) return;

      target?.removeEventListener("wheel", onWheel);
      target = next;
      if (target) {
        target.style.setProperty("--weave-scroll", "0");
        target.addEventListener("wheel", onWheel, { passive: false });
      }
    };

    attach();

    const observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      target?.removeEventListener("wheel", onWheel);
      target = null;
    };
  }, []);

  return null;
}
