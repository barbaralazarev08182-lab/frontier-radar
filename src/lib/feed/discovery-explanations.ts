import { createAdminClient } from "@/lib/supabase/admin";
import {
  INTEREST_PROFILE,
  type InterestKey,
} from "@/config/interest-profile";
import type { FrontierFeedItem } from "./types";

export interface DiscoveryExplanation {
  whyNow: string | null;
  whyYou: string | null;
}

interface ScoreRow {
  item_id: string;
  dimension: string;
  normalized_score: number;
  rationale: string | null;
  created_at: string;
}

const INTEREST_LABEL: Record<InterestKey, string> = {
  ai_creative_projects: "Creative AI",
  ai_integrations: "AI × Software",
  ai_games: "AI Games",
  ai_ui_interaction: "AI × UI",
  small_open_source: "Small Open Source",
  new_ai_capabilities: "New AI Capabilities",
  ai_agents: "Agent / MCP",
  vibe_coding: "AI Coding",
  developer_tools: "Developer Tools",
  multimodal: "Multimodal",
  product_design: "Product / UI Design",
  speech_audio: "Speech / Audio",
  speaker_recognition: "Speaker Recognition",
  machine_learning: "Machine Learning",
  computer_vision: "Computer Vision",
  nlp_llm: "LLM / NLP",
  education_ai: "Education AI",
  reinforcement_learning: "Reinforcement Learning",
  mlops: "MLOps",
  quant_finance: "Quant",
  general_tech_news: "Tech Launches",
};

function corpus(item: FrontierFeedItem): string {
  return [
    item.title,
    item.description ?? "",
    item.summaryZh ?? "",
    item.novelty ?? "",
    item.whyItMatters ?? "",
    item.source,
    item.contentType,
    ...item.tags,
  ]
    .join(" ")
    .toLowerCase();
}

function matchedPersonalInterests(
  item: FrontierFeedItem,
  strongest: Array<{ key: InterestKey; weight: number }>
): string[] {
  const text = corpus(item);
  const matches: string[] = [];
  for (const entry of strongest) {
    const definition = INTEREST_PROFILE[entry.key];
    if (definition.keywords.some((keyword) => text.includes(keyword.toLowerCase()))) {
      matches.push(INTEREST_LABEL[entry.key]);
    }
    if (matches.length >= 2) break;
  }
  return matches;
}

function cleanMomentumRationale(rationale: string | null): string | null {
  if (!rationale) return null;
  if (rationale.startsWith("真实增长：")) return rationale;
  if (rationale.includes("rising:")) {
    return "当前增长速度高于同龄项目，正在起势。";
  }
  return null;
}

function chooseWhyNow(rows: Map<string, ScoreRow>): string | null {
  const momentum = rows.get("momentum");
  const freshness = rows.get("freshness");
  const ideaSpark = rows.get("idea_spark");
  const tryability = rows.get("tryability");

  if (momentum && momentum.normalized_score >= 55) {
    const detail = cleanMomentumRationale(momentum.rationale);
    if (detail) return detail;
  }
  if (freshness && freshness.normalized_score >= 75) {
    return "刚发布或刚更新，仍处在最值得早期发现的窗口。";
  }
  if (ideaSpark && ideaSpark.normalized_score >= 72) {
    return "跨域组合和可延展性很强，Idea Spark 信号突出。";
  }
  if (tryability && tryability.normalized_score >= 85) {
    return "现在就能打开体验或直接复现，不只是概念。";
  }
  return null;
}

export async function getDiscoveryExplanations(
  items: FrontierFeedItem[],
  strongestInterests: Array<{ key: InterestKey; weight: number }>
): Promise<Map<string, DiscoveryExplanation>> {
  const result = new Map<string, DiscoveryExplanation>();
  if (items.length === 0) return result;

  const itemIds = items.map((item) => item.id);
  const latestByItem = new Map<string, Map<string, ScoreRow>>();

  // Score-component explanations are a read-only enrichment sidecar. Missing or
  // temporarily unavailable Supabase configuration must not make the core feed
  // disappear (fixture/preview QA deliberately runs without those credentials).
  // Local interest overlap can still produce WHY YOU below; WHY NOW remains null
  // until real score evidence is available.
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("score_components")
      .select("item_id,dimension,normalized_score,rationale,created_at")
      .in("item_id", itemIds)
      .in("dimension", ["momentum", "freshness", "idea_spark", "tryability"])
      .order("created_at", { ascending: false });

    if (!error) {
      for (const raw of (data ?? []) as ScoreRow[]) {
        let dimensions = latestByItem.get(raw.item_id);
        if (!dimensions) {
          dimensions = new Map<string, ScoreRow>();
          latestByItem.set(raw.item_id, dimensions);
        }
        if (!dimensions.has(raw.dimension)) dimensions.set(raw.dimension, raw);
      }
    }
  } catch {
    // Non-blocking enrichment: the Today/Explore feed remains truthful without it.
  }

  for (const item of items) {
    const personal = matchedPersonalInterests(item, strongestInterests);
    result.set(item.id, {
      whyNow: chooseWhyNow(latestByItem.get(item.id) ?? new Map()),
      whyYou:
        personal.length > 0
          ? `与你最近偏好的 ${personal.join(" / ")} 重合。`
          : null,
    });
  }

  return result;
}
