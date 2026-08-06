/**
 * GitHub REST API 客户端（阶段 1.2）。
 *
 * 设计：
 *  - 优先使用 Node.js 原生 fetch，不引入重量级 HTTP SDK。
 *  - 所有请求统一经过 request()，负责 Base URL / Accept / API-Version /
 *    Bearer Token / 超时 / 状态码 / 限流 Header / Retry-After / 指数退避 /
 *    上限 / JSON 解析 / 可选 ETag 条件请求。
 *  - 默认串行；并发上限由调用方通过 runWithConcurrency 控制（≤2）。
 *  - 无上限重试；可重试错误（超时 / 网络 / 5xx / 403 / 429）指数退避，
 *    401 立即停止，404 不无限重试。
 *  - 限流优先读响应自带的 x-ratelimit-*，/rate_limit 仅用于主动查询。
 *
 * 不读取 .env（由 scripts / 上层显式注入 token），便于测试注入 fake fetch。
 */
import {
  GitHubAuthError,
  GitHubConfigurationError,
  GitHubInvalidJsonError,
  GitHubNetworkError,
  GitHubNotFoundError,
  GitHubNotModifiedError,
  GitHubRateLimitError,
  GitHubServerError,
  GitHubTimeoutError,
} from "./errors";
import {
  parseRateLimit,
  parseRetryAfterMs,
  pickRateLimitFromApi,
  type GitHubRateLimit,
  type GitHubRateLimitApiResponse,
  type RateLimitResource,
} from "./rate-limit";
import type {
  GitHubReadmeResponse,
  GitHubResponse,
  GitHubSearchResponse,
} from "./types";
import type { Logger } from "@/lib/logger";

export interface GitHubClientOptions {
  baseUrl: string;
  apiVersion: string;
  token?: string;
  timeoutMs: number;
  maxRetries: number;
  /** 可注入的 fetch（测试用 fake）；默认全局 fetch */
  fetchFn?: typeof fetch;
  logger?: Logger;
}

const BASE_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 30_000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function computeBackoff(attempt: number): number {
  const exp = BASE_BACKOFF_MS * 2 ** attempt;
  const cap = Math.min(exp, MAX_BACKOFF_MS);
  const jitter = cap * 0.25 * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(cap + jitter));
}

export class GitHubClient {
  private readonly baseUrl: string;
  private readonly apiVersion: string;
  private readonly token?: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly fetchFn: typeof fetch;
  private readonly logger: Logger;
  private requestCount = 0;
  private lastRateLimit: GitHubRateLimit | null = null;

  constructor(opts: GitHubClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.apiVersion = opts.apiVersion;
    this.token = opts.token;
    this.timeoutMs = opts.timeoutMs;
    this.maxRetries = Math.max(0, opts.maxRetries);
    this.fetchFn = opts.fetchFn ?? fetch;
    this.logger = opts.logger ?? {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    };
    if (!this.token) {
      this.logger.warn("github_client.no_token", {
        hint: "未提供 GITHUB_TOKEN，真实采集将失败。",
      });
    }
  }

  /** 累计请求数（供采集运行统计）。 */
  getRequestCount(): number {
    return this.requestCount;
  }

  /** 最近一次响应携带的限流信息（供采集运行统计）。 */
  getLastRateLimit(): GitHubRateLimit | null {
    return this.lastRateLimit;
  }

  /**
   * 统一请求入口。attempt 从 0 到 maxRetries（含），共 maxRetries+1 次尝试。
   * @param path 已含查询字符串的路径（如 /search/repositories?q=...）
   * @param resource 端点资源类型（影响限流解析）
   * @param etag 可选 If-None-Match（条件请求）
   * @param accept 默认 application/vnd.github+json
   */
  private async request<T>(
    path: string,
    resource: RateLimitResource,
    etag?: string | null,
    accept = "application/vnd.github+json"
  ): Promise<GitHubResponse<T>> {
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const headers: Record<string, string> = {
      Accept: accept,
      "X-GitHub-Api-Version": this.apiVersion,
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    if (etag) headers["If-None-Match"] = etag;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      let res: Response;
      const started = Date.now();
      try {
        res = await this.fetchFn(url, {
          method: "GET",
          headers,
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timer);
        if (attempt === this.maxRetries) {
          if (err instanceof Error && err.name === "AbortError") {
            throw new GitHubTimeoutError();
          }
          throw new GitHubNetworkError();
        }
        const isTimeout = err instanceof Error && err.name === "AbortError";
        const backoff = computeBackoff(attempt + 1);
        this.logger.warn("github.request.retryable_network", {
          path,
          reason: isTimeout ? "timeout" : "network",
          attempt: attempt + 1,
          backoff_ms: backoff,
        });
        await sleep(backoff);
        continue;
      }
      clearTimeout(timer);
      this.requestCount++;
      const rateLimit = parseRateLimit(res.headers, resource);
      this.lastRateLimit = rateLimit;
      const logFields = {
        method: "GET",
        path,
        status: res.status,
        duration_ms: Date.now() - started,
        retry_count: attempt,
        remaining: rateLimit.remaining,
        reset_at: rateLimit.resetAtMs
          ? new Date(rateLimit.resetAtMs).toISOString()
          : null,
      };

      // 304 未变化
      if (res.status === 304) {
        this.logger.info("github.request.not_modified", logFields);
        throw new GitHubNotModifiedError();
      }
      // 401 立即停止
      if (res.status === 401) {
        this.logger.error("github.request.unauthorized", logFields);
        throw new GitHubAuthError();
      }
      // 403 / 429 限流
      if (res.status === 403 || res.status === 429) {
        const retryAfter = parseRetryAfterMs(res.headers);
        const wait = retryAfter ?? computeBackoff(attempt + 1);
        this.logger.warn("github.request.rate_limited", {
          ...logFields,
          retry_after_ms: retryAfter,
          wait_ms: wait,
        });
        if (attempt === this.maxRetries) {
          throw new GitHubRateLimitError(
            `GitHub 限流未缓解（${res.status}），已用尽重试`,
            res.status === 429 ? 429 : 403,
            retryAfter,
            rateLimit
          );
        }
        await sleep(wait);
        continue;
      }
      // 404 不重试
      if (res.status === 404) {
        this.logger.info("github.request.not_found", logFields);
        throw new GitHubNotFoundError();
      }
      // 5xx 有限退避重试
      if (res.status >= 500 && res.status < 600) {
        if (attempt === this.maxRetries) {
          throw new GitHubServerError(res.status);
        }
        const backoff = computeBackoff(attempt + 1);
        this.logger.warn("github.request.server_error", {
          ...logFields,
          backoff_ms: backoff,
        });
        await sleep(backoff);
        continue;
      }
      // 2xx 成功
      if (res.status >= 200 && res.status < 300) {
        const etagOut = res.headers.get("etag");
        const lastModified = res.headers.get("last-modified");
        let data: T;
        try {
          data = (await res.json()) as T;
        } catch {
          throw new GitHubInvalidJsonError();
        }
        this.logger.info("github.request.ok", logFields);
        return {
          data,
          status: res.status,
          rateLimit,
          etag: etagOut,
          lastModified,
          notModified: false,
        };
      }
      throw new GitHubNetworkError(`GitHub 意外状态码 ${res.status}`);
    }
    // 理论不可达
    throw new GitHubNetworkError("GitHub 请求重试耗尽");
  }

  /** 仓库搜索（分页）。etag 用于条件请求（返回 notModified=true 表示无变化）。 */
  async searchRepositories(
    query: string,
    opts: {
      page?: number;
      perPage?: number;
      sort?: "stars" | "forks" | "updated" | "help-wanted-issues";
      order?: "asc" | "desc";
      etag?: string | null;
    } = {}
  ): Promise<GitHubResponse<GitHubSearchResponse>> {
    const params = new URLSearchParams();
    params.set("q", query);
    params.set("page", String(opts.page ?? 1));
    params.set("per_page", String(opts.perPage ?? 30));
    if (opts.sort) params.set("sort", opts.sort);
    if (opts.order) params.set("order", opts.order);
    const path = `/search/repositories?${params.toString()}`;
    try {
      return await this.request<GitHubSearchResponse>(path, "search", opts.etag);
    } catch (err) {
      if (err instanceof GitHubNotModifiedError) {
        return {
          data: { total_count: 0, incomplete_results: false, items: [] },
          status: 304,
          rateLimit: this.lastRateLimit,
          etag: opts.etag ?? null,
          lastModified: null,
          notModified: true,
        };
      }
      throw err;
    }
  }

  /** 获取仓库 README。404 → notFound:true（不视为采集失败）。 */
  async getReadme(
    owner: string,
    repo: string,
    opts: { etag?: string | null } = {}
  ): Promise<GitHubResponse<GitHubReadmeResponse> & { notFound?: boolean }> {
    const path = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
      repo
    )}/readme`;
    try {
      return await this.request<GitHubReadmeResponse>(path, "core", opts.etag);
    } catch (err) {
      if (err instanceof GitHubNotModifiedError) {
        return {
          data: {} as GitHubReadmeResponse,
          status: 304,
          rateLimit: this.lastRateLimit,
          etag: opts.etag ?? null,
          lastModified: null,
          notModified: true,
        };
      }
      if (err instanceof GitHubNotFoundError) {
        return {
          data: {} as GitHubReadmeResponse,
          status: 404,
          rateLimit: this.lastRateLimit,
          etag: null,
          lastModified: null,
          notModified: false,
          notFound: true,
        };
      }
      throw err;
    }
  }

  /** 主动查询 /rate_limit（仅用 resources.core / resources.search）。 */
  async getRateLimit(): Promise<{
    core: GitHubRateLimit | null;
    search: GitHubRateLimit | null;
  }> {
    const res = await this.request<GitHubRateLimitApiResponse>(
      "/rate_limit",
      "unknown"
    );
    return {
      core: pickRateLimitFromApi(res.data, "core"),
      search: pickRateLimitFromApi(res.data, "search"),
    };
  }
}

/** 缺少 token 时显式抛出（供 scripts 在真实采集前校验）。 */
export function assertHasToken(token?: string): void {
  if (!token) {
    throw new GitHubConfigurationError(
      "缺少 GITHUB_TOKEN：真实采集需要服务端 Token（dry-run 可无 Token 运行）。"
    );
  }
}
