/** Discovery Score v3 tests. */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeBasicScore,
  BASIC_SCORE_VERSION,
  SCORE_WEIGHTS,
  formatAffinityScore,
  momentumScore,
} from "@/lib/scoring/basic-score";

const DAY = 86_400_000;

function base(overrides: Record<string, unknown> = {}) {
  return {
    source: "github",
    itemType: "repo",
    title: "AI agent creative tool",
    description: "A small open source AI tool with an interactive demo.",
    topics: ["ai", "agent", "creative-ai"],
    createdAtSource: new Date(Date.now() - 2 * DAY).toISOString(),
    pushedAtSource: new Date(Date.now() - 0.5 * DAY).toISOString(),
    stars: 80,
    forks: 8,
    downloads: null,
    likes: null,
    aiResult: null,
    ...overrides,
  };
}

test("v3 无 AI 也产生完整的 7 维公共 Discovery Score", () => {
  const score = computeBasicScore(base());

  assert.equal(score.scoreVersion, BASIC_SCORE_VERSION);
  assert.equal(score.hasAi, false);

  const dims = new Set(score.components.map((c) => c.dimension));
  for (const dimension of [
    "freshness",
    "domain_relevance",
    "momentum",
    "project_health",
    "novelty",
    "idea_spark",
    "tryability",
  ]) {
    assert.ok(dims.has(dimension), `缺少 ${dimension}`);
  }

  assert.equal(score.components.length, 7);
  for (const component of score.components) {
    assert.ok(component.normalizedScore >= 0 && component.normalizedScore <= 100);
    assert.ok(component.rationale.length > 0);
  }

  const totalWeight = Object.values(SCORE_WEIGHTS).reduce((sum, value) => sum + value, 0);
  assert.ok(Math.abs(totalWeight - 1) < 1e-9);
  assert.ok(score.total >= 0 && score.total <= 100);
});

test("Rising > Popular：新小项目的年龄校正 Momentum 高于老牌大项目", () => {
  const rising = momentumScore(base({
    createdAtSource: new Date(Date.now() - 2 * DAY).toISOString(),
    pushedAtSource: new Date(Date.now() - 0.2 * DAY).toISOString(),
    stars: 80,
    forks: 8,
  }));

  const oldPopular = momentumScore(base({
    createdAtSource: new Date(Date.now() - 5 * 365 * DAY).toISOString(),
    pushedAtSource: new Date(Date.now() - 120 * DAY).toISOString(),
    stars: 30_000,
    forks: 3_000,
  }));

  assert.ok(rising.score > oldPopular.score, `rising=${rising.score}, old=${oldPopular.score}`);
});

test("可体验项目默认高于纯论文", () => {
  assert.ok(formatAffinityScore("space").score > formatAffinityScore("paper").score);
  assert.ok(formatAffinityScore("repo").score > formatAffinityScore("paper").score);
  assert.ok(formatAffinityScore("product").score > formatAffinityScore("paper").score);
});

test("跨域创意组合比普通单一项目获得更高 Idea Spark", () => {
  const creative = computeBasicScore(base({
    title: "Blender MCP agent that generates playable 3D game worlds",
    description: "AI agent controls Blender through MCP and creates interactive game scenes.",
    topics: ["ai", "agent", "mcp", "3d", "blender", "game"],
  }));
  const generic = computeBasicScore(base({
    title: "Machine learning utilities",
    description: "A collection of machine learning utility functions.",
    topics: ["machine-learning"],
  }));

  const creativeSpark = creative.components.find((c) => c.dimension === "idea_spark")!;
  const genericSpark = generic.components.find((c) => c.dimension === "idea_spark")!;
  assert.ok(creativeSpark.normalizedScore > genericSpark.normalizedScore);
});
