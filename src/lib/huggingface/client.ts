/**
 * HuggingFace Hub API 客户端（阶段 1.3）。
 *
 * 设计：
 *  - 原生 fetch，不引入 SDK。
 *  - 支持 Bearer Token / 超时 / 429+Retry-After / 有限重试(默认2) / ETag 条件请求。
 *  - 不复制 GitHub 客户端的全部复杂机制（无 rate_limit 解析、无多资源限额）。
 *  - 公开内容允许匿名运行；Token 可选。
 */
import {
  HFError,
  HFAuthError,
  HFInvalidJsonError,
  HFNetworkError,
  HFNotFoundError,
  HFRateLimitError,
  HFTimeoutError,
} from "./errors";
import type {
  HFCardResponse,
  HFContentType,
  HFDatasetList,
  HFModelList,
  HFSpaceList,
} from "./types";
import type { Logger } from "@/lib/logger";

export interface HFClientOptions {
  /** Base URL，默认 https://huggingface.co */
  baseUrl?: string;
  /** 可选 Bearer Token */
  token?: string;
  /** 请求超时 ms，默认 15000 */
  timeoutMs?: number;
  /** 最大重试次数，默认 2 */
  maxRetries?: number;
  /** 可注入的 fetch（测试用） */
  fetchFn?: typeof fetch;
  logger?: Logger;
}

/** API 统一响应包装 */
export interface HFResponse<T> {
  data: T;
  status: number;
  etag: string | null;
  lastModified: string | null;
  /** 304 未变化 */
  notModified: boolean;
}

const BASE_BACKOFF_MS = 500;
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
  // HTTP-date 格式不处理，返回 null 让退避算法决定
  return null;
}

export class HFClient {
  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly fetchFn: typeof fetch;
  private readonly logger: Logger;
  private requestCount = 0;

  constructor(opts: HFClientOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? "https://huggingface.co").replace(/\/$/, "");
    this.token = opts.token;
    this.timeoutMs = opts.timeoutMs ?? 15_000;
    this.maxRetries = Math.max(0, opts.maxRetries ?? 2);
    this.fetchFn = opts.fetchFn ?? fetch;
    this.logger = opts.logger ?? { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };
  }

  getRequestCount(): number {
    return this.requestCount;
  }

  /**
   * 统一 GET 请求。
   * @param path 如 "api/models?limit=10&sort=downloads"
   * @param etag 可选 If-None-Match
   * @param parseAs 响应解析方式，默认 JSON；Card 等纯文本端点用 "text"
   */
  async request<T>(
    path: string,
    etag?: string | null,
    parseAs: "json" | "text" = "json"
  ): Promise<HFResponse<T>> {
    const url = `${this.baseUrl}/${path.replace(/^\//, "")}`;
    const headers: Record<string, string> = {};
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
          redirect: "follow",
        });
      } catch (err) {
        clearTimeout(timer);
        if (attempt === this.maxRetries) {
          if (err instanceof Error && err.name === "AbortError") throw new HFTimeoutError();
          throw new HFNetworkError(err instanceof Error ? err.message : undefined);
        }
        const backoff = computeBackoff(attempt + 1);
        this.logger.warn("hf.retryable_network", { path, attempt: attempt + 1, backoff_ms: backoff });
        await sleep(backoff);
        continue;
      }

      clearTimeout(timer);
      this.requestCount++;
      const duration = Date.now() - started;

      // 304
      if (res.status === 304) {
        this.logger.info("hf.not_modified", { path, status: 304, duration_ms: duration });
        return { data: [] as unknown as T, status: 304, etag: etag ?? null, lastModified: null, notModified: true };
      }

      // 401/403 — 认证或权限问题
      if (res.status === 401 || res.status === 403) {
        this.logger.warn("hf.auth_error", { path, status: res.status, duration_ms: duration });
        if (attempt === this.maxRetries) throw new HFAuthError();
        await sleep(computeBackoff(attempt + 1));
        continue;
      }

      // 429 — 限流
      if (res.status === 429) {
        const retryAfter = parseRetryAfter(res.headers);
        const wait = retryAfter ?? computeBackoff(attempt + 1);
        this.logger.warn("hf.rate_limited", { path, retry_after_ms: retryAfter, wait_ms: wait });
        if (attempt === this.maxRetries) throw new HFRateLimitError(retryAfter ?? undefined);
        await sleep(wait);
        continue;
      }

      // 404
      if (res.status === 404) {
        this.logger.info("hf.not_found", { path, duration_ms: duration });
        throw new HFNotFoundError(path);
      }

      // 5xx
      if (res.status >= 500) {
        if (attempt === this.maxRetries) throw new HFError(`HF 服务端错误 ${res.status}`, res.status);
        const backoff = computeBackoff(attempt + 1);
        this.logger.warn("hf.server_error", { path, status: res.status, backoff_ms: backoff });
        await sleep(backoff);
        continue;
      }

      // 2xx 成功
      if (res.status >= 200 && res.status < 300) {
        const etagOut = res.headers.get("etag");
        const lastModified = res.headers.get("last-modified");
        let data: T;
        try {
          data =
            parseAs === "text"
              ? ((await res.text()) as unknown as T)
              : ((await res.json()) as T);
        } catch {
          throw new HFInvalidJsonError();
        }
        this.logger.info("hf.ok", { path, status: res.status, duration_ms: duration });
        return { data, status: res.status, etag: etagOut, lastModified, notModified: false };
      }

      // 其他状态码
      if (attempt === this.maxRetries) throw new HFError(`HF 意外状态码 ${res.status}`, res.status);
      await sleep(computeBackoff(attempt + 1));
    }

    throw new HFNetworkError("请求重试耗尽");
  }

  // -----------------------------------------------------------------------
  // Models
  // -----------------------------------------------------------------------

  /**
   * 搜索/列出模型。
   * @param params URL 查询参数（如 sort, direction, limit, filter 等）
   * @see https://huggingface.co/api/models
   */
  listModels(params?: Record<string, string>, etag?: string | null): Promise<HFResponse<HFModelList>> {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
    return this.request<HFModelList>(`api/models${qs}`, etag);
  }

  // -----------------------------------------------------------------------
  // Datasets
  // -----------------------------------------------------------------------

  listDatasets(params?: Record<string, string>, etag?: string | null): Promise<HFResponse<HFDatasetList>> {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
    return this.request<HFDatasetList>(`api/datasets${qs}`, etag);
  }

  // -----------------------------------------------------------------------
  // Spaces
  // -----------------------------------------------------------------------

  listSpaces(params?: Record<string, string>, etag?: string | null): Promise<HFResponse<HFSpaceList>> {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
    return this.request<HFSpaceList>(`api/spaces${qs}`, etag);
  }

  // -----------------------------------------------------------------------
  // Card / README
  // -----------------------------------------------------------------------

  /**
   * 获取 Model Card / Dataset Card / Space README 的原始 Markdown 内容。
   *
   * 端点格式（revision 优先使用 API 返回的 sha 提交哈希，缺失时回退 main）：
   *   - Model:   https://huggingface.co/{owner}/{name}/resolve/{revision}/README.md
   *   - Dataset: https://huggingface.co/datasets/{owner}/{name}/resolve/{revision}/README.md
   *   - Space:   https://huggingface.co/spaces/{owner}/{name}/resolve/{revision}/README.md
   *
   * 401 / 403 / 404 只代表 Card 无法获取，不抛出（返回空内容），不阻断条目采集。
   * 只请求 README.md 文件本身，不下载其中引用的图片、权重或附件。
   */
  async getCard(
    contentType: HFContentType,
    repoId: string, // "owner/name"
    revision?: string | null,
    etag?: string | null
  ): Promise<HFResponse<HFCardResponse>> {
    const slash = repoId.indexOf("/");
    if (slash <= 0 || slash === repoId.length - 1) {
      throw new HFError(`无效 repoId: ${repoId}`);
    }
    const owner = encodeURIComponent(repoId.slice(0, slash));
    const name = encodeURIComponent(repoId.slice(slash + 1));

    const rev = normalizeRevision(revision);
    const typePrefix = contentType === "model" ? "" : `${contentType}s/`;
    const path = `${typePrefix}${owner}/${name}/resolve/${rev}/README.md`;

    try {
      const res = await this.request<string>(path, etag, "text");
      return {
        data: { content: res.data, revision: rev, etag: res.etag ?? undefined, lastModified: res.lastModified ?? undefined },
        status: res.status,
        etag: res.etag,
        lastModified: res.lastModified,
        notModified: res.notModified,
      };
    } catch (err) {
      // Card 无法获取（不存在 / 无权限）不是致命错误，返回空内容
      if (
        err instanceof HFNotFoundError ||
        err instanceof HFAuthError ||
        err instanceof HFInvalidJsonError
      ) {
        const status =
          err instanceof HFNotFoundError ? 404
          : err instanceof HFAuthError ? 401
          : 200;
        return {
          data: { content: "", revision: rev },
          status,
          etag: null,
          lastModified: null,
          notModified: false,
        };
      }
      throw err;
    }
  }
}

/**
 * 选择 Card 获取使用的 revision：
 * - 优先使用 API 返回的 sha（十六进制提交哈希）；
 * - sha 缺失或格式不可用（如 "sha256:..." 内容哈希、分支/标签名）时回退 "main"。
 */
export function normalizeRevision(revision: string | null | undefined): string {
  const rev = revision?.trim();
  if (!rev) return "main";
  if (/^[0-9a-f]{7,40}$/.test(rev)) return rev;
  return "main";
}
