import { sha256Hex } from "@/lib/hash";

export const DAILY_SYNTHESIS_SCHEMA_VERSION = "daily-synthesis-v1";
export const DAILY_SYNTHESIS_PROMPT_VERSION = "daily-synthesis-prompt-v1";

export type SynthesisFormation = "strong" | "emerging" | "novel";

export interface DailySynthesisSignalInput {
  id: string;
  rank: number;
  title: string;
  summary: string;
  tags: string[];
  lane: "core" | "adjacent" | "wildcard";
  whyNow: string | null;
  score: number | null;
}

export interface DailySynthesisPattern {
  id: string;
  index: string;
  formation: SynthesisFormation;
  title: string;
  short: string;
  summary: string;
  why: string;
  signalIds: string[];
  confidence: number;
}

export interface DailySynthesisSnapshot {
  schemaVersion: typeof DAILY_SYNTHESIS_SCHEMA_VERSION;
  editionDate: string;
  selectionHash: string;
  signalIds: string[];
  patterns: DailySynthesisPattern[];
}

export function computeDailySelectionHash(signalIds: string[]): string {
  const qaSalt = process.env.VERCEL_ENV === "preview" ? "gate-7-cold-start-v1\n" : "";
  return sha256Hex(`${qaSalt}${signalIds.join("\n")}`);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPattern(value: unknown): value is DailySynthesisPattern {
  if (!value || typeof value !== "object") return false;
  const pattern = value as Partial<DailySynthesisPattern>;
  return (
    typeof pattern.id === "string" &&
    typeof pattern.index === "string" &&
    (pattern.formation === "strong" || pattern.formation === "emerging" || pattern.formation === "novel") &&
    typeof pattern.title === "string" &&
    typeof pattern.short === "string" &&
    typeof pattern.summary === "string" &&
    typeof pattern.why === "string" &&
    Array.isArray(pattern.signalIds) &&
    pattern.signalIds.length >= 1 &&
    pattern.signalIds.every((id) => typeof id === "string") &&
    isFiniteNumber(pattern.confidence) &&
    pattern.confidence >= 0 &&
    pattern.confidence <= 1
  );
}

export function isDailySynthesisSnapshot(value: unknown): value is DailySynthesisSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<DailySynthesisSnapshot>;
  if (
    snapshot.schemaVersion !== DAILY_SYNTHESIS_SCHEMA_VERSION ||
    typeof snapshot.editionDate !== "string" ||
    typeof snapshot.selectionHash !== "string" ||
    !Array.isArray(snapshot.signalIds) ||
    snapshot.signalIds.length < 1 ||
    snapshot.signalIds.length > 7 ||
    !snapshot.signalIds.every((id) => typeof id === "string") ||
    !Array.isArray(snapshot.patterns) ||
    snapshot.patterns.length < 1 ||
    snapshot.patterns.length > 3 ||
    !snapshot.patterns.every(isPattern)
  ) {
    return false;
  }

  const selected = new Set(snapshot.signalIds);
  const evidence = snapshot.patterns.flatMap((pattern) => pattern.signalIds);
  if (evidence.length !== snapshot.signalIds.length) return false;
  if (new Set(evidence).size !== evidence.length) return false;
  return evidence.every((id) => selected.has(id));
}
