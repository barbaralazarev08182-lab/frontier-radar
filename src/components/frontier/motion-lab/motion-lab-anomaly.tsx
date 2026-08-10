"use client";

import { useEffect } from "react";

const ADJACENT_SELECTOR = ".motion-lab-signal-06";
const WILDCARD_SELECTOR = ".motion-lab-signal-07";
const SIGNAL_SELECTOR = ".motion-lab-signal";

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function getCenter(rect: DOMRect) {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export function MotionLabAnomaly() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".motion-lab-shell");
    if (!root) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const adjacent = root.querySelector<HTMLElement>(ADJACENT_SELECTOR);
    const wildcard = root.querySelector<HTMLElement>(WILDCARD_SELECTOR);
    const signals = Array.from(root.querySelectorAll<HTMLElement>(SIGNAL_SELECTOR));

    if (!adjacent || !wildcard || signals.length === 0 || reduced || coarsePointer) {
      root.dataset.anomalyLab = "disabled";
      return () => root.removeAttribute("data-anomaly-lab");
    }

    root.dataset.anomalyLab = "ready";

    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    let active: "adjacent" | "wildcard" | null = null;
    let currentStrength = 0;
    let targetStrength = 0;
    let centers = new Map<HTMLElement, { x: number; y: number }>();

    const isOverview = () => root.dataset.scene === "overview" && root.dataset.layout === "overview";

    const captureCenters = () => {
      centers = new Map(signals.map((signal) => [signal, getCenter(signal.getBoundingClientRect())]));
    };

    const clearSignalOffsets = () => {
      signals.forEach((signal) => {
        signal.style.setProperty("--anomaly-x", "0px");
        signal.style.setProperty("--anomaly-y", "0px");
        signal.style.setProperty("--anomaly-scale", "0");
      });
    };

    const writeOffsets = () => {
      if (!active || !isOverview()) {
        clearSignalOffsets();
        return;
      }

      const source = active === "wildcard" ? wildcard : adjacent;
      const sourceRect = source.getBoundingClientRect();
      const sourceCenter = getCenter(sourceRect);
      const localX = clamp((pointerX - sourceRect.left) / Math.max(1, sourceRect.width), 0, 1) * 2 - 1;
      const localY = clamp((pointerY - sourceRect.top) / Math.max(1, sourceRect.height), 0, 1) * 2 - 1;

      root.style.setProperty("--anomaly-local-x", localX.toFixed(4));
      root.style.setProperty("--anomaly-local-y", localY.toFixed(4));
      root.style.setProperty("--anomaly-screen-x", `${pointerX.toFixed(2)}px`);
      root.style.setProperty("--anomaly-screen-y", `${pointerY.toFixed(2)}px`);

      signals.forEach((signal) => {
        const center = centers.get(signal) ?? getCenter(signal.getBoundingClientRect());
        let dx = center.x - sourceCenter.x;
        let dy = center.y - sourceCenter.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        dx /= distance;
        dy /= distance;

        if (signal === source) {
          const selfX = active === "adjacent" ? localX * 5 : localX * 2.5;
          const selfY = active === "adjacent" ? localY * 3 : localY * 1.5;
          signal.style.setProperty("--anomaly-x", `${(selfX * currentStrength).toFixed(2)}px`);
          signal.style.setProperty("--anomaly-y", `${(selfY * currentStrength).toFixed(2)}px`);
          signal.style.setProperty("--anomaly-scale", `${(active === "wildcard" ? 0.012 : 0.006) * currentStrength}`);
          return;
        }

        if (active === "adjacent") {
          const proximity = 1 - clamp(distance / 760);
          const lateral = (9 + proximity * 11) * currentStrength;
          signal.style.setProperty("--anomaly-x", `${((dx * lateral) + localX * 3.5 * proximity).toFixed(2)}px`);
          signal.style.setProperty("--anomaly-y", `${((dy * lateral * 0.32) + localY * 1.8 * proximity).toFixed(2)}px`);
          signal.style.setProperty("--anomaly-scale", `${(-0.004 * proximity * currentStrength).toFixed(5)}`);
        } else {
          const proximity = 1 - clamp(distance / 980);
          const push = (17 + proximity * 46) * currentStrength;
          const tangentX = -dy * localX * 10 * proximity * currentStrength;
          const tangentY = dx * localX * 7 * proximity * currentStrength;
          signal.style.setProperty("--anomaly-x", `${(dx * push + tangentX).toFixed(2)}px`);
          signal.style.setProperty("--anomaly-y", `${(dy * push + tangentY).toFixed(2)}px`);
          signal.style.setProperty("--anomaly-scale", `${(-0.009 * proximity * currentStrength).toFixed(5)}`);
        }
      });
    };

    const animate = () => {
      frame = 0;
      currentStrength += (targetStrength - currentStrength) * 0.12;
      root.style.setProperty("--anomaly-strength", currentStrength.toFixed(4));
      writeOffsets();

      if (Math.abs(targetStrength - currentStrength) > 0.002) {
        frame = window.requestAnimationFrame(animate);
      } else if (targetStrength === 0) {
        currentStrength = 0;
        root.style.setProperty("--anomaly-strength", "0");
        clearSignalOffsets();
        root.removeAttribute("data-anomaly");
      }
    };

    const requestAnimate = () => {
      if (!frame) frame = window.requestAnimationFrame(animate);
    };

    const activate = (kind: "adjacent" | "wildcard", event: PointerEvent) => {
      if (event.pointerType === "touch" || !isOverview()) return;
      active = kind;
      pointerX = event.clientX;
      pointerY = event.clientY;
      captureCenters();
      root.dataset.anomaly = kind;
      targetStrength = kind === "wildcard" ? 1 : 0.72;
      requestAnimate();
    };

    const move = (kind: "adjacent" | "wildcard", event: PointerEvent) => {
      if (active !== kind || !isOverview()) return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      writeOffsets();
      requestAnimate();
    };

    const deactivate = () => {
      active = null;
      targetStrength = 0;
      requestAnimate();
    };

    const onAdjacentEnter = (event: PointerEvent) => activate("adjacent", event);
    const onAdjacentMove = (event: PointerEvent) => move("adjacent", event);
    const onWildcardEnter = (event: PointerEvent) => activate("wildcard", event);
    const onWildcardMove = (event: PointerEvent) => move("wildcard", event);

    adjacent.addEventListener("pointerenter", onAdjacentEnter);
    adjacent.addEventListener("pointermove", onAdjacentMove, { passive: true });
    adjacent.addEventListener("pointerleave", deactivate);
    wildcard.addEventListener("pointerenter", onWildcardEnter);
    wildcard.addEventListener("pointermove", onWildcardMove, { passive: true });
    wildcard.addEventListener("pointerleave", deactivate);

    const scroller = root.querySelector<HTMLElement>(".motion-lab-scroller");
    const onScroll = () => {
      if (!isOverview()) deactivate();
    };
    const onResize = () => {
      captureCenters();
      deactivate();
    };

    scroller?.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      adjacent.removeEventListener("pointerenter", onAdjacentEnter);
      adjacent.removeEventListener("pointermove", onAdjacentMove);
      adjacent.removeEventListener("pointerleave", deactivate);
      wildcard.removeEventListener("pointerenter", onWildcardEnter);
      wildcard.removeEventListener("pointermove", onWildcardMove);
      wildcard.removeEventListener("pointerleave", deactivate);
      scroller?.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      clearSignalOffsets();
      root.removeAttribute("data-anomaly");
      root.removeAttribute("data-anomaly-lab");
      root.style.removeProperty("--anomaly-strength");
      root.style.removeProperty("--anomaly-local-x");
      root.style.removeProperty("--anomaly-local-y");
      root.style.removeProperty("--anomaly-screen-x");
      root.style.removeProperty("--anomaly-screen-y");
    };
  }, []);

  return null;
}
