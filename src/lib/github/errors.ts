/**
 * GitHub API 客户端错误类型（阶段 1.2）。
 *
 * 区分可重试与不可重试错误，便于客户端决定退避策略与采集器决定运行结果状态。
 * 所有错误类均不承载 Token 或认证 Header，日志不得输出这些敏感信息。
 */
import type { GitHubRateLimit } from "./rate-limit";

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly rateLimit?: GitHubRateLimit | null
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

/** 401：鉴权失败，停止运行。 */
export class GitHubAuthError extends GitHubError {
  constructor(message = "GitHub 鉴权失败：Token 无效或缺失（401）") {
    super(message, 401);
    this.name = "GitHubAuthError";
  }
}

/** 403 / 429：限流，携带 Retry-After 与剩余配额。 */
export class GitHubRateLimitError extends GitHubError {
  /** 建议等待的毫秒数（来自 Retry-After 或 reset 计算） */
  readonly retryAfterMs: number | null;
  constructor(
    message: string,
    status: 403 | 429,
    retryAfterMs: number | null,
    rateLimit?: GitHubRateLimit | null
  ) {
    super(message, status, rateLimit);
    this.name = "GitHubRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

/** 404：资源缺失，记录但不无限重试。 */
export class GitHubNotFoundError extends GitHubError {
  constructor(message = "GitHub 资源不存在（404）") {
    super(message, 404);
    this.name = "GitHubNotFoundError";
  }
}

/** 5xx：服务端错误，可有限退避重试。 */
export class GitHubServerError extends GitHubError {
  constructor(status: number, message = `GitHub 服务端错误（${status}）`) {
    super(message, status);
    this.name = "GitHubServerError";
  }
}

/** 304：未变化（条件请求命中）。 */
export class GitHubNotModifiedError extends GitHubError {
  constructor(message = "GitHub 资源未变化（304）") {
    super(message, 304);
    this.name = "GitHubNotModifiedError";
  }
}

/** 网络层错误（DNS / 连接失败）。 */
export class GitHubNetworkError extends GitHubError {
  constructor(message = "GitHub 网络请求失败") {
    super(message);
    this.name = "GitHubNetworkError";
  }
}

/** 请求超时（AbortController 触发）。 */
export class GitHubTimeoutError extends GitHubError {
  constructor(message = "GitHub 请求超时") {
    super(message);
    this.name = "GitHubTimeoutError";
  }
}

/** JSON 解析失败。 */
export class GitHubInvalidJsonError extends GitHubError {
  constructor(message = "GitHub 响应不是合法 JSON") {
    super(message);
    this.name = "GitHubInvalidJsonError";
  }
}

/** 运行前置条件不满足（如缺少 Token）。 */
export class GitHubConfigurationError extends GitHubError {
  constructor(message: string) {
    super(message);
    this.name = "GitHubConfigurationError";
  }
}
