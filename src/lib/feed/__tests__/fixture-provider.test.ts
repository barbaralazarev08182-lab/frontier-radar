/**
 * Fixture provider 测试（阶段 1.6）。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { FixtureFeedProvider } from "@/lib/feed/fixture-provider";
import { FIXTURES } from "@/lib/feed/fixtures";
import type { FeedQuery } from "@/lib/feed/types";

const BASE_QUERY: FeedQuery = { q: null, source: null, type: null, tag: null, sort: "score", page: 1 };

// ---------------------------------------------------------------------------
// 1. fixture provider 返回统一 Feed 类型
// ---------------------------------------------------------------------------

test("fixture provider 返回统一 Feed 类型并覆盖全部来源与内容类型", async () => {
  const provider = new FixtureFeedProvider();
  const feed = await provider.getFeed(BASE_QUERY);

  assert.equal(provider.mode, "fixture");
  assert.equal(feed.total, FIXTURES.length);
  assert.equal(feed.pageSize, 20);
  assert.ok(feed.items.length > 0);

  // 统一类型字段齐全
  for (const item of feed.items) {
    assert.ok(typeof item.id === "string" && item.id.length > 0);
    assert.ok(["github", "huggingface", "arxiv"].includes(item.source));
    assert.ok(typeof item.title === "string" && item.title.length > 0);
    assert.ok(item.canonicalUrl.startsWith("https://"));
    assert.equal(item.isFixture, true);
    assert.ok(Array.isArray(item.tags));
    assert.ok(typeof item.metrics === "object");
  }

  // 覆盖三类来源与五种内容类型
  const sources = new Set(feed.items.map((i) => i.source));
  assert.deepEqual([...sources].sort(), ["arxiv", "github", "huggingface"]);
  const types = new Set(feed.items.map((i) => i.contentType));
  for (const t of ["repo", "model", "dataset", "space", "paper"] as const) {
    assert.ok(types.has(t), `缺少内容类型 ${t}`);
  }
});

// ---------------------------------------------------------------------------
// 6. 来源 / 标签筛选与关键词搜索
// ---------------------------------------------------------------------------

test("fixture provider 支持来源、标签筛选与关键词搜索", async () => {
  const provider = new FixtureFeedProvider();

  const arxivOnly = await provider.getFeed({ ...BASE_QUERY, source: "arxiv" });
  assert.ok(arxivOnly.items.length >= 3);
  assert.ok(arxivOnly.items.every((i) => i.source === "arxiv"));

  const tagged = await provider.getFeed({ ...BASE_QUERY, tag: "llm" });
  assert.ok(tagged.items.length > 0);
  assert.ok(tagged.items.every((i) => i.tags.includes("llm")));

  // 搜索命中标题 / 中文摘要 / 标签
  const byTitle = await provider.getFeed({ ...BASE_QUERY, q: "backtest" });
  assert.ok(byTitle.items.length > 0);
  const bySummary = await provider.getFeed({ ...BASE_QUERY, q: "音色克隆" });
  assert.ok(bySummary.items.length > 0);
  const byTag = await provider.getFeed({ ...BASE_QUERY, q: "multimodal" });
  assert.ok(byTag.items.length > 0);

  // 无命中返回空结果而非报错
  const none = await provider.getFeed({ ...BASE_QUERY, q: "zzzz-not-exist" });
  assert.equal(none.items.length, 0);
  assert.equal(none.total, 0);
});
