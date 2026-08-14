import type { ReactNode } from "react";
import { ProjectReadingController } from "./project-reading-controller";
import "./project-research-history.css";
import "./project-lieflat-reading.css";
import "./project-focus-density.css";
import "./project-editorial-drama.css";
import "./project-surface-breathing.css";

export default function ProjectIntelligenceLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ProjectReadingController />
      {children}
    </>
  );
}
