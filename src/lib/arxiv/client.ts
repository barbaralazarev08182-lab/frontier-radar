/**
 * arXiv API 客户端（阶段 1.4）。
 *
 * 设计：
 *  - 原生 fetch，不引入 HTTP SDK；XML 解析使用 fast-xml-parser（轻量、无传递依赖）。
 *  - 请求串行，两次请求之间保留 requestIntervalMs 间隔，避免高频访问 arXiv。
 *  - 最多 maxRetries 次重试（默认 2）：网络 / 超时 / 429 / 5xx 指数退避；
 *    429 优先使用 Retry-After。
 *  - XML 解析失败抛 ArxivParseError（单组失败不阻断整体采集）。
 *  - arXiv 无需 Token。
 */
import { XMLParser } from "fast-xml-parser";
import {
  ArxivHttpError,
  ArxivNetworkError,
  ArxivParseError,
  ArxivRateLimitError,
  ArxivServerError,
  ArxivTimeoutError,
} from "./errors";
import type { ArxivAtomFeed, ArxivQueryParams, ArxivQueryResult } from "./types";
import type { Logger } from "@/lib/logger";

export interface ArxivClientOptions {
  /** API 端点，默认 https://export.arxiv.org/api/query */
  baseUrl?: string;
  /** 请求超时 ms，默认 20000 */
  timeoutMs?: number;
  /** 最大重试次数（上限 2），默认 2 */
  maxRetries?: number;
  /** 两次请求之间的最小间隔 ms，默认 3000（arXiv 官方建议 ≥3s） */
  requestIntervalMs?: number;
  /** 可注入的 fetch（测试用） */
  fetchFn?: typeof fetch;
  logger?: Logger;
}

const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 20_000;
const MAX_RETRIES_CAP = 2;

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

/** fast-xml-parser 配置：保留属性（无前缀）、不把纯数字文本转为 number。 */
const XML_PARSER = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  processEntities: true,
});

/** 统一把单元素或数组规整为数组。 */
export function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

export class ArxivClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly requestIntervalMs: number;
  private readonly fetchFn: typeof fetch;
  private readonly logger: Logger;
  private lastRequestAt = 0;
  private requestCount = 0;

  constructor(opts: ArxivClientOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? "https://export.arxiv.org/api/query").replace(/\/$/, "");
    this.timeoutMs = opts.timeoutMs ?? 20_000;
    this.maxRetries = Math.min(MAX_RETRIES_CAP, Math.max(0, opts.maxRetries ?? 2));
    this.requestIntervalMs = Math.max(0, opts.requestIntervalMs ?? 3000);
    this.fetchFn = opts.fetchFn ?? fetch;
    this.logger = opts.logger ?? { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };
  }

  getRequestCount(): number {
    return this.requestCount;
  }

  /**
   * 串行查询 arXiv API。
   * 每次调用前等待 requestIntervalMs 间隔，保证对 arXiv 的低频访问。
   */
  async search(params: ArxivQueryParams): Promise<ArxivQueryResult> {
    await this.waitInterval();
    return this.doSearch(params);
  }

  private async waitInterval(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestAt;
    if (this.lastRequestAt > 0 && elapsed < this.requestIntervalMs) {
      await sleep(this.requestIntervalMs - elapsed);
    }
    this.lastRequestAt = Date.now();
  }

  private async doSearch(params: ArxivQueryParams): Promise<ArxivQueryResult> {
    const qs = new URLSearchParams({
      search_query: params.searchQuery,
      start: String(params.start ?? 0),
      max_results: String(params.maxResults ?? 30),
    });
    if (params.sortBy) qs.set("sortBy", params.sortBy);
    if (params.sortOrder) qs.set("sortOrder", params.sortOrder);
    const url = `${this.baseUrl}?${qs.toString()}`;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      let res: Response;
      const started = Date.now();

      try {
        res = await this.fetchFn(url, {
          method: "GET",
          headers: { Accept: "application/atom+xml, application/xml, text/xml" },
          signal: controller.signal,
          redirect: "follow",
        });
      } catch (err) {
        clearTimeout(timer);
        if (attempt === this.maxRetries) {
          if (err instanceof Error && err.name === "AbortError") throw new ArxivTimeoutError();
          throw new ArxivNetworkError(err instanceof Error ? err.message : undefined);
        }
        const backoff = computeBackoff(attempt + 1);
        this.logger.warn("arxiv.retryable_network", { attempt: attempt + 1, backoff_ms: backoff });
        await sleep(backoff);
        continue;
      }

      clearTimeout(timer);
      this.requestCount++;
      const durationMs = Date.now() - started;
      const logFields = { status: res.status, duration_ms: durationMs, retry_count: attempt };

      // 429 限流（arXiv 要求 ≥3s 间隔）
      if (res.status === 429) {
        const retryAfter = parseRetryAfter(res.headers);
        const wait = retryAfter ?? computeBackoff(attempt + 1);
        this.logger.warn("arxiv.rate_limited", { ...logFields, retry_after_ms: retryAfter, wait_ms: wait });
        if (attempt === this.maxRetries) throw new ArxivRateLimitError(retryAfter);
        await sleep(wait);
        continue;
      }

      // 5xx 有限退避重试
      if (res.status >= 500 && res.status < 600) {
        if (attempt === this.maxRetries) throw new ArxivServerError(res.status);
        const backoff = computeBackoff(attempt + 1);
        this.logger.warn("arxiv.server_error", { ...logFields, backoff_ms: backoff });
        await sleep(backoff);
        continue;
      }

      // 其他非 2xx（400 等）不重试
      if (res.status < 200 || res.status >= 300) {
        this.logger.warn("arxiv.http_error", logFields);
        throw new ArxivHttpError(res.status);
      }

      // 2xx：解析 XML
      this.logger.info("arxiv.ok", logFields);
      const xml = await res.text();
      return this.parseFeed(xml);
    }

    throw new ArxivNetworkError("arXiv 请求重试耗尽");
  }

  /** 解析 Atom XML；结构不符抛 ArxivParseError。 */
  parseFeed(xml: string): ArxivQueryResult {
    let parsed: unknown;
    try {
      parsed = XML_PARSER.parse(xml);
    } catch (err) {
      throw new ArxivParseError(err instanceof Error ? err.message : undefined);
    }

    const feed = (parsed as ArxivAtomFeed).feed;
    if (!feed || typeof feed !== "object") {
      throw new ArxivParseError("响应缺少 <feed> 根元素");
    }

    const totalResults = Number(feed["opensearch:totalResults"] ?? 0);
    const startIndex = Number(feed["opensearch:startIndex"] ?? 0);
    const itemsPerPage = Number(feed["opensearch:itemsPerPage"] ?? 0);

    return {
      entries: asArray(feed.entry),
      totalResults: Number.isFinite(totalResults) ? totalResults : 0,
      startIndex: Number.isFinite(startIndex) ? startIndex : 0,
      itemsPerPage: Number.isFinite(itemsPerPage) ? itemsPerPage : 0,
    };
  }
}
