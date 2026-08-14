import type { SupabaseClient } from "@supabase/supabase-js";
import { INTEREST_PROFILE, type InterestKey } from "@/config/interest-profile";
import { activityFreshness, evidenceConfidence, personalizationConfidence } from "./confidence";
import { feedbackStrength } from "./profile";
import { FEATURE_KEYS, FEATURE_VECTOR_VERSION, vectorizeItem } from "./vector";

interface RadarEventRow {
  item_id: string;
  event_type: string;
  dwell_ms: number | null;
  created_at: string;
}

interface RadarItemRow {
  item_id: string;
  title: string;
  description: string | null;
  summary_zh: string | null;
  why_it_matters: string | null;
  source_slug: string;
  content_type: string;
  tags: unknown;
}

export type PersonalRadarStatus = "cold_start" | "forming" | "evidence_qualified";

export interface PersonalRadarDimension {
  key: InterestKey;
  label: string;
  priorWeight: number;
  behaviorSignal: number;
  evidenceCount: number;
  positiveEvidence: number;
  negativeEvidence: number;
  lastEvidenceAt: string | null;
  freshness: number;
  confidence: number;
}

export interface PersonalRadarProfile {
  status: PersonalRadarStatus;
  modelVersion: string;
  eventCount: number;
  distinctItemCount: number;
  evidenceDimensionCount: number;
  lastEventAt: string | null;
  globalConfidence: number;
  dimensions: PersonalRadarDimension[];
  generatedAt: string;
}

const INTEREST_LABELS: Record<InterestKey, string> = {
  ai_creative_projects: "AI CREATIVE PROJECTS",
  ai_integrations: "AI INTEGRATIONS",
  ai_games: "AI GAMES",
  ai_ui_interaction: "AI UI / INTERACTION",
  small_open_source: "SMALL OPEN SOURCE",
  new_ai_capabilities: "NEW AI CAPABILITIES",
  ai_agents: "AI AGENTS",
  vibe_coding: "VIBE CODING",
  developer_tools: "DEVELOPER TOOLS",
  multimodal: "MULTIMODAL",
  product_design: "PRODUCT DESIGN",
  speech_audio: "SPEECH / AUDIO",
  speaker_recognition: "SPEAKER RECOGNITION",
  machine_learning: "MACHINE LEARNING",
  computer_vision: "COMPUTER VISION",
  nlp_llm: "NLP / LLM",
  education_ai: "EDUCATION AI",
  reinforcement_learning: "REINFORCEMENT LEARNING",
  mlops: "MLOPS",
  quant_finance: "QUANT FINANCE",
  general_tech_news: "GENERAL TECH NEWS",
};

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function eventRecencyMultiplier(createdAt: string, nowMs: number): number {
  const timestamp = Date.parse(createdAt);
  if (!Number.isFinite(timestamp)) return 1;
  const ageDays = Math.max(0, (nowMs - timestamp) / 86_400_000);
  return Math.pow(0.5, ageDays / 30);
}

function round(value: number, digits = 3): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function featureVector(row: RadarItemRow): number[] {
  return vectorizeItem({
    title: row.title,
    description: row.description,
    summaryZh: row.summary_zh,
    whyItMatters: row.why_it_matters,
    source: row.source_slug,
    contentType: row.content_type,
    tags: stringArray(row.tags),
  });
}

export function derivePersonalRadarProfile(
  events: RadarEventRow[],
  items: RadarItemRow[],
  nowMs = Date.now()
): PersonalRadarProfile {
  const itemById = new Map(items.map((item) => [item.item_id, item]));
  const vectorById = new Map(items.map((item) => [item.item_id, featureVector(item)]));
  const dimensionState = new Map<InterestKey, PersonalRadarDimension>();

  for (const key of FEATURE_KEYS) {
    dimensionState.set(key, {
      key,
      label: INTEREST_LABELS[key],
      priorWeight: INTEREST_PROFILE[key].weight,
      behaviorSignal: 0,
      evidenceCount: 0,
      positiveEvidence: 0,
      negativeEvidence: 0,
      lastEvidenceAt: null,
      freshness: 0,
      confidence: 0,
    });
  }

  const sortedEvents = [...events].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)
  );

  for (const event of sortedEvents) {
    if (!itemById.has(event.item_id)) continue;
    const itemVector = vectorById.get(event.item_id);
    if (!itemVector) continue;

    const rawStrength = feedbackStrength(event.event_type, event.dwell_ms);
    if (rawStrength === 0) continue;
    const weightedStrength = rawStrength * eventRecencyMultiplier(event.created_at, nowMs);

    FEATURE_KEYS.forEach((key, index) => {
      const itemFeatureWeight = itemVector[index] ?? 0;
      if (itemFeatureWeight <= 0) return;

      const current = dimensionState.get(key)!;
      current.behaviorSignal += weightedStrength * itemFeatureWeight;
      current.evidenceCount += 1;
      if (rawStrength > 0) current.positiveEvidence += 1;
      if (rawStrength < 0) current.negativeEvidence += 1;
      if (!current.lastEvidenceAt || Date.parse(event.created_at) > Date.parse(current.lastEvidenceAt)) {
        current.lastEvidenceAt = event.created_at;
      }
    });
  }

  const dimensions = FEATURE_KEYS.map((key) => {
    const current = dimensionState.get(key)!;
    const freshness = activityFreshness(current.lastEvidenceAt, nowMs);
    const confidence = evidenceConfidence(current.evidenceCount) * freshness;
    return {
      ...current,
      behaviorSignal: round(current.behaviorSignal),
      freshness: round(freshness),
      confidence: round(confidence),
    };
  });

  const contributing = dimensions.filter((dimension) => dimension.evidenceCount > 0);
  const distinctItemCount = new Set(events.map((event) => event.item_id)).size;
  const lastEventAt = sortedEvents[0]?.created_at ?? null;
  const eventCount = events.length;
  const globalConfidence = personalizationConfidence(eventCount, lastEventAt, nowMs);

  const status: PersonalRadarStatus =
    contributing.length === 0
      ? "cold_start"
      : eventCount >= 6 && distinctItemCount >= 3 && contributing.length >= 3
        ? "evidence_qualified"
        : "forming";

  return {
    status,
    modelVersion: FEATURE_VECTOR_VERSION,
    eventCount,
    distinctItemCount,
    evidenceDimensionCount: contributing.length,
    lastEventAt,
    globalConfidence: round(globalConfidence),
    dimensions,
    generatedAt: new Date(nowMs).toISOString(),
  };
}

export async function loadPersonalRadarProfile(
  supabase: SupabaseClient,
  visitorId: string
): Promise<PersonalRadarProfile> {
  const { data: eventData, error: eventError } = await supabase
    .from("user_events")
    .select("item_id, event_type, dwell_ms, created_at")
    .eq("visitor_id", visitorId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (eventError) throw eventError;
  const events = (eventData ?? []) as RadarEventRow[];
  if (events.length === 0) return derivePersonalRadarProfile([], []);

  const itemIds = [...new Set(events.map((event) => event.item_id))];
  const { data: itemData, error: itemError } = await supabase
    .from("frontier_feed_v1")
    .select("item_id, title, description, summary_zh, why_it_matters, source_slug, content_type, tags")
    .in("item_id", itemIds);

  if (itemError) throw itemError;
  return derivePersonalRadarProfile(events, (itemData ?? []) as RadarItemRow[]);
}
