"use client";

import { useEffect } from "react";

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function ProjectIntelligenceMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".project-intelligence-shell");
    if (!root) return;

    const motionNodes = Array.from(
      root.querySelectorAll<HTMLElement>(
        "[data-pi-motion], .pi-evidence-row, .pi-case-block, .pi-score-cell, .pi-build-row, .pi-ledger-row"
      )
    );
    const sections = Array.from(root.querySelectorAll<HTMLElement>("[data-pi-section]"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;

    const settleNode = (node: HTMLElement) => {
      node.style.setProperty("--pi-enter", "1");
      node.style.setProperty("--pi-pass", "0");
      node.style.setProperty("--pi-enter-x", "0px");
      node.style.setProperty("--pi-enter-y", "0px");
      node.style.setProperty("--pi-enter-z", "0px");
      node.style.setProperty("--pi-enter-rot", "0deg");
      node.style.setProperty("--pi-pass-y", "0px");
      node.style.setProperty("--pi-motion-opacity", "1");
    };

    const render = () => {
      frame = 0;

      if (reduced.matches) {
        root.style.setProperty("--pi-scroll", "0");
        root.style.setProperty("--pi-scroll-shift", "0px");
        root.style.setProperty("--pi-marker-y", "12%");
        root.style.setProperty("--pi-pointer-x", "0px");
        root.style.setProperty("--pi-pointer-y", "0px");
        root.style.setProperty("--pi-pointer-rx", "0deg");
        root.style.setProperty("--pi-pointer-ry", "0deg");
        motionNodes.forEach(settleNode);
        return;
      }

      const viewport = Math.max(1, window.innerHeight);
      const rootRect = root.getBoundingClientRect();
      const travel = Math.max(1, root.scrollHeight - viewport);
      const rootProgress = clamp01((-rootRect.top) / travel);

      root.style.setProperty("--pi-scroll", rootProgress.toFixed(4));
      root.style.setProperty("--pi-scroll-shift", `${(-150 * rootProgress).toFixed(2)}px`);
      root.style.setProperty("--pi-marker-y", `${(12 + rootProgress * 76).toFixed(2)}%`);
      root.style.setProperty("--pi-pointer-x", `${(pointerX * 12).toFixed(2)}px`);
      root.style.setProperty("--pi-pointer-y", `${(pointerY * 9).toFixed(2)}px`);
      root.style.setProperty("--pi-pointer-rx", `${(-pointerY * 3.2).toFixed(2)}deg`);
      root.style.setProperty("--pi-pointer-ry", `${(pointerX * 4.2).toFixed(2)}deg`);

      motionNodes.forEach((node) => {
        const rect = node.getBoundingClientRect();
        const enter = clamp01((viewport * 0.94 - rect.top) / (viewport * 0.52));
        const pass = clamp01((viewport * 0.28 - rect.top) / Math.max(viewport * 0.78, rect.height));
        const from = 1 - enter;

        let x = 0;
        let y = from * 76;
        let z = from * -130;
        let rot = from * 5.5;

        if (node.classList.contains("pi-case-block") || node.classList.contains("pi-build-row")) {
          const odd = Array.from(node.parentElement?.children ?? []).indexOf(node) % 2 === 0;
          x = from * (odd ? 48 : -48);
          z = from * -170;
          rot = from * (odd ? 6 : -6);
        } else if (node.classList.contains("pi-evidence-row")) {
          x = from * 28;
          y = from * 54;
          z = from * -120;
          rot = from * 4;
        } else if (node.classList.contains("pi-score-cell")) {
          y = from * 42;
          z = from * -220;
          rot = from * 8;
        } else if (node.classList.contains("pi-ledger-row")) {
          y = from * 34;
          z = from * -90;
          rot = from * 2.5;
        }

        node.style.setProperty("--pi-enter", enter.toFixed(4));
        node.style.setProperty("--pi-pass", pass.toFixed(4));
        node.style.setProperty("--pi-enter-x", `${x.toFixed(2)}px`);
        node.style.setProperty("--pi-enter-y", `${y.toFixed(2)}px`);
        node.style.setProperty("--pi-enter-z", `${z.toFixed(2)}px`);
        node.style.setProperty("--pi-enter-rot", `${rot.toFixed(2)}deg`);
        node.style.setProperty("--pi-pass-y", `${(-28 * pass).toFixed(2)}px`);
        node.style.setProperty("--pi-motion-opacity", `${(0.3 + enter * 0.7).toFixed(3)}`);
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
