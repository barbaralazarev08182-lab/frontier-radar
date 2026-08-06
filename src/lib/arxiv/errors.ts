/**
 * arXiv API 客户端错误类型（阶段 1.4）。
 *
 * 区分可重试（网络 / 超时 / 429 / 5xx）与不可重试（4xx / XML 解析失败）错误。
 * 所有错误类不承载任何密钥或敏感信息。
 */

export class ArxivError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "ArxivError";
  }
}

/** 网络层失败（DNS / 连接中断）。 */
export class ArxivNetworkError extends ArxivError {
  constructor(message = "arXiv 网络请求失败") {
    super(message);
    this.name = "ArxivNetworkError";
  }
}

/** 请求超时（AbortController 触发）。 */
export class ArxivTimeoutError extends ArxivError {
  constructor(message = "arXiv 请求超时") {
    super(message);
    this.name = "ArxivTimeoutError";
  }
}

/** 429 限流（arXiv 要求请求间隔 ≥3s）。 */
export class ArxivRateLimitError extends ArxivError {
  readonly retryAfterMs: number | null;
  constructor(retryAfterMs: number | null = null, message = "arXiv 限流（429）") {
    super(message, 429);
    this.name = "ArxivRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

/** 5xx：服务端错误，可有限退避重试。 */
export class ArxivServerError extends ArxivError {
  constructor(status: number, message = `arXiv 服务端错误（${status}）`) {
    super(message, status);
    this.name = "ArxivServerError";
  }
}

/** 其他 4xx（400 参数错误等），不重试。 */
export class ArxivHttpError extends ArxivError {
  constructor(status: number, message = `arXiv HTTP 错误（${status}）`) {
    super(message, status);
    this.name = "ArxivHttpError";
  }
}

/** XML 解析失败或响应不是预期结构。 */
export class ArxivParseError extends ArxivError {
  constructor(message = "arXiv 响应 XML 解析失败") {
    super(message);
    this.name = "ArxivParseError";
  }
}
