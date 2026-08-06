/**
 * 基础排序测试（阶段 1.5）：arXiv 无 source signal 时仍能计算总分。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { computeBasicScore, BASIC_SCORE_VERSION, SCORE_WEIGHTS } from "@/lib/scoring/basic-score";

test("arXiv 无互动指标时仍能计算总分（source signal 中性、无 AI 为临时分）", () => {
  const score = computeBasicScore({
    source: "arxiv",
    itemType: "paper",
    title: "A Paper",
    description: "abstract",
    topics: ["cs.LG", "nlp"],
    createdAtSource: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    pushedAtSource: new Date(Date.now() - 1 * 86_400_000).toISOString(),
    stars: null,
    forks: null,
    downloads: null,
    likes: null,
    aiResult: null,
  });

  assert.equal(score.scoreVersion, BASIC_SCORE_VERSION);
  assert.equal(score.hasAi, false); // 临时分明确标记

  // 组件齐全：freshness / interest_relevance / source_signal
  const dims = score.components.map((c) => c.dimension);
  assert.ok(dims.includes("freshness"));
  assert.ok(dims.includes("interest_relevance"));
  assert.ok(dims.includes("source_signal"));
  assert.ok(!dims.includes("editorial_value"));

  // 所有组件在 0–100
  for (const c of score.components) {
    assert.ok(c.normalizedScore >= 0 && c.normalizedScore <= 100, `${c.dimension} 越界`);
    assert.ok(c.rationale.length > 0, `${c.dimension} 缺少 rationale`);
  }

  // source signal 为中性 50，不伪造热度
  const source = score.components.find((c) => c.dimension === "source_signal")!;
  assert.equal(source.normalizedScore, 50);
  assert.ok(source.rationale.includes("中性"));

  // 临时分 = 三个组件按权重归一化
  const expected =
    (score.components.find((c) => c.dimension === "freshness")!.normalizedScore * SCORE_WEIGHTS.freshness +
      score.components.find((c) => c.dimension === "interest_relevance")!.normalizedScore * SCORE_WEIGHTS.interestRelevance +
      source.normalizedScore * SCORE_WEIGHTS.sourceSignal) /
    (SCORE_WEIGHTS.freshness + SCORE_WEIGHTS.interestRelevance + SCORE_WEIGHTS.sourceSignal);
  assert.equal(score.total, Math.round(expected * 100) / 100);
});
