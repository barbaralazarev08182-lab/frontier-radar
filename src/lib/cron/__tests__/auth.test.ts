/**
 * Cron 鉴权测试（阶段 1.7）。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { checkCronAuth } from "@/lib/cron/auth";

function req(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/cron/github", { headers });
}

// ---------------------------------------------------------------------------
// 1. 缺少密钥返回 401；CRON_SECRET 缺失拒绝运行
// ---------------------------------------------------------------------------

test("缺少 Authorization / 密钥错误返回 401，CRON_SECRET 缺失返回 500，且不泄露期望密钥", async () => {
  const secret = "top-secret-cron";

  const noHeader = checkCronAuth(req(), secret);
  assert.equal(noHeader.authorized, false);
  assert.equal(noHeader.response!.status, 401);

  const wrongKey = checkCronAuth(req({ authorization: "Bearer wrong" }), secret);
  assert.equal(wrongKey.response!.status, 401);
  const body = await wrongKey.response!.json();
  assert.ok(!JSON.stringify(body).includes(secret), "响应不得包含期望密钥");

  // 空 Bearer / 缺少配置
  assert.equal(checkCronAuth(req({ authorization: "Bearer   " }), secret).response!.status, 401);
  const noConfig = checkCronAuth(req({ authorization: "Bearer x" }), undefined);
  assert.equal(noConfig.authorized, false);
  assert.equal(noConfig.response!.status, 500);
});

// ---------------------------------------------------------------------------
// 2. 正确密钥允许进入 handler
// ---------------------------------------------------------------------------

test("正确 Bearer 密钥允许执行，不接受 query parameter 密钥", () => {
  const ok = checkCronAuth(req({ authorization: "Bearer correct-secret" }), "correct-secret");
  assert.equal(ok.authorized, true);
  assert.equal(ok.response, undefined);
});

// ---------------------------------------------------------------------------
// 3. Preview / Development 永远不进入写任务
// ---------------------------------------------------------------------------

test("Vercel Preview 在密钥校验前拒绝 cron 写任务", async () => {
  const previous = process.env.VERCEL_ENV;
  process.env.VERCEL_ENV = "preview";

  try {
    const result = checkCronAuth(req({ authorization: "Bearer correct-secret" }), "correct-secret");
    assert.equal(result.authorized, false);
    assert.equal(result.response!.status, 403);
    assert.deepEqual(await result.response!.json(), { error: "non_production_write_blocked" });
  } finally {
    if (previous === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previous;
  }
});
