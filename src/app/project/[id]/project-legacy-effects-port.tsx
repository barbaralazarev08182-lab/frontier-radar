"use client";

import { useEffect } from "react";

const STAGES = [
  ["capture", "pi-stage-capture"],
  ["evidence", "pi-stage-evidence"],
  ["interrogation", "pi-stage-interrogation"],
  ["resolution", "pi-stage-resolution"],
  ["build", "pi-stage-build"],
] as const;

function appendLegacyDecor(section: HTMLElement, id: string) {
  const layer = document.createElement("div");
  layer.className = "pi-port-decor";
  layer.setAttribute("aria-hidden", "true");

  if (id === "capture") {
    layer.innerHTML = `
      <div class="pi-capture-noise"></div>
      <div class="pi-capture-object">
        <div class="pi-capture-sheet pi-capture-sheet-4"></div>
        <div class="pi-capture-sheet pi-capture-sheet-3"></div>
        <div class="pi-capture-sheet pi-capture-sheet-2"></div>
        <div class="pi-capture-sheet pi-capture-sheet-1">
          <div class="pi-capture-topline"><span>FR / EVIDENCE DOSSIER</span><span>LIVE</span></div>
          <strong>FR</strong>
          <div class="pi-capture-bottomline"><span>EVIDENCE FIELD</span><span>RADAR</span></div>
        </div>
        <div class="pi-capture-flare"></div>
      </div>
    `;
  } else if (id === "evidence") {
    layer.innerHTML = `
      <div class="pi-vanishing-grid"></div>
      <div class="pi-evidence-tunnel">
        <article class="pi-evidence-card" data-state="active">
          <span class="pi-evidence-seq">01</span>
          <div class="pi-evidence-card-top"><span>TRACEABLE</span><span>FR / SOURCE</span></div>
          <h2>EVIDENCE</h2>
          <div class="pi-momentum"><span>INSPECTION FIELD</span></div>
        </article>
      </div>
    `;
  } else if (id === "interrogation") {
    layer.innerHTML = `
      <div class="pi-interrogation-stack">
        <article class="pi-interrogation-card" data-state="active">
          <span class="pi-interrogation-kind">QUESTION THE SIGNAL</span>
          <h2>WHY?</h2>
          <p>FR / INTERROGATION FIELD</p>
          <div class="pi-interrogation-stamp">FR / 03</div>
        </article>
      </div>
    `;
  } else if (id === "resolution") {
    layer.innerHTML = `
      <div class="pi-score-orbit">
        ${Array.from({ length: 7 }, (_, index) => `<div class="pi-score-shard"><span>0${index + 1} / SIGNAL</span><strong>${String((index + 3) * 11)}</strong></div>`).join("")}
      </div>
      <div class="pi-resolution-core"><span>FRONTIER VERDICT</span><strong>RESOLVE</strong><p>FR / SIGNAL CONVERGENCE</p></div>
    `;
  } else if (id === "build") {
    layer.innerHTML = `
      <div class="pi-build-deck">
        <article class="pi-build-card" data-state="active">
          <span class="pi-build-number">01</span>
          <span class="pi-build-mode">BUILD</span>
          <strong>MOVE</strong>
          <span class="pi-build-action">IDEA → ACTION</span>
        </article>
      </div>
    `;
  }

  section.prepend(layer);
  return layer;
}

export function ProjectLegacyEffectsPort() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".pr-shell");
    if (!root) return;

    const mounted: Array<{ section: HTMLElement; className: string; layer: HTMLElement }> = [];

    for (const [id, className] of STAGES) {
      const section = document.getElementById(id);
      if (!(section instanceof HTMLElement)) continue;
      section.classList.add(className, "pi-port-stage");
      if (id === "interrogation") section.dataset.activeLabel = "INTERROGATION";
      const layer = appendLegacyDecor(section, id);
      mounted.push({ section, className, layer });
    }

    const syncActive = () => {
      const active = root.dataset.activeStage ?? "capture";
      for (const { section } of mounted) {
        section.dataset.active = section.id === active ? "true" : "false";
      }
    };

    const observer = new MutationObserver(syncActive);
    observer.observe(root, { attributes: true, attributeFilter: ["data-active-stage"] });
    syncActive();

    let pointerFrame = 0;
    let lastX = 0;
    let lastY = 0;
    let lastTime = 0;
    let ready = false;
    let pending = { x: 0, y: 0, nx: 0, ny: 0, velocity: 0 };

    const flushPointer = () => {
      pointerFrame = 0;
      root.style.setProperty("--pi-px", pending.nx.toFixed(3));
      root.style.setProperty("--pi-py", pending.ny.toFixed(3));
      root.style.setProperty("--pi-mx", `${pending.x}px`);
      root.style.setProperty("--pi-my", `${pending.y}px`);
      root.style.setProperty("--pi-pointer-v", pending.velocity.toFixed(3));
    };

    const onPointerMove = (event: PointerEvent) => {
      const now = performance.now();
      let velocity = 0;
      if (ready) {
        const dt = Math.max(16, now - lastTime);
        velocity = Math.min(1, Math.hypot(event.clientX - lastX, event.clientY - lastY) / dt / 1.3);
      }
      lastX = event.clientX;
      lastY = event.clientY;
      lastTime = now;
      ready = true;
      pending = {
        x: event.clientX,
        y: event.clientY,
        nx: event.clientX / Math.max(1, window.innerWidth) - 0.5,
        ny: event.clientY / Math.max(1, window.innerHeight) - 0.5,
        velocity,
      };
      if (!pointerFrame) pointerFrame = window.requestAnimationFrame(flushPointer);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      if (pointerFrame) window.cancelAnimationFrame(pointerFrame);
      for (const { section, className, layer } of mounted) {
        layer.remove();
        section.classList.remove(className, "pi-port-stage");
        section.removeAttribute("data-active");
        if (section.id === "interrogation") section.removeAttribute("data-active-label");
      }
    };
  }, []);

  return null;
}
