"use client";

import { useEffect, useState } from "react";
import { ProjectReadingController } from "@/app/project/[id]/project-reading-controller";

const PROJECT_STAGE_IDS = ["capture", "evidence", "interrogation", "resolution", "build"] as const;

export function ProjectGate15BRuntimeBridge() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let frame = 0;

    const waitForCompleteProject = () => {
      if (cancelled) return;

      const rootReady = document.querySelector(".pr-shell") instanceof HTMLElement;
      const stagesReady = PROJECT_STAGE_IDS.every((id) => document.getElementById(id) instanceof HTMLElement);

      if (rootReady && stagesReady) {
        setReady(true);
        return;
      }

      frame = window.requestAnimationFrame(waitForCompleteProject);
    };

    waitForCompleteProject();

    return () => {
      cancelled = true;
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return ready ? <ProjectReadingController /> : null;
}
