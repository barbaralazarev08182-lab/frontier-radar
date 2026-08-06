/**
 * 基础排序（阶段 1.5 MVP）。
 *
 * Basic Frontier Score =
 *   30% freshness + 25% interest relevance + 20% source signal + 25% editorial value
 *
 * 规则：
 *  - 所有组件限制在 0–100；
 *  - arXiv 无互动指标 → source signal 用中性值，不伪造热度；
 *  - 无 AI 分析时可计算不含 editorial value 的临时分（明确标记 hasAi=false）；
 *  - 分数可解释：每个组件带 rationale。
 *
 * 参见 docs/SCORING.md 与 src/config/interest-profile.ts。
 */

import type { ItemAnalysisResult } from "@/lib/ai/types";
import { INTEREST_PROFILE } from "@/config/interest-profile";

export const BASIC_SCORE_VERSION = "basic-frontier-v1";

export const SCORE_WEIGHTS = {
  freshness: 0.3,
  interestRelevance: 0.25,
  sourceSignal: 0.2,
  editorialValue: 0.25,
} as const;

export interface BasicScoreSignals {
  source: string;
  itemType: string;
  title: string;
  description: string | null;
  topics: string[];
  createdAtSource: string | null;
  pushedAtSource: string | null;
  /** 数值指标（来自最新快照；arXiv 无则 null） */
  stars: number | null;
  forks: number | null;
  downloads: number | null;
  likes: number | null;
  /** AI 分析输出（可无） */
  aiResult?: ItemAnalysisResult | null;
}

export interface ScoreComponentValue {
  dimension: string;
  /** 原始值（可解释来源），如天数、stars 数 */
  rawValue: number | null;
  normalizedScore: number;
  weight: number;
  rationale: string;
}

export interface BasicScoreResult {
  components: ScoreComponentValue[];
  total: number;
  scoreVersion: string;
  /** false = 临时分（无 AI 分析） */
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

/** 取内容最新时间（pushed/updated 优先，回退 created）。 */
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

/** 兴趣相关性：标准标签（topics）+ AI tags 命中 interest-profile 关键词加权。 */
export function interestRelevanceScore(topics: string[], aiTags: string[]): { score: number; rationale: string; raw: number | null } {
  const corpus = new Set<string>();
  for (const t of topics) if (typeof t === "string") corpus.add(t.toLowerCase());
  for (const t of aiTags) if (typeof t === "string") corpus.add(t.toLowerCase());

  const matched: string[] = [];
  let weightSum = 0;
  for (const [key, entry] of Object.entries(INTEREST_PROFILE)) {
    const hit = entry.keywords.some((kw) => [...corpus].some((tag) => tag.includes(kw)));
    if (hit) {
      matched.push(`${key}(${entry.weight})`);
      weightSum += entry.weight;
    }
  }
  if (matched.length === 0) {
    return { score: 0, rationale: "未命中兴趣画像", raw: 0 };
  }
  const score = Math.round(100 * clamp01(weightSum));
  return { score, rationale: `命中: ${matched.join(", ")}`, raw: weightSum };
}

function log1p(x: number): number {
  return Math.log1p(Math.max(0, x));
}

/** 来源信号：GitHub / HF 使用真实指标对数映射；arXiv 中性。 */
export function sourceSignalScore(signals: BasicScoreSignals): { score: number; rationale: string; raw: number | null } {
  switch (signals.source) {
    case "github": {
      const hasMetrics = signals.stars !== null || signals.forks !== null;
      if (!hasMetrics) {
        return { score: 50, rationale: "GitHub 无指标快照，中性 50", raw: null };
      }
      const starScore = Math.round(100 * clamp01(log1p(signals.stars ?? 0) / log1p(5000)));
      const forkScore = Math.round(100 * clamp01(log1p(signals.forks ?? 0) / log1p(2000)));
      const pushedMs = signals.pushedAtSource ? Date.parse(signals.pushedAtSource) : NaN;
      const activityScore = Number.isFinite(pushedMs)
        ? freshnessScore(Math.max(0, (Date.now() - pushedMs) / 86_400_000)).score
        : 50;
      const score = Math.round(0.5 * starScore + 0.3 * forkScore + 0.2 * activityScore);
      return { score, rationale: `star=${starScore} fork=${forkScore} activity=${activityScore}`, raw: signals.stars ?? signals.forks ?? 0 };
    }
    case "huggingface": {
      const hasMetrics = signals.downloads !== null || signals.likes !== null;
      if (!hasMetrics) {
        return { score: 50, rationale: "HF 无指标快照，中性 50", raw: null };
      }
      const dlScore = Math.round(100 * clamp01(log1p(signals.downloads ?? 0) / log1p(2_000_000)));
      const likeScore = Math.round(100 * clamp01(log1p(signals.likes ?? 0) / log1p(20_000)));
      const score = Math.round(0.7 * dlScore + 0.3 * likeScore);
      return { score, rationale: `downloads=${dlScore} likes=${likeScore}`, raw: signals.downloads ?? signals.likes ?? 0 };
    }
    case "arxiv":
      return { score: 50, rationale: "arXiv 无真实互动指标，中性 50，不伪造热度", raw: null };
    default:
      return { score: 50, rationale: `未知来源 ${signals.source}，中性 50`, raw: null };
  }
}

/** 编辑价值：AI 输出得分加权。无 AI 分析 → null。 */
export function editorialValueScore(aiResult: ItemAnalysisResult | null | undefined): { score: number | null; rationale: string } {
  if (!aiResult) {
    return { score: null, rationale: "无 AI 分析，编辑价值缺失（临时分）" };
  }
  const score = Math.round(
    0.4 * aiResult.noveltyScore +
    0.3 * aiResult.practicalValueScore +
    0.2 * aiResult.researchValueScore +
    0.1 * (aiResult.confidence * 100)
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
  const relevance = interestRelevanceScore(signals.topics, signals.aiResult?.tags ?? []);
  const source = sourceSignalScore(signals);
  const editorial = editorialValueScore(signals.aiResult);

  const components: ScoreComponentValue[] = [
    { dimension: "freshness", rawValue: freshness.raw, normalizedScore: freshness.score, weight: SCORE_WEIGHTS.freshness, rationale: freshness.rationale },
    { dimension: "interest_relevance", rawValue: relevance.raw, normalizedScore: relevance.score, weight: SCORE_WEIGHTS.interestRelevance, rationale: relevance.rationale },
    { dimension: "source_signal", rawValue: source.raw, normalizedScore: source.score, weight: SCORE_WEIGHTS.sourceSignal, rationale: source.rationale },
  ];

  const hasAi = editorial.score !== null;
  if (hasAi) {
    components.push({ dimension: "editorial_value", rawValue: editorial.score, normalizedScore: editorial.score!, weight: SCORE_WEIGHTS.editorialValue, rationale: editorial.rationale });
  }

  // 总分：有 AI 用四权重；无 AI 时在三组件内归一化（临时分，明确标记）
  const total = hasAi
    ? round2(
        freshness.score * SCORE_WEIGHTS.freshness +
        relevance.score * SCORE_WEIGHTS.interestRelevance +
        source.score * SCORE_WEIGHTS.sourceSignal +
        editorial.score! * SCORE_WEIGHTS.editorialValue
      )
    : round2(
        (freshness.score * SCORE_WEIGHTS.freshness +
          relevance.score * SCORE_WEIGHTS.interestRelevance +
          source.score * SCORE_WEIGHTS.sourceSignal) /
          (SCORE_WEIGHTS.freshness + SCORE_WEIGHTS.interestRelevance + SCORE_WEIGHTS.sourceSignal)
      );

  return {
    components,
    total: Math.max(0, Math.min(100, total)),
    scoreVersion: BASIC_SCORE_VERSION,
    hasAi,
  };
}
