import type { ReactNode } from "react";
import { ProjectReadingController } from "./project-reading-controller";
import "./project-research-history.css";
import "./project-lieflat-reading.css";

export default function ProjectIntelligenceLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ProjectReadingController />
      {children}
    </>
  );
}
