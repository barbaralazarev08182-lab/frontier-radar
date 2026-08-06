/**
 * Supabase provider 行映射测试（阶段 1.6）。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { mapFeedRow, type FeedViewRow } from "@/lib/feed/supabase-provider";

const FULL_ROW: FeedViewRow = {
  item_id: "item-1",
  source_slug: "huggingface",
  content_type: "model",
  title: "TinyAgentLM",
  canonical_url: "https://huggingface.co/org/TinyAgentLM",
  author: "org",
  description: "small tool-use model",
  published_at: "2026-07-25T08:00:00.000Z",
  updated_at: "2026-08-02T10:00:00.000Z",
  latest_score: 81.5,
  analysis_result: {
    summaryZh: "一个本地可跑的小型工具调用模型。",
    novelty: "函数调用数据裁剪",
    whyItMatters: "本地 Agent 应用需要轻量模型",
    targetUsers: ["嵌入式开发者"],
    possibleUses: ["本地助手"],
    hasCode: "yes",
    hasDemo: "no",
    reproductionDifficulty: "easy",
    limitations: [],
    hypeRisk: "low",
    tags: ["llm", "tool-use"],
    noveltyScore: 70,
    practicalValueScore: 80,
    researchValueScore: 50,
    confidence: 0.85,
  },
  analysis_created_at: "2026-08-05T00:00:00.000Z",
  summary_zh: "一个本地可跑的小型工具调用模型。",
  why_it_matters: "本地 Agent 应用需要轻量模型",
  tags: ["llm", "tool-use"],
  tags_text: "llm tool-use",
  metrics: { stars: null, forks: null, downloads: 158000, likes: 1200 },
};

// ---------------------------------------------------------------------------
// 2. Supabase 行映射为统一 Feed 类型
// ---------------------------------------------------------------------------

test("View 行完整映射为统一 Feed 类型", () => {
  const item = mapFeedRow(FULL_ROW);

  assert.equal(item.id, "item-1");
  assert.equal(item.source, "huggingface");
  assert.equal(item.contentType, "model");
  assert.equal(item.title, "TinyAgentLM");
  assert.equal(item.canonicalUrl, "https://huggingface.co/org/TinyAgentLM");
  assert.equal(item.score, 81.5);
  assert.equal(item.summaryZh, "一个本地可跑的小型工具调用模型。");
  assert.equal(item.whyItMatters, "本地 Agent 应用需要轻量模型");
  assert.deepEqual(item.targetUsers, ["嵌入式开发者"]);
  assert.equal(item.hasCode, "yes");
  assert.equal(item.hasDemo, "no");
  assert.equal(item.reproductionDifficulty, "easy");
  assert.deepEqual(item.tags, ["llm", "tool-use"]);
  assert.equal(item.metrics.downloads, 158000);
  assert.equal(item.metrics.likes, 1200);
  assert.equal(item.metrics.stars, undefined);
});

// ---------------------------------------------------------------------------
// 5. 无 AI 分析时回退 description 与 unknown
// ---------------------------------------------------------------------------

test("无 AI 分析时 summaryZh 为 null、枚举回退 unknown", () => {
  const item = mapFeedRow({
    ...FULL_ROW,
    analysis_result: null,
    summary_zh: null,
    why_it_matters: null,
    tags: null,
    tags_text: null,
    metrics: null,
  });

  assert.equal(item.summaryZh, null);
  assert.equal(item.novelty, null);
  assert.equal(item.whyItMatters, null);
  assert.deepEqual(item.targetUsers, []);
  assert.equal(item.hasCode, "unknown");
  assert.equal(item.hasDemo, "unknown");
  assert.equal(item.reproductionDifficulty, "unknown");
  assert.deepEqual(item.tags, []);
  assert.deepEqual(item.metrics, {});
  // 描述保留（页面用于无 AI 回退展示）
  assert.equal(item.description, "small tool-use model");
});
