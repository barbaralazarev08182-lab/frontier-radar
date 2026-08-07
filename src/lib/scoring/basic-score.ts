/**
 * Frontier Radar · Discovery Score v3
 *
 * 公共分只回答：这个项目本身是否值得进入候选集？
 * Personal Match 属于用户级信号，不写入共享的 items.latest_score。
 *
 * Discovery Score v3 =
 *   15% Freshness
 * + 12% Domain Relevance
 * + 18% Momentum
 * + 12% Project Health
 * + 13% Novelty
 * + 20% Idea Spark
 * + 10% Tryability
 *
 * 核心原则：
 * - Rising > Popular：优先年龄校正后的增长速度，而不是绝对 stars/downloads。
 * - Idea Spark > Research Value：能启发新做法的项目优先。
 * - 项目优先：repo / Space / Show HN / Product Hunt 默认比纯论文更可行动。
 */

import type { ItemAnalysisResult } from "@/lib/ai/types";
import { INTEREST_PROFILE } from "@/config/interest-profile";

export const BASIC_SCORE_VERSION = "discovery-frontier-v3";

export const SCORE_WEIGHTS = {
  freshness: 0.15,
  domainRelevance: 0.12,
  momentum: 0.18,
  projectHealth: 0.12,
  novelty: 0.13,
  ideaSpark: 0.2,
  tryability: 0.1,
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

  /** 新采集器可逐步补充；全部可选，旧调用方无需同步升级。 */
  engagements?: number | null;
  comments?: number | null;
  hasCode?: boolean | null;
  hasDemo?: boolean | null;
  archived?: boolean | null;
  fork?: boolean | null;
  license?: string | null;
  homepage?: string | null;
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

function clamp100(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function ageDaysFrom(value: string | null): number | null {
  if (!value) return null;
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, (Date.now() - t) / 86_400_000);
}

function latestTimestampMs(signals: BasicScoreSignals): number | null {
  const values = [signals.pushedAtSource, signals.createdAtSource];
  let latest: number | null = null;
  for (const value of values) {
    if (!value) continue;
    const t = Date.parse(value);
    if (Number.isFinite(t) && (latest === null || t > latest)) latest = t;
  }
  return latest;
}

function corpus(signals: BasicScoreSignals): string {
  return [
    signals.title,
    signals.description ?? "",
    signals.itemType,
    signals.source,
    ...signals.topics,
    ...(signals.aiResult?.tags ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

/** 新鲜度：7 天半衰期，让 Today 更偏向真正的新东西。 */
export function freshnessScore(
  ageDays: number | null
): { score: number; rationale: string; raw: number | null } {
  if (ageDays === null) {
    return { score: 45, rationale: "缺少可靠时间，保守 45", raw: null };
  }
  const score = clamp100(100 * Math.pow(0.5, ageDays / 7));
  return {
    score,
    rationale: `age=${ageDays.toFixed(1)} 天，7 天半衰期`,
    raw: ageDays,
  };
}

/**
 * 冷启动领域相关性。它不是 Personal Match；只保证候选仍处于 Frontier Radar 的科技边界内。
 */
export function interestRelevanceScore(
  topics: string[],
  aiTags: string[],
  textParts: string[] = []
): { score: number; rationale: string; raw: number | null } {
  const text = [...topics, ...aiTags, ...textParts]
    .filter((x): x is string => typeof x === "string" && x.length > 0)
    .join(" ")
    .toLowerCase();

  const matched: string[] = [];
  let weightSum = 0;
  for (const [key, entry] of Object.entries(INTEREST_PROFILE)) {
    if (entry.keywords.some((kw) => text.includes(kw.toLowerCase()))) {
      matched.push(key);
      weightSum += entry.weight;
    }
  }

  if (matched.length === 0) {
    return { score: 25, rationale: "未命中默认科技兴趣词，保守 25", raw: 0 };
  }

  // 多个方向交叉通常比单一标签更符合“前沿组合”的发现目标。
  const breadthBonus = Math.min(20, Math.max(0, matched.length - 1) * 5);
  const score = clamp100(55 + 30 * clamp01(weightSum) + breadthBonus);
  return {
    score,
    rationale: `领域命中 ${matched.slice(0, 6).join(", ")}${matched.length > 6 ? "…" : ""}`,
    raw: weightSum,
  };
}

/** 兼容旧命名：现在只作为内容可行动性的粗略代理。 */
export function formatAffinityScore(
  itemType: string
): { score: number; rationale: string; raw: number | null } {
  return tryabilityScore({
    source: "unknown",
    itemType,
    title: "",
    description: null,
    topics: [],
    createdAtSource: null,
    pushedAtSource: null,
    stars: null,
    forks: null,
    downloads: null,
    likes: null,
  });
}

function logRateScore(rate: number, strongRate: number): number {
  if (rate <= 0) return 0;
  return clamp100((Math.log1p(rate) / Math.log1p(strongRate)) * 100);
}

/**
 * Momentum：核心看 age-adjusted velocity，而不是绝对总量。
 * 没有历史快照时，用“当前累计量 / 项目年龄”作为第一版速度代理；
 * 后续有连续快照后可直接替换为 24h/7d delta，不改变评分接口。
 */
export function momentumScore(
  signals: BasicScoreSignals
): { score: number; rationale: string; raw: number | null } {
  const ageDays = Math.max(0.5, ageDaysFrom(signals.createdAtSource) ?? 7);
  const recentAge = ageDaysFrom(signals.pushedAtSource ?? signals.createdAtSource);
  const activity = freshnessScore(recentAge).score;

  if (signals.source === "github") {
    const starsPerDay = Math.max(0, signals.stars ?? 0) / ageDays;
    const forksPerDay = Math.max(0, signals.forks ?? 0) / ageDays;
    const velocity = 0.78 * logRateScore(starsPerDay, 120) + 0.22 * logRateScore(forksPerDay, 25);
    const score = clamp100(0.78 * velocity + 0.22 * activity);
    return {
      score,
      rationale: `GitHub rising: ${starsPerDay.toFixed(1)} stars/day, ${forksPerDay.toFixed(1)} forks/day`,
      raw: starsPerDay,
    };
  }

  if (signals.source === "huggingface") {
    const downloadsPerDay = Math.max(0, signals.downloads ?? 0) / ageDays;
    const likesPerDay = Math.max(0, signals.likes ?? 0) / ageDays;
    const velocity = 0.65 * logRateScore(downloadsPerDay, 50_000) + 0.35 * logRateScore(likesPerDay, 250);
    const score = clamp100(0.75 * velocity + 0.25 * activity);
    return {
      score,
      rationale: `HF rising: ${downloadsPerDay.toFixed(0)} downloads/day, ${likesPerDay.toFixed(1)} likes/day`,
      raw: downloadsPerDay,
    };
  }

  if (signals.source === "hackernews") {
    const pointsPerDay = Math.max(0, signals.engagements ?? 0) / ageDays;
    const commentsPerDay = Math.max(0, signals.comments ?? 0) / ageDays;
    const hasEngagement = signals.engagements != null || signals.comments != null;
    if (hasEngagement) {
      const velocity = 0.7 * logRateScore(pointsPerDay, 120) + 0.3 * logRateScore(commentsPerDay, 50);
      return {
        score: clamp100(0.85 * velocity + 0.15 * activity),
        rationale: `Show HN rising: ${pointsPerDay.toFixed(1)} points/day, ${commentsPerDay.toFixed(1)} comments/day`,
        raw: pointsPerDay,
      };
    }
    return { score: clamp100(0.75 * activity + 15), rationale: "Show HN 暂无互动快照，以发布时间速度代理", raw: null };
  }

  if (signals.source === "producthunt") {
    return { score: clamp100(0.8 * activity + 12), rationale: "Product Hunt 新发布流，以发布时间与上榜时效代理", raw: null };
  }

  if (signals.source === "arxiv") {
    return { score: clamp100(0.5 * activity + 15), rationale: "arXiv 缺少可比项目增长指标，降低 Momentum 权重表现", raw: null };
  }

  return { score: activity, rationale: `未知来源 ${signals.source}，以活跃新鲜度代理`, raw: null };
}

/**
 * 兼容旧 sourceSignalScore 导出；语义已经升级为 Momentum。
 */
export function sourceSignalScore(signals: BasicScoreSignals) {
  return momentumScore(signals);
}

/** 项目健康度：惩罚 archived/fork，奖励近期维护、可用描述、license / demo / code。 */
export function projectHealthScore(
  signals: BasicScoreSignals
): { score: number; rationale: string; raw: number | null } {
  if (signals.archived === true) return { score: 5, rationale: "项目已 archived", raw: 5 };

  let score = 45;
  const reasons: string[] = [];
  const activityAge = ageDaysFrom(signals.pushedAtSource);
  if (activityAge !== null) {
    const activity = freshnessScore(activityAge).score;
    score += (activity - 50) * 0.35;
    reasons.push(`activity=${activity}`);
  }

  const hasDescription = Boolean(signals.description && signals.description.trim().length >= 24);
  if (hasDescription) score += 8;
  if (signals.hasCode === true || signals.itemType === "repo") score += 10;
  if (signals.hasDemo === true || signals.itemType === "space") score += 10;
  if (signals.license) score += 6;
  if (signals.homepage) score += 5;
  if (signals.fork === true) score -= 18;

  // Show HN / Product Hunt 本身是“有人刚公开发布”的弱质量信号，但不等价于成熟度。
  if (signals.source === "hackernews" || signals.source === "producthunt") score += 5;

  return {
    score: clamp100(score),
    rationale: reasons.length > 0 ? `health: ${reasons.join(" ")}` : "依据可用性与维护信号估算健康度",
    raw: null,
  };
}

const COMBINATION_GROUPS: Array<[string, RegExp]> = [
  ["agent", /\b(agent|agentic|computer use|mcp)\b/],
  ["creative", /\b(creative|generative|design|canvas|art|music)\b/],
  ["ui", /\b(ui|ux|interface|frontend|interaction)\b/],
  ["game", /\b(game|npc|unity|unreal|godot)\b/],
  ["3d", /\b(3d|blender|webgl|webgpu|scene)\b/],
  ["audio", /\b(audio|voice|speech|tts|asr|music)\b/],
  ["video", /\b(video|animation|world model)\b/],
  ["browser", /\b(browser|chrome|firefox|extension)\b/],
  ["automation", /\b(automation|workflow|tool use|plugin)\b/],
  ["local", /\b(local-first|offline|on-device|edge)\b/],
];

function combinationCount(signals: BasicScoreSignals): number {
  const text = corpus(signals);
  return COMBINATION_GROUPS.reduce((count, [, pattern]) => count + (pattern.test(text) ? 1 : 0), 0);
}

/** 新颖性：优先 AI 的 source-grounded noveltyScore；无 AI 时用组合性 + 新项目信号做保守估计。 */
export function noveltyScore(
  signals: BasicScoreSignals
): { score: number; rationale: string; raw: number | null } {
  if (signals.aiResult) {
    return {
      score: clamp100(signals.aiResult.noveltyScore),
      rationale: `AI novelty=${signals.aiResult.noveltyScore} confidence=${signals.aiResult.confidence}`,
      raw: signals.aiResult.noveltyScore,
    };
  }

  const combos = combinationCount(signals);
  const age = ageDaysFrom(signals.createdAtSource);
  let score = 35 + Math.min(32, combos * 8);
  if (age !== null && age <= 3) score += 10;
  else if (age !== null && age <= 7) score += 6;
  if (signals.source === "hackernews") score += 6;
  if (signals.itemType === "paper") score -= 8;

  return {
    score: clamp100(score),
    rationale: `heuristic novelty: ${combos} 个跨域/新交互信号${age !== null ? `, age=${age.toFixed(1)}d` : ""}`,
    raw: combos,
  };
}

/** 可试玩/可复现性。 */
export function tryabilityScore(
  signals: BasicScoreSignals
): { score: number; rationale: string; raw: number | null } {
  let base: number;
  switch (signals.itemType) {
    case "space":
      base = 100;
      break;
    case "repo":
      base = 82;
      break;
    case "product":
      base = 78;
      break;
    case "tool":
    case "demo":
      base = 92;
      break;
    case "model":
      base = 58;
      break;
    case "dataset":
      base = 38;
      break;
    case "paper":
      base = 22;
      break;
    default:
      base = 50;
  }

  if (signals.hasDemo === true) base += 12;
  if (signals.hasCode === true) base += 7;
  if (signals.hasDemo === false && signals.itemType === "product") base -= 8;

  const score = clamp100(base);
  return { score, rationale: `tryability: ${signals.itemType}${signals.hasDemo === true ? " + demo" : ""}${signals.hasCode === true ? " + code" : ""}`, raw: score };
}

/**
 * Idea Spark：衡量“看到以后会不会产生新的做法/项目灵感”。
 * 有 AI 时主要看 novelty + practical + possibleUses；无 AI 时由组合性、新颖性、可试玩性估计。
 */
export function ideaSparkScore(
  signals: BasicScoreSignals,
  novelty: number,
  tryability: number
): { score: number; rationale: string; raw: number | null } {
  const combos = combinationCount(signals);

  if (signals.aiResult) {
    const uses = Math.min(100, signals.aiResult.possibleUses.length * 22);
    const score = clamp100(
      0.48 * signals.aiResult.noveltyScore +
      0.32 * signals.aiResult.practicalValueScore +
      0.12 * uses +
      0.08 * tryability
    );
    return {
      score,
      rationale: `idea spark: novelty=${signals.aiResult.noveltyScore} practical=${signals.aiResult.practicalValueScore} uses=${signals.aiResult.possibleUses.length}`,
      raw: score,
    };
  }

  const score = clamp100(0.5 * novelty + 0.3 * tryability + Math.min(20, combos * 5));
  return {
    score,
    rationale: `heuristic idea spark: novelty=${novelty} tryability=${tryability} combinations=${combos}`,
    raw: score,
  };
}

/** 保留旧函数供其他代码兼容；v3 主分已不再使用单一 editorial_value。 */
export function editorialValueScore(
  aiResult: ItemAnalysisResult | null | undefined
): { score: number | null; rationale: string } {
  if (!aiResult) return { score: null, rationale: "无 AI 分析" };
  const score = clamp100(
    0.5 * aiResult.noveltyScore +
    0.4 * aiResult.practicalValueScore +
    0.05 * aiResult.researchValueScore +
    0.05 * aiResult.confidence * 100
  );
  return { score, rationale: `兼容 editorial proxy=${score}` };
}

/** 计算公共 Discovery Score。 */
export function computeBasicScore(signals: BasicScoreSignals): BasicScoreResult {
  const latestMs = latestTimestampMs(signals);
  const ageDays = latestMs === null ? null : Math.max(0, (Date.now() - latestMs) / 86_400_000);

  const freshness = freshnessScore(ageDays);
  const relevance = interestRelevanceScore(
    signals.topics,
    signals.aiResult?.tags ?? [],
    [signals.title, signals.description ?? "", signals.itemType, signals.source]
  );
  const momentum = momentumScore(signals);
  const health = projectHealthScore(signals);
  const novelty = noveltyScore(signals);
  const tryability = tryabilityScore(signals);
  const spark = ideaSparkScore(signals, novelty.score, tryability.score);

  const components: ScoreComponentValue[] = [
    { dimension: "freshness", rawValue: freshness.raw, normalizedScore: freshness.score, weight: SCORE_WEIGHTS.freshness, rationale: freshness.rationale },
    { dimension: "domain_relevance", rawValue: relevance.raw, normalizedScore: relevance.score, weight: SCORE_WEIGHTS.domainRelevance, rationale: relevance.rationale },
    { dimension: "momentum", rawValue: momentum.raw, normalizedScore: momentum.score, weight: SCORE_WEIGHTS.momentum, rationale: momentum.rationale },
    { dimension: "project_health", rawValue: health.raw, normalizedScore: health.score, weight: SCORE_WEIGHTS.projectHealth, rationale: health.rationale },
    { dimension: "novelty", rawValue: novelty.raw, normalizedScore: novelty.score, weight: SCORE_WEIGHTS.novelty, rationale: novelty.rationale },
    { dimension: "idea_spark", rawValue: spark.raw, normalizedScore: spark.score, weight: SCORE_WEIGHTS.ideaSpark, rationale: spark.rationale },
    { dimension: "tryability", rawValue: tryability.raw, normalizedScore: tryability.score, weight: SCORE_WEIGHTS.tryability, rationale: tryability.rationale },
  ];

  const total = round2(
    freshness.score * SCORE_WEIGHTS.freshness +
    relevance.score * SCORE_WEIGHTS.domainRelevance +
    momentum.score * SCORE_WEIGHTS.momentum +
    health.score * SCORE_WEIGHTS.projectHealth +
    novelty.score * SCORE_WEIGHTS.novelty +
    spark.score * SCORE_WEIGHTS.ideaSpark +
    tryability.score * SCORE_WEIGHTS.tryability
  );

  return {
    components,
    total: Math.max(0, Math.min(100, total)),
    scoreVersion: BASIC_SCORE_VERSION,
    hasAi: Boolean(signals.aiResult),
  };
}
