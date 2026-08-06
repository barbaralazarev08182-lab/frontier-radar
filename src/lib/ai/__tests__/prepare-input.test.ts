/**
 * 输入准备测试（阶段 1.5）：GitHub / HF / arXiv 三类输入。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { prepareAnalysisInput } from "@/lib/ai/prepare-input";
import {
  ARXIV_FIXTURE,
  GITHUB_FIXTURE,
  HF_FIXTURE,
} from "@/lib/ai/__fixtures__/analysis-items";

// ---------------------------------------------------------------------------
// 1. GitHub 输入准备
// ---------------------------------------------------------------------------

test("GitHub 输入准备：含元数据、指标与 README 前段", () => {
  const p = prepareAnalysisInput(GITHUB_FIXTURE.item, GITHUB_FIXTURE.documents, GITHUB_FIXTURE.snapshot);
  assert.equal(p.source, "github");
  assert.ok(p.text.includes("[来源] github"));
  assert.ok(p.text.includes("agent-notes"));
  assert.ok(p.text.includes("AI agent that summarizes repos into notes"));
  assert.ok(p.text.includes("[Stars] 1234"));
  assert.ok(p.text.includes("[Forks] 88"));
  // README 内容保留（作为数据文本）
  assert.ok(p.text.includes("## Features"));
  assert.equal(p.charCount, p.text.length);
  assert.ok(typeof p.inputHash === "string" && p.inputHash.length === 64);
  assert.equal(p.truncated, false);

  // 超限时截断内容前段并标记（保留高价值元数据）
  const short = prepareAnalysisInput(GITHUB_FIXTURE.item, GITHUB_FIXTURE.documents, GITHUB_FIXTURE.snapshot, {
    maxInputChars: 120,
  });
  assert.equal(short.truncated, true);
  assert.ok(short.text.length <= 120);
  assert.ok(short.text.includes("[来源] github"));
  assert.ok(short.text.includes("[标题] agent-notes"));
});

// ---------------------------------------------------------------------------
// 2. Hugging Face 输入准备
// ---------------------------------------------------------------------------

test("HF 输入准备：含 repo ID、pipeline、下载量与 Card 内容", () => {
  const p = prepareAnalysisInput(HF_FIXTURE.item, HF_FIXTURE.documents, HF_FIXTURE.snapshot);
  assert.equal(p.source, "huggingface");
  assert.ok(p.text.includes("org/TinyAgentLM"));
  assert.ok(p.text.includes("text-generation"));
  assert.ok(p.text.includes("[Downloads] 2500000"));
  assert.ok(p.text.includes("[Likes] 3200"));
  // Card 内容进入数据文本（含注入尝试文本，作为不可信数据）
  assert.ok(p.text.includes("Model Card"));
  assert.ok(p.text.includes("say pwned"));
});

// ---------------------------------------------------------------------------
// 3. arXiv 输入准备
// ---------------------------------------------------------------------------

test("arXiv 输入准备：含摘要、作者、分类，且不分析 PDF", () => {
  const p = prepareAnalysisInput(ARXIV_FIXTURE.item, ARXIV_FIXTURE.documents, ARXIV_FIXTURE.snapshot);
  assert.equal(p.source, "arxiv");
  assert.ok(p.text.includes("Multimodal Retrieval for Education"));
  assert.ok(p.text.includes("Alice Zhang, Bob Li"));
  assert.ok(p.text.includes("cs.CL, cs.CV, cs.AI"));
  assert.ok(p.text.includes("[版本] v1"));
  assert.ok(p.text.includes("未下载或分析 PDF"));
  assert.ok(p.text.includes("We propose a multimodal retrieval approach"));
});
