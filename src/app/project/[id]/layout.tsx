import type { ReactNode } from "react";
import { EditorialLineField } from "@/components/frontier/editorial-line-field";
import { ProjectReadingController } from "./project-reading-controller";
import "./project-research-history.css";
import "./project-lieflat-reading.css";
import "./project-focus-density.css";
import "./project-editorial-drama.css";
import "../../editorial-line-field.css";

export default function ProjectIntelligenceLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <EditorialLineField variant="project" />
      <ProjectReadingController />
      {children}
    </>
  );
}
