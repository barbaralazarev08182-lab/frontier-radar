/**
 * Schema 校验测试（阶段 1.5）：合法结果通过，非法/越界被拒绝。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AnalysisValidationError,
  parseAndValidateAnalysis,
  validateAnalysisResult,
} from "@/lib/ai/schema";
import type { ItemAnalysisResult } from "@/lib/ai/types";

const VALID_RESULT: ItemAnalysisResult = {
  summaryZh: "一个用于仓库总结的 AI Agent。",
  problem: "手动阅读仓库效率低",
  novelty: "记忆管理",
  whyItMatters: "提升开发效率",
  targetUsers: ["开发者"],
  possibleUses: ["总结 PR"],
  hasCode: "yes",
  hasDemo: "no",
  reproductionDifficulty: "easy",
  limitations: ["依赖 LLM 成本"],
  hypeRisk: "low",
  tags: ["ai-agent", "llm"],
  noveltyScore: 60,
  practicalValueScore: 70,
  researchValueScore: 40,
  confidence: 0.8,
};

// ---------------------------------------------------------------------------
// 5. 合法 JSON 通过校验
// ---------------------------------------------------------------------------

test("合法 JSON 分析结果通过校验（含代码块包裹形式）", () => {
  const plain = parseAndValidateAnalysis(JSON.stringify(VALID_RESULT));
  assert.equal(plain.summaryZh, VALID_RESULT.summaryZh);
  assert.equal(plain.confidence, 0.8);

  // ```json 代码块形式也可解析
  const fenced = parseAndValidateAnalysis("```json\n" + JSON.stringify(VALID_RESULT) + "\n```");
  assert.equal(fenced.problem, VALID_RESULT.problem);
});

// ---------------------------------------------------------------------------
// 6. 无效 JSON / 越界分数被拒绝
// ---------------------------------------------------------------------------

test("越界分数、缺失核心字段、非法枚举与非 JSON 都被拒绝", () => {
  // 越界分数被拒绝而非静默截断
  const outOfRange = validateAnalysisResult({ ...VALID_RESULT, noveltyScore: 150 });
  assert.equal(outOfRange.ok, false);
  if (!outOfRange.ok) {
    assert.ok(outOfRange.errors.some((e) => e.includes("noveltyScore")));
  }

  // 缺失核心字段（空白摘要）被拒绝
  const missing = validateAnalysisResult({ ...VALID_RESULT, summaryZh: "   " });
  assert.equal(missing.ok, false);

  // 非法枚举被拒绝
  const badEnum = validateAnalysisResult({ ...VALID_RESULT, hasCode: "maybe" });
  assert.equal(badEnum.ok, false);

  // 非 JSON 与错误结构被拒绝
  assert.throws(() => parseAndValidateAnalysis("not json at all"), AnalysisValidationError);
  assert.throws(() => parseAndValidateAnalysis("[]"), AnalysisValidationError);
});
