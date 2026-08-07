import { test } from "node:test";
import assert from "node:assert/strict";
import { clusterProjectFeed } from "@/lib/feed/project-entities";
import type { FeedResult, FrontierFeedItem } from "@/lib/feed/types";

function item(
  id: string,
  source: FrontierFeedItem["source"],
  title: string,
  url: string,
  score: number
): FrontierFeedItem {
  return {
    id,
    source,
    contentType: source === "github" ? "repo" : "product",
    title,
    canonicalUrl: url,
    author: null,
    description: null,
    publishedAt: "2026-08-07T00:00:00.000Z",
    updatedAt: "2026-08-07T01:00:00.000Z",
    score,
    summaryZh: null,
    novelty: null,
    whyItMatters: null,
    targetUsers: [],
    possibleUses: [],
    hasCode: source === "github" ? "yes" : "unknown",
    hasDemo: source === "hackernews" || source === "producthunt" ? "yes" : "unknown",
    reproductionDifficulty: "unknown",
    tags: [],
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

test("跨来源 exact URL 合并后保留上游个性化排序的第一条作为主条目", () => {
  const hnFirst = item(
    "hn",
    "hackernews",
    "Show HN: Tiny Agent Studio",
    "https://github.com/acme/tiny-agent-studio?utm_source=hn",
    61
  );
  const githubSecond = item(
    "gh",
    "github",
    "Tiny Agent Studio",
    "https://github.com/acme/tiny-agent-studio",
    94
  );

  const clustered = clusterProjectFeed(feed([hnFirst, githubSecond]));
  assert.equal(clustered.feed.items.length, 1);
  assert.equal(clustered.feed.items[0]!.id, "hn", "不能用公共分覆盖已经完成的个性化顺序");

  const entity = clustered.entities.get("hn");
  assert.ok(entity);
  assert.equal(entity.crossSource, true);
  assert.deepEqual(new Set(entity.sources), new Set(["hackernews", "github"]));
  assert.equal(entity.evidence.length, 2);
  assert.equal(entity.matchConfidence, "url");
});

test("跨来源高相似标题可以聚类，但同来源相似标题不互相误伤", () => {
  const githubA = item("gh-a", "github", "Canvas Agent Studio", "https://github.com/acme/canvas-agent", 90);
  const productHunt = item("ph", "producthunt", "Canvas Agent Studio — visual AI workflows", "https://producthunt.com/posts/canvas-agent-studio", 75);
  const githubB = item("gh-b", "github", "Canvas Agent Studio Pro", "https://github.com/acme/canvas-agent-pro", 70);

  const clustered = clusterProjectFeed(feed([githubA, productHunt, githubB]));
  assert.equal(clustered.feed.items.length, 2);

  const firstEntity = clustered.entities.get("gh-a");
  assert.ok(firstEntity);
  assert.equal(firstEntity.crossSource, true);
  assert.equal(firstEntity.matchConfidence, "title");

  assert.ok(clustered.entities.has("gh-b"), "同来源的另一个仓库应保留为独立项目实体");
});
