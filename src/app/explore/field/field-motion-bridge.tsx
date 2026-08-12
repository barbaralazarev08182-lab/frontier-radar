"use client";

import { useEffect, useRef, type ReactNode } from "react";

const RESET_DELAY_MS = 520;

export function FieldMotionBridge({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let idleTimer = 0;

    const reset = (stage: HTMLElement) => {
      stage.dataset.pointerActive = "false";
      stage.style.setProperty("--pointer-x", "50%");
      stage.style.setProperty("--pointer-y", "42%");
      stage.style.setProperty("--parallax-near-x", "0px");
      stage.style.setProperty("--parallax-near-y", "0px");
      stage.style.setProperty("--parallax-mid-x", "0px");
      stage.style.setProperty("--parallax-mid-y", "0px");
      stage.style.setProperty("--parallax-far-x", "0px");
      stage.style.setProperty("--parallax-far-y", "0px");
      stage.style.setProperty("--parallax-focus-x", "0px");
      stage.style.setProperty("--parallax-focus-y", "0px");
      stage.style.setProperty("--focus-tilt-x", "0deg");
      stage.style.setProperty("--focus-tilt-y", "0deg");
      stage.style.setProperty("--focus-shadow-x", "0px");
      stage.style.setProperty("--focus-shadow-y", "16px");
      stage.style.setProperty("--note-shadow-x", "0px");
      stage.style.setProperty("--note-shadow-y", "6px");
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const stage = root.querySelector<HTMLElement>(".explore-field-stage");
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      ) {
        return;
      }

      const px = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      const py = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
      const nx = px * 2 - 1;
      const ny = py * 2 - 1;

      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        stage.dataset.pointerActive = "true";
        stage.style.setProperty("--pointer-x", `${(px * 100).toFixed(2)}%`);
        stage.style.setProperty("--pointer-y", `${(py * 100).toFixed(2)}%`);
        stage.style.setProperty("--parallax-near-x", `${(nx * 8).toFixed(2)}px`);
        stage.style.setProperty("--parallax-near-y", `${(ny * 5).toFixed(2)}px`);
        stage.style.setProperty("--parallax-mid-x", `${(nx * 4).toFixed(2)}px`);
        stage.style.setProperty("--parallax-mid-y", `${(ny * 2.8).toFixed(2)}px`);
        stage.style.setProperty("--parallax-far-x", `${(nx * 1.8).toFixed(2)}px`);
        stage.style.setProperty("--parallax-far-y", `${(ny * 1.2).toFixed(2)}px`);
        stage.style.setProperty("--parallax-focus-x", `${(nx * 3.2).toFixed(2)}px`);
        stage.style.setProperty("--parallax-focus-y", `${(ny * 2).toFixed(2)}px`);
        stage.style.setProperty("--focus-tilt-x", `${(-ny * 0.7).toFixed(3)}deg`);
        stage.style.setProperty("--focus-tilt-y", `${(nx * 0.9).toFixed(3)}deg`);
        stage.style.setProperty("--focus-shadow-x", `${(-nx * 9).toFixed(2)}px`);
        stage.style.setProperty("--focus-shadow-y", `${(16 - ny * 5).toFixed(2)}px`);
        stage.style.setProperty("--note-shadow-x", `${(-nx * 3.2).toFixed(2)}px`);
        stage.style.setProperty("--note-shadow-y", `${(6 - ny * 2).toFixed(2)}px`);
      });

      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => reset(stage), RESET_DELAY_MS);
    };

    const onPointerLeave = () => {
      const stage = root.querySelector<HTMLElement>(".explore-field-stage");
      if (stage) reset(stage);
    };

    root.addEventListener("pointermove", onPointerMove, { passive: true });
    root.addEventListener("pointerleave", onPointerLeave);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(idleTimer);
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <div ref={rootRef} className="explore-field-first explore-field-motion-root">
      {children}
    </div>
  );
}
