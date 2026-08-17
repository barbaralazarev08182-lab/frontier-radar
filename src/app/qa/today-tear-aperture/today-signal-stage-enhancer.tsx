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

    const syncGates = () => {
      const bands = Array.from(root.querySelectorAll<HTMLElement>(".fr-band"));
      bands.forEach((band, index) => {
        const gate = band.querySelector<HTMLElement>(".fr-band-gate");
        const label = gate?.querySelector<HTMLElement>("span");
        const icon = gate?.querySelector<HTMLElement>("b");
        if (!gate || !label || !icon) return;

        const active = band.dataset.active === "true";
        label.textContent = active ? "ENTER" : "OPEN";
        icon.textContent = "↗";
        gate.dataset.mode = active ? "enter" : "open";
        gate.setAttribute("aria-label", active ? "Enter project detail" : "Open signal");
      });
    };

    syncGates();

    const observer = new MutationObserver(syncGates);
    observer.observe(root, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-active"],
      childList: true,
      characterData: true,
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
    };
  }, []);

  return null;
}
