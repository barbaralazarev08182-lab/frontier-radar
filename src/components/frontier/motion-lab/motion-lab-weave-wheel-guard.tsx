"use client";

import { useEffect } from "react";

/**
 * Signal Weave is the terminal chapter of the Motion Lab sequence.
 * Downward wheel input is absorbed so there is no hidden chapter after Weave.
 * Upward wheel input is explicitly forwarded to the outer Motion Lab scroller
 * so the user can immediately return to TODAY'S 7.
 */
export function MotionLabWeaveWheelGuard() {
  useEffect(() => {
    let target: HTMLElement | null = null;
    let scroller: HTMLElement | null = null;

    const onWheel = (event: WheelEvent) => {
      if (!target || target.dataset.ready !== "true") return;

      // Signal Weave is the terminal chapter: downward input does nothing.
      if (event.deltaY > 0) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      // Do not rely on browser scroll chaining here. The Weave is viewport-locked
      // and overflow-hidden, so explicitly hand upward motion back to the real
      // chapter scroller instead.
      if (event.deltaY < 0 && scroller) {
        event.preventDefault();
        event.stopImmediatePropagation();
        scroller.scrollTop = Math.max(0, scroller.scrollTop + event.deltaY * 1.35);
      }
    };

    const attach = () => {
      const next = document.querySelector<HTMLElement>(".weave-analysis");
      if (next === target) return;

      target?.removeEventListener("wheel", onWheel);
      target = next;
      scroller = target
        ?.closest<HTMLElement>(".motion-lab-shell")
        ?.querySelector<HTMLElement>(".motion-lab-scroller") ?? null;

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
      scroller = null;
    };
  }, []);

  return null;
}
