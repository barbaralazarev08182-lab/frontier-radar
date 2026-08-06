import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeRepo,
  normalizeTopics,
} from "@/lib/collectors/github/normalize";
import { computePayloadHash } from "@/lib/hash";
import {
  repoAgent,
  repoAgentRenamed,
  repoMinimal,
} from "@/lib/collectors/github/__fixtures__/repos";

test("标准化：基本字段映射正确", () => {
  const n = normalizeRepo(repoAgent);
  assert.equal(n.sourceItemId, "1001");
  assert.equal(n.itemType, "repo");
  assert.equal(n.title, "awesome-agent");
  assert.equal(n.canonicalUrl, "https://github.com/alice/awesome-agent");
  assert.equal(n.description, "An AI agent framework");
  assert.equal(n.ownerLogin, "alice");
  assert.equal(n.repositoryName, "awesome-agent");
  assert.equal(n.fullName, "alice/awesome-agent");
  assert.equal(n.primaryLanguage, "TypeScript");
  assert.equal(n.license, "MIT");
  assert.equal(n.defaultBranch, "main");
  assert.equal(n.homepageUrl, "https://agent.example.com");
  assert.equal(n.archived, false);
  assert.equal(n.fork, false);
  assert.equal(n.visibility, "public");
  assert.equal(n.stars, 128);
  assert.equal(n.forks, 12);
  assert.equal(n.watchers, 128);
  assert.equal(n.openIssues, 5);
  assert.equal(n.subscribers, 30);
  assert.equal(n.repositorySize, 2048);
  assert.equal(n.hasIssues, true);
  assert.equal(n.hasDiscussions, true);
  assert.equal(n.hasWiki, false);
  assert.equal(n.hasPages, true);
});

test("改名 / 转移所有者：source_item_id 与 dedupe_key 不变", () => {
  const a = normalizeRepo(repoAgent);
  const b = normalizeRepo(repoAgentRenamed);
  assert.equal(a.sourceItemId, "1001");
  assert.equal(b.sourceItemId, "1001");
  assert.equal(a.dedupeKey, b.dedupeKey);
  assert.equal(b.fullName, "bob/awesome-agent-v2");
  assert.equal(b.ownerLogin, "bob");
});

test("空值处理：缺失字段一律为 null，不编造默认值", () => {
  const n = normalizeRepo(repoMinimal);
  assert.equal(n.description, null);
  assert.equal(n.primaryLanguage, null);
  assert.equal(n.license, null);
  assert.equal(n.homepageUrl, null);
  assert.equal(n.defaultBranch, null);
  assert.equal(n.subscribers, null);
  assert.equal(n.hasIssues, null);
  assert.equal(n.hasDiscussions, null);
  assert.equal(n.hasWiki, null);
  assert.equal(n.hasPages, null);
  assert.deepEqual(n.topics, []);
});

test("Topics：小写、去重、去空", () => {
  assert.deepEqual(normalizeTopics(["AI", "agent", "LLM", "agent"]), [
    "ai",
    "agent",
    "llm",
  ]);
  assert.deepEqual(normalizeTopics(["  Foo ", "foo", "", "  "]), ["foo"]);
  assert.deepEqual(normalizeTopics(undefined), []);
});

test("Payload Hash：相同 payload 稳定，变化则哈希不同", () => {
  const h1 = computePayloadHash(repoAgent);
  const h2 = computePayloadHash(repoAgent);
  assert.equal(h1, h2);
  const changed = { ...repoAgent, stargazers_count: 999 };
  const h3 = computePayloadHash(changed);
  assert.notEqual(h1, h3);
  // 键序无关稳定
  const reordered = JSON.parse(JSON.stringify(repoAgent));
  assert.equal(computePayloadHash(reordered), h1);
});
