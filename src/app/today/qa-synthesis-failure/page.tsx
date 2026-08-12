"use client";

import { TodayMotionProduction } from "@/components/frontier/today-motion-production";
import type { EditorialSignal } from "@/components/frontier/today-editorial";
import type { DailySynthesisSignalInput, DailySynthesisSnapshot } from "@/lib/ai/daily-synthesis";

const signals: EditorialSignal[] = Array.from({ length: 7 }, (_, index) => ({
  id: `qa-signal-${index + 1}`,
  title: `QA Signal ${index + 1}`,
  summary: `Deterministic failure-path signal ${index + 1}.`,
  score: 90 - index,
  source: index % 2 === 0 ? "github" : "hackernews",
  contentType: "project",
  canonicalUrl: "https://example.com",
  author: null,
  tags: ["QA"],
  lane: index === 5 ? "adjacent" : index === 6 ? "wildcard" : "core",
  whyNow: "QA",
  whyYou: null,
  buildIdea: null,
  metricsLabel: null,
  crossSource: false,
  sourceCount: 1,
  hasCode: true,
  hasDemo: false,
  metadata: {
    rank: index + 1,
    lane: index === 5 ? "adjacent" : index === 6 ? "wildcard" : "core",
    surface: "today",
    algorithm_variant: "qa-terminal-failure",
    source: index % 2 === 0 ? "github" : "hackernews",
    content_type: "project",
  },
}));

const synthesisSignals: DailySynthesisSignalInput[] = signals.map((signal, index) => ({
  id: signal.id,
  rank: index + 1,
  title: signal.title,
  summary: signal.summary,
  tags: signal.tags,
  lane: signal.lane,
  whyNow: signal.whyNow,
  score: signal.score,
}));

async function alwaysFail(): Promise<DailySynthesisSnapshot | null> {
  await new Promise((resolve) => window.setTimeout(resolve, 80));
  return null;
}

export default function TodaySynthesisFailureQaPage() {
  return (
    <TodayMotionProduction
      dateLabel="WEDNESDAY, 12 AUG 2026"
      dataLabel="QA DATA"
      totalDiscoveries={37}
      signals={signals}
      synthesisSignals={synthesisSignals}
      initialSnapshot={null}
      resolveSynthesisAction={alwaysFail}
      loadSynthesisAction={alwaysFail}
    />
  );
}
