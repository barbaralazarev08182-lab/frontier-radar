import type { Metadata } from "next";
import { MotionLab } from "@/components/frontier/motion-lab/motion-lab";
import { MotionLabInteractions } from "@/components/frontier/motion-lab/motion-lab-interactions";
import { MotionLabAnalysis } from "@/components/frontier/motion-lab/motion-lab-analysis";
import { MotionLabAnomaly } from "@/components/frontier/motion-lab/motion-lab-anomaly";
import { MotionLabDirectHandoff } from "@/components/frontier/motion-lab/motion-lab-direct-handoff";
import "./motion-lab.css";
import "./motion-lab-lab03.css";
import "./motion-lab-lab04.css";
import "./motion-lab-lab05.css";
import "./motion-lab-handoff.css";
import "./motion-lab-lab06.css";
import "./motion-lab-direct-handoff.css";
import "./motion-lab-analysis-sheet.css";
import "./motion-lab-analysis-effects.css";

export const metadata: Metadata = {
  title: "Motion Lab · Frontier Radar",
  robots: { index: false, follow: false },
};

export default function MotionLabPage() {
  return (
    <>
      <MotionLab />
      <MotionLabInteractions />
      <MotionLabAnalysis />
      <MotionLabAnomaly />
      <MotionLabDirectHandoff />
    </>
  );
}
