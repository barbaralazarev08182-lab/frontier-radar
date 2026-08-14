import type { PersonalRadarProfile } from "@/lib/personalization/personal-radar";
import { PersonalRadarClient } from "./personal-radar-client";

export const metadata = {
  title: "Personal Radar · Frontier Radar",
  description: "A truthful view of the behavioral evidence currently shaping your Frontier Radar profile.",
};

const PREVIEW_EVIDENCE_PROFILE: PersonalRadarProfile = {
  status: "evidence_qualified",
  modelVersion: "interest-keyword-v1",
  eventCount: 24,
  distinctItemCount: 9,
  evidenceDimensionCount: 8,
  lastEventAt: "2026-08-14T08:58:00.000Z",
  globalConfidence: 0.62,
  generatedAt: "2026-08-14T09:00:00.000Z",
  dimensions: [
    { key: "ai_agents", label: "AI AGENTS", priorWeight: 0.95, behaviorSignal: 9.8, evidenceCount: 8, positiveEvidence: 8, negativeEvidence: 0, lastEvidenceAt: "2026-08-14T08:58:00.000Z", freshness: 1, confidence: 0.4 },
    { key: "ai_ui_interaction", label: "AI UI / INTERACTION", priorWeight: 0.98, behaviorSignal: 8.1, evidenceCount: 7, positiveEvidence: 7, negativeEvidence: 0, lastEvidenceAt: "2026-08-14T08:42:00.000Z", freshness: 0.999, confidence: 0.368 },
    { key: "developer_tools", label: "DEVELOPER TOOLS", priorWeight: 0.9, behaviorSignal: 6.4, evidenceCount: 6, positiveEvidence: 6, negativeEvidence: 0, lastEvidenceAt: "2026-08-14T08:20:00.000Z", freshness: 0.999, confidence: 0.333 },
    { key: "product_design", label: "PRODUCT DESIGN", priorWeight: 0.85, behaviorSignal: 4.7, evidenceCount: 5, positiveEvidence: 5, negativeEvidence: 0, lastEvidenceAt: "2026-08-14T07:55:00.000Z", freshness: 0.998, confidence: 0.294 },
    { key: "speaker_recognition", label: "SPEAKER RECOGNITION", priorWeight: 0.45, behaviorSignal: 3.9, evidenceCount: 4, positiveEvidence: 4, negativeEvidence: 0, lastEvidenceAt: "2026-08-14T07:24:00.000Z", freshness: 0.997, confidence: 0.249 },
    { key: "machine_learning", label: "MACHINE LEARNING", priorWeight: 0.8, behaviorSignal: 2.8, evidenceCount: 3, positiveEvidence: 3, negativeEvidence: 0, lastEvidenceAt: "2026-08-14T06:45:00.000Z", freshness: 0.995, confidence: 0.199 },
    { key: "multimodal", label: "MULTIMODAL", priorWeight: 0.86, behaviorSignal: 1.7, evidenceCount: 2, positiveEvidence: 2, negativeEvidence: 0, lastEvidenceAt: "2026-08-14T06:20:00.000Z", freshness: 0.994, confidence: 0.142 },
    { key: "general_tech_news", label: "GENERAL TECH NEWS", priorWeight: 0.25, behaviorSignal: -2.6, evidenceCount: 3, positiveEvidence: 1, negativeEvidence: 2, lastEvidenceAt: "2026-08-14T05:50:00.000Z", freshness: 0.993, confidence: 0.199 },
  ],
};

export default async function PersonalRadarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requested = params.demo === "evidence";
  const demoAllowed =
    process.env.VERCEL_ENV === "preview" ||
    process.env.FRONTIER_DATA_MODE === "fixture" ||
    process.env.NODE_ENV === "development";
  const previewDemo = requested && demoAllowed;

  return (
    <PersonalRadarClient
      initialProfile={previewDemo ? PREVIEW_EVIDENCE_PROFILE : undefined}
      previewDemo={previewDemo}
    />
  );
}
