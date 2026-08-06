/**
 * GitHub 仓库富化（阶段 1.2）：仅为基础筛选后的前 N 个候选项目获取 README。
 *
 *  - 不为所有搜索结果立即请求 README（节省配额）。
 *  - 基础筛选：非 archived / 非 fork / 有 description / 最近有 push /
 *    达到最低 Star 门槛 / 非明显空仓库。
 *  - README 超长时按字节安全截断，并保存 truncated 与 original_size，
 *    不允许无提示截断。
 *  - README 不存在（404）不是整个仓库采集失败。
 *  - 并发上限 2，集中队列控制。
 *
 * 本阶段只保存 README 原始内容与元数据，不进行 AI 分析。
 */
import { Buffer } from "node:buffer";
import type { GitHubClient } from "@/lib/github/client";
import type { GitHubRateLimit } from "@/lib/github/types";
import { runWithConcurrency } from "@/lib/concurrency";
import type { DiscoveredRepo } from "./discover";
import type { Logger } from "@/lib/logger";

export interface RepoReadmePayload {
  readme: {
    source_item_id: string; // 所属仓库数字 id
    full_name: string;
    content: string; // 解码后的文本（可能已截断）
    truncated: boolean;
    original_size: number; // 原始字节大小
    etag: string | null;
    fetched_at: string; // ISO
  };
}

export interface EnrichResult {
  /** keyed by sourceItemId */
  readmes: Map<string, RepoReadmePayload>;
  fetched: number;
  truncated: number;
  notFound: number;
  errors: number;
  rateLimit: GitHubRateLimit | null;
  skippedByFilter: number;
}

export interface EnrichOptions {
  limit: number; // GITHUB_ENRICH_LIMIT
  minStars: number; // 最低 Star 门槛
  since: string; // 最近 push 时间窗口起点（YYYY-MM-DD）
  readmeMaxBytes: number; // 截断阈值
  getReadmeEtag?: (
    sourceItemId: string
  ) => Promise<string | null> | string | null;
  logger?: Logger;
}

/** 基础筛选：判断仓库是否值得获取 README。 */
export function passesBasicFilter(
  d: DiscoveredRepo,
  since: string,
  minStars: number
): boolean {
  const r = d.normalized;
  if (r.fork) return false;
  if (r.archived) return false;
  if (!r.description) return false;
  if (r.stars < minStars) return false;
  // 最近有 push：pushed_at 不早于 since
  if (r.pushedAt.slice(0, 10) < since) return false;
  // 非明显空仓库（size 为 KB；0 视为空）
  if (r.repositorySize === null || r.repositorySize <= 0) return false;
  return true;
}

/** 筛选 → 按 stars 降序 → 取前 limit。 */
export function selectEnrichTargets(
  items: DiscoveredRepo[],
  opts: EnrichOptions
): DiscoveredRepo[] {
  const passed = items.filter((d) => passesBasicFilter(d, opts.since, opts.minStars));
  passed.sort((a, b) => b.normalized.stars - a.normalized.stars);
  return passed.slice(0, Math.max(0, opts.limit));
}

/** 按字节安全截断 UTF-8（去除被切断的多字节尾字符）。 */
function truncateUtf8(buf: Buffer, maxBytes: number): { text: string; truncated: boolean } {
  if (buf.length <= maxBytes) {
    return { text: buf.toString("utf8"), truncated: false };
  }
  let end = maxBytes;
  // 回退到完整字符边界：若 end 处是 UTF-8 续字节，继续前移
  while (end > 0) {
    const b = buf[end];
    if (b === undefined || (b & 0xc0) !== 0x80) break;
    end--;
  }
  return { text: buf.subarray(0, end).toString("utf8"), truncated: true };
}

function decodeReadme(contentB64: string, maxBytes: number): {
  text: string;
  truncated: boolean;
  originalSize: number;
} {
  const buf = Buffer.from(contentB64, "base64");
  const originalSize = buf.length;
  const { text, truncated } = truncateUtf8(buf, maxBytes);
  return { text, truncated, originalSize };
}

/** 为前 N 个候选项目获取 README（并发 ≤2）。 */
export async function enrichReadmes(
  client: GitHubClient,
  items: DiscoveredRepo[],
  opts: EnrichOptions
): Promise<EnrichResult> {
  const logger = opts.logger ?? {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };
  const targets = selectEnrichTargets(items, opts);
  const skippedByFilter = items.length - targets.length;
  const readmes = new Map<string, RepoReadmePayload>();
  let fetched = 0;
  let truncated = 0;
  let notFound = 0;
  let errors = 0;

  await runWithConcurrency(targets, 2, async (d) => {
    const id = d.normalized.sourceItemId;
    const owner = d.normalized.ownerLogin;
    const repo = d.normalized.repositoryName;
    if (!owner || !repo) return;
    const etag = opts.getReadmeEtag ? await opts.getReadmeEtag(id) : null;
    try {
      const res = await client.getReadme(owner, repo, { etag: etag ?? null });
      if (res.notFound) {
        notFound++;
        logger.info("github.enrich.readme_missing", { id, full_name: d.normalized.fullName });
        return;
      }
      if (res.notModified) {
        // 命中条件请求：README 未变化，不重复存储（视为已保存）
        fetched++;
        logger.info("github.enrich.readme_not_modified", { id });
        return;
      }
      const decoded = decodeReadme(res.data.content, opts.readmeMaxBytes);
      const payload: RepoReadmePayload = {
        readme: {
          source_item_id: id,
          full_name: d.normalized.fullName,
          content: decoded.text,
          truncated: decoded.truncated,
          original_size: decoded.originalSize,
          etag: res.etag,
          fetched_at: new Date().toISOString(),
        },
      };
      readmes.set(id, payload);
      fetched++;
      if (decoded.truncated) truncated++;
      logger.info("github.enrich.readme_ok", {
        id,
        original_size: decoded.originalSize,
        truncated: decoded.truncated,
      });
    } catch (err) {
      errors++;
      logger.warn("github.enrich.readme_error", {
        id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  return {
    readmes,
    fetched,
    truncated,
    notFound,
    errors,
    rateLimit: client.getLastRateLimit(),
    skippedByFilter,
  };
}
