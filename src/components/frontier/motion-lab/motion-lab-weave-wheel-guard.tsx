"use client";

import { useEffect } from "react";

/**
 * React/browser wheel listeners may be passive depending on delegation details.
 * This guard guarantees that the resolved Signal Weave owns the wheel while its
 * internal resolve progress is active, so the outer Motion Lab scroller cannot
 * move the viewport-locked composition underneath it.
 */
export function MotionLabWeaveWheelGuard() {
  useEffect(() => {
    let target: HTMLElement | null = null;

    const onWheel = (event: WheelEvent) => {
      if (!target || target.dataset.ready !== "true") return;

      const raw = target.style.getPropertyValue("--weave-scroll");
      const progress = Number.parseFloat(raw) || 0;

      // Downward wheel always belongs to the resolved Weave. At progress=1 we
      // intentionally absorb extra downward input instead of moving the outer
      // scroller and creating a hidden positional offset.
      if (event.deltaY > 0) {
        event.preventDefault();
        return;
      }

      // Upward input remains inside the Weave until resolve has fully returned
      // to zero. Only then can the event bubble naturally back to TODAY'S 7.
      if (event.deltaY < 0 && progress > 0.001) {
        event.preventDefault();
      }
    };

    const attach = () => {
      const next = document.querySelector<HTMLElement>(".weave-analysis");
      if (next === target) return;

      target?.removeEventListener("wheel", onWheel);
      target = next;
      target?.addEventListener("wheel", onWheel, { passive: false });
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
