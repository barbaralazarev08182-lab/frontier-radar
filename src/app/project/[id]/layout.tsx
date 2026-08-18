import type { ReactNode } from "react";
import { EditorialLineField } from "@/components/frontier/editorial-line-field";
import { ProjectGate15BRuntime } from "./project-gate15b-runtime";
import "./project-research-history.css";
import "./project-lieflat-reading.css";
import "./project-focus-density.css";
import "./project-editorial-drama.css";
import "./project-chapter-chart-motion.css";
import "./project-micro-polish.css";

export default function ProjectIntelligenceLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <EditorialLineField variant="project" />
      <ProjectGate15BRuntime />
      {children}
    </>
  );
}
