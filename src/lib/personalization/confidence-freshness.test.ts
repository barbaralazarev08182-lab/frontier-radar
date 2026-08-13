import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type {
  FeedContentType,
  FeedResult,
  FeedSource,
  FrontierFeedItem,
} from "@/lib/feed/types";
import {
  PERSONALIZATION_ACTIVITY_HALF_LIFE_DAYS,
  activityFreshness,
  evidenceConfidence,
  personalizationConfidence,
  storedProfileIsFresh,
} from "./confidence";
import { rankWithInterestVector } from "./server";
import { l2Normalize, vectorizeFeedItem } from "./vector";

function makeItem({
  id,
  title,
  score,
  tags = [],
  source = "hackernews",
  contentType = "product",
}: {
  id: string;
  title: string;
  score: number;
  tags?: string[];
  source?: FeedSource;
  contentType?: FeedContentType;
}): FrontierFeedItem {
  return {
    id,
    source,
    contentType,
    title,
    canonicalUrl: `https://example.com/${id}`,
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
    hasCode: "unknown",
    hasDemo: "unknown",
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

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("Gate 13D: three events have materially lower evidence confidence than fifty", () => {
  const three = evidenceConfidence(3);
  const fifty = evidenceConfidence(50);

  assert.equal(Math.round(three * 1000) / 1000, 0.2);
  assert.equal(Math.round(fifty * 1000) / 1000, 0.806);
  assert.ok(fifty > three * 3);
});

test("Gate 13D: thirty days of inactivity halves absolute personalization confidence", () => {
  const now = Date.parse("2026-08-13T08:00:00.000Z");
  const freshAt = new Date(now).toISOString();
  const oldAt = new Date(
    now - PERSONALIZATION_ACTIVITY_HALF_LIFE_DAYS * 86_400_000
  ).toISOString();

  assert.equal(activityFreshness(freshAt, now), 1);
  assert.ok(Math.abs(activityFreshness(oldAt, now) - 0.5) < 1e-12);
  assert.ok(
    Math.abs(
      personalizationConfidence(50, oldAt, now) /
        personalizationConfidence(50, freshAt, now) -
        0.5
    ) < 1e-12
  );
});

test("Gate 13D: confidence changes Personal Match strength without mutating Global Score", () => {
  const related = makeItem({
    id: "related",
    title: "Autonomous agent workflow",
    score: 50,
    tags: ["agent", "autonomous", "workflow"],
  });
  const unrelated = makeItem({
    id: "unrelated",
    title: "Factor investing backtest",
    score: 60,
    tags: ["quant finance", "backtest", "factor investing"],
  });
  const feed = makeFeed([unrelated, related]);
  const vector = l2Normalize(vectorizeFeedItem(related));

  const lowConfidence = rankWithInterestVector(feed, vector, 0.2);
  const highConfidence = rankWithInterestVector(feed, vector, 0.8);

  assert.deepEqual(lowConfidence.items.map((item) => item.id), ["unrelated", "related"]);
  assert.deepEqual(highConfidence.items.map((item) => item.id), ["related", "unrelated"]);
  assert.equal(related.score, 50);
  assert.equal(unrelated.score, 60);
});

test("Gate 13D: any event newer than the stored vector makes that snapshot stale", () => {
  assert.equal(
    storedProfileIsFresh("2026-08-13T08:00:00.000Z", "2026-08-13T07:59:59.000Z"),
    true
  );
  assert.equal(
    storedProfileIsFresh("2026-08-13T08:00:00.000Z", "2026-08-13T08:00:01.000Z"),
    false
  );
  assert.equal(storedProfileIsFresh(null, "2026-08-13T08:00:01.000Z"), false);
});

test("Gate 13D: server wires latest-event freshness into vector use and confidence into both ranking paths", () => {
  const server = source("./server.ts");

  assert.match(
    server,
    /select\("vector_version, interest_vector, event_count, updated_at"\)/
  );
  assert.match(
    server,
    /\.from\("user_events"\)[\s\S]*\.select\("created_at"\)[\s\S]*\.limit\(1\)/
  );
  assert.match(server, /storedProfileIsFresh\(row\.updated_at, latestEventAt\)/);
  assert.match(server, /personalizationConfidence\(row\.event_count, latestEventAt\)/);
  assert.match(server, /rankWithInterestVector\(feed, vector, confidence\)/);
  assert.match(server, /const personalizationBoost = rawBoost \* confidence;/);
  assert.match(server, /return await personalizeWithRules\(feed, visitorId\);/);
});
