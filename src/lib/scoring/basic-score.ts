/**
 * Frontier Radar 基础排序 v2。
 *
 * 目标：从“学术/绝对热度排序”转向“新鲜、有创意、可体验的科技项目发现”。
 *
 * Frontier Score v2 =
 *   25% freshness
 * + 30% interest relevance
 * + 15% source signal
 * + 10% format affinity
 * + 20% editorial value
 */

import type { ItemAnalysisResult } from "@/lib/ai/types";
import { INTEREST_PROFILE } from "@/config/interest-profile";

export const BASIC_SCORE_VERSION = "basic-frontier-v2";

export const SCORE_WEIGHTS = {
  freshness: 0.25,
  interestRelevance: 0.3,
  sourceSignal: 0.15,
  formatAffinity: 0.1,
  editorialValue: 0.2,
} as const;

export interface BasicScoreSignals {
  source: string;
  itemType: string;
  title: string;
  description: string | null;
  topics: string[];
  createdAtSource: string | null;
  pushedAtSource: string | null;
  stars: number | null;
  forks: number | null;
  downloads: number | null;
  likes: number | null;
  aiResult?: ItemAnalysisResult | null;
}

export interface ScoreComponentValue {
  dimension: string;
  rawValue: number | null;
  normalizedScore: number;
  weight: number;
  rationale: string;
}

export interface BasicScoreResult {
  components: ScoreComponentValue[];
  total: number;
  scoreVersion: string;
  hasAi: boolean;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** 新鲜度：半衰期 14 天指数衰减。未知时间 → 中性 50。 */
export function freshnessScore(ageDays: number | null): { score: number; rationale: string; raw: number | null } {
  if (ageDays === null) {
    return { score: 50, rationale: "无发布时间/更新时间，中性 50", raw: null };
  }
  const score = Math.max(0, Math.round(100 * Math.pow(0.5, ageDays / 14)));
  return { score, rationale: `age=${ageDays.toFixed(1)} 天，半衰期 14 天指数衰减`, raw: ageDays };
}

function latestTimestampMs(signals: BasicScoreSignals): number | null {
  const values = [signals.pushedAtSource, signals.createdAtSource];
  let latest: number | null = null;
  for (const v of values) {
    if (!v) continue;
    const t = Date.parse(v);
    if (Number.isFinite(t) && (latest === null || t > latest)) latest = t;
  }
  return latest;
}

/**
 * 兴趣相关性：topics + AI tags + 标题 + 描述共同命中冷启动兴趣画像。
 * 这样尚未进行 AI 分析的新仓库，也可以仅凭标题/描述被正确识别。
 */
export function interestRelevanceScore(
  topics: string[],
  aiTags: string[],
  textParts: string[] = []
): { score: number; rationale: string; raw: number | null } {
  const corpus = [...topics, ...aiTags, ...textParts]
    .filter((x): x is string => typeof x === "string" && x.length > 0)
    .join(" ")
    .toLowerCase();

  const matched: string[] = [];
  let weightSum = 0;
  for (const [key, entry] of Object.entries(INTEREST_PROFILE)) {
    const hit = entry.keywords.some((kw) => corpus.includes(kw.toLowerCase()));
    if (hit) {
      matched.push(`${key}(${entry.weight})`);
      weightSum += entry.weight;
    }
  }

  if (matched.length === 0) {
    return { score: 0, rationale: "未命中默认科技兴趣画像", raw: 0 };
  }

  const score = Math.round(100 * clamp01(weightSum));
  return { score, rationale: `命中: ${matched.join(", ")}`, raw: weightSum };
}

/** 内容形态偏好：冷启动时优先可直接体验/复现的项目，论文保留但降低默认占比。 */
export function formatAffinityScore(itemType: string): { score: number; rationale: string; raw: number | null } {
  switch (itemType) {
    case "repo":
      return { score: 100, rationale: "GitHub Repository：可复现项目优先", raw: 100 };
    case "space":
      return { score: 95, rationale: "Hugging Face Space：可直接体验 Demo", raw: 95 };
    case "model":
      return { score: 65, rationale: "模型本体：有应用潜力，但不是完整项目", raw: 65 };
    case "dataset":
      return { score: 45, rationale: "数据集：作为项目素材保留", raw: 45 };
    case "paper":
      return { score: 30, rationale: "论文：作为补充前沿信息，不默认主导 Today", raw: 30 };
    default:
      return { score: 50, rationale: `未知内容类型 ${itemType}，中性 50`, raw: 50 };
  }
}

function log1p(x: number): number {
  return Math.log1p(Math.max(0, x));
}

/**
 * 来源信号：不再让总 stars/downloads 主导排序。
 * 对 GitHub，新鲜活跃度占 60%，让刚发布的小项目也有机会进入 Today。
 */
export function sourceSignalScore(signals: BasicScoreSignals): { score: number; rationale: string; raw: number | null } {
  switch (signals.source) {
    case "github": {
      const hasMetrics = signals.stars !== null || signals.forks !== null;
      const pushedMs = signals.pushedAtSource ? Date.parse(signals.pushedAtSource) : NaN;
      const activityScore = Number.isFinite(pushedMs)
        ? freshnessScore(Math.max(0, (Date.now() - pushedMs) / 86_400_000)).score
        : 50;
      if (!hasMetrics) {
        return { score: activityScore, rationale: `GitHub 无热度快照，以活跃度 ${activityScore} 代替`, raw: null };
      }
      const starScore = Math.round(100 * clamp01(log1p(signals.stars ?? 0) / log1p(5000)));
      const forkScore = Math.round(100 * clamp01(log1p(signals.forks ?? 0) / log1p(2000)));
      const score = Math.round(0.25 * starScore + 0.15 * forkScore + 0.6 * activityScore);
      return {
        score,
        rationale: `fresh-first: star=${starScore} fork=${forkScore} activity=${activityScore}`,
        raw: signals.stars ?? signals.forks ?? 0,
      };
    }
    case "huggingface": {
      const hasMetrics = signals.downloads !== null || signals.likes !== null;
      const updatedMs = signals.pushedAtSource ? Date.parse(signals.pushedAtSource) : NaN;
      const activityScore = Number.isFinite(updatedMs)
        ? freshnessScore(Math.max(0, (Date.now() - updatedMs) / 86_400_000)).score
        : 50;
      if (!hasMetrics) {
        return { score: activityScore, rationale: `HF 无热度快照，以活跃度 ${activityScore} 代替`, raw: null };
      }
      const dlScore = Math.round(100 * clamp01(log1p(signals.downloads ?? 0) / log1p(2_000_000)));
      const likeScore = Math.round(100 * clamp01(log1p(signals.likes ?? 0) / log1p(20_000)));
      const score = Math.round(0.45 * dlScore + 0.25 * likeScore + 0.3 * activityScore);
      return {
        score,
        rationale: `downloads=${dlScore} likes=${likeScore} activity=${activityScore}`,
        raw: signals.downloads ?? signals.likes ?? 0,
      };
    }
    case "arxiv":
      return { score: 50, rationale: "arXiv 无真实互动指标，中性 50，不伪造热度", raw: null };
    default:
      return { score: 50, rationale: `未知来源 ${signals.source}，中性 50`, raw: null };
  }
}

/**
 * AI 编辑价值：更重视“新不新、能不能用”，降低纯研究价值对默认排序的支配。
 */
export function editorialValueScore(aiResult: ItemAnalysisResult | null | undefined): { score: number | null; rationale: string } {
  if (!aiResult) {
    return { score: null, rationale: "无 AI 分析，编辑价值缺失（临时分）" };
  }
  const score = Math.round(
    0.45 * aiResult.noveltyScore +
    0.4 * aiResult.practicalValueScore +
    0.1 * aiResult.researchValueScore +
    0.05 * (aiResult.confidence * 100)
  );
  return {
    score: Math.max(0, Math.min(100, score)),
    rationale: `novelty=${aiResult.noveltyScore} practical=${aiResult.practicalValueScore} research=${aiResult.researchValueScore} confidence=${aiResult.confidence}`,
  };
}

/** 计算基础排序分。 */
export function computeBasicScore(signals: BasicScoreSignals): BasicScoreResult {
  const createdMs = signals.createdAtSource ? Date.parse(signals.createdAtSource) : NaN;
  const latestMs = latestTimestampMs(signals);
  const ageDays =
    latestMs !== null && Number.isFinite(latestMs)
      ? Math.max(0, (Date.now() - latestMs) / 86_400_000)
      : Number.isFinite(createdMs)
        ? Math.max(0, (Date.now() - createdMs) / 86_400_000)
        : null;

  const freshness = freshnessScore(ageDays);
  const relevance = interestRelevanceScore(
    signals.topics,
    signals.aiResult?.tags ?? [],
    [signals.title, signals.description ?? "", signals.itemType, signals.source]
  );
  const source = sourceSignalScore(signals);
  const format = formatAffinityScore(signals.itemType);
  const editorial = editorialValueScore(signals.aiResult);

  const components: ScoreComponentValue[] = [
    { dimension: "freshness", rawValue: freshness.raw, normalizedScore: freshness.score, weight: SCORE_WEIGHTS.freshness, rationale: freshness.rationale },
    { dimension: "interest_relevance", rawValue: relevance.raw, normalizedScore: relevance.score, weight: SCORE_WEIGHTS.interestRelevance, rationale: relevance.rationale },
    { dimension: "source_signal", rawValue: source.raw, normalizedScore: source.score, weight: SCORE_WEIGHTS.sourceSignal, rationale: source.rationale },
    { dimension: "format_affinity", rawValue: format.raw, normalizedScore: format.score, weight: SCORE_WEIGHTS.formatAffinity, rationale: format.rationale },
  ];

  const hasAi = editorial.score !== null;
  if (hasAi) {
    components.push({
      dimension: "editorial_value",
      rawValue: editorial.score,
      normalizedScore: editorial.score!,
      weight: SCORE_WEIGHTS.editorialValue,
      rationale: editorial.rationale,
    });
  }

  const nonAiWeight =
    SCORE_WEIGHTS.freshness +
    SCORE_WEIGHTS.interestRelevance +
    SCORE_WEIGHTS.sourceSignal +
    SCORE_WEIGHTS.formatAffinity;

  const nonAiWeighted =
    freshness.score * SCORE_WEIGHTS.freshness +
    relevance.score * SCORE_WEIGHTS.interestRelevance +
    source.score * SCORE_WEIGHTS.sourceSignal +
    format.score * SCORE_WEIGHTS.formatAffinity;

  const total = hasAi
    ? round2(nonAiWeighted + editorial.score! * SCORE_WEIGHTS.editorialValue)
    : round2(nonAiWeighted / nonAiWeight);

  return {
    components,
    total: Math.max(0, Math.min(100, total)),
    scoreVersion: BASIC_SCORE_VERSION,
    hasAi,
  };
}
