/**
 * 分析编排测试（阶段 1.5）：相同 input_hash 跳过重复分析。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeItem } from "@/lib/ai/analyze-item";
import { GITHUB_FIXTURE } from "@/lib/ai/__fixtures__/analysis-items";
import type { AiProvider } from "@/lib/ai/provider";

/** 只支持 ai_analyses 查询链的 mock。 */
function createMockSupabase(hasExisting: boolean) {
  const chain: Record<string, unknown> = {
    from: () => chain,
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: () => Promise.resolve({ data: hasExisting ? { id: "existing-analysis" } : null, error: null }),
  };
  return chain as never;
}

function throwingProvider(): AiProvider {
  return {
    slug: "tencent",
    model: "test-model",
    analyzeItem: async () => {
      throw new Error("provider 不应被调用（幂等命中）");
    },
  };
}

test("相同 input_hash 已有成功分析时跳过，不调用 provider", async () => {
  const supabase = createMockSupabase(true);
  const provider = throwingProvider();

  const result = await analyzeItem(supabase, {
    item: GITHUB_FIXTURE.item,
    documents: GITHUB_FIXTURE.documents,
    snapshot: GITHUB_FIXTURE.snapshot,
    provider,
    model: "test-model",
    promptVersion: "frontier-analysis-v1",
    schemaVersion: "item-analysis-v1",
    maxInputChars: 12_000,
    dryRun: false,
    force: false,
  });

  assert.equal(result.status, "skipped");
  assert.equal(result.reason, "相同 input_hash 已有成功分析");
  assert.ok(typeof result.inputHash === "string" && result.inputHash.length === 64);
});
