/**
 * TokenHub / OpenAI 兼容 Chat Completions 客户端（阶段 1.5）。
 *
 * 设计：
 *  - 原生 fetch，不引入 OpenAI SDK。
 *  - AI_BASE_URL 接受以 /v1 结尾的 OpenAI 兼容地址，请求 {baseUrl}/chat/completions。
 *  - Token 仅服务端注入；禁止把 Token / Authorization Header / 完整消息写入日志。
 *  - 401 立即停止；429 / 超时 / 5xx 最多重试 maxRetries 次（指数退避 + Retry-After）。
 *  - 默认串行调用由上层（analyze 脚本）控制。
 */

import type { ChatCompletionResult, ChatMessage, TokenUsage } from "./types";
import type { Logger } from "@/lib/logger";

export class TokenHubError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "TokenHubError";
  }
}

export class TokenHubAuthError extends TokenHubError {
  constructor(message = "TokenHub 鉴权失败（401）：AI_API_KEY 无效") {
    super(message, 401);
    this.name = "TokenHubAuthError";
  }
}

export class TokenHubRateLimitError extends TokenHubError {
  readonly retryAfterMs: number | null;
  constructor(retryAfterMs: number | null = null) {
    super("TokenHub 限流（429）", 429);
    this.name = "TokenHubRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

export class TokenHubTimeoutError extends TokenHubError {
  constructor(message = "TokenHub 请求超时") {
    super(message);
    this.name = "TokenHubTimeoutError";
  }
}

export class TokenHubNetworkError extends TokenHubError {
  constructor(message = "TokenHub 网络请求失败") {
    super(message);
    this.name = "TokenHubNetworkError";
  }
}

/** 4xx（非 401/429）：参数或请求错误，不重试。 */
export class TokenHubApiError extends TokenHubError {
  constructor(status: number, message = `TokenHub API 错误（${status}）`) {
    super(message, status);
    this.name = "TokenHubApiError";
  }
}

export class TokenHubInvalidResponseError extends TokenHubError {
  constructor(message = "TokenHub 响应不是合法 Chat Completions 结构") {
    super(message);
    this.name = "TokenHubInvalidResponseError";
  }
}

export interface TokenHubClientOptions {
  /** OpenAI 兼容 Base URL，如 https://xxx/v1 */
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs?: number;
  /** 最大重试次数（上限 2），默认 2 */
  maxRetries?: number;
  temperature?: number;
  /** 可注入的 fetch（测试用） */
  fetchFn?: typeof fetch;
  logger?: Logger;
}

const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 15_000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function computeBackoff(attempt: number): number {
  const exp = BASE_BACKOFF_MS * 2 ** attempt;
  const cap = Math.min(exp, MAX_BACKOFF_MS);
  const jitter = cap * 0.2 * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(cap + jitter));
}

function parseRetryAfter(headers: Headers): number | null {
  const h = headers.get("retry-after");
  if (!h) return null;
  const sec = Number(h);
  if (Number.isFinite(sec) && sec > 0) return sec * 1000;
  return null;
}

export class TokenHubClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly temperature: number;
  private readonly fetchFn: typeof fetch;
  private readonly logger: Logger;

  constructor(opts: TokenHubClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.apiKey = opts.apiKey;
    this.model = opts.model;
    this.timeoutMs = opts.timeoutMs ?? 60_000;
    this.maxRetries = Math.min(2, Math.max(0, opts.maxRetries ?? 2));
    this.temperature = opts.temperature ?? 0.2;
    this.fetchFn = opts.fetchFn ?? fetch;
    this.logger = opts.logger ?? { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };
  }

  getRequestCount(): number {
    return 0; // 占位：客户端不统计请求数（由上层统计）
  }

  /**
   * 调用 Chat Completions。
   * 只记录 event / status / duration / retry 等字段，绝不记录 Token、Header、完整消息。
   */
  async chatCompletion(messages: ChatMessage[], opts?: { temperature?: number }): Promise<ChatCompletionResult> {
    const url = `${this.baseUrl}/chat/completions`;
    const body = {
      model: this.model,
      messages,
      temperature: opts?.temperature ?? this.temperature,
    };
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      let res: Response;
      const started = Date.now();

      try {
        res = await this.fetchFn(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timer);
        if (attempt === this.maxRetries) {
          if (err instanceof Error && err.name === "AbortError") throw new TokenHubTimeoutError();
          throw new TokenHubNetworkError(err instanceof Error ? err.message : undefined);
        }
        const backoff = computeBackoff(attempt + 1);
        this.logger.warn("ai.tokenhub.retryable_network", { attempt: attempt + 1, backoff_ms: backoff });
        await sleep(backoff);
        continue;
      }

      clearTimeout(timer);
      const durationMs = Date.now() - started;
      const logFields = { status: res.status, duration_ms: durationMs, retry_count: attempt };

      // 401 立即停止
      if (res.status === 401) {
        this.logger.error("ai.tokenhub.auth_error", logFields);
        throw new TokenHubAuthError();
      }

      // 429 限流（不无限等待限额恢复）
      if (res.status === 429) {
        const retryAfter = parseRetryAfter(res.headers);
        const wait = retryAfter ?? computeBackoff(attempt + 1);
        this.logger.warn("ai.tokenhub.rate_limited", { ...logFields, retry_after_ms: retryAfter, wait_ms: wait });
        if (attempt === this.maxRetries) throw new TokenHubRateLimitError(retryAfter);
        await sleep(wait);
        continue;
      }

      // 5xx 有限退避重试
      if (res.status >= 500 && res.status < 600) {
        if (attempt === this.maxRetries) throw new TokenHubApiError(res.status);
        const backoff = computeBackoff(attempt + 1);
        this.logger.warn("ai.tokenhub.server_error", { ...logFields, backoff_ms: backoff });
        await sleep(backoff);
        continue;
      }

      // 其他非 2xx（400 等）：不重试
      if (res.status < 200 || res.status >= 300) {
        this.logger.warn("ai.tokenhub.api_error", logFields);
        throw new TokenHubApiError(res.status);
      }

      // 2xx
      this.logger.info("ai.tokenhub.ok", logFields);
      return this.parseChatCompletion(await res.text());
    }

    throw new TokenHubNetworkError("TokenHub 请求重试耗尽");
  }

  /** 解析 Chat Completions 响应；结构不符抛 InvalidResponseError。 */
  parseChatCompletion(raw: string): ChatCompletionResult {
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new TokenHubInvalidResponseError("TokenHub 响应不是合法 JSON");
    }
    if (typeof data !== "object" || data === null) {
      throw new TokenHubInvalidResponseError();
    }
    const obj = data as Record<string, unknown>;
    const choices = obj.choices;
    if (!Array.isArray(choices) || choices.length === 0) {
      throw new TokenHubInvalidResponseError();
    }
    const first = choices[0] as Record<string, unknown> | undefined;
    const message = first?.message as Record<string, unknown> | undefined;
    if (!message || typeof message.content !== "string") {
      throw new TokenHubInvalidResponseError();
    }

    let tokenUsage: TokenUsage | null = null;
    if (typeof obj.usage === "object" && obj.usage !== null) {
      const u = obj.usage as Record<string, unknown>;
      const total = Number(u.total_tokens);
      if (Number.isFinite(total) && total > 0) {
        tokenUsage = {
          promptTokens: Number(u.prompt_tokens) || 0,
          completionTokens: Number(u.completion_tokens) || 0,
          totalTokens: total,
        };
      }
    }

    return {
      content: message.content,
      model: typeof obj.model === "string" ? obj.model : this.model,
      tokenUsage,
    };
  }
}
