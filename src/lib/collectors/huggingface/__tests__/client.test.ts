/**
 * HuggingFace 客户端 Card/README 获取测试（阶段 1.3 修正）。
 *
 * 覆盖：
 *  - model / dataset / space 三类 resolve URL 正确区分
 *  - sha 优先作为 revision，缺失回退 main
 *  - 401 / 403 / 404 不抛出（Card 无法获取不阻断条目采集）
 *  - 有 HF_TOKEN 时携带 Bearer Token
 *  - 文本响应（非 JSON）正确解析
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { HFClient, normalizeRevision } from "@/lib/huggingface/client";

interface FetchCall {
  url: string;
  init: RequestInit;
}

function createFakeFetch(
  handler: (url: string) => Response | Promise<Response>
): { fetchFn: typeof fetch; calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const fetchFn = (async (url: string | URL, init?: RequestInit) => {
    const u = String(url);
    calls.push({ url: u, init: init ?? {} });
    return await handler(u);
  }) as typeof fetch;
  return { fetchFn, calls };
}

function textResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

// ===========================================================================
// 1. 三类 README URL 正确区分
// ===========================================================================

test("getCard 三类内容使用正确的 resolve URL（sha 作为 revision）", async () => {
  const { fetchFn, calls } = createFakeFetch(() =>
    textResponse("# Model Card")
  );
  const client = new HFClient({ fetchFn, baseUrl: "https://huggingface.co" });

  await client.getCard("model", "meta-llama/Llama-3-8B", "6c9c1c2a7d1e5b1c0a1b2c3d4e5f6a7b8c9d0e1f");
  await client.getCard("dataset", "mozilla-foundation/common_voice_13_0", "6c9c1c2a7d1e5b1c0a1b2c3d4e5f6a7b8c9d0e1f");
  await client.getCard("space", "stabilityai/stable-diffusion-online", "6c9c1c2a7d1e5b1c0a1b2c3d4e5f6a7b8c9d0e1f");

  assert.equal(
    calls[0]!.url,
    "https://huggingface.co/meta-llama/Llama-3-8B/resolve/6c9c1c2a7d1e5b1c0a1b2c3d4e5f6a7b8c9d0e1f/README.md"
  );
  assert.equal(
    calls[1]!.url,
    "https://huggingface.co/datasets/mozilla-foundation/common_voice_13_0/resolve/6c9c1c2a7d1e5b1c0a1b2c3d4e5f6a7b8c9d0e1f/README.md"
  );
  assert.equal(
    calls[2]!.url,
    "https://huggingface.co/spaces/stabilityai/stable-diffusion-online/resolve/6c9c1c2a7d1e5b1c0a1b2c3d4e5f6a7b8c9d0e1f/README.md"
  );
});

// ===========================================================================
// 2. revision 选择：sha 优先，缺失/不可用回退 main
// ===========================================================================

test("revision 缺失或不是提交哈希时回退 main", async () => {
  const { fetchFn, calls } = createFakeFetch(() => textResponse("ok"));
  const client = new HFClient({ fetchFn, baseUrl: "https://huggingface.co" });

  await client.getCard("model", "org/repo", null);
  assert.ok(calls[0]!.url.endsWith("/resolve/main/README.md"));

  await client.getCard("model", "org/repo", "");
  assert.ok(calls[1]!.url.endsWith("/resolve/main/README.md"));

  // sha256: 内容哈希不是可用的 git ref → main
  await client.getCard("model", "org/repo", "sha256:abc123");
  assert.ok(calls[2]!.url.endsWith("/resolve/main/README.md"));

  assert.equal(normalizeRevision("6c9c1c2a7d1e5b1c0a1b2c3d4e5f6a7b8c9d0e1f"), "6c9c1c2a7d1e5b1c0a1b2c3d4e5f6a7b8c9d0e1f");
  assert.equal(normalizeRevision("abc1234"), "abc1234");
  assert.equal(normalizeRevision(null), "main");
  assert.equal(normalizeRevision("v1.0"), "main");
});

// ===========================================================================
// 3. 401 / 403 / 404 不抛出（Card 无法获取不阻断采集）
// ===========================================================================

test("404 时返回空 Card 且 revision 仍记录", async () => {
  const { fetchFn } = createFakeFetch(() =>
    textResponse("Not Found", 404)
  );
  const client = new HFClient({ fetchFn, baseUrl: "https://huggingface.co", maxRetries: 0 });

  const res = await client.getCard("model", "org/repo", "6c9c1c2a7d1e5b1c0a1b2c3d4e5f6a7b8c9d0e1f");
  assert.equal(res.status, 404);
  assert.equal(res.data.content, "");
  assert.equal(res.data.revision, "6c9c1c2a7d1e5b1c0a1b2c3d4e5f6a7b8c9d0e1f");
});

test("401/403 时返回空 Card 而不抛出", async () => {
  const { fetchFn } = createFakeFetch(() => textResponse("Forbidden", 403));
  const client = new HFClient({ fetchFn, baseUrl: "https://huggingface.co", maxRetries: 0 });

  const res = await client.getCard("space", "org/repo", null);
  assert.equal(res.status, 401);
  assert.equal(res.data.content, "");
});

// ===========================================================================
// 4. 有 HF_TOKEN 时携带 Bearer Token；文本响应正确返回
// ===========================================================================

test("getCard 携带 Bearer Token 并解析文本响应", async () => {
  const { fetchFn, calls } = createFakeFetch(() => textResponse("## Title\ncontent"));
  const client = new HFClient({
    fetchFn,
    baseUrl: "https://huggingface.co",
    token: "hf_test_token",
    maxRetries: 0,
  });

  const res = await client.getCard("model", "org/repo", null);
  assert.equal(res.data.content, "## Title\ncontent");
  assert.equal(res.data.revision, "main");

  const init = calls[0]!.init as { headers?: Record<string, string> };
  assert.equal(init.headers?.Authorization, "Bearer hf_test_token");
});

test("getCard 返回的 etag / lastModified 透传给 Card 响应", async () => {
  const { fetchFn } = createFakeFetch(async () => {
    return new Response("# ok", {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        ETag: '"abc123"',
        "Last-Modified": "Mon, 01 Jan 2026 00:00:00 GMT",
      },
    });
  });
  const client = new HFClient({ fetchFn, baseUrl: "https://huggingface.co", maxRetries: 0 });
  const res = await client.getCard("model", "org/repo", null);
  assert.equal(res.data.etag, '"abc123"');
  assert.equal(res.data.lastModified, "Mon, 01 Jan 2026 00:00:00 GMT");
});
