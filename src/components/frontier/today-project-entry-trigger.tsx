"use client";

import { useEffect } from "react";
import { startProjectEntryTransition } from "@/components/frontier/project-entry-transition-layer";

export function TodayProjectEntryTrigger() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!window.location.pathname.startsWith("/today")) return;
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      const gate = target?.closest(".fr-band-gate");
      const band = gate?.closest<HTMLElement>(".fr-band");
      if (!gate || band?.dataset.active !== "true") return;
      startProjectEntryTransition();
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
