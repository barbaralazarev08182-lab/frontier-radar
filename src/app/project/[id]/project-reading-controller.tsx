"use client";

import { useEffect } from "react";

const STAGE_IDS = ["capture", "evidence", "interrogation", "resolution", "build"] as const;

export function ProjectReadingController() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".pr-shell");
    if (!root) return;

    root.classList.add("is-reading-enhanced");

    const stageLinks = Array.from(root.querySelectorAll<HTMLAnchorElement>(".pr-stage-links a"));
    const sections = STAGE_IDS
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section instanceof HTMLElement);

    const updateReadingState = () => {
      const navOffset = 132;
      let active = sections[0]?.id ?? "capture";

      for (const section of sections) {
        if (section.getBoundingClientRect().top <= navOffset) active = section.id;
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

    const revealTargets = Array.from(root.querySelectorAll<HTMLElement>([
      ".pr-capture-main",
      ".pr-verdict",
      ".pr-evidence-row",
      ".pr-question-row",
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
      threshold: 0.12,
      rootMargin: "0px 0px -8% 0px",
    });

    revealTargets.forEach((target, index) => {
      target.style.setProperty("--reveal-order", String(index));
      revealObserver.observe(target);
    });

    updateReadingState();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      revealObserver.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      root.classList.remove("is-reading-enhanced");
    };
  }, []);

  return null;
}
