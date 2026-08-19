/**
 * Frontier Radar · AI Provider 抽象层（阶段 1.5 实现）。
 *
 * 业务代码只依赖 AiProvider 接口。
 * 当前实现 TencentProvider 基于 TokenHubClient（OpenAI 兼容 Chat Completions）。
 * 解析失败允许一次修复重试；第二次仍失败抛错，不生成假分析。
 */

import type {
  ChatCompletionResult,
  ItemAnalysisResult,
  PreparedAnalysisInput,
  TokenUsage,
} from "./types";
import {
  AnalysisValidationError,
  ANALYSIS_PROMPT_VERSION,
  ANALYSIS_SCHEMA_VERSION,
  parseAndValidateAnalysis,
} from "./schema";
import {
  buildAnalysisMessages,
  buildRepairMessages,
} from "./prompts";
import { TokenHubClient, type TokenHubClientOptions } from "./tokenhub-client";
import type { Logger } from "@/lib/logger";

/** Provider 标识 */
export type AiProviderSlug = "tencent";

/** 结构化分析请求输入 */
export interface AnalyzeItemInput extends PreparedAnalysisInput {
  /** 模型输入指纹（由实际输入文本生成，用于去重） */
  inputHash: string;
}

/** 结构化分析响应 */
export interface AnalyzeItemOutput {
  provider: AiProviderSlug;
  model: string;
  promptVersion: string;
  schemaVersion: string;
  inputHash: string;
  result: ItemAnalysisResult;
  /** 主调用 + repair 调用的完整 Token 用量；任一调用缺 usage 时为 null，避免低估。 */
  tokenUsage: TokenUsage | null;
  /** 逻辑模型调用次数：正常为 1，发生 JSON repair 时为 2；不包含底层网络重试。 */
  modelCallCount: number;
  /** 结构化结果 repair 次数，当前只可能为 0 或 1。 */
  repairCount: number;
  /** 无法可靠定价时保存 null，不编造费用 */
  estimatedCost: number | null;
  latencyMs: number;
}

/** 统一 AI Provider 接口 */
export interface AiProvider {
  readonly slug: AiProviderSlug;
  readonly model: string;

  /** 对单条目做结构化分析（必须输出 ItemAnalysisResult 契约） */
  analyzeItem(input: AnalyzeItemInput): Promise<AnalyzeItemOutput>;
}

export interface TencentProviderOptions {
  client: TokenHubClient;
  model: string;
  promptVersion?: string;
  schemaVersion?: string;
  logger?: Logger;
}

function combineTokenUsage(first: TokenUsage | null, second: TokenUsage | null): TokenUsage | null {
  if (!first || !second) return null;
  return {
    promptTokens: first.promptTokens + second.promptTokens,
    completionTokens: first.completionTokens + second.completionTokens,
    totalTokens: first.totalTokens + second.totalTokens,
  };
}

/** 腾讯 TokenHub / OpenAI 兼容 Provider */
export class TencentProvider implements AiProvider {
  readonly slug: AiProviderSlug = "tencent";
  readonly model: string;
  private readonly client: TokenHubClient;
  private readonly promptVersion: string;
  private readonly schemaVersion: string;
  private readonly logger: Logger;

  constructor(opts: TencentProviderOptions) {
    this.model = opts.model;
    this.client = opts.client;
    this.promptVersion = opts.promptVersion ?? ANALYSIS_PROMPT_VERSION;
    this.schemaVersion = opts.schemaVersion ?? ANALYSIS_SCHEMA_VERSION;
    this.logger = opts.logger ?? { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };
  }

  async analyzeItem(input: AnalyzeItemInput): Promise<AnalyzeItemOutput> {
    const started = Date.now();
    let res: ChatCompletionResult;
    let tokenUsage: TokenUsage | null;
    let repairCount = 0;

    res = await this.client.chatCompletion(buildAnalysisMessages(input.text));
    tokenUsage = res.tokenUsage;
    let result: ItemAnalysisResult;
    try {
      result = parseAndValidateAnalysis(res.content);
    } catch (firstErr) {
      // 只对解析/校验失败做一次修复重试；网络 / 限流 / 鉴权等错误直接上抛
      if (!(firstErr instanceof AnalysisValidationError)) {
        throw firstErr;
      }
      repairCount = 1;
      this.logger.warn("ai.provider.validation_retry", { reason: firstErr.message });
      const repairRes = await this.client.chatCompletion(
        buildRepairMessages(input.text, res.content)
      );
      result = parseAndValidateAnalysis(repairRes.content);
      tokenUsage = combineTokenUsage(res.tokenUsage, repairRes.tokenUsage);
      res = repairRes;
    }

    return {
      provider: this.slug,
      model: this.model,
      promptVersion: this.promptVersion,
      schemaVersion: this.schemaVersion,
      inputHash: input.inputHash,
      result,
      tokenUsage,
      modelCallCount: 1 + repairCount,
      repairCount,
      estimatedCost: null,
      latencyMs: Date.now() - started,
    };
  }
}

/**
 * Provider 工厂：构建 TencentProvider。
 * 未配置（缺 baseUrl / key / model）时由调用方在调用前校验，这里只做装配。
 */
export function createAiProvider(opts: {
  tokenHub: TokenHubClientOptions;
  promptVersion?: string;
  schemaVersion?: string;
  logger?: Logger;
}): AiProvider {
  const client = new TokenHubClient(opts.tokenHub);
  return new TencentProvider({
    client,
    model: opts.tokenHub.model,
    promptVersion: opts.promptVersion,
    schemaVersion: opts.schemaVersion,
    logger: opts.logger,
  });
}
