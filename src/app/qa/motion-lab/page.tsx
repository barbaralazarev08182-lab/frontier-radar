import type { Metadata } from "next";
import { MotionLab } from "@/components/frontier/motion-lab/motion-lab";
import "./motion-lab.css";

export const metadata: Metadata = {
  title: "Motion Lab · Frontier Radar",
  robots: { index: false, follow: false },
};

export default function MotionLabPage() {
  return <MotionLab />;
}
