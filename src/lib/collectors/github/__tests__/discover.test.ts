import { test } from "node:test";
import assert from "node:assert/strict";
import { GitHubClient } from "@/lib/github/client";
import { discoverRepos } from "@/lib/collectors/github/discover";
import type { GitHubSearchResponse } from "@/lib/github/types";
import {
  repoAgent,
  repoVision,
} from "@/lib/collectors/github/__fixtures__/repos";

function searchRes(items: typeof repoAgent[]): string {
  const body: GitHubSearchResponse = {
    total_count: items.length,
    incomplete_results: false,
    items,
  };
  return JSON.stringify(body);
}

test("多查询结果去重：同一仓库跨查询只保留一份并合并命中来源", async () => {
  // group1 返回 repoAgent；group2 返回 repoAgent + repoVision
  const fetchFn = async (input: RequestInfo | URL) => {
    const url = String(input);
    const q = decodeURIComponent(url);
    if (q.includes("topic:alpha")) {
      return new Response(searchRes([repoAgent]), { status: 200 });
    }
    if (q.includes("topic:beta")) {
      return new Response(searchRes([repoAgent, repoVision]), { status: 200 });
    }
    return new Response("not found", { status: 404 });
  };
  const client = new GitHubClient({
    baseUrl: "https://api.github.com",
    apiVersion: "2026-03-10",
    token: "fake",
    timeoutMs: 1000,
    maxRetries: 0,
    fetchFn,
  });
  const result = await discoverRepos(client, {
    groups: [
      { id: "g1", label: "G1", priority: 1, enabled: true, queries: ["topic:alpha created:>{since}"] },
      { id: "g2", label: "G2", priority: 2, enabled: true, queries: ["topic:beta created:>{since}"] },
    ],
    since: "2026-08-01",
    pagesPerQuery: 1,
    perPage: 50,
  });
  // 跨查询 repoAgent 去重为一份，repoVision 独立 → 共 2 项
  assert.equal(result.items.length, 2);
  // 共发现 3 条原始结果，去重后 2 条 → deduplicated = 1
  assert.equal(result.totalDiscovered, 3);
  assert.equal(result.deduplicated, 1);
  // repoAgent 被两个查询命中，queryIds 合并
  const agent = result.items.find((i) => i.normalized.sourceItemId === "1001");
  assert.ok(agent);
  assert.deepEqual([...agent.queryIds].sort(), ["g1", "g2"]);
});

test("禁用查询组不执行", async () => {
  const fetchFn = async () => new Response(searchRes([repoAgent]), { status: 200 });
  const client = new GitHubClient({
    baseUrl: "https://api.github.com",
    apiVersion: "2026-03-10",
    token: "fake",
    timeoutMs: 1000,
    maxRetries: 0,
    fetchFn,
  });
  const result = await discoverRepos(client, {
    groups: [
      { id: "g1", label: "G1", priority: 1, enabled: false, queries: ["topic:alpha"] },
    ],
    since: "2026-08-01",
    pagesPerQuery: 1,
    perPage: 50,
  });
  assert.equal(result.items.length, 0);
  assert.equal(result.totalDiscovered, 0);
});

test("预算耗尽时发现中止并返回 abort 状态", async () => {
  let requestCount = 0;
  const fetchFn = async (input: RequestInfo | URL) => {
    requestCount++;
    const url = String(input);
    const q = decodeURIComponent(url);
    if (q.includes("topic:alpha")) {
      return new Response(searchRes([repoAgent]), { status: 200 });
    }
    return new Response(searchRes([repoVision]), { status: 200 });
  };
  const client = new GitHubClient({
    baseUrl: "https://api.github.com",
    apiVersion: "2026-03-10",
    token: "fake",
    timeoutMs: 1000,
    maxRetries: 0,
    fetchFn,
  });
  // 预算只允许 1 个 Search 请求，但有 2 个查询 → 第 2 个查询应被跳过
  const result = await discoverRepos(client, {
    groups: [
      { id: "g1", label: "G1", priority: 1, enabled: true, queries: ["topic:alpha created:>{since}"] },
      { id: "g2", label: "G2", priority: 2, enabled: true, queries: ["topic:beta created:>{since}"] },
    ],
    since: "2026-08-01",
    pagesPerQuery: 1,
    perPage: 50,
    searchRequestBudget: 1, // 只允许 1 次搜索请求
  });
  // 应中止
  assert.equal(result.abort.aborted, true);
  assert.ok(result.abort.reason?.includes("预算上限"));
  assert.equal(result.abort.searchRequestsUsed, 1);
  // 至少发现了第 1 个查询的结果（g1 的 repoAgent）
  assert.ok(result.items.length >= 1);
});
