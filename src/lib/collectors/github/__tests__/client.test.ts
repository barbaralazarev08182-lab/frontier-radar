import { test } from "node:test";
import assert from "node:assert/strict";
import { GitHubClient } from "@/lib/github/client";
import {
  GitHubAuthError,
  GitHubRateLimitError,
} from "@/lib/github/errors";
import type { GitHubSearchResponse } from "@/lib/github/types";

const BASE_OPTS = {
  baseUrl: "https://api.github.com",
  apiVersion: "2026-03-10",
  token: "fake-token-for-test",
  timeoutMs: 1000,
};

function searchBody(): string {
  const body: GitHubSearchResponse = {
    total_count: 1,
    incomplete_results: false,
    items: [],
  };
  return JSON.stringify(body);
}

function jsonRes(body: string, headers: Record<string, string> = {}): Response {
  return new Response(body, { status: 200, headers: new Headers(headers) });
}

/** 返回一个按队列依次给出响应的 fake fetch（记录调用次数）。 */
function fakeFetchQueue(responses: Response[]) {
  let calls = 0;
  const fetchFn = async () => {
    calls++;
    const r = responses[calls - 1] ?? responses[responses.length - 1]!;
    return r;
  };
  return { fetchFn, getCalls: () => calls };
}

test("304：返回 notModified，不重复返回数据", async () => {
  const { fetchFn } = fakeFetchQueue([new Response(null, { status: 304 })]);
  const client = new GitHubClient({ ...BASE_OPTS, maxRetries: 0, fetchFn });
  const res = await client.searchRepositories("topic:x", { etag: "abc" });
  assert.equal(res.notModified, true);
  assert.equal(res.status, 304);
});

test("401：立即抛出 GitHubAuthError，不重试", async () => {
  const { fetchFn, getCalls } = fakeFetchQueue([
    new Response("unauthorized", { status: 401 }),
  ]);
  const client = new GitHubClient({ ...BASE_OPTS, maxRetries: 3, fetchFn });
  await assert.rejects(() => client.getRateLimit(), GitHubAuthError);
  assert.equal(getCalls(), 1); // 无重试
});

test("429 限流：有限重试后抛 GitHubRateLimitError", async () => {
  const rateLimitHeaders = {
    "x-ratelimit-remaining": "0",
    "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 60),
    "retry-after": "0",
  };
  const { fetchFn, getCalls } = fakeFetchQueue([
    new Response("rate limited", { status: 429, headers: new Headers(rateLimitHeaders) }),
    new Response("rate limited", { status: 429, headers: new Headers(rateLimitHeaders) }),
  ]);
  const client = new GitHubClient({ ...BASE_OPTS, maxRetries: 1, fetchFn });
  await assert.rejects(() => client.getRateLimit(), GitHubRateLimitError);
  assert.equal(getCalls(), 2); // 初始 + 1 次重试
});

test("5xx：有限退避重试后成功", async () => {
  const { fetchFn, getCalls } = fakeFetchQueue([
    new Response("server error", { status: 500 }),
    jsonRes(
      JSON.stringify({
        resources: {
          core: { limit: 5000, remaining: 4999, reset: 1_700_000_000, used: 1 },
          search: { limit: 30, remaining: 29, reset: 1_700_000_000, used: 1 },
        },
      })
    ),
  ]);
  const client = new GitHubClient({ ...BASE_OPTS, maxRetries: 1, fetchFn });
  const res = await client.getRateLimit();
  assert.equal(getCalls(), 2);
  assert.ok(res);
});

test("README 404：返回 notFound，不视为失败", async () => {
  const { fetchFn } = fakeFetchQueue([new Response("not found", { status: 404 })]);
  const client = new GitHubClient({ ...BASE_OPTS, maxRetries: 0, fetchFn });
  const res = await client.getReadme("alice", "awesome-agent");
  assert.equal(res.notFound, true);
  assert.equal(res.status, 404);
});

test("成功请求：解析数据与限流头", async () => {
  const { fetchFn, getCalls } = fakeFetchQueue([
    jsonRes(searchBody(), {
      "x-ratelimit-remaining": "59",
      "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 3600),
    }),
  ]);
  const client = new GitHubClient({ ...BASE_OPTS, maxRetries: 0, fetchFn });
  const res = await client.searchRepositories("topic:x");
  assert.equal(getCalls(), 1);
  assert.equal(res.data.total_count, 1);
  assert.equal(res.rateLimit?.remaining, 59);
  assert.equal(client.getRequestCount(), 1);
});
