"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const STAGES = ["CAPTURE", "EVIDENCE", "INTERROGATION", "RESOLUTION", "BUILD"] as const;

type Props = {
  evidenceCount: number;
  caseCount: number;
  buildCount: number;
};

type Cursor = {
  stage: number;
  step: number;
};

export function ProjectIntelligenceMotion({ evidenceCount, caseCount, buildCount }: Props) {
  const stageCounts = useMemo(
    () => [1, Math.max(1, evidenceCount), Math.max(1, caseCount), 1, Math.max(1, buildCount)],
    [evidenceCount, caseCount, buildCount]
  );
  const stageStarts = useMemo(() => {
    const starts: number[] = [];
    let cursor = 0;
    for (const count of stageCounts) {
      starts.push(cursor);
      cursor += count;
    }
    return starts;
  }, [stageCounts]);
  const totalPositions = stageCounts.reduce((sum, count) => sum + count, 0);

  const decode = (position: number): Cursor => {
    for (let stage = stageCounts.length - 1; stage >= 0; stage -= 1) {
      if (position >= stageStarts[stage]!) {
        return { stage, step: position - stageStarts[stage]! };
      }
    }
    return { stage: 0, step: 0 };
  };

  const [position, setPosition] = useState(0);
  const positionRef = useRef(0);
  const consumedRef = useRef(false);
  const lockedRef = useRef(false);
  const accumulatedRef = useRef(0);
  const gestureEndTimer = useRef<number | null>(null);
  const unlockTimer = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const directionRef = useRef(1);

  const cursor = decode(position);

  const moveTo = (next: number, direction: number) => {
    const clamped = Math.max(0, Math.min(totalPositions - 1, next));
    if (clamped === positionRef.current) return;
    directionRef.current = direction;
    positionRef.current = clamped;
    lockedRef.current = true;
    setPosition(clamped);
    if (unlockTimer.current) window.clearTimeout(unlockTimer.current);
    unlockTimer.current = window.setTimeout(() => {
      lockedRef.current = false;
    }, 920);
  };

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".project-intelligence-shell");
    if (!root) return;

    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousOverscroll = html.style.overscrollBehavior;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";

    const panels = Array.from(root.querySelectorAll<HTMLElement>("[data-pi-stage-panel]"));
    const evidence = Array.from(root.querySelectorAll<HTMLElement>("[data-pi-evidence]"));
    const cases = Array.from(root.querySelectorAll<HTMLElement>("[data-pi-case]"));
    const builds = Array.from(root.querySelectorAll<HTMLElement>("[data-pi-build]"));
    const interrogation = root.querySelector<HTMLElement>(".pi-stage-interrogation");

    const applyStates = () => {
      const current = decode(positionRef.current);
      root.dataset.piStage = String(current.stage);
      root.dataset.piStep = String(current.step);
      root.dataset.piDir = String(directionRef.current);
      root.style.setProperty("--pi-stage", String(current.stage));
      root.style.setProperty("--pi-step", String(current.step));
      root.style.setProperty("--pi-progress", String(positionRef.current / Math.max(1, totalPositions - 1)));

      panels.forEach((panel, index) => {
        const active = index === current.stage;
        panel.dataset.active = active ? "true" : "false";
        panel.setAttribute("aria-hidden", active ? "false" : "true");
      });

      const applyItemStates = (items: HTMLElement[], activeStep: number, activeStage: number) => {
        items.forEach((item, index) => {
          const state = current.stage !== activeStage
            ? "dormant"
            : index === activeStep
              ? "active"
              : index < activeStep
                ? "before"
                : "after";
          item.dataset.state = state;
        });
      };

      applyItemStates(evidence, current.step, 1);
      applyItemStates(cases, current.step, 2);
      applyItemStates(builds, current.step, 4);

      if (interrogation && current.stage === 2) {
        interrogation.dataset.activeLabel = cases[current.step]?.dataset.label ?? "INTERROGATION";
      }
    };

    const rearmGesture = () => {
      consumedRef.current = false;
      accumulatedRef.current = 0;
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (gestureEndTimer.current) window.clearTimeout(gestureEndTimer.current);
      gestureEndTimer.current = window.setTimeout(rearmGesture, 260);
      if (lockedRef.current || consumedRef.current) return;

      accumulatedRef.current += event.deltaY;
      if (Math.abs(accumulatedRef.current) < 42) return;

      const direction = accumulatedRef.current > 0 ? 1 : -1;
      consumedRef.current = true;
      accumulatedRef.current = 0;
      moveTo(positionRef.current + direction, direction);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (["ArrowDown", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        moveTo(positionRef.current + 1, 1);
      } else if (["ArrowUp", "PageUp"].includes(event.key)) {
        event.preventDefault();
        moveTo(positionRef.current - 1, -1);
      } else if (event.key === "Home") {
        event.preventDefault();
        moveTo(0, -1);
      } else if (event.key === "End") {
        event.preventDefault();
        moveTo(totalPositions - 1, 1);
      }
    };

    const onTouchStart = (event: TouchEvent) => {
      touchStartY.current = event.touches[0]?.clientY ?? null;
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (touchStartY.current == null) return;
      const endY = event.changedTouches[0]?.clientY ?? touchStartY.current;
      const delta = touchStartY.current - endY;
      touchStartY.current = null;
      if (Math.abs(delta) < 34 || lockedRef.current) return;
      moveTo(positionRef.current + (delta > 0 ? 1 : -1), delta > 0 ? 1 : -1);
    };

    const onPointerMove = (event: PointerEvent) => {
      const px = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
      const py = (event.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
      root.style.setProperty("--pi-px", px.toFixed(3));
      root.style.setProperty("--pi-py", py.toFixed(3));
    };

    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    applyStates();

    return () => {
      window.removeEventListener("wheel", onWheel, true);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("pointermove", onPointerMove);
      if (gestureEndTimer.current) window.clearTimeout(gestureEndTimer.current);
      if (unlockTimer.current) window.clearTimeout(unlockTimer.current);
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      html.style.overscrollBehavior = previousOverscroll;
    };
  }, [stageCounts, stageStarts, totalPositions]);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".project-intelligence-shell");
    if (!root) return;
    const current = decode(position);
    root.dataset.piStage = String(current.stage);
    root.dataset.piStep = String(current.step);

    const panels = Array.from(root.querySelectorAll<HTMLElement>("[data-pi-stage-panel]"));
    panels.forEach((panel, index) => {
      const active = index === current.stage;
      panel.dataset.active = active ? "true" : "false";
      panel.setAttribute("aria-hidden", active ? "false" : "true");
    });

    const updateItems = (selector: string, stage: number) => {
      const items = Array.from(root.querySelectorAll<HTMLElement>(selector));
      items.forEach((item, index) => {
        item.dataset.state = current.stage !== stage
          ? "dormant"
          : index === current.step
            ? "active"
            : index < current.step
              ? "before"
              : "after";
      });
    };

    updateItems("[data-pi-evidence]", 1);
    updateItems("[data-pi-case]", 2);
    updateItems("[data-pi-build]", 4);

    const interrogation = root.querySelector<HTMLElement>(".pi-stage-interrogation");
    const cases = Array.from(root.querySelectorAll<HTMLElement>("[data-pi-case]"));
    if (interrogation && current.stage === 2) {
      interrogation.dataset.activeLabel = cases[current.step]?.dataset.label ?? "INTERROGATION";
    }
  }, [position]);

  const jumpToStage = (stage: number) => {
    const target = stageStarts[stage] ?? 0;
    moveTo(target, target >= positionRef.current ? 1 : -1);
  };

  return (
    <div className="pi-stage-ui" aria-label="Project Intelligence stages">
      <div className="pi-stage-counter">
        <strong>{String(cursor.stage + 1).padStart(2, "0")}</strong>
        <span>/ 05</span>
      </div>
      <div className="pi-stage-nav">
        {STAGES.map((label, index) => (
          <button
            key={label}
            type="button"
            className={index === cursor.stage ? "active" : ""}
            onClick={() => jumpToStage(index)}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{label}</strong>
          </button>
        ))}
      </div>
      <div className="pi-stage-instruction">
        <span>{cursor.step + 1} / {stageCounts[cursor.stage]}</span>
        <strong>SCROLL / SWIPE TO ADVANCE</strong>
      </div>
    </div>
  );
}
