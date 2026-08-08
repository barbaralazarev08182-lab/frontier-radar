"use client";

import { useEffect, useRef } from "react";

type SignalDetail = {
  momentum: string;
  sources: string;
  match: string;
  novelty: string;
  whyNow: string;
};

const DETAILS: Record<string, SignalDetail> = {
  "01": {
    momentum: "+382%",
    sources: "4 SOURCES",
    match: "96%",
    novelty: "61",
    whyNow: "Memory is shifting from a feature into agent infrastructure.",
  },
  "02": {
    momentum: "+244%",
    sources: "3 SOURCES",
    match: "92%",
    novelty: "72",
    whyNow: "Browser-native orchestration is becoming a serious runtime layer.",
  },
  "03": {
    momentum: "+198%",
    sources: "5 SOURCES",
    match: "89%",
    novelty: "68",
    whyNow: "Local multimodal latency is crossing the threshold from demo to habit.",
  },
  "04": {
    momentum: "+171%",
    sources: "3 SOURCES",
    match: "86%",
    novelty: "84",
    whyNow: "Motion is starting to become an interface primitive, not decoration.",
  },
  "05": {
    momentum: "+139%",
    sources: "2 SOURCES",
    match: "83%",
    novelty: "58",
    whyNow: "Smaller runtimes are making edge deployment feel less compromised.",
  },
  "06": {
    momentum: "+112%",
    sources: "3 SOURCES",
    match: "41%",
    novelty: "91",
    whyNow: "This sits outside your normal feed, but its interaction model is unusually strong.",
  },
  "07": {
    momentum: "+74%",
    sources: "2 SOURCES",
    match: "27%",
    novelty: "98",
    whyNow: "It is too strange to rank highly, which is exactly why it survived the scan.",
  },
};

const INTENT_DELAY_MS = 220;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getRank(signal: HTMLElement) {
  return signal.querySelector<HTMLElement>(".motion-lab-rank")?.textContent?.trim() ?? "--";
}

function createDeepLayer(rank: string, detail: SignalDetail) {
  const layer = document.createElement("div");
  layer.className = "motion-lab-deep-layer";
  layer.setAttribute("aria-hidden", "true");

  const kicker = document.createElement("div");
  kicker.className = "motion-lab-deep-kicker";
  kicker.innerHTML = `<span>XRAY / ${rank}</span><span>SECOND LAYER</span>`;

  const metrics = document.createElement("div");
  metrics.className = "motion-lab-deep-metrics";
  metrics.innerHTML = `
    <div><span>MOMENTUM</span><strong>${detail.momentum}</strong></div>
    <div><span>EVIDENCE</span><strong>${detail.sources}</strong></div>
    <div><span>YOUR MATCH</span><strong>${detail.match}</strong></div>
    <div><span>NOVELTY</span><strong>${detail.novelty}</strong></div>
  `;

  const why = document.createElement("div");
  why.className = "motion-lab-deep-why";
  why.innerHTML = `<span>WHY NOW</span><p>${detail.whyNow}</p>`;

  layer.append(kicker, metrics, why);
  return layer;
}

export function MotionLabInteractions() {
  const scannerRef = useRef<HTMLDivElement | null>(null);
  const scannerRankRef = useRef<HTMLStrongElement | null>(null);
  const scannerModeRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".motion-lab-shell");
    const scanner = scannerRef.current;
    if (!root || !scanner) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const signals = Array.from(root.querySelectorAll<HTMLElement>(".motion-lab-signal"));
    const scroller = root.querySelector<HTMLElement>(".motion-lab-scroller");
    const stateSpan = root.querySelector<HTMLElement>(".motion-lab-hud dl > div:first-child dd span");
    const metaLabel = root.querySelector<HTMLElement>(".motion-lab-meta > div:first-child span");
    const previousMetaLabel = metaLabel?.textContent ?? "";

    if (metaLabel) metaLabel.textContent = "LAB-04 SCANNER + FOCUS GRAVITY / LAB-03 MOTION PRESERVED";

    if (reduced || coarsePointer || signals.length === 0) {
      root.dataset.pointerLab = "disabled";
      return () => {
        if (metaLabel) metaLabel.textContent = previousMetaLabel;
        root.removeAttribute("data-pointer-lab");
      };
    }

    root.dataset.pointerLab = "ready";

    const injectedLayers: HTMLElement[] = [];
    signals.forEach((signal) => {
      const rank = getRank(signal);
      const detail = DETAILS[rank];
      if (!detail || signal.querySelector(".motion-lab-deep-layer")) return;
      const layer = createDeepLayer(rank, detail);
      signal.appendChild(layer);
      injectedLayers.push(layer);
    });

    let hoverTimer = 0;
    let pointerFrame = 0;
    let activeSignal: HTMLElement | null = null;
    let pointerX = 0;
    let pointerY = 0;
    let baseRects: Map<HTMLElement, DOMRect> | null = null;

    const isOverview = () => {
      const state = stateSpan?.textContent?.trim();
      return state === "OVERVIEW" && root.dataset.layout === "overview";
    };

    const setScannerMode = (mode: "SCAN" | "FOCUS") => {
      if (scannerModeRef.current) scannerModeRef.current.textContent = mode;
      scanner.dataset.mode = mode.toLowerCase();
    };

    const resetGravity = () => {
      window.clearTimeout(hoverTimer);
      root.removeAttribute("data-focus");
      signals.forEach((signal) => {
        signal.dataset.focused = "false";
        signal.style.setProperty("--gravity-x", "0px");
        signal.style.setProperty("--gravity-y", "0px");
        signal.style.setProperty("--gravity-scale", "1");
      });
      if (activeSignal) setScannerMode("SCAN");
    };

    const deactivateScanner = () => {
      window.clearTimeout(hoverTimer);
      if (activeSignal) activeSignal.dataset.scanActive = "false";
      activeSignal = null;
      scanner.dataset.active = "false";
      root.dataset.scanning = "false";
      resetGravity();
    };

    const captureBaseRects = () => {
      baseRects = new Map(signals.map((signal) => [signal, signal.getBoundingClientRect()]));
    };

    const applyGravity = (focusSignal: HTMLElement) => {
      if (!isOverview() || activeSignal !== focusSignal) return;
      if (!baseRects) captureBaseRects();
      const focusRect = baseRects?.get(focusSignal);
      if (!focusRect) return;

      const focusCx = focusRect.left + focusRect.width / 2;
      const focusCy = focusRect.top + focusRect.height / 2;
      const rank = getRank(focusSignal);

      root.dataset.focus = rank;
      setScannerMode("FOCUS");

      signals.forEach((signal) => {
        const rect = baseRects?.get(signal);
        if (!rect) return;

        if (signal === focusSignal) {
          signal.dataset.focused = "true";
          signal.style.setProperty("--gravity-x", "0px");
          signal.style.setProperty("--gravity-y", "0px");
          signal.style.setProperty("--gravity-scale", "1.045");
          return;
        }

        signal.dataset.focused = "false";
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        let dx = cx - focusCx;
        let dy = cy - focusCy;
        const distance = Math.max(1, Math.hypot(dx, dy));
        dx /= distance;
        dy /= distance;

        const proximity = 1 - clamp(distance / 980, 0, 1);
        const push = 28 + proximity * 42;
        signal.style.setProperty("--gravity-x", `${(dx * push).toFixed(2)}px`);
        signal.style.setProperty("--gravity-y", `${(dy * push).toFixed(2)}px`);
        signal.style.setProperty("--gravity-scale", `${(0.985 - proximity * 0.012).toFixed(4)}`);
      });
    };

    const writePointer = () => {
      pointerFrame = 0;
      if (!activeSignal || !isOverview()) return;

      const rect = activeSignal.getBoundingClientRect();
      const localX = clamp(pointerX - rect.left, 0, rect.width);
      const localY = clamp(pointerY - rect.top, 0, rect.height);

      scanner.style.setProperty("--scanner-x", `${pointerX}px`);
      scanner.style.setProperty("--scanner-y", `${pointerY}px`);
      activeSignal.style.setProperty("--scan-local-x", `${localX}px`);
      activeSignal.style.setProperty("--scan-local-y", `${localY}px`);
    };

    const requestPointerWrite = () => {
      if (!pointerFrame) pointerFrame = window.requestAnimationFrame(writePointer);
    };

    const handlers = signals.map((signal) => {
      const onEnter = (event: PointerEvent) => {
        if (event.pointerType === "touch" || !isOverview()) return;

        if (activeSignal && activeSignal !== signal) {
          activeSignal.dataset.scanActive = "false";
          resetGravity();
        }

        if (!baseRects) captureBaseRects();
        activeSignal = signal;
        signal.dataset.scanActive = "true";
        root.dataset.scanning = "true";
        scanner.dataset.active = "true";
        setScannerMode("SCAN");

        const rank = getRank(signal);
        if (scannerRankRef.current) scannerRankRef.current.textContent = rank;
        pointerX = event.clientX;
        pointerY = event.clientY;
        requestPointerWrite();

        window.clearTimeout(hoverTimer);
        hoverTimer = window.setTimeout(() => applyGravity(signal), INTENT_DELAY_MS);
      };

      const onMove = (event: PointerEvent) => {
        if (activeSignal !== signal || !isOverview()) return;
        pointerX = event.clientX;
        pointerY = event.clientY;
        requestPointerWrite();
      };

      const onLeave = () => {
        if (activeSignal !== signal) return;
        deactivateScanner();
      };

      signal.addEventListener("pointerenter", onEnter);
      signal.addEventListener("pointermove", onMove, { passive: true });
      signal.addEventListener("pointerleave", onLeave);

      return { signal, onEnter, onMove, onLeave };
    });

    const onScroll = () => {
      window.requestAnimationFrame(() => {
        if (!isOverview()) {
          deactivateScanner();
          baseRects = null;
        }
      });
    };

    const onResize = () => {
      baseRects = null;
      deactivateScanner();
    };

    scroller?.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      window.clearTimeout(hoverTimer);
      if (pointerFrame) window.cancelAnimationFrame(pointerFrame);
      handlers.forEach(({ signal, onEnter, onMove, onLeave }) => {
        signal.removeEventListener("pointerenter", onEnter);
        signal.removeEventListener("pointermove", onMove);
        signal.removeEventListener("pointerleave", onLeave);
      });
      scroller?.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      injectedLayers.forEach((layer) => layer.remove());
      if (metaLabel) metaLabel.textContent = previousMetaLabel;
      root.removeAttribute("data-focus");
      root.removeAttribute("data-scanning");
      root.removeAttribute("data-pointer-lab");
    };
  }, []);

  return (
    <div ref={scannerRef} data-active="false" data-mode="scan" className="motion-lab-scanner" aria-hidden="true">
      <span ref={scannerModeRef}>SCAN</span>
      <strong ref={scannerRankRef}>--</strong>
      <small>MOVE TO READ · HOLD TO FOCUS</small>
    </div>
  );
}
