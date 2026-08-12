"use client";

import { useEffect, useState } from "react";

import { TodayStageScrollController } from "@/components/frontier/today-stage-scroll-controller";

export default function TodayPendingIntentQaPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 20_000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main
      className="motion-lab-shell"
      data-mode="run"
      data-production="true"
      data-qa-ready={ready ? "true" : "false"}
      style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#f1eee5" }}
    >
      <div
        className="motion-lab-scroller"
        style={{ position: "absolute", inset: 0, overflowY: "auto", overscrollBehavior: "none" }}
      >
        <div style={{ height: "700vh" }} />
      </div>
      <div
        style={{
          position: "fixed",
          left: 20,
          top: 20,
          zIndex: 5,
          fontFamily: "monospace",
          fontSize: 12,
        }}
      >
        QA READY: {ready ? "TRUE" : "FALSE"}
      </div>
      <TodayStageScrollController canEnterWeave={ready} />
    </main>
  );
}
