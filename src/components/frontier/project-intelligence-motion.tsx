"use client";

import { useEffect } from "react";

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function ProjectIntelligenceMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".project-intelligence-shell");
    if (!root) return;

    const motionNodes = Array.from(root.querySelectorAll<HTMLElement>("[data-pi-motion]"));
    const sections = Array.from(root.querySelectorAll<HTMLElement>("[data-pi-section]"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;

    const render = () => {
      frame = 0;

      if (reduced.matches) {
        root.style.setProperty("--pi-scroll", "0");
        root.style.setProperty("--pi-pointer-x", "0");
        root.style.setProperty("--pi-pointer-y", "0");
        motionNodes.forEach((node) => {
          node.style.setProperty("--pi-enter", "1");
          node.style.setProperty("--pi-pass", "0");
        });
        return;
      }

      const viewport = Math.max(1, window.innerHeight);
      const rootRect = root.getBoundingClientRect();
      const travel = Math.max(1, root.scrollHeight - viewport);
      const rootProgress = clamp01((-rootRect.top) / travel);

      root.style.setProperty("--pi-scroll", rootProgress.toFixed(4));
      root.style.setProperty("--pi-pointer-x", pointerX.toFixed(4));
      root.style.setProperty("--pi-pointer-y", pointerY.toFixed(4));

      motionNodes.forEach((node) => {
        const rect = node.getBoundingClientRect();
        const enter = clamp01((viewport * 0.94 - rect.top) / (viewport * 0.5));
        const pass = clamp01((viewport * 0.34 - rect.top) / Math.max(viewport * 0.72, rect.height));
        node.style.setProperty("--pi-enter", enter.toFixed(4));
        node.style.setProperty("--pi-pass", pass.toFixed(4));
      });

      let active = "00";
      let bestDistance = Number.POSITIVE_INFINITY;
      const focusY = viewport * 0.46;
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const center = rect.top + Math.min(rect.height, viewport) * 0.36;
        const distance = Math.abs(center - focusY);
        if (distance < bestDistance) {
          bestDistance = distance;
          active = section.dataset.piSection ?? "00";
        }
      });
      root.dataset.piActive = active;
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(render);
    };

    const onPointerMove = (event: PointerEvent) => {
      pointerX = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
      pointerY = (event.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
      schedule();
    };

    const onPointerLeave = () => {
      pointerX = 0;
      pointerY = 0;
      schedule();
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onPointerLeave);
    reduced.addEventListener("change", schedule);

    render();

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("mouseleave", onPointerLeave);
      reduced.removeEventListener("change", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="pi-motion-layer" aria-hidden="true">
      <div className="pi-depth-axis" />
      <div className="pi-depth-marker" />
      <div className="pi-ambient-sheet pi-ambient-sheet-a" />
      <div className="pi-ambient-sheet pi-ambient-sheet-b" />
    </div>
  );
}
