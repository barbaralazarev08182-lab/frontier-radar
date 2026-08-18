"use client";

import { useEffect, useState } from "react";
import { ProjectReadingController } from "@/app/project/[id]/project-reading-controller";

export function ProjectGate15BRuntimeBridge() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let frame = 0;

    const waitForProject = () => {
      if (cancelled) return;
      if (document.querySelector(".pr-shell")) {
        setReady(true);
        return;
      }
      frame = window.requestAnimationFrame(waitForProject);
    };

    waitForProject();

    return () => {
      cancelled = true;
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return ready ? <ProjectReadingController /> : null;
}
