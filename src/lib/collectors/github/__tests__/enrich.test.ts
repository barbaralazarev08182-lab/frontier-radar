import { test } from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { GitHubClient } from "@/lib/github/client";
import {
  enrichReadmes,
  passesBasicFilter,
  selectEnrichTargets,
} from "@/lib/collectors/github/enrich";
import { normalizeRepo } from "@/lib/collectors/github/normalize";
import type { DiscoveredRepo } from "@/lib/collectors/github/discover";
import {
  repoAgent,
  repoMinimal,
} from "@/lib/collectors/github/__fixtures__/repos";
import {
  readmeLong,
  README_TEXT_LONG,
} from "@/lib/collectors/github/__fixtures__/readme";

function makeDiscovered(raw: typeof repoAgent, queryIds = ["g1"]): DiscoveredRepo {
  return { normalized: normalizeRepo(raw), rawRepo: raw, queryIds };
}

test("基础筛选：fork / archived / 空描述 / 空仓库被剔除", () => {
  const d = makeDiscovered(repoAgent);
  assert.equal(passesBasicFilter(d, "2026-08-01", 0), true);

  assert.equal(passesBasicFilter(makeDiscovered({ ...repoAgent, fork: true }), "2026-08-01", 0), false);
  assert.equal(passesBasicFilter(makeDiscovered({ ...repoAgent, archived: true }), "2026-08-01", 0), false);
  assert.equal(passesBasicFilter(makeDiscovered({ ...repoAgent, description: null }), "2026-08-01", 0), false);
  // 最近无 push
  assert.equal(passesBasicFilter(makeDiscovered({ ...repoAgent, pushed_at: "2026-07-01T00:00:00Z" }), "2026-08-01", 0), false);
  // 低于 Star 门槛
  assert.equal(passesBasicFilter(makeDiscovered(repoAgent), "2026-08-01", 500), false);
  // 空仓库（size=0）
  assert.equal(passesBasicFilter(makeDiscovered({ ...repoMinimal, size: 0, description: "x", stargazers_count: 10 }), "2026-07-01", 0), false);
});

test("README 截断：超长按字节安全截断并保存 truncated 与 original_size", async () => {
  const fetchFn = async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/readme")) {
      return new Response(JSON.stringify(readmeLong), { status: 200 });
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
  const items = [makeDiscovered(repoAgent)];
  const result = await enrichReadmes(client, items, {
    limit: 10,
    minStars: 0,
    since: "2026-08-01",
    readmeMaxBytes: 100,
  });
  const payload = result.readmes.get("1001");
  assert.ok(payload);
  assert.equal(payload.readme.truncated, true);
  assert.equal(payload.readme.original_size, Buffer.byteLength(README_TEXT_LONG, "utf8"));
  assert.ok(Buffer.byteLength(payload.readme.content, "utf8") <= 100);
  assert.equal(result.fetched, 1);
  assert.equal(result.truncated, 1);
});

test("README 不存在（404）不视为失败", async () => {
  const fetchFn = async () => new Response("not found", { status: 404 });
  const client = new GitHubClient({
    baseUrl: "https://api.github.com",
    apiVersion: "2026-03-10",
    token: "fake",
    timeoutMs: 1000,
    maxRetries: 0,
    fetchFn,
  });
  const items = [makeDiscovered(repoAgent)];
  const result = await enrichReadmes(client, items, {
    limit: 10,
    minStars: 0,
    since: "2026-08-01",
    readmeMaxBytes: 100,
  });
  assert.equal(result.notFound, 1);
  assert.equal(result.readmes.size, 0);
  assert.equal(result.errors, 0);
});

test("selectEnrichTargets：按 stars 降序取前 limit", () => {
  const items = [makeDiscovered(repoAgent)];
  const targets = selectEnrichTargets(items, {
    limit: 1,
    minStars: 0,
    since: "2026-08-01",
    readmeMaxBytes: 100,
  });
  assert.equal(targets.length, 1);
});
