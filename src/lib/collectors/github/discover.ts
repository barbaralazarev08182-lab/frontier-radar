/**
 * GitHub 仓库发现（阶段 1.2）。
 *
 *  - 只使用官方仓库搜索接口，不抓取 GitHub Trending。
 *  - 遍历启用的查询组与组内查询，拼接明确时间窗口与 archived:false / fork:false。
 *  - 不同查询返回同一仓库时按数字 id 去重并合并命中来源。
 *  - 不写数据库；返回内存结果，由 collector 负责持久化。
 *
 * 条件请求（ETag）通过可选回调注入，dry-run 与测试默认不注入。
 */
import type { GitHubClient } from "@/lib/github/client";
import type { GitHubRateLimit, GitHubRepo } from "@/lib/github/types";
import { normalizeRepo, type NormalizedRepo } from "./normalize";
import { renderQuery, type DiscoveryGroup } from "@/config/github-discovery";
import type { Logger } from "@/lib/logger";

export interface DiscoveredRepo {
  normalized: NormalizedRepo;
  rawRepo: GitHubRepo;
  /** 命中该仓库的查询组 id 列表（去重后合并） */
  queryIds: string[];
}

export interface DiscoveryQueryStat {
  queries: number;
  found: number;
}

export interface DiscoveryResult {
  items: DiscoveredRepo[];
  totalDiscovered: number;
  deduplicated: number;
  queryStats: Record<string, DiscoveryQueryStat>;
  /** 每个查询键最近一次响应的 ETag（用于增量条件请求） */
  queryEtags: Record<string, string | null>;
  rateLimit: GitHubRateLimit | null;
  /** 阶段 1.2.1：中止状态（预算/限额触发） */
  abort: DiscoveryAbort;
}

export interface DiscoverOptions {
  groups: DiscoveryGroup[];
  since: string;
  pagesPerQuery: number;
  perPage: number;
  /** 可选：按查询键返回 ETag 以发起条件请求（304） */
  getQueryEtag?: (queryKey: string) => Promise<string | null> | string | null;
  logger?: Logger;
  /** 阶段 1.2.1：预算控制 */
  searchRequestBudget?: number; // 最大 Search 请求数（0 = 无限制）
  searchRateLimitReserve?: number; // Search 保留额度
}

/** 发现过程中的中止状态 */
export interface DiscoveryAbort {
  aborted: boolean;
  reason: string | null;
  /** 已消耗的 Search 请求数 */
  searchRequestsUsed: number;
}

function finalizeQuery(template: string, since: string): string {
  const rendered = renderQuery(template, since);
  return `${rendered} archived:false fork:false`;
}

export async function discoverRepos(
  client: GitHubClient,
  opts: DiscoverOptions
): Promise<DiscoveryResult> {
  const logger = opts.logger ?? {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };
  const byId = new Map<string, DiscoveredRepo>();
  const queryStats: Record<string, DiscoveryQueryStat> = {};
  const queryEtags: Record<string, string | null> = {};
  let totalDiscovered = 0;
  let searchRequestsUsed = 0;
  let abortReason: string | null = null;

  // 预算配置
  const searchBudget = opts.searchRequestBudget ?? 0; // 0 = 无限制
  const searchReserve = opts.searchRateLimitReserve ?? 0;

  for (const group of opts.groups) {
    if (!group.enabled) continue;

    // 检查是否已因预算/限额中止
    if (abortReason) break;

    queryStats[group.id] = { queries: group.queries.length, found: 0 };
    for (const template of group.queries) {
      // 每次循环前检查预算
      if (searchBudget > 0 && searchRequestsUsed >= searchBudget) {
        abortReason = `Search 请求数 (${searchRequestsUsed}) 达到预算上限 (${searchBudget})`;
        logger.warn("github.discover.budget_exceeded", {
          used: searchRequestsUsed,
          limit: searchBudget,
        });
        break;
      }

      // 检查 Search 速率限制（通过最后已知状态）
      const rl = client.getLastRateLimit();
      if (
        searchReserve > 0 &&
        rl &&
        rl.remaining != null &&
        rl.remaining <= searchReserve
      ) {
        abortReason =
          `速率限制剩余 (${rl.remaining}) 达到保留额度 (${searchReserve})，重置时间：${rl.resetAtMs ? new Date(rl.resetAtMs).toISOString() : "未知"}`;
        logger.warn("github.discover.rate_limit_reserve", {
          remaining: rl.remaining,
          reserve: searchReserve,
          reset_at: rl.resetAtMs ? new Date(rl.resetAtMs).toISOString() : null,
        });
        break;
      }

      const q = finalizeQuery(template, opts.since);
      const queryKey = `${group.id}::${template}`;
      const etag = opts.getQueryEtag
        ? await opts.getQueryEtag(queryKey)
        : null;
      for (let page = 1; page <= opts.pagesPerQuery; page++) {
        // 页级预算检查
        if (searchBudget > 0 && searchRequestsUsed >= searchBudget) {
          abortReason = `Search 请求数 (${searchRequestsUsed}) 达到预算上限 (${searchBudget})`;
          break;
        }

        searchRequestsUsed++;
        const res = await client.searchRepositories(q, {
          page,
          perPage: opts.perPage,
          sort: "stars",
          order: "desc",
          etag: etag ?? null,
        });
        if (res.notModified) {
          // 该查询自上次采集无变化，跳过本页
          queryEtags[queryKey] = res.etag ?? queryEtags[queryKey] ?? null;
          logger.info("github.discover.not_modified", {
            query_key: queryKey,
            page,
          });
          continue;
        }
        queryEtags[queryKey] = res.etag ?? null;
        for (const rawRepo of res.data.items) {
          totalDiscovered++;
          const id = String(rawRepo.id);
          const normalized = normalizeRepo(rawRepo);
          const existing = byId.get(id);
          if (existing) {
            if (!existing.queryIds.includes(group.id)) {
              existing.queryIds.push(group.id);
            }
            continue;
          }
          byId.set(id, { normalized, rawRepo, queryIds: [group.id] });
          queryStats[group.id]!.found++;
        }
      }

      // 外层循环也检查中止原因（从内层 break 出来后）
      if (abortReason) break;
    }
  }

  const items = [...byId.values()];
  const deduplicated = totalDiscovered - items.length;
  return {
    items,
    totalDiscovered,
    deduplicated,
    queryStats,
    queryEtags,
    rateLimit: client.getLastRateLimit(),
    abort: {
      aborted: !!abortReason,
      reason: abortReason,
      searchRequestsUsed,
    },
  };
}
