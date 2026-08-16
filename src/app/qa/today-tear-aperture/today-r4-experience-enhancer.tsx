"use client";

import { useEffect } from "react";

const SIGNAL_META = [
  { rank: "01", lane: "core", label: "LOCAL-FIRST" },
  { rank: "02", lane: "core", label: "LICENSE-SEARCH" },
  { rank: "03", lane: "core", label: "LOCAL AUDIO" },
  { rank: "04", lane: "core", label: "MOCK-API" },
  { rank: "05", lane: "core", label: "LOCAL-FIRST" },
  { rank: "06", lane: "adjacent", label: "OUTSIDE YOUR BUBBLE" },
  { rank: "07", lane: "wildcard", label: "WILDCARD" },
] as const;

const SYNTHETIC_OPEN_DELTA = 180;
const TOUCH_TRIGGER_PX = 10;

const laneAccent = {
  core: "#171715",
  adjacent: "#3150ff",
  wildcard: "#ff5b21",
} as const;

export function TodayR4ExperienceEnhancer() {
  useEffect(() => {
    const shell = document.querySelector<HTMLElement>('[data-today-r4="true"]');
    const scroller = shell?.querySelector<HTMLElement>(":scope > div");
    const stage = scroller?.querySelector<HTMLElement>(":scope > div > div");
    if (!shell || !scroller || !stage) return;

    shell.dataset.r4Enhanced = "true";
    shell.style.setProperty("--r4-mx", "0");
    shell.style.setProperty("--r4-my", "0");
    shell.style.setProperty("--r4-px", `${stage.clientWidth / 2}px`);
    shell.style.setProperty("--r4-py", `${stage.clientHeight / 2}px`);
    shell.style.setProperty("--r4-interaction", laneAccent.core);

    const layer = document.createElement("div");
    layer.className = "fr-r4-showcase";
    layer.dataset.r4Showcase = "true";
    layer.setAttribute("aria-hidden", "true");

    const radar = document.createElement("div");
    radar.className = "fr-r4-radar";

    const sweep = document.createElement("div");
    sweep.className = "fr-r4-radar__sweep";
    radar.append(sweep);

    SIGNAL_META.forEach((signal) => {
      const blip = document.createElement("i");
      blip.className = "fr-r4-radar__blip";
      blip.dataset.rank = signal.rank;
      blip.dataset.lane = signal.lane;
      blip.dataset.label = signal.label;
      radar.append(blip);
    });

    const tape = document.createElement("div");
    tape.className = "fr-r4-signal-tape";
    const tapeText = SIGNAL_META.map((signal) => `${signal.rank} ${signal.label}`).join("  ·  ");
    tape.innerHTML = `<span>${tapeText}&nbsp;&nbsp;·&nbsp;&nbsp;${tapeText}</span>`;

    const telemetry = document.createElement("div");
    telemetry.className = "fr-r4-hero-telemetry";
    telemetry.innerHTML = `
      <span><b>458</b> CANDIDATES</span>
      <span><b>07</b> SELECTED</span>
      <span><b>01</b> LIVE FIELD</span>
    `;

    const flash = document.createElement("div");
    flash.className = "fr-r4-release-flash";

    layer.append(radar, tape, telemetry, flash);

    const liveField = document.createElement("div");
    liveField.className = "fr-r4-live-field";
    liveField.dataset.r4LiveField = "true";
    liveField.dataset.r4FocusField = "true";
    liveField.setAttribute("aria-hidden", "true");
    liveField.innerHTML = `
      <svg class="fr-r4-current-map" viewBox="0 0 1600 900" preserveAspectRatio="none" focusable="false">
        <path class="fr-r4-current fr-r4-current--ink" d="M-100 280 C260 390 410 165 785 300 S1260 565 1710 390" />
        <path class="fr-r4-current fr-r4-current--blue" d="M-120 600 C220 505 445 730 825 592 S1265 375 1710 520" />
        <path class="fr-r4-current fr-r4-current--orange" d="M-80 780 C330 660 575 825 955 690 S1370 620 1710 735" />
        <path class="fr-r4-current fr-r4-current--hair" d="M60 70 L1490 825" />
        <path class="fr-r4-current fr-r4-current--hair" d="M1540 90 L120 840" />
      </svg>

      <svg class="fr-r4-capture-links" viewBox="0 0 1600 900" preserveAspectRatio="none" focusable="false">
        <path data-rank="01" data-lane="core" d="M128 92 C340 112 520 265 790 435" />
        <path data-rank="02" data-lane="core" d="M510 82 C600 145 655 260 790 435" />
        <path data-rank="03" data-lane="core" d="M1125 98 C1030 152 930 290 790 435" />
        <path data-rank="04" data-lane="core" d="M1510 330 C1280 340 1015 390 790 435" />
        <path data-rank="05" data-lane="core" d="M1430 805 C1205 675 1010 535 790 435" />
        <path data-rank="06" data-lane="adjacent" d="M545 820 C625 680 705 545 790 435" />
        <path data-rank="07" data-lane="wildcard" d="M100 470 C315 470 555 452 790 435" />
      </svg>

      <div class="fr-r4-live-bands"><i></i><i></i><i></i></div>
      <div class="fr-r4-focus-lens"><i></i><i></i><i></i><b></b></div>
      <strong class="fr-r4-focus-rank">01</strong>
      <div class="fr-r4-recalibration"><i></i><i></i><i></i></div>
      <div class="fr-r4-edge-meter fr-r4-edge-meter--left"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
      <div class="fr-r4-edge-meter fr-r4-edge-meter--right"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
      <div class="fr-r4-reticle"><i></i><b>LIVE FIELD</b><span>INSPECT</span></div>
    `;

    stage.prepend(liveField);
    stage.prepend(layer);

    const heroPrompt = shell.querySelector<HTMLElement>("footer span:last-child");
    if (heroPrompt) heroPrompt.textContent = "SCROLL ONCE TO OPEN TODAY";

    const focusRank = liveField.querySelector<HTMLElement>(".fr-r4-focus-rank");
    const capturePaths = Array.from(liveField.querySelectorAll<SVGPathElement>(".fr-r4-capture-links path"));
    const recalibration = liveField.querySelector<HTMLElement>(".fr-r4-recalibration");

    const syncSelection = () => {
      const rank = shell.dataset.selectedRank ?? "01";
      const active = SIGNAL_META.find((signal) => signal.rank === rank) ?? SIGNAL_META[0];
      if (focusRank) focusRank.textContent = rank;
      capturePaths.forEach((path) => {
        path.dataset.active = path.dataset.rank === rank ? "true" : "false";
      });
      if (!shell.dataset.r4HoverRank) {
        shell.style.setProperty("--r4-interaction", laneAccent[active.lane]);
      }
      if (recalibration && shell.dataset.openState === "open") {
        recalibration.classList.remove("is-pulsing");
        void recalibration.offsetWidth;
        recalibration.classList.add("is-pulsing");
      }
    };

    syncSelection();
    const selectionObserver = new MutationObserver(syncSelection);
    selectionObserver.observe(shell, { attributes: true, attributeFilter: ["data-selected-rank"] });

    const dispatchOpenGesture = () => {
      if (shell.dataset.openState !== "closed") return;
      const synthetic = new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        deltaY: SYNTHETIC_OPEN_DELTA,
        deltaMode: WheelEvent.DOM_DELTA_PIXEL,
      });
      scroller.dispatchEvent(synthetic);
    };

    const onWheelCapture = (event: WheelEvent) => {
      if (!event.isTrusted || shell.dataset.openState !== "closed" || event.deltaY <= 0) return;
      event.preventDefault();
      dispatchOpenGesture();
    };

    let touchStartY: number | null = null;
    const onTouchStart = (event: TouchEvent) => {
      if (shell.dataset.openState !== "closed") return;
      touchStartY = event.touches[0]?.clientY ?? null;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (shell.dataset.openState !== "closed" || touchStartY === null) return;
      const currentY = event.touches[0]?.clientY;
      if (currentY === undefined) return;
      if (touchStartY - currentY < TOUCH_TRIGGER_PX) return;
      event.preventDefault();
      touchStartY = null;
      dispatchOpenGesture();
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const localX = Math.min(rect.width, Math.max(0, event.clientX - rect.left));
      const localY = Math.min(rect.height, Math.max(0, event.clientY - rect.top));
      const nx = localX / rect.width - 0.5;
      const ny = localY / rect.height - 0.5;
      shell.style.setProperty("--r4-mx", nx.toFixed(4));
      shell.style.setProperty("--r4-my", ny.toFixed(4));
      shell.style.setProperty("--r4-px", `${localX.toFixed(1)}px`);
      shell.style.setProperty("--r4-py", `${localY.toFixed(1)}px`);
    };

    const onPointerLeave = () => {
      shell.style.setProperty("--r4-mx", "0");
      shell.style.setProperty("--r4-my", "0");
    };

    const signalButtons = Array.from(
      shell.querySelectorAll<HTMLButtonElement>('nav[aria-label="Today R4 fixture signals"] button'),
    );
    const hoverBindings = signalButtons.map((button) => {
      const rank = button.dataset.rank ?? "";
      const signal = SIGNAL_META.find((candidate) => candidate.rank === rank);
      const enter = () => {
        shell.dataset.r4HoverRank = rank;
        shell.style.setProperty("--r4-interaction", signal ? laneAccent[signal.lane] : laneAccent.core);
      };
      const leave = () => {
        delete shell.dataset.r4HoverRank;
        const active = SIGNAL_META.find((candidate) => candidate.rank === shell.dataset.selectedRank);
        shell.style.setProperty("--r4-interaction", active ? laneAccent[active.lane] : laneAccent.core);
      };
      button.addEventListener("pointerenter", enter);
      button.addEventListener("pointerleave", leave);
      return { button, enter, leave };
    });

    window.addEventListener("wheel", onWheelCapture, { capture: true, passive: false });
    scroller.addEventListener("touchstart", onTouchStart, { passive: true });
    scroller.addEventListener("touchmove", onTouchMove, { passive: false });
    stage.addEventListener("pointermove", onPointerMove, { passive: true });
    stage.addEventListener("pointerleave", onPointerLeave);

    return () => {
      window.removeEventListener("wheel", onWheelCapture, true);
      scroller.removeEventListener("touchstart", onTouchStart);
      scroller.removeEventListener("touchmove", onTouchMove);
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerleave", onPointerLeave);
      hoverBindings.forEach(({ button, enter, leave }) => {
        button.removeEventListener("pointerenter", enter);
        button.removeEventListener("pointerleave", leave);
      });
      selectionObserver.disconnect();
      liveField.remove();
      layer.remove();
      delete shell.dataset.r4Enhanced;
      delete shell.dataset.r4HoverRank;
    };
  }, []);

  return null;
}
