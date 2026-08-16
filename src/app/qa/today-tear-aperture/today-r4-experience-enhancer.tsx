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

export function TodayR4ExperienceEnhancer() {
  useEffect(() => {
    const shell = document.querySelector<HTMLElement>('[data-today-r4="true"]');
    const scroller = shell?.querySelector<HTMLElement>(":scope > div");
    const stage = scroller?.querySelector<HTMLElement>(":scope > div > div");
    if (!shell || !scroller || !stage) return;

    shell.dataset.r4Enhanced = "true";

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
    stage.prepend(layer);

    const heroPrompt = shell.querySelector<HTMLElement>("footer span:last-child");
    if (heroPrompt) heroPrompt.textContent = "SCROLL ONCE TO OPEN TODAY";

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

    window.addEventListener("wheel", onWheelCapture, { capture: true, passive: false });
    scroller.addEventListener("touchstart", onTouchStart, { passive: true });
    scroller.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      window.removeEventListener("wheel", onWheelCapture, true);
      scroller.removeEventListener("touchstart", onTouchStart);
      scroller.removeEventListener("touchmove", onTouchMove);
      layer.remove();
      delete shell.dataset.r4Enhanced;
    };
  }, []);

  return null;
}
