import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDiscoveryMix } from "@/lib/feed/discovery-mix";
import type { FeedResult, FrontierFeedItem } from "@/lib/feed/types";

function item(
  id: string,
  title: string,
  score: number,
  tags: string[],
  contentType: FrontierFeedItem["contentType"] = "repo",
  source: FrontierFeedItem["source"] = "github"
): FrontierFeedItem {
  return {
    id,
    source,
    contentType,
    title,
    canonicalUrl: `https://example.com/${id}`,
    author: null,
    description: tags.join(" "),
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    score,
    summaryZh: null,
    novelty: null,
    whyItMatters: null,
    targetUsers: [],
    possibleUses: [],
    hasCode: contentType === "repo" ? "yes" : "unknown",
    hasDemo: contentType === "space" || contentType === "product" ? "yes" : "unknown",
    reproductionDifficulty: "unknown",
    tags,
    metrics: {},
  };
}

function feed(items: FrontierFeedItem[]): FeedResult {
  return {
    items,
    total: items.length,
    page: 1,
    pageSize: 20,
    query: { q: null, source: null, type: null, tag: null, sort: "score", page: 1 },
  };
}

test("Daily Radar 在候选充足时保留 5 Core + 1 Adjacent + 1 Wildcard", () => {
  const input = feed([
    item("1", "Autonomous AI agent", 92, ["agent", "autonomous"]),
    item("2", "MCP agent toolkit", 89, ["agent", "mcp"]),
    item("3", "Agent workflow builder", 87, ["agent", "workflow"]),
    item("4", "Coding agent CLI", 85, ["agent", "coding agent"]),
    item("5", "Browser agent", 83, ["agent", "browser"]),
    item("6", "Agent creative studio", 80, ["agent", "creative tool"]),
    item("7", "Generative game playground", 78, ["generative game", "gameplay"], "product", "hackernews"),
    item("8", "Music generation canvas", 74, ["music generation", "canvas"], "space", "huggingface"),
    item("9", "Agent SDK", 72, ["agent", "sdk"]),
  ]);

  const mixed = buildDiscoveryMix(input, [{ key: "ai_agents", weight: 10 }], 7);
  assert.equal(mixed.feed.items.length, 7);
  assert.equal(mixed.feed.items[0]!.id, "1", "第一名应保留上游最强推荐");

  const lanes = mixed.feed.items.map((entry) => mixed.lanes.get(entry.id));
  assert.equal(lanes.filter((lane) => lane === "core").length, 5);
  assert.equal(lanes.filter((lane) => lane === "adjacent").length, 1);
  assert.equal(lanes.filter((lane) => lane === "wildcard").length, 1);
});

test("Wildcard 不为了探索强塞低质量候选", () => {
  const input = feed([
    item("1", "AI agent one", 90, ["agent"]),
    item("2", "AI agent two", 88, ["agent"]),
    item("3", "AI agent three", 86, ["agent"]),
    item("4", "AI agent four", 84, ["agent"]),
    item("5", "AI agent creative", 82, ["agent", "creative tool"]),
    item("6", "Random unrelated toy", 20, ["unrelated"], "product", "hackernews"),
    item("7", "Agent developer tool", 70, ["agent", "developer tools"]),
  ]);

  const mixed = buildDiscoveryMix(input, [{ key: "ai_agents", weight: 10 }], 7);
  const wildcard = mixed.feed.items.find((entry) => mixed.lanes.get(entry.id) === "wildcard");
  assert.ok(!wildcard || (wildcard.score ?? 0) >= 50);
});
