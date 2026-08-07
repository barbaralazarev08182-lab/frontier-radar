/**
 * 基础排序测试 v2：arXiv 无 source signal 时仍能计算总分，且论文形态默认低于可体验项目。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeBasicScore,
  BASIC_SCORE_VERSION,
  SCORE_WEIGHTS,
  formatAffinityScore,
} from "@/lib/scoring/basic-score";

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
  assert.equal(score.hasAi, false);

  const dims = score.components.map((c) => c.dimension);
  assert.ok(dims.includes("freshness"));
  assert.ok(dims.includes("interest_relevance"));
  assert.ok(dims.includes("source_signal"));
  assert.ok(dims.includes("format_affinity"));
  assert.ok(!dims.includes("editorial_value"));

  for (const c of score.components) {
    assert.ok(c.normalizedScore >= 0 && c.normalizedScore <= 100, `${c.dimension} 越界`);
    assert.ok(c.rationale.length > 0, `${c.dimension} 缺少 rationale`);
  }

  const source = score.components.find((c) => c.dimension === "source_signal")!;
  assert.equal(source.normalizedScore, 50);
  assert.ok(source.rationale.includes("中性"));

  const expected =
    (score.components.find((c) => c.dimension === "freshness")!.normalizedScore * SCORE_WEIGHTS.freshness +
      score.components.find((c) => c.dimension === "interest_relevance")!.normalizedScore * SCORE_WEIGHTS.interestRelevance +
      source.normalizedScore * SCORE_WEIGHTS.sourceSignal +
      score.components.find((c) => c.dimension === "format_affinity")!.normalizedScore * SCORE_WEIGHTS.formatAffinity) /
    (SCORE_WEIGHTS.freshness +
      SCORE_WEIGHTS.interestRelevance +
      SCORE_WEIGHTS.sourceSignal +
      SCORE_WEIGHTS.formatAffinity);
  assert.equal(score.total, Math.round(expected * 100) / 100);
});

test("冷启动内容形态优先可体验项目而不是论文", () => {
  assert.ok(formatAffinityScore("repo").score > formatAffinityScore("paper").score);
  assert.ok(formatAffinityScore("space").score > formatAffinityScore("model").score);
});
