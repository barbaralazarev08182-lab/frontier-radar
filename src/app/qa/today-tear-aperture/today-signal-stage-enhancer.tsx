"use client";

import { useEffect } from "react";

const PROJECT_ITEM_IDS = [
  "798bd965-9a1d-4e36-ae36-c0f2f8467482",
  "e88d85ce-5175-4b5c-9738-a24157bbb367",
  "dc8433c1-48f5-467a-bceb-ea0f17108655",
  "f9c4ccfd-77e1-4b48-8082-14d2ad6cee53",
  "cae1858b-f3cf-4c7b-bbc3-01bbdd900775",
  "eb828ba6-c3a7-4aeb-9834-eeb301f50124",
  "1ce9500e-c290-4a5b-80d0-cea2b710cca3",
] as const;

export function TodaySignalStageEnhancer() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".fr-stack");
    if (!root) return;

    let morph: HTMLElement | null = null;
    const timers = new Set<number>();

    const later = (fn: () => void, delay: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, delay);
      timers.add(id);
      return id;
    };

    const syncGates = () => {
      const bands = Array.from(root.querySelectorAll<HTMLElement>(".fr-band"));
      bands.forEach((band) => {
        const gate = band.querySelector<HTMLElement>(".fr-band-gate");
        const label = gate?.querySelector<HTMLElement>("span");
        const icon = gate?.querySelector<HTMLElement>("b");
        if (!gate || !label || !icon) return;

        const active = band.dataset.active === "true";
        const nextLabel = active ? "ENTER" : "OPEN";
        if (label.textContent !== nextLabel) label.textContent = nextLabel;
        if (icon.textContent !== "↗") icon.textContent = "↗";
        gate.dataset.mode = active ? "enter" : "open";
        gate.setAttribute("aria-label", active ? "Enter project detail" : "Open signal");
      });
    };

    const clearMorph = () => {
      timers.forEach((id) => window.clearTimeout(id));
      timers.clear();
      morph?.remove();
      morph = null;
      delete root.dataset.sharedMorph;
    };

    const runSharedMorph = () => {
      if (morph) return;
      const source = root.querySelector<HTMLElement>(".fr-stack-cover-index");
      const target = root.querySelector<HTMLElement>(".fr-stack-bands");
      const bands = Array.from(root.querySelectorAll<HTMLElement>(".fr-band"));
      if (!source || !target || bands.length === 0) return;

      const rootRect = root.getBoundingClientRect();
      const sourceRect = source.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const activeIndex = Math.max(0, bands.findIndex((band) => band.dataset.active === "true"));

      morph = source.cloneNode(true) as HTMLElement;
      morph.className = "fr-stack-shared-morph";
      morph.removeAttribute("aria-hidden");
      morph.setAttribute("aria-hidden", "true");
      morph.dataset.phase = "start";

      Array.from(morph.children).forEach((child, index) => {
        if (child instanceof HTMLElement) child.dataset.morphActive = index === activeIndex ? "true" : "false";
      });

      Object.assign(morph.style, {
        left: `${sourceRect.left - rootRect.left}px`,
        top: `${sourceRect.top - rootRect.top}px`,
        width: `${sourceRect.width}px`,
        height: `${sourceRect.height}px`,
      });

      root.appendChild(morph);
      root.dataset.sharedMorph = "true";

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!morph) return;
          morph.dataset.phase = "spread";
          Object.assign(morph.style, {
            left: `${targetRect.left - rootRect.left}px`,
            top: `${targetRect.top - rootRect.top}px`,
            width: `${targetRect.width}px`,
            height: `${targetRect.height}px`,
          });
        });
      });

      later(() => {
        if (morph) morph.dataset.phase = "open";
      }, 430);

      later(() => {
        if (morph) morph.dataset.phase = "handoff";
        root.dataset.sharedMorph = "handoff";
      }, 880);

      later(() => {
        morph?.remove();
        morph = null;
        delete root.dataset.sharedMorph;
      }, 1060);
    };

    syncGates();

    const observer = new MutationObserver((records) => {
      let shouldSync = false;
      let shouldMorph = false;

      for (const record of records) {
        if (record.type !== "attributes") continue;
        if (record.attributeName === "data-active") shouldSync = true;
        if (record.target === root && record.attributeName === "data-transition" && root.dataset.transition === "opening") {
          shouldMorph = true;
        }
      }

      if (shouldSync) syncGates();
      if (shouldMorph) runSharedMorph();
    });

    observer.observe(root, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-active", "data-transition"],
    });

    const onGateClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>(".fr-band-gate") : null;
      if (!target) return;
      const band = target.closest<HTMLElement>(".fr-band");
      if (!band || band.dataset.active !== "true") return;

      const bands = Array.from(root.querySelectorAll<HTMLElement>(".fr-band"));
      const index = bands.indexOf(band);
      const itemId = PROJECT_ITEM_IDS[index];
      if (!itemId) return;

      event.preventDefault();
      event.stopPropagation();
      window.location.assign(`/project/${encodeURIComponent(itemId)}`);
    };

    root.addEventListener("click", onGateClick, true);
    return () => {
      observer.disconnect();
      root.removeEventListener("click", onGateClick, true);
      clearMorph();
    };
  }, []);

  return null;
}
