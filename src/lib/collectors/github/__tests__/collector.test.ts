import { test } from "node:test";
import assert from "node:assert/strict";
import { GitHubClient } from "@/lib/github/client";
import {
  GitHubCollector,
  DryRunSink,
  type CollectorSink,
  type PersistRepoInput,
  type PersistRepoOutcome,
} from "@/lib/collectors/github/collector";
import type { BudgetConfig } from "@/lib/collectors/github/budget";
import type { GitHubSearchResponse } from "@/lib/github/types";
import type { DiscoveryGroup } from "@/config/github-discovery";
import {
  repoAgent,
  repoVision,
} from "@/lib/collectors/github/__fixtures__/repos";

const TEST_GROUPS: DiscoveryGroup[] = [
  { id: "g1", label: "G1", priority: 1, enabled: true, queries: ["topic:x created:>{since}"] },
];

/** 测试用无限制预算（不触发 abort） */
const NO_LIMIT_BUDGET: BudgetConfig = {
  searchRequestBudget: 100,
  searchRateLimitReserve: 0,
  coreRateLimitReserve: 0,
  groupsPerRun: 10,
};

function searchResponse(items: typeof repoAgent[]): string {
  const body: GitHubSearchResponse = {
    total_count: items.length,
    incomplete_results: false,
    items,
  };
  return JSON.stringify(body);
}

function makeClient(): GitHubClient {
  const fetchFn = async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/search/repositories")) {
      return new Response(searchResponse([repoAgent, repoVision]), { status: 200 });
    }
    if (url.includes("/readme")) {
      return new Response("not found", { status: 404 });
    }
    return new Response("not found", { status: 404 });
  };
  return new GitHubClient({
    baseUrl: "https://api.github.com",
    apiVersion: "2026-03-10",
    token: "fake",
    timeoutMs: 1000,
    maxRetries: 0,
    fetchFn,
  });
}

function baseCollectorOpts(sink: CollectorSink) {
  return {
    client: makeClient(),
    sink,
    sourceId: "test-source",
    discoveryDays: 7,
    pagesPerQuery: 1,
    perPage: 50,
    enrichLimit: 10,
    minStars: 0,
    readmeMaxBytes: 100,
    snapshotDate: "2026-08-06",
    groups: TEST_GROUPS,
    budget: NO_LIMIT_BUDGET,
  };
}

/** 可注入失败的假 sink，用于测试运行状态。 */
class FakeSink implements CollectorSink {
  private readonly fails: Set<string>;
  readonly persisted: string[] = [];
  constructor(fails: string[] = []) {
    this.fails = new Set(fails);
  }
  async startRun(): Promise<string> {
    return "test-run";
  }
  async finishRun(): Promise<void> {}
  async persistRepo(input: PersistRepoInput): Promise<PersistRepoOutcome> {
    if (this.fails.has(input.normalized.sourceItemId)) {
      throw new Error("db down");
    }
    this.persisted.push(input.normalized.sourceItemId);
    return { inserted: true, updated: false, rawInserted: true, snapshotWritten: true, readmeWritten: false };
  }
  async saveQueryState(): Promise<void> {}
}

test("Dry-run：不写数据库，仅记录将写入内容并产出统计", async () => {
  const sink = new DryRunSink();
  const collector = new GitHubCollector(baseCollectorOpts(sink));
  const result = await collector.collect();
  assert.equal(result.status, "success");
  assert.equal(result.discovered, 2);
  assert.equal(result.inserted, 2); // 前瞻性：均计为将新增
  assert.equal(sink.wouldWrite.repos, 2);
  assert.equal(result.errorCount, 0);
});

test("运行状态：全部成功 → success", async () => {
  const sink = new FakeSink();
  const collector = new GitHubCollector(baseCollectorOpts(sink));
  const result = await collector.collect();
  assert.equal(result.status, "success");
  assert.equal(result.errorCount, 0);
  assert.equal(sink.persisted.length, 2);
});

test("运行状态：部分持久化失败 → partial", async () => {
  const sink = new FakeSink(["1001"]); // repoAgent 失败，repoVision 成功
  const collector = new GitHubCollector(baseCollectorOpts(sink));
  const result = await collector.collect();
  assert.equal(result.status, "partial");
  assert.equal(result.errorCount, 1);
  assert.equal(result.inserted, 1);
});

test("运行状态：全部持久化失败 → failed", async () => {
  const sink = new FakeSink(["1001", "3003"]);
  const collector = new GitHubCollector(baseCollectorOpts(sink));
  const result = await collector.collect();
  assert.equal(result.status, "failed");
  assert.equal(result.errorCount, 2);
  assert.equal(result.inserted, 0);
  assert.equal(result.updated, 0);
});
