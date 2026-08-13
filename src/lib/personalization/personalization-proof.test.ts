import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildDiscoveryMix } from "@/lib/feed/discovery-mix";
import {
  clusterProjectFeed,
  promoteCrossSourceEvidence,
} from "@/lib/feed/project-entities";
import type {
  FeedContentType,
  FeedResult,
  FeedSource,
  FrontierFeedItem,
} from "@/lib/feed/types";
import { feedbackStrength } from "./profile";
import { rankWithInterestVector } from "./server";
import { l2Normalize, vectorizeFeedItem } from "./vector";

function makeItem({
  id,
  title,
  score,
  tags = [],
  source = "hackernews",
  contentType = "product",
  canonicalUrl = `https://example.com/${id}`,
}: {
  id: string;
  title: string;
  score: number;
  tags?: string[];
  source?: FeedSource;
  contentType?: FeedContentType;
  canonicalUrl?: string;
}): FrontierFeedItem {
  return {
    id,
    source,
    contentType,
    title,
    canonicalUrl,
    author: null,
    description: null,
    publishedAt: "2026-08-13T00:00:00.000Z",
    updatedAt: null,
    score,
    summaryZh: null,
    novelty: null,
    whyItMatters: null,
    targetUsers: [],
    possibleUses: [],
    hasCode: contentType === "repo" ? "yes" : "unknown",
    hasDemo: contentType === "space" ? "yes" : "unknown",
    reproductionDifficulty: "unknown",
    tags,
    metrics: {},
  };
}

function makeFeed(items: FrontierFeedItem[]): FeedResult {
  return {
    items,
    total: items.length,
    page: 1,
    pageSize: 20,
    query: {
      q: null,
      source: null,
      type: null,
      tag: null,
      sort: "score",
      page: 1,
    },
  };
}

function singleEventVector(item: FrontierFeedItem, eventType: "interested" | "not_interested"): number[] {
  const strength = feedbackStrength(eventType, null);
  return l2Normalize(vectorizeFeedItem(item).map((value) => value * strength));
}

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("Gate 13C: More Like This raises a related candidate without mutating Global Score", () => {
  const related = makeItem({
    id: "related-low",
    title: "Autonomous agent workflow",
    score: 50,
    tags: ["agent", "autonomous", "workflow"],
  });
  const unrelated = makeItem({
    id: "unrelated-high",
    title: "Factor investing backtest",
    score: 60,
    tags: ["quant finance", "backtest", "factor investing"],
  });
  const input = makeFeed([unrelated, related]);

  assert.equal(feedbackStrength("interested", null), 4);
  const ranked = rankWithInterestVector(input, singleEventVector(related, "interested"));

  assert.deepEqual(ranked.items.map((item) => item.id), ["related-low", "unrelated-high"]);
  assert.equal(related.score, 50);
  assert.equal(unrelated.score, 60);
  assert.equal(ranked.items.find((item) => item.id === related.id)?.score, 50);
  assert.equal(ranked.items.find((item) => item.id === unrelated.id)?.score, 60);
});

test("Gate 13C: Less Like This lowers a related candidate without mutating Global Score", () => {
  const related = makeItem({
    id: "related-high",
    title: "Autonomous agent workflow",
    score: 70,
    tags: ["agent", "autonomous", "workflow"],
  });
  const unrelated = makeItem({
    id: "unrelated-low",
    title: "Factor investing backtest",
    score: 60,
    tags: ["quant finance", "backtest", "factor investing"],
  });
  const input = makeFeed([related, unrelated]);

  assert.equal(feedbackStrength("not_interested", null), -5);
  const ranked = rankWithInterestVector(input, singleEventVector(related, "not_interested"));

  assert.deepEqual(ranked.items.map((item) => item.id), ["unrelated-low", "related-high"]);
  assert.equal(related.score, 70);
  assert.equal(unrelated.score, 60);
  assert.equal(ranked.items.find((item) => item.id === related.id)?.score, 70);
  assert.equal(ranked.items.find((item) => item.id === unrelated.id)?.score, 60);
});

test("Gate 13C: explicit More/Less feedback rebuilds the stored interest vector", () => {
  const feedbackRoute = source("../../app/api/feedback/route.ts");

  assert.match(feedbackRoute, /"interested"/);
  assert.match(feedbackRoute, /"not_interested"/);
  assert.match(
    feedbackRoute,
    /if \(eventType !== "dwell"\) \{[\s\S]*rebuildUserInterestVector\(supabase, visitorId\)/
  );
});

test("Gate 13C: project clustering preserves the personalized primary item", () => {
  const personalizedPrimary = makeItem({
    id: "personalized-primary",
    title: "Agent Kit launch",
    score: 82,
    tags: ["agent"],
    canonicalUrl: "https://github.com/acme/agent-kit",
  });
  const duplicateEvidence = makeItem({
    id: "duplicate-evidence",
    title: "Agent Kit",
    score: 80,
    tags: ["agent", "open source"],
    source: "github",
    contentType: "repo",
    canonicalUrl: "https://github.com/acme/agent-kit",
  });
  const other = makeItem({
    id: "other",
    title: "Factor investing backtest",
    score: 70,
    tags: ["quant finance", "backtest"],
  });

  const clustered = clusterProjectFeed(makeFeed([personalizedPrimary, duplicateEvidence, other]));
  const entity = clustered.entities.get(personalizedPrimary.id);

  assert.ok(entity);
  assert.equal(entity.primary.id, personalizedPrimary.id);
  assert.equal(entity.crossSource, true);

  const promoted = promoteCrossSourceEvidence(clustered);
  const promotedEntity = promoted.entities.get(personalizedPrimary.id);
  assert.ok(promotedEntity);
  assert.equal(promotedEntity.primary.id, personalizedPrimary.id);
});

test("Gate 13C: Discovery Mix preserves a real wildcard after personalized ordering", () => {
  const wildcard = makeItem({
    id: "wildcard-quant",
    title: "Factor investing backtest workstation",
    score: 70,
    tags: ["quant finance", "backtest", "factor investing"],
  });
  const items = [
    makeItem({ id: "core-1", title: "Autonomous agent workflow", score: 88, tags: ["agent", "workflow"] }),
    makeItem({ id: "core-2", title: "Agent orchestration runtime", score: 84, tags: ["agent", "autonomous"] }),
    makeItem({ id: "core-3", title: "Agent task planner", score: 82, tags: ["agent", "workflow"] }),
    makeItem({ id: "adjacent", title: "Voice agent workflow", score: 80, tags: ["agent", "workflow", "voice", "audio"] }),
    makeItem({ id: "core-4", title: "Agent function calling toolkit", score: 78, tags: ["agent", "function calling"] }),
    makeItem({ id: "core-5", title: "Autonomous agent scheduler", score: 76, tags: ["agent", "autonomous"] }),
    wildcard,
    makeItem({ id: "core-6", title: "Agent workflow monitor", score: 68, tags: ["agent", "workflow"] }),
  ];

  const mixed = buildDiscoveryMix(makeFeed(items), [{ key: "ai_agents", weight: 4 }], 7);

  assert.equal(mixed.feed.items.length, 7);
  assert.equal(mixed.lanes.get(wildcard.id), "wildcard");
  assert.ok(mixed.feed.items.some((item) => item.id === wildcard.id));
  assert.ok([...mixed.lanes.values()].includes("wildcard"));
});
