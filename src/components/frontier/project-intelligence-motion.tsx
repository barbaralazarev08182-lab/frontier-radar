"use client";

import { flushSync } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";

const STAGES = ["CAPTURE", "EVIDENCE", "INTERROGATION", "RESOLUTION", "BUILD"] as const;

type Props = {
  evidenceCount: number;
  caseCount: number;
  buildCount: number;
};

type Cursor = { stage: number; step: number };

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void | Promise<void>) => {
    finished: Promise<void>;
    ready: Promise<void>;
    updateCallbackDone: Promise<void>;
    skipTransition: () => void;
  };
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function ProjectIntelligenceMotion({ evidenceCount, caseCount, buildCount }: Props) {
  const counts = useMemo(
    () => [1, Math.max(1, evidenceCount), Math.max(1, caseCount), 1, Math.max(1, buildCount)],
    [evidenceCount, caseCount, buildCount]
  );

  const starts = useMemo(() => {
    const result: number[] = [];
    let total = 0;
    counts.forEach((count) => {
      result.push(total);
      total += count;
    });
    return result;
  }, [counts]);

  const total = counts.reduce((sum, count) => sum + count, 0);

  const decode = (position: number): Cursor => {
    for (let stage = counts.length - 1; stage >= 0; stage -= 1) {
      if (position >= (starts[stage] ?? 0)) {
        return { stage, step: position - (starts[stage] ?? 0) };
      }
    }
    return { stage: 0, step: 0 };
  };

  const [position, setPosition] = useState(0);
  const positionRef = useRef(0);
  const lockedRef = useRef(false);
  const wheelAccumRef = useRef(0);
  const gestureTimerRef = useRef<number | null>(null);
  const gestureConsumedRef = useRef(false);
  const interrogationMovedRef = useRef(false);
  const touchStartRef = useRef<number | null>(null);
  const pointerFrameRef = useRef<number | null>(null);
  const lastPointerRef = useRef({ x: 0, y: 0, time: 0, ready: false });
  const pendingPointerRef = useRef({ x: 0, y: 0, nx: 0, ny: 0, velocity: 0 });

  const applyDomState = (nextPosition: number) => {
    const shell = document.querySelector<HTMLElement>(".project-intelligence-shell");
    if (!shell) return;

    const cursor = decode(nextPosition);
    shell.dataset.piStage = String(cursor.stage);
    shell.dataset.piStep = String(cursor.step);
    shell.style.setProperty("--pi-progress", String(nextPosition / Math.max(1, total - 1)));

    const panels = Array.from(shell.querySelectorAll<HTMLElement>("[data-pi-stage-panel]"));
    panels.forEach((panel, index) => {
      const active = index === cursor.stage;
      panel.dataset.active = active ? "true" : "false";
      panel.setAttribute("aria-hidden", active ? "false" : "true");
    });

    const setItemStates = (selector: string, stage: number) => {
      const items = Array.from(shell.querySelectorAll<HTMLElement>(selector));
      items.forEach((item, index) => {
        item.dataset.state = cursor.stage !== stage
          ? "dormant"
          : index === cursor.step
            ? "active"
            : index < cursor.step
              ? "before"
              : "after";
      });
    };

    setItemStates("[data-pi-evidence]", 1);
    setItemStates("[data-pi-case]", 2);
    setItemStates("[data-pi-build]", 4);

    const interrogation = shell.querySelector<HTMLElement>(".pi-stage-interrogation");
    if (interrogation && cursor.stage === 2) {
      const active = shell.querySelector<HTMLElement>("[data-pi-case][data-state='active']");
      interrogation.dataset.activeLabel = active?.dataset.label ?? "INTERROGATION";
    }
  };

  const commitPosition = (nextPosition: number) => {
    positionRef.current = nextPosition;
    flushSync(() => setPosition(nextPosition));
    applyDomState(nextPosition);
  };

  const animateFallback = (from: Cursor, to: Cursor, update: () => void) => {
    const shell = document.querySelector<HTMLElement>(".project-intelligence-shell");
    if (!shell) {
      update();
      return;
    }
    const outgoing = shell.querySelector<HTMLElement>(`[data-pi-stage-panel='${from.stage}']`);
    update();
    const incoming = shell.querySelector<HTMLElement>(`[data-pi-stage-panel='${to.stage}']`);
    incoming?.animate(
      [
        { opacity: 0, transform: `translate3d(${to.stage > from.stage ? 7 : -7}vw,0,0) scale(.985)` },
        { opacity: 1, transform: "translate3d(0,0,0) scale(1)" },
      ],
      { duration: 720, easing: "cubic-bezier(.16,1,.3,1)" }
    );
    outgoing?.animate(
      [
        { opacity: 1, transform: "translate3d(0,0,0) scale(1)" },
        { opacity: 0, transform: `translate3d(${to.stage > from.stage ? -5 : 5}vw,0,0) scale(.99)` },
      ],
      { duration: 520, easing: "cubic-bezier(.4,0,.2,1)" }
    );
  };

  const moveTo = (target: number, direction: number, useTransition = true) => {
    const next = clamp(target, 0, total - 1);
    if (next === positionRef.current) return;

    const from = decode(positionRef.current);
    const to = decode(next);
    const stageChanged = from.stage !== to.stage;
    const shell = document.querySelector<HTMLElement>(".project-intelligence-shell");
    const html = document.documentElement;

    if (!stageChanged || !useTransition) {
      commitPosition(next);
      return;
    }

    lockedRef.current = true;
    const transitionKey = `${from.stage}-${to.stage}`;
    shell?.setAttribute("data-pi-transition", transitionKey);
    shell?.setAttribute("data-pi-direction", String(direction));
    html.setAttribute("data-pi-transition", transitionKey);
    html.setAttribute("data-pi-direction", String(direction));

    const update = () => commitPosition(next);
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const vtDocument = document as ViewTransitionDocument;

    if (!prefersReduced && vtDocument.startViewTransition) {
      const transition = vtDocument.startViewTransition(update);
      transition.finished.finally(() => {
        lockedRef.current = false;
        shell?.removeAttribute("data-pi-transition");
        shell?.removeAttribute("data-pi-direction");
        html.removeAttribute("data-pi-transition");
        html.removeAttribute("data-pi-direction");
      });
    } else {
      animateFallback(from, to, update);
      window.setTimeout(() => {
        lockedRef.current = false;
        shell?.removeAttribute("data-pi-transition");
        shell?.removeAttribute("data-pi-direction");
        html.removeAttribute("data-pi-transition");
        html.removeAttribute("data-pi-direction");
      }, 760);
    }
  };

  useEffect(() => {
    const shell = document.querySelector<HTMLElement>(".project-intelligence-shell");
    if (!shell) return;

    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousOverscroll = html.style.overscrollBehavior;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    applyDomState(0);

    const endGesture = () => {
      wheelAccumRef.current = 0;
      gestureConsumedRef.current = false;
      interrogationMovedRef.current = false;
      shell.removeAttribute("data-pi-scrub");
    };

    const scheduleGestureEnd = () => {
      if (gestureTimerRef.current) window.clearTimeout(gestureTimerRef.current);
      gestureTimerRef.current = window.setTimeout(endGesture, 190);
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      scheduleGestureEnd();
      if (lockedRef.current) return;

      const cursor = decode(positionRef.current);
      wheelAccumRef.current += event.deltaY;

      if (cursor.stage === 2) {
        shell.dataset.piScrub = "true";
        const threshold = 46;
        while (Math.abs(wheelAccumRef.current) >= threshold) {
          const direction = wheelAccumRef.current > 0 ? 1 : -1;
          const stageStart = starts[2] ?? 0;
          const stageEnd = stageStart + (counts[2] ?? 1) - 1;
          const next = positionRef.current + direction;
          const canMoveInside = next >= stageStart && next <= stageEnd;

          if (canMoveInside) {
            moveTo(next, direction, false);
            interrogationMovedRef.current = true;
            wheelAccumRef.current -= direction * threshold;
            continue;
          }

          if (interrogationMovedRef.current || gestureConsumedRef.current) {
            wheelAccumRef.current = 0;
            return;
          }

          gestureConsumedRef.current = true;
          wheelAccumRef.current = 0;
          moveTo(positionRef.current + direction, direction, true);
          return;
        }
        return;
      }

      if (gestureConsumedRef.current || Math.abs(wheelAccumRef.current) < 38) return;
      const direction = wheelAccumRef.current > 0 ? 1 : -1;
      wheelAccumRef.current = 0;
      gestureConsumedRef.current = true;
      moveTo(positionRef.current + direction, direction, true);
    };

    const onKey = (event: KeyboardEvent) => {
      if (lockedRef.current) return;
      if (["ArrowDown", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        moveTo(positionRef.current + 1, 1, true);
      } else if (["ArrowUp", "PageUp"].includes(event.key)) {
        event.preventDefault();
        moveTo(positionRef.current - 1, -1, true);
      } else if (event.key === "Home") {
        event.preventDefault();
        moveTo(0, -1, true);
      } else if (event.key === "End") {
        event.preventDefault();
        moveTo(total - 1, 1, true);
      }
    };

    const onTouchStart = (event: TouchEvent) => {
      touchStartRef.current = event.touches[0]?.clientY ?? null;
    };

    const onTouchEnd = (event: TouchEvent) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (start == null || lockedRef.current) return;
      const end = event.changedTouches[0]?.clientY ?? start;
      const delta = start - end;
      if (Math.abs(delta) < 34) return;
      const direction = delta > 0 ? 1 : -1;
      const cursor = decode(positionRef.current);

      if (cursor.stage === 2) {
        const stageStart = starts[2] ?? 0;
        const stageEnd = stageStart + (counts[2] ?? 1) - 1;
        const distance = Math.max(1, Math.round(Math.abs(delta) / 76));
        const target = clamp(positionRef.current + direction * distance, stageStart, stageEnd);
        if (target !== positionRef.current) {
          moveTo(target, direction, false);
          return;
        }
      }
      moveTo(positionRef.current + direction, direction, true);
    };

    const flushPointer = () => {
      pointerFrameRef.current = null;
      const pending = pendingPointerRef.current;
      shell.style.setProperty("--pi-px", pending.nx.toFixed(3));
      shell.style.setProperty("--pi-py", pending.ny.toFixed(3));
      shell.style.setProperty("--pi-mx", `${pending.x}px`);
      shell.style.setProperty("--pi-my", `${pending.y}px`);
      shell.style.setProperty("--pi-pointer-v", pending.velocity.toFixed(3));
    };

    const onPointerMove = (event: PointerEvent) => {
      const now = performance.now();
      const previous = lastPointerRef.current;
      let velocity = 0;
      if (previous.ready) {
        const dt = Math.max(16, now - previous.time);
        velocity = Math.min(1, Math.hypot(event.clientX - previous.x, event.clientY - previous.y) / dt / 1.3);
      }
      lastPointerRef.current = { x: event.clientX, y: event.clientY, time: now, ready: true };
      pendingPointerRef.current = {
        x: event.clientX,
        y: event.clientY,
        nx: event.clientX / Math.max(1, window.innerWidth) - 0.5,
        ny: event.clientY / Math.max(1, window.innerHeight) - 0.5,
        velocity,
      };
      if (pointerFrameRef.current == null) pointerFrameRef.current = window.requestAnimationFrame(flushPointer);
    };

    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    return () => {
      window.removeEventListener("wheel", onWheel, true);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("pointermove", onPointerMove);
      if (gestureTimerRef.current) window.clearTimeout(gestureTimerRef.current);
      if (pointerFrameRef.current) window.cancelAnimationFrame(pointerFrameRef.current);
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      html.style.overscrollBehavior = previousOverscroll;
      html.removeAttribute("data-pi-transition");
      html.removeAttribute("data-pi-direction");
    };
  }, [counts, starts, total]);

  const cursor = decode(position);

  return (
    <div className="pi-ui" aria-label="Project Intelligence navigation">
      <div className="pi-pointer" aria-hidden="true" />
      <nav className="pi-trace" aria-label="Investigation stages">
        {STAGES.map((label, stage) => {
          const active = stage === cursor.stage;
          return (
            <button
              key={label}
              type="button"
              className={active ? "active" : ""}
              onClick={() => {
                if (lockedRef.current) return;
                const target = starts[stage] ?? 0;
                moveTo(target, target >= positionRef.current ? 1 : -1, true);
              }}
            >
              <i />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
      <div className="pi-progress-note">
        {cursor.stage === 2
          ? `${cursor.step + 1} / ${counts[2]}  SCRUB TO INTERROGATE`
          : `${cursor.stage + 1} / 5  SCROLL / SWIPE`}
      </div>
    </div>
  );
}
