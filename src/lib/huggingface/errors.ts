/**
 * HuggingFace Hub API 错误类型（阶段 1.3）。
 *
 * 简化版：不复制 GitHub 全部错误层次，只覆盖实际需要的场景。
 */

export class HFError extends Error {
  constructor(message: string, public readonly statusCode?: number) {
    super(message);
    this.name = "HFError";
  }
}

export class HFAuthError extends HFError {
  constructor() {
    super("HuggingFace 认证失败（401/403）", 401);
    this.name = "HFAuthError";
  }
}

export class HFRateLimitError extends HFError {
  constructor(retryAfterMs?: number) {
    super(
      `HuggingFace 限流（429），建议等待 ${retryAfterMs ?? "自动退避"}ms`,
      429
    );
    this.name = "HFRateLimitError";
  }
}

export class HFNotFoundError extends HFError {
  constructor(resource?: string) {
    super(`HuggingFace 资源不存在${resource ? `: ${resource}` : ""}`, 404);
    this.name = "HFNotFoundError";
  }
}

export class HFTimeoutError extends HFError {
  constructor() {
    super("HuggingFace 请求超时");
    this.name = "HFTimeoutError";
  }
}

export class HFNetworkError extends HFError {
  constructor(reason?: string) {
    super(`HuggingFace 网络错误${reason ? `: ${reason}` : ""}`);
    this.name = "HFNetworkError";
  }
}

export class HFInvalidJsonError extends HFError {
  constructor() {
    super("HuggingFace 响应 JSON 解析失败");
    this.name = "HFInvalidJsonError";
  }
}
