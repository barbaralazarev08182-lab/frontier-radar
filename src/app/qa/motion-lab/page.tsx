import type { Metadata } from "next";
import { MotionLab } from "@/components/frontier/motion-lab/motion-lab";
import { MotionLabInteractions } from "@/components/frontier/motion-lab/motion-lab-interactions";
import { MotionLabAnalysis } from "@/components/frontier/motion-lab/motion-lab-analysis";
import "./motion-lab.css";
import "./motion-lab-lab03.css";
import "./motion-lab-lab04.css";
import "./motion-lab-lab05.css";

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
    </>
  );
}
