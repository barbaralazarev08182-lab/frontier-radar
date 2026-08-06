/**
 * Feed 查询参数测试（阶段 1.6）。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildExploreUrl, parseFeedQuery } from "@/lib/feed/query-params";
import type { FeedQuery } from "@/lib/feed/types";

// ---------------------------------------------------------------------------
// 3. query parameters 解析
// ---------------------------------------------------------------------------

test("query parameters 解析：默认值、规范化与非法值回退", () => {
  const defaults = parseFeedQuery({});
  assert.deepEqual(defaults, { q: null, source: null, type: null, tag: null, sort: "score", page: 1 });

  const full = parseFeedQuery({
    q: "  agent  ",
    source: "github",
    type: "model",
    tag: "llm",
    sort: "newest",
    page: "3",
  });
  assert.equal(full.q, "agent");
  assert.equal(full.source, "github");
  assert.equal(full.type, "model");
  assert.equal(full.tag, "llm");
  assert.equal(full.sort, "newest");
  assert.equal(full.page, 3);

  // 非法值回退默认，不报错
  const invalid = parseFeedQuery({ source: "nope", type: "unknown", sort: "bogus", page: "abc" });
  assert.equal(invalid.source, null);
  assert.equal(invalid.type, null);
  assert.equal(invalid.sort, "score");
  assert.equal(invalid.page, 1);

  // 负数 / 零页回退第 1 页；超大页封顶
  assert.equal(parseFeedQuery({ page: "-2" }).page, 1);
  assert.equal(parseFeedQuery({ page: "99999" }).page, 1000);
});

// ---------------------------------------------------------------------------
// 4. 排序参数验证 + URL 构建
// ---------------------------------------------------------------------------

test("score / newest / updated 排序参数全部通过并可从 URL 还原", () => {
  for (const sort of ["score", "newest", "updated"]) {
    const q = parseFeedQuery({ sort });
    assert.equal(q.sort, sort);
  }

  const q: FeedQuery = { q: "agent", source: null, type: null, tag: "llm", sort: "updated", page: 2 };
  const url = buildExploreUrl("/explore", q);
  assert.ok(url.startsWith("/explore?"));
  assert.ok(url.includes("q=agent"));
  assert.ok(url.includes("tag=llm"));
  assert.ok(url.includes("sort=updated"));
  assert.ok(url.includes("page=2"));

  // 重新解析 URL 后状态保持
  const restored = parseFeedQuery(Object.fromEntries(new URLSearchParams(url.split("?")[1]!)));
  assert.equal(restored.q, "agent");
  assert.equal(restored.tag, "llm");
  assert.equal(restored.sort, "updated");
  assert.equal(restored.page, 2);
});
