import type { Metadata } from "next";
import { SignalCutawayPrototype } from "@/components/frontier/signal-cutaway-prototype";
import "./signal-cutaway-route.css";

export const metadata: Metadata = {
  title: "Signal Cutaway Prototype · Frontier Radar",
  robots: { index: false, follow: false },
};

export default function SignalCutawayPrototypePage() {
  return <SignalCutawayPrototype />;
}
