"use client";

import { useEffect } from "react";

const STAGE_IDS = ["capture", "evidence", "interrogation", "resolution", "build"] as const;

type ScoreRead = {
  label: string;
  value: number;
};

function makeSummary(
  primaryLabel: string,
  primaryRead: string,
  secondaryLabel: string,
  secondaryRead: string,
  note?: string,
): HTMLDivElement {
  const summary = document.createElement("div");
  summary.className = "pr-reading-summary";
  summary.setAttribute("role", "note");

  const primary = document.createElement("div");
  const primaryKicker = document.createElement("span");
  primaryKicker.textContent = primaryLabel;
  const primaryStrong = document.createElement("strong");
  primaryStrong.textContent = primaryRead;
  primary.append(primaryKicker, primaryStrong);

  const secondary = document.createElement("div");
  secondary.className = "is-signal";
  const secondaryKicker = document.createElement("span");
  secondaryKicker.textContent = secondaryLabel;
  const secondaryStrong = document.createElement("strong");
  secondaryStrong.textContent = secondaryRead;
  secondary.append(secondaryKicker, secondaryStrong);

  if (note) {
    const copy = document.createElement("p");
    copy.textContent = note;
    secondary.append(copy);
  }

  summary.append(primary, secondary);
  return summary;
}

function scoreReads(root: HTMLElement): ScoreRead[] {
  return Array.from(root.querySelectorAll<SVGGElement>(".pr-score-visual svg g"))
    .map((group) => {
      const label = group.querySelector<SVGTextElement>(".pr-score-label")?.textContent?.trim() ?? "";
      const raw = group.querySelector<SVGTextElement>(".pr-score-value")?.textContent?.trim() ?? "";
      const value = Number(raw);
      return { label, value };
    })
    .filter((entry) => entry.label.length > 0 && Number.isFinite(entry.value));
}

export function ProjectReadingController() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".pr-shell");
    if (!root) return;

    root.classList.add("is-reading-enhanced");
    root.style.setProperty("--pr-px", "0");
    root.style.setProperty("--pr-py", "0");
    root.style.setProperty("--pr-pointer-v", "0");

    const injected: HTMLElement[] = [];
    const stageLinks = Array.from(root.querySelectorAll<HTMLAnchorElement>(".pr-stage-links a"));
    const sections = STAGE_IDS
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section instanceof HTMLElement);

    const interrogation = root.querySelector<HTMLElement>("#interrogation");
    if (interrogation) {
      const rows = Array.from(interrogation.querySelectorAll<HTMLElement>(".pr-question-row"));
      const observed = rows.filter((row) => row.querySelector(".pr-kind-observed")).length;
      const inference = rows.filter((row) => row.querySelector(".pr-kind-inference")).length;
      const open = rows.filter((row) => row.querySelector(".pr-kind-open-question")).length;

      if (rows.length <= 2) interrogation.classList.add("is-sparse-stage");

      const body = interrogation.querySelector<HTMLElement>(".pr-section-body");
      const ledger = interrogation.querySelector<HTMLElement>(".pr-question-ledger");
      if (body && ledger) {
        const note = observed === 0 && inference > 0
          ? "This stage is interpretive rather than directly observed. Verify the underlying Evidence ledger before treating the read as a fact."
          : open > 0
            ? "Keep observed facts separate from unresolved questions; the orange rows are deliberately not confirmation."
            : "Use the epistemic labels to separate direct observation from Frontier Radar's interpretation.";
        const summary = makeSummary(
          "EPISTEMIC MIX",
          `${observed} OBSERVED · ${inference} INFERENCE · ${open} OPEN`,
          "READ THIS STAGE AS",
          observed === 0 && inference > 0 ? "INTERPRETATION, NOT CONFIRMATION" : "EVIDENCE FIRST, INTERPRETATION SECOND",
          note,
        );
        body.insertBefore(summary, ledger);
        injected.push(summary);
      }
    }

    const resolution = root.querySelector<HTMLElement>("#resolution");
    if (resolution) {
      const reads = scoreReads(resolution).sort((a, b) => b.value - a.value);
      const scoreVisual = resolution.querySelector<HTMLElement>(".pr-score-visual");
      const scoreColumn = scoreVisual?.parentElement;

      if (scoreColumn && scoreVisual && reads.length > 0) {
        const top = reads.slice(0, 2).map((entry) => `${entry.label} ${Math.round(entry.value)}`).join(" · ");
        const bottom = [...reads]
          .sort((a, b) => a.value - b.value)
          .slice(0, 2)
          .map((entry) => `${entry.label} ${Math.round(entry.value)}`)
          .join(" · ");
        const summary = makeSummary(
          "HIGHEST NORMALIZED",
          top,
          "LOWEST NORMALIZED",
          bottom,
          "Read the spread before the total. These are normalized dimensions shown for comparison, not independent causal contributions to the final score.",
        );
        scoreColumn.insertBefore(summary, scoreVisual);
        injected.push(summary);
      }
    }

    const updateReadingState = () => {
      const navOffset = 96;
      let active = sections[0]?.id ?? "capture";
      let bestVisible = -1;

      for (const section of sections) {
        const rect = section.getBoundingClientRect();
        const visibleTop = Math.max(navOffset, rect.top);
        const visibleBottom = Math.min(window.innerHeight, rect.bottom);
        const visible = Math.max(0, visibleBottom - visibleTop);
        if (visible > bestVisible) {
          bestVisible = visible;
          active = section.id;
        }
      }

      root.dataset.activeStage = active;
      stageLinks.forEach((link) => {
        const isActive = link.getAttribute("href") === `#${active}`;
        link.classList.toggle("is-active", isActive);
        if (isActive) link.setAttribute("aria-current", "step");
        else link.removeAttribute("aria-current");
      });

      const rect = root.getBoundingClientRect();
      const travel = Math.max(1, root.scrollHeight - window.innerHeight);
      const progressed = Math.min(travel, Math.max(0, -rect.top));
      root.style.setProperty("--reading-progress", `${(progressed / travel) * 100}%`);
    };

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateReadingState();
      });
    };

    let pointerFrame = 0;
    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;
    let previousPointerX = pointerX;
    let previousPointerY = pointerY;
    let previousPointerTime = performance.now();

    const flushPointer = () => {
      pointerFrame = 0;
      const width = Math.max(1, window.innerWidth);
      const height = Math.max(1, window.innerHeight);
      root.style.setProperty("--pr-px", (pointerX / width - 0.5).toFixed(3));
      root.style.setProperty("--pr-py", (pointerY / height - 0.5).toFixed(3));
      root.style.setProperty("--pr-mx", `${pointerX.toFixed(1)}px`);
      root.style.setProperty("--pr-my", `${pointerY.toFixed(1)}px`);
    };

    const onPointerMove = (event: PointerEvent) => {
      const now = performance.now();
      const dt = Math.max(16, now - previousPointerTime);
      const velocity = Math.min(1, Math.hypot(event.clientX - previousPointerX, event.clientY - previousPointerY) / dt / 1.3);
      pointerX = event.clientX;
      pointerY = event.clientY;
      previousPointerX = event.clientX;
      previousPointerY = event.clientY;
      previousPointerTime = now;
      root.style.setProperty("--pr-pointer-v", velocity.toFixed(3));
      if (!pointerFrame) pointerFrame = window.requestAnimationFrame(flushPointer);
    };

    const onPointerLeave = () => {
      root.style.setProperty("--pr-px", "0");
      root.style.setProperty("--pr-py", "0");
      root.style.setProperty("--pr-pointer-v", "0");
    };

    const revealTargets = Array.from(root.querySelectorAll<HTMLElement>([
      ".pr-capture-main",
      ".pr-verdict",
      ".pr-evidence-row",
      ".pr-question-row",
      ".pr-reading-summary",
      ".pr-score-visual",
      ".pr-score-notes p",
      ".pr-resolution-verdict",
      ".pr-build-row",
      ".pr-source-ledger",
    ].join(",")));

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).classList.add("is-revealed");
        revealObserver.unobserve(entry.target);
      });
    }, {
      threshold: 0.1,
      rootMargin: "0px 0px -5% 0px",
    });

    revealTargets.forEach((target, index) => {
      target.style.setProperty("--reveal-order", String(index));
      revealObserver.observe(target);
    });

    updateReadingState();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      revealObserver.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      if (pointerFrame) window.cancelAnimationFrame(pointerFrame);
      injected.forEach((node) => node.remove());
      interrogation?.classList.remove("is-sparse-stage");
      root.classList.remove("is-reading-enhanced");
      root.style.removeProperty("--pr-px");
      root.style.removeProperty("--pr-py");
      root.style.removeProperty("--pr-mx");
      root.style.removeProperty("--pr-my");
      root.style.removeProperty("--pr-pointer-v");
    };
  }, []);

  return null;
}