/**
 * 后台任务服务函数测试（阶段 1.7）。
 * 不测试采集器内部逻辑，只验证入口行为的契约。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { runAiAnalysis, runGithubCollection, type JobResult } from "@/lib/jobs";

// ---------------------------------------------------------------------------
// 3. 缺少 GitHub Token 时 GitHub job 返回 skipped
// ---------------------------------------------------------------------------

test("缺少 GITHUB_TOKEN 时 GitHub job 返回 skipped，不访问网络", async () => {
  const r = await runGithubCollection({ env: {} });
  assert.equal(r.job, "github");
  assert.equal(r.status, "skipped");
  assert.ok((r.message ?? "").includes("GITHUB_TOKEN"));
  assert.ok(r.startedAt <= r.completedAt);
});

// ---------------------------------------------------------------------------
// 4. 缺少 AI 配置时 analyze job 返回 skipped
// ---------------------------------------------------------------------------

test("缺少 AI_BASE_URL / AI_API_KEY / AI_MODEL 时 analyze job 返回 skipped", async () => {
  const partial = await runAiAnalysis({ env: { AI_BASE_URL: "https://example.com/v1" } });
  assert.equal(partial.status, "skipped");

  const none = await runAiAnalysis({ env: {} });
  assert.equal(none.status, "skipped");
});

// ---------------------------------------------------------------------------
// 5. JobResult 不包含秘密字段
// ---------------------------------------------------------------------------

test("JobResult 序列化结果不包含任何密钥值", async () => {
  const fakeKey = "sk-test-secret-value-12345";
  const r = await runAiAnalysis({
    env: {
      AI_BASE_URL: "https://example.com/v1",
      AI_API_KEY: fakeKey,
      AI_MODEL: "test-model",
    },
  });
  // 有 AI 配置但没有 Supabase → failed（不会出现密钥）
  assert.equal(r.status, "failed");
  assert.ok(!JSON.stringify(r).includes(fakeKey), "结果不得包含 AI_API_KEY 值");

  // JobResult 结构：只允许已知字段
  const allowed = new Set([
    "job",
    "status",
    "startedAt",
    "completedAt",
    "discovered",
    "persisted",
    "analyzed",
    "errors",
    "message",
  ]);
  for (const key of Object.keys(r)) {
    assert.ok(allowed.has(key), `JobResult 含未知字段 ${key}`);
  }
  const r2: JobResult = r;
  assert.ok(["succeeded", "partial", "failed", "skipped"].includes(r2.status));
});
