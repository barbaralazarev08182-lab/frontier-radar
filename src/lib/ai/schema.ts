/**
 * AI 分析输出 Schema 校验（阶段 1.5）。
 *
 * 手动校验器（不使用 zod）：避免仅为一次校验引入依赖。
 * 规则：
 *  - 分数超范围 → 视为无效输出，不静默截断；
 *  - 缺少核心字段 → 拒绝；
 *  - 字符串 trim、去重、限长；数组去重、限长；
 *  - 不使用 any 绕过校验（全部走 unknown + 类型收窄）。
 */

import type {
  AvailabilityStatus,
  ItemAnalysisResult,
  ReproductionDifficulty,
  RiskLevel,
} from "./types";

export const ANALYSIS_SCHEMA_VERSION = "item-analysis-v1";
export const ANALYSIS_PROMPT_VERSION = "frontier-analysis-v1";

/** 数组最多保留的元素数 */
const MAX_ARRAY_LENGTH = 10;
/** 单个字符串字段最大长度（超长截断） */
const MAX_STRING_LENGTH = 800;
/** 得分必须落在该区间，越界即无效 */
const SCORE_MIN = 0;
const SCORE_MAX = 100;
const CONFIDENCE_MIN = 0;
const CONFIDENCE_MAX = 1;

export class AnalysisValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalysisValidationError";
  }
}

const AVAILABILITY_VALUES: AvailabilityStatus[] = ["yes", "no", "unknown"];
const DIFFICULTY_VALUES: ReproductionDifficulty[] = ["easy", "medium", "hard", "unknown"];
const RISK_VALUES: RiskLevel[] = ["low", "medium", "high", "unknown"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 字符串：trim + 合并空白；非字符串或空 → null。 */
function normString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.replace(/\s+/g, " ").trim();
  return s.length > 0 ? s : null;
}

/** 字符串数组：元素必须为字符串；去空、去重、限长。非数组 → null。 */
function normStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const s = item.replace(/\s+/g, " ").trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= MAX_ARRAY_LENGTH) break;
  }
  return out;
}

/** 数字：必须为有限 number 且在 [min,max] 内，否则返回 null（越界=无效）。 */
function normScore(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

function normEnum<T extends string>(value: unknown, allowed: T[]): T | null {
  return typeof value === "string" && (allowed as string[]).includes(value)
    ? (value as T)
    : null;
}

/** 校验并规范化模型输出。非法输出返回 { ok:false, errors }。 */
export function validateAnalysisResult(raw: unknown):
  | { ok: true; result: ItemAnalysisResult }
  | { ok: false; errors: string[] } {
  if (!isRecord(raw)) {
    return { ok: false, errors: ["输出不是 JSON 对象"] };
  }

  const errors: string[] = [];

  // 核心字符串字段：缺失 / 非字符串 / 空白 → 拒绝
  const coreStrings = ["summaryZh", "problem", "novelty", "whyItMatters"] as const;
  const core: Record<string, string> = {};
  for (const key of coreStrings) {
    const s = normString(raw[key]);
    if (s === null) {
      errors.push(`缺少或非法字段 ${key}`);
    } else {
      core[key] = s.slice(0, MAX_STRING_LENGTH);
    }
  }

  const targetUsers = normStringArray(raw.targetUsers);
  const possibleUses = normStringArray(raw.possibleUses);
  const limitations = normStringArray(raw.limitations);
  const tags = normStringArray(raw.tags);
  if (targetUsers === null) errors.push("targetUsers 不是字符串数组");
  if (possibleUses === null) errors.push("possibleUses 不是字符串数组");
  if (limitations === null) errors.push("limitations 不是字符串数组");
  if (tags === null) errors.push("tags 不是字符串数组");

  const hasCode = normEnum<AvailabilityStatus>(raw.hasCode, AVAILABILITY_VALUES);
  const hasDemo = normEnum<AvailabilityStatus>(raw.hasDemo, AVAILABILITY_VALUES);
  const reproductionDifficulty = normEnum<ReproductionDifficulty>(
    raw.reproductionDifficulty,
    DIFFICULTY_VALUES
  );
  const hypeRisk = normEnum<RiskLevel>(raw.hypeRisk, RISK_VALUES);
  if (!hasCode) errors.push("hasCode 非法（需 yes/no/unknown）");
  if (!hasDemo) errors.push("hasDemo 非法（需 yes/no/unknown）");
  if (!reproductionDifficulty) errors.push("reproductionDifficulty 非法");
  if (!hypeRisk) errors.push("hypeRisk 非法");

  // 分数：越界 → 无效（不静默截断）
  const noveltyScore = normScore(raw.noveltyScore, SCORE_MIN, SCORE_MAX);
  const practicalValueScore = normScore(raw.practicalValueScore, SCORE_MIN, SCORE_MAX);
  const researchValueScore = normScore(raw.researchValueScore, SCORE_MIN, SCORE_MAX);
  const confidence = normScore(raw.confidence, CONFIDENCE_MIN, CONFIDENCE_MAX);
  if (noveltyScore === null) errors.push("noveltyScore 越界或非数字（需 0–100）");
  if (practicalValueScore === null) errors.push("practicalValueScore 越界或非数字（需 0–100）");
  if (researchValueScore === null) errors.push("researchValueScore 越界或非数字（需 0–100）");
  if (confidence === null) errors.push("confidence 越界或非数字（需 0–1）");

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    result: {
      summaryZh: core.summaryZh!,
      problem: core.problem!,
      novelty: core.novelty!,
      whyItMatters: core.whyItMatters!,
      targetUsers: targetUsers!,
      possibleUses: possibleUses!,
      hasCode: hasCode!,
      hasDemo: hasDemo!,
      reproductionDifficulty: reproductionDifficulty!,
      limitations: limitations!,
      hypeRisk: hypeRisk!,
      tags: tags!,
      noveltyScore: noveltyScore!,
      practicalValueScore: practicalValueScore!,
      researchValueScore: researchValueScore!,
      confidence: confidence!,
    },
  };
}

/**
 * 从模型输出中提取 JSON 对象。
 * 只做两层受控处理：直接 JSON.parse；单层 ```json 代码块。
 * 不做宽松正则猜测复杂输出。
 */
export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new AnalysisValidationError("模型输出为空");
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    // 尝试去除单层 Markdown 代码块
  }
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence && fence[1]) {
    try {
      return JSON.parse(fence[1]) as unknown;
    } catch {
      // fallthrough
    }
  }
  throw new AnalysisValidationError("模型输出不是合法 JSON");
}

/** 解析模型输出并校验。返回结果或抛出 AnalysisValidationError。 */
export function parseAndValidateAnalysis(text: string): ItemAnalysisResult {
  const parsed = extractJsonObject(text);
  const validated = validateAnalysisResult(parsed);
  if (!validated.ok) {
    throw new AnalysisValidationError(`Schema 校验失败: ${validated.errors.join("; ")}`);
  }
  return validated.result;
}
