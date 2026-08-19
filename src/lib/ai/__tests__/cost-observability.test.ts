import { test } from "node:test";
import assert from "node:assert/strict";
import { TokenHubClient } from "@/lib/ai/tokenhub-client";
import { TencentProvider } from "@/lib/ai/provider";
import type { ItemAnalysisResult, PreparedAnalysisInput } from "@/lib/ai/types";

const VALID_RESULT: ItemAnalysisResult = {
  summaryZh: "一个用于仓库总结的 AI Agent。",
  problem: "手动阅读仓库效率低",
  novelty: "记忆管理",
  whyItMatters: "提升开发效率",
  targetUsers: ["开发者"],
  possibleUses: ["总结 PR"],
  hasCode: "yes",
  hasDemo: "no",
  reproductionDifficulty: "easy",
  limitations: ["依赖 LLM 成本"],
  hypeRisk: "low",
  tags: ["ai-agent", "llm"],
  noveltyScore: 60,
  practicalValueScore: 70,
  researchValueScore: 40,
  confidence: 0.8,
};

const INPUT: PreparedAnalysisInput = {
  source: "github",
  itemType: "repo",
  title: "agent-notes",
  sourceUrl: "https://github.com/example/agent-notes",
  text: "fixture input",
  charCount: 13,
  inputHash: "a".repeat(64),
  truncated: false,
};

function response(content: string, promptTokens: number, completionTokens: number): Response {
  return new Response(
    JSON.stringify({
      model: "test-model",
      choices: [{ message: { content } }],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      },
    }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}

test("repair 调用会累计两次 Token，并记录 modelCallCount / repairCount", async () => {
  let calls = 0;
  const client = new TokenHubClient({
    baseUrl: "https://example.test/v1",
    apiKey: "test-key",
    model: "test-model",
    maxRetries: 0,
    fetchFn: async () => {
      calls += 1;
      return calls === 1
        ? response("not valid analysis json", 100, 20)
        : response(JSON.stringify(VALID_RESULT), 80, 30);
    },
  });
  const provider = new TencentProvider({ client, model: "test-model" });

  const output = await provider.analyzeItem(INPUT);

  assert.equal(calls, 2);
  assert.equal(output.modelCallCount, 2);
  assert.equal(output.repairCount, 1);
  assert.deepEqual(output.tokenUsage, {
    promptTokens: 180,
    completionTokens: 50,
    totalTokens: 230,
  });
});

test("正常一次成功只记录一个模型调用", async () => {
  const client = new TokenHubClient({
    baseUrl: "https://example.test/v1",
    apiKey: "test-key",
    model: "test-model",
    maxRetries: 0,
    fetchFn: async () => response(JSON.stringify(VALID_RESULT), 90, 25),
  });
  const provider = new TencentProvider({ client, model: "test-model" });

  const output = await provider.analyzeItem(INPUT);

  assert.equal(output.modelCallCount, 1);
  assert.equal(output.repairCount, 0);
  assert.deepEqual(output.tokenUsage, {
    promptTokens: 90,
    completionTokens: 25,
    totalTokens: 115,
  });
});
