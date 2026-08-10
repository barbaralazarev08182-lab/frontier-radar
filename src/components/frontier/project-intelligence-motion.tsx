"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const STAGES = ["CAPTURE", "EVIDENCE", "INTERROGATION", "RESOLUTION", "BUILD"] as const;

const PERF_STYLE = `
.project-intelligence-shell .pi-stage[data-active="true"]::after {
  content: none !important;
  display: none !important;
  animation: none !important;
}

.project-intelligence-shell .pi-stage {
  filter: none !important;
  contain: paint;
  backface-visibility: hidden;
  will-change: transform, opacity;
  transition:
    opacity 260ms ease,
    transform 700ms cubic-bezier(.16,1,.3,1),
    visibility 0s linear 700ms !important;
}

.project-intelligence-shell .pi-stage[data-active="true"] {
  animation: none !important;
}

.project-intelligence-shell .pi-hud-tag,
.project-intelligence-shell .pi-capture-sheet-1 {
  backdrop-filter: none !important;
}

.project-intelligence-shell .pi-hud-tag {
  background: rgba(247,245,238,.84) !important;
}

.project-intelligence-shell .pi-pointer-field {
  inset: auto !important;
  left: 0 !important;
  top: 0 !important;
  width: 520px !important;
  height: 520px !important;
  transform: translate3d(calc(var(--pi-mx) - 260px), calc(var(--pi-my) - 260px), 0);
  will-change: transform;
  contain: strict;
  background:
    radial-gradient(circle at 50% 50%, rgba(255,255,255,.13), transparent 34%),
    radial-gradient(circle at 50% 50%, rgba(118,205,255,.07), transparent 74%) !important;
}

.project-intelligence-shell[data-pi-stage="2"] .pi-pointer-field {
  background:
    radial-gradient(circle at 50% 50%, rgba(255,235,211,.20), transparent 32%),
    radial-gradient(circle at 50% 50%, rgba(80,0,0,.13), transparent 72%) !important;
}

.project-intelligence-shell[data-pi-stage="4"] .pi-pointer-field {
  background:
    radial-gradient(circle at 50% 50%, rgba(255,255,255,.18), transparent 34%),
    radial-gradient(circle at 50% 50%, rgba(137,214,255,.12), transparent 76%) !important;
}

.project-intelligence-shell[data-pi-scrub="true"] .pi-stage-interrogation::after {
  content: none !important;
  display: none !important;
  animation: none !important;
}

.project-intelligence-shell[data-pi-scrub="true"] .pi-interrogation-stack::after {
  content: "";
  position: absolute;
  left: 18%;
  right: 18%;
  top: 50%;
  z-index: 40;
  height: 2px;
  pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(255,243,226,.76), transparent);
  box-shadow: 0 0 18px rgba(255,230,190,.34);
  animation: pi-perf-scrub-line .34s ease-out infinite alternate;
}

.project-intelligence-shell[data-pi-scrub="true"] .pi-interrogation-card[data-state="active"] {
  animation: none !important;
}

.project-intelligence-shell[data-pi-transitioning="true"] .pi-capture-object,
.project-intelligence-shell[data-pi-transitioning="true"] .pi-capture-sheet,
.project-intelligence-shell[data-pi-transitioning="true"] .pi-hud-orbit,
.project-intelligence-shell[data-pi-transitioning="true"] .pi-hud-reticle,
.project-intelligence-shell[data-pi-transitioning="true"] .pi-hud-tag,
.project-intelligence-shell[data-pi-transitioning="true"] .pi-stage-evidence::before,
.project-intelligence-shell[data-pi-transitioning="true"] .pi-evidence-card,
.project-intelligence-shell[data-pi-transitioning="true"] .pi-stage-interrogation::before,
.project-intelligence-shell[data-pi-transitioning="true"] .pi-interrogation-card,
.project-intelligence-shell[data-pi-transitioning="true"] .pi-stage-resolution::before,
.project-intelligence-shell[data-pi-transitioning="true"] .pi-score-shard,
.project-intelligence-shell[data-pi-transitioning="true"] .pi-resolution-core,
.project-intelligence-shell[data-pi-transitioning="true"] .pi-stage-build::before,
.project-intelligence-shell[data-pi-transitioning="true"] .pi-build-card {
  animation-play-state: paused !important;
}

@keyframes pi-perf-scrub-line {
  from { transform: scaleX(.58); opacity: .34; }
  to { transform: scaleX(1); opacity: .9; }
}

@keyframes pi-v4-build-tunnel {
  0% { transform: scale(.18) rotate(-8deg); opacity: 0; }
  42% { transform: scale(.92) rotate(0deg); opacity: .95; }
  100% { transform: scale(3.2) rotate(7deg); opacity: 0; }
}
`;

type Props = {
  evidenceCount: number;
  caseCount: number;
  buildCount: number;
};

type Cursor = {
  stage: number;
  step: number;
};

type MoveOptions = {
  lockMs?: number;
  transition?: boolean;
};

type PendingPointer = {
  px: number;
  py: number;
  x: number;
  y: number;
  velocity: number;
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
  const interrogationDeltaRef = useRef(0);
  const interrogationMovedRef = useRef(false);
  const gestureEndTimer = useRef<number | null>(null);
  const unlockTimer = useRef<number | null>(null);
  const transitionTimer = useRef<number | null>(null);
  const pointerVelocityTimer = useRef<number | null>(null);
  const pointerFrameRef = useRef<number | null>(null);
  const pendingPointerRef = useRef<PendingPointer | null>(null);
  const touchStartY = useRef<number | null>(null);
  const directionRef = useRef(1);
  const lastPointerRef = useRef({ x: 0, y: 0, ready: false });

  const cursor = decode(position);

  const moveTo = (next: number, direction: number, options: MoveOptions = {}) => {
    const clamped = Math.max(0, Math.min(totalPositions - 1, next));
    if (clamped === positionRef.current) return;

    const from = decode(positionRef.current);
    const to = decode(clamped);
    const root = document.querySelector<HTMLElement>(".project-intelligence-shell");

    directionRef.current = direction;
    positionRef.current = clamped;
    setPosition(clamped);

    if (root) {
      root.dataset.piStage = String(to.stage);
      root.dataset.piStep = String(to.step);
      root.dataset.piDir = String(direction);
    }

    const lockMs = options.lockMs ?? 920;
    lockedRef.current = lockMs > 0;
    if (unlockTimer.current) window.clearTimeout(unlockTimer.current);
    if (lockMs > 0) {
      unlockTimer.current = window.setTimeout(() => {
        lockedRef.current = false;
      }, lockMs);
    }

    if (root && options.transition !== false && from.stage !== to.stage) {
      root.dataset.piTransition = `${from.stage}-${to.stage}`;
      root.dataset.piTransitioning = "true";
      root.style.setProperty("--pi-transition-dir", String(direction));
      if (transitionTimer.current) window.clearTimeout(transitionTimer.current);
      transitionTimer.current = window.setTimeout(() => {
        delete root.dataset.piTransitioning;
      }, 980);
    }
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
      interrogationDeltaRef.current = 0;
      interrogationMovedRef.current = false;
      delete root.dataset.piScrub;
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (gestureEndTimer.current) window.clearTimeout(gestureEndTimer.current);
      gestureEndTimer.current = window.setTimeout(rearmGesture, 280);

      const current = decode(positionRef.current);

      if (current.stage === 2) {
        root.dataset.piScrub = "true";
        interrogationDeltaRef.current += event.deltaY;
        const threshold = 58;
        if (Math.abs(interrogationDeltaRef.current) < threshold) return;

        const direction = interrogationDeltaRef.current > 0 ? 1 : -1;
        const start = stageStarts[2] ?? 0;
        const end = start + (stageCounts[2] ?? 1) - 1;
        const canMoveInside = direction > 0
          ? positionRef.current < end
          : positionRef.current > start;

        if (canMoveInside) {
          const steps = Math.max(1, Math.floor(Math.abs(interrogationDeltaRef.current) / threshold));
          const target = Math.max(start, Math.min(end, positionRef.current + direction * steps));
          interrogationDeltaRef.current -= direction * steps * threshold;
          interrogationMovedRef.current = true;
          moveTo(target, direction, { lockMs: 0, transition: false });

          if (target === start || target === end) consumedRef.current = true;
          return;
        }

        if (interrogationMovedRef.current || consumedRef.current) {
          consumedRef.current = true;
          return;
        }

        interrogationDeltaRef.current = 0;
        consumedRef.current = true;
        moveTo(positionRef.current + direction, direction);
        return;
      }

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

      const current = decode(positionRef.current);
      const direction = delta > 0 ? 1 : -1;
      if (current.stage === 2) {
        const start = stageStarts[2] ?? 0;
        const end = start + (stageCounts[2] ?? 1) - 1;
        const distance = Math.max(1, Math.round(Math.abs(delta) / 72));
        const target = Math.max(start, Math.min(end, positionRef.current + direction * distance));
        if (target !== positionRef.current) {
          moveTo(target, direction, { lockMs: 0, transition: false });
          return;
        }
      }
      moveTo(positionRef.current + direction, direction);
    };

    const flushPointer = () => {
      pointerFrameRef.current = null;
      const pending = pendingPointerRef.current;
      if (!pending) return;

      root.style.setProperty("--pi-px", pending.px.toFixed(3));
      root.style.setProperty("--pi-py", pending.py.toFixed(3));
      root.style.setProperty("--pi-mx", `${pending.x}px`);
      root.style.setProperty("--pi-my", `${pending.y}px`);
      root.style.setProperty("--pi-pointer-v", pending.velocity.toFixed(3));

      if (pointerVelocityTimer.current) window.clearTimeout(pointerVelocityTimer.current);
      pointerVelocityTimer.current = window.setTimeout(() => {
        root.style.setProperty("--pi-pointer-v", "0");
      }, 90);
    };

    const onPointerMove = (event: PointerEvent) => {
      const px = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
      const py = (event.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
      const last = lastPointerRef.current;
      const velocity = last.ready
        ? Math.min(1, Math.hypot(event.clientX - last.x, event.clientY - last.y) / 64)
        : 0;
      lastPointerRef.current = { x: event.clientX, y: event.clientY, ready: true };
      pendingPointerRef.current = { px, py, x: event.clientX, y: event.clientY, velocity };

      if (pointerFrameRef.current == null) {
        pointerFrameRef.current = window.requestAnimationFrame(flushPointer);
      }
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
      if (transitionTimer.current) window.clearTimeout(transitionTimer.current);
      if (pointerVelocityTimer.current) window.clearTimeout(pointerVelocityTimer.current);
      if (pointerFrameRef.current != null) window.cancelAnimationFrame(pointerFrameRef.current);
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
      <style>{PERF_STYLE}</style>
      <div className="pi-pointer-field" aria-hidden="true" />
      <div className="pi-pointer-probe" aria-hidden="true">
        <i />
        <b />
        <span>FR</span>
      </div>

      <div className="pi-capture-hud" aria-hidden="true">
        <div className="pi-hud-orbit pi-hud-orbit-a" />
        <div className="pi-hud-orbit pi-hud-orbit-b" />
        <div className="pi-hud-reticle" />
        <span className="pi-hud-tag pi-hud-tag-a">DOSSIER / ACTIVE</span>
        <span className="pi-hud-tag pi-hud-tag-b">CURSOR / PROBE</span>
        <span className="pi-hud-tag pi-hud-tag-c">TRACE / LIVE</span>
      </div>

      <div className="pi-transition-gate" aria-hidden="true">
        <i className="pi-gate-blade pi-gate-blade-a" />
        <i className="pi-gate-blade pi-gate-blade-b" />
        <b className="pi-gate-core" />
      </div>

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
        <strong>{cursor.stage === 2 ? "ONE GESTURE / SCRUB THE CASE" : "SCROLL / SWIPE TO ADVANCE"}</strong>
      </div>
    </div>
  );
}
