/**
 * GitHub API 限流信息解析（阶段 1.2）。
 *
 * 重点：
 *  - 优先读取每个响应自带的限流 Header（x-ratelimit-*），而不是轮询 /rate_limit。
 *  - /rate_limit 接口的限额按资源分区：resources.core / resources.search，
 *    不再依赖旧的顶层 rate 字段。
 *  - Retry-After 既可能是秒数，也可能是 HTTP 日期，统一归一成毫秒或绝对时间戳。
 */

export type RateLimitResource = "core" | "search" | "unknown";

export interface GitHubRateLimit {
  resource: RateLimitResource;
  limit: number | null;
  remaining: number | null;
  /** 限额重置的绝对时间（毫秒时间戳） */
  resetAtMs: number | null;
  used: number | null;
}

type HeaderSource = Headers | Record<string, string | null | undefined>;

function headerGet(h: HeaderSource, name: string): string | null {
  if (h instanceof Headers) return h.get(name);
  const key = Object.keys(h).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? (h[key] ?? null) : null;
}

/** 从响应 Header 解析限流信息。resource 由调用方依据端点给出。 */
export function parseRateLimit(
  headers: HeaderSource,
  resource: RateLimitResource = "unknown"
): GitHubRateLimit {
  const limit = Number(headerGet(headers, "x-ratelimit-limit"));
  const remaining = Number(headerGet(headers, "x-ratelimit-remaining"));
  const reset = Number(headerGet(headers, "x-ratelimit-reset"));
  const used = Number(headerGet(headers, "x-ratelimit-used"));
  return {
    resource,
    limit: Number.isFinite(limit) && limit > 0 ? limit : null,
    remaining: Number.isFinite(remaining) && remaining >= 0 ? remaining : null,
    resetAtMs:
      Number.isFinite(reset) && reset > 0 ? reset * 1000 : null,
    used: Number.isFinite(used) && used >= 0 ? used : null,
  };
}

/** 读取 Retry-After Header，返回「还需等待的毫秒数」或 null。 */
export function parseRetryAfterMs(headers: HeaderSource): number | null {
  const raw = headerGet(headers, "retry-after");
  if (!raw) return null;
  const trimmed = raw.trim();
  // 秒数形式
  if (/^\d+$/.test(trimmed)) {
    const secs = Number(trimmed);
    return Number.isFinite(secs) ? secs * 1000 : null;
  }
  // HTTP 日期形式
  const dt = Date.parse(trimmed);
  if (!Number.isNaN(dt)) {
    const wait = dt - Date.now();
    return wait > 0 ? wait : 0;
  }
  return null;
}

/** /rate_limit 接口的归一化响应（只关心 core / search 两个分区）。 */
export interface GitHubRateLimitApiResponse {
  resources: {
    core: { limit: number; remaining: number; reset: number; used: number };
    search: { limit: number; remaining: number; reset: number; used: number };
  };
}

/** 由 /rate_limit 响应取指定资源分区的限额（不读旧顶层 rate）。 */
export function pickRateLimitFromApi(
  data: GitHubRateLimitApiResponse,
  resource: RateLimitResource
): GitHubRateLimit | null {
  const bucket = resource === "search" ? data.resources?.search : data.resources?.core;
  if (!bucket) return null;
  return {
    resource,
    limit: bucket.limit,
    remaining: bucket.remaining,
    resetAtMs: bucket.reset * 1000,
    used: bucket.used,
  };
}
