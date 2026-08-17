"use client";

import { useEffect } from "react";

const WHEEL_THRESHOLD = 72;
const WHEEL_COOLDOWN_MS = 340;
const WHEEL_IDLE_RESET_MS = 150;
const FOCUS_TRANSITION_MS = 340;

type FocusMotion = "open" | "up" | "down";
type RowSnapshot = Map<SVGGElement, DOMRect>;

function normalizedDelta(event: WheelEvent): number {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * window.innerHeight;
  return event.deltaY;
}

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function captureRows(field: HTMLElement): RowSnapshot {
  const snapshot: RowSnapshot = new Map();
  field.querySelectorAll<SVGGElement>(".lf4-row").forEach((row) => {
    snapshot.set(row, row.getBoundingClientRect());
  });
  return snapshot;
}

function motionForRow(field: HTMLElement, row: SVGGElement): FocusMotion | null {
  const rows = Array.from(field.querySelectorAll<SVGGElement>(".lf4-row"));
  const current = rows.findIndex((entry) => entry.classList.contains("is-selected"));
  const next = rows.indexOf(row);
  if (next < 0) return null;
  if (current < 0) return "open";
  if (next === current) return null;
  return next < current ? "up" : "down";
}

function canNavigate(field: HTMLElement, motion: Exclude<FocusMotion, "open">): boolean {
  const rows = Array.from(field.querySelectorAll<SVGGElement>(".lf4-row"));
  const current = rows.findIndex((entry) => entry.classList.contains("is-selected"));
  if (current < 0) return false;
  return motion === "up" ? current > 0 : current < rows.length - 1;
}

function animateRowReflow(field: HTMLElement, before: RowSnapshot) {
  field.querySelectorAll<SVGGElement>(".lf4-row").forEach((row) => {
    const previous = before.get(row);
    if (!previous) return;

    const next = row.getBoundingClientRect();
    const deltaY = previous.top - next.top;
    if (Math.abs(deltaY) < 0.75) return;

    row
      .querySelectorAll<SVGGraphicsElement>(
        ".lf4-rank, .lf4-score, .lf4-title, .lf4-inline-readout, .lf4-record-mark"
      )
      .forEach((node) => {
        node.animate(
          [
            { transform: `translateY(${deltaY}px)` },
            { transform: "translateY(0)" },
          ],
          {
            duration: FOCUS_TRANSITION_MS,
            easing: "cubic-bezier(.16, 1, .3, 1)",
          }
        );
      });

    const thread = row.querySelector<SVGPathElement>(".lf4-thread");
    if (thread) {
      const finalOpacity = Number.parseFloat(getComputedStyle(thread).opacity || "0.5");
      thread.animate(
        [
          { opacity: Math.min(finalOpacity, 0.1) },
          { opacity: finalOpacity },
        ],
        {
          duration: FOCUS_TRANSITION_MS - 30,
          easing: "cubic-bezier(.2, .8, .2, 1)",
        }
      );
    }
  });
}

function animateAperture(field: HTMLElement, motion: FocusMotion) {
  const aperture = field.querySelector<HTMLElement>(".lf4-aperture-body");
  if (!aperture) return;

  const enterY = motion === "up" ? -12 : motion === "down" ? 12 : 8;
  const enterScale = motion === "open" ? 0.982 : 0.992;

  aperture.animate(
    [
      {
        opacity: 0.18,
        transform: `translateY(${enterY}px) scaleY(${enterScale})`,
        filter: "blur(.65px)",
      },
      {
        opacity: 1,
        transform: "translateY(0) scaleY(1)",
        filter: "blur(0)",
      },
    ],
    {
      duration: FOCUS_TRANSITION_MS,
      easing: "cubic-bezier(.16, 1, .3, 1)",
    }
  );

  const contentEnterY = motion === "up" ? -4 : motion === "down" ? 4 : 3;
  [
    aperture.querySelector<HTMLElement>(".lf4-aperture-kicker"),
    aperture.querySelector<HTMLElement>(".lf4-aperture-grid"),
    aperture.querySelector<HTMLElement>(".lf4-aperture-bottom"),
  ].forEach((section, index) => {
    if (!section) return;
    section.animate(
      [
        { opacity: 0, transform: `translateY(${contentEnterY}px)` },
        { opacity: 1, transform: "translateY(0)" },
      ],
      {
        duration: 250,
        delay: 45 + index * 28,
        easing: "cubic-bezier(.2, .8, .2, 1)",
        fill: "backwards",
      }
    );
  });

  const selectedThread = field.querySelector<SVGPathElement>(".lf4-row.is-selected .lf4-thread");
  if (selectedThread) {
    const finalOpacity = Number.parseFloat(getComputedStyle(selectedThread).opacity || "0.92");
    selectedThread.animate(
      [
        { opacity: 0.08 },
        { opacity: finalOpacity },
      ],
      {
        duration: FOCUS_TRANSITION_MS,
        easing: "cubic-bezier(.16, 1, .3, 1)",
      }
    );
  }
}

function scheduleFocusTransition(field: HTMLElement, motion: FocusMotion, before: RowSnapshot) {
  if (reducedMotion()) return;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!field.isConnected) return;
      animateRowReflow(field, before);
      animateAperture(field, motion);
    });
  });
}

export function ExploreWheelNavigator() {
  useEffect(() => {
    let accumulated = 0;
    let lastSwitchAt = 0;
    let resetTimer: number | null = null;

    const resetAccumulatorSoon = () => {
      if (resetTimer != null) window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        accumulated = 0;
        resetTimer = null;
      }, WHEEL_IDLE_RESET_MS);
    };

    const onPointerClickCapture = (event: MouseEvent) => {
      if (window.innerWidth <= 900) return;
      const target = event.target;
      if (!(target instanceof Element)) return;

      const row = target.closest<SVGGElement>(".lf4-row");
      if (!row) return;
      const field = row.closest<HTMLElement>(".lf4");
      if (!field) return;

      const motion = motionForRow(field, row);
      if (!motion) return;
      const before = captureRows(field);
      scheduleFocusTransition(field, motion, before);
    };

    const onKeyDownCapture = (event: KeyboardEvent) => {
      if (window.innerWidth <= 900 || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;

      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        const field = document.querySelector<HTMLElement>('.lf4[data-focus="pinned"]');
        if (!field) return;
        const motion: Exclude<FocusMotion, "open"> = event.key === "ArrowUp" ? "up" : "down";
        if (!canNavigate(field, motion)) return;
        const before = captureRows(field);
        scheduleFocusTransition(field, motion, before);
        return;
      }

      if (event.key !== "Enter" && event.key !== " ") return;
      if (!(target instanceof Element)) return;
      const row = target.closest<SVGGElement>(".lf4-row");
      if (!row) return;
      const field = row.closest<HTMLElement>(".lf4");
      if (!field) return;
      const motion = motionForRow(field, row);
      if (!motion) return;
      const before = captureRows(field);
      scheduleFocusTransition(field, motion, before);
    };

    const onWheel = (event: WheelEvent) => {
      if (window.innerWidth <= 900 || event.ctrlKey) return;

      const field = document.querySelector<HTMLElement>('.lf4[data-focus="pinned"]');
      const canvas = field?.querySelector<HTMLElement>(".lf4-canvas");
      const target = event.target;
      if (!field || !canvas || !(target instanceof Node) || !canvas.contains(target)) return;

      if (target instanceof Element && target.closest("a, button, input, textarea, select")) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;

      const delta = normalizedDelta(event);
      if (delta === 0) return;

      event.preventDefault();
      accumulated += delta;
      resetAccumulatorSoon();

      const now = performance.now();
      if (Math.abs(accumulated) < WHEEL_THRESHOLD || now - lastSwitchAt < WHEEL_COOLDOWN_MS) return;

      const motion: Exclude<FocusMotion, "open"> = accumulated > 0 ? "down" : "up";
      if (!canNavigate(field, motion)) {
        accumulated = 0;
        return;
      }

      const before = captureRows(field);
      const key = motion === "down" ? "ArrowDown" : "ArrowUp";
      accumulated = 0;
      lastSwitchAt = now;
      window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
      scheduleFocusTransition(field, motion, before);
    };

    document.addEventListener("click", onPointerClickCapture, true);
    document.addEventListener("keydown", onKeyDownCapture, true);
    document.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      document.removeEventListener("click", onPointerClickCapture, true);
      document.removeEventListener("keydown", onKeyDownCapture, true);
      document.removeEventListener("wheel", onWheel);
      if (resetTimer != null) window.clearTimeout(resetTimer);
    };
  }, []);

  return null;
}
