/**
 * arXiv 论文发现（阶段 1.4）。
 *
 * 遍历发现组，调用 arXiv API（串行 + 间隔），标准化并跨组去重。
 * 不写数据库；由 collector.ts 负责持久化。
 */
import type { ArxivClient } from "@/lib/arxiv/client";
import { buildArxivQuery, enabledArxivGroups, type ArxivDiscoveryGroup } from "@/config/arxiv-discovery";
import { normalizeArxivEntry, type NormalizedArxivPaper } from "./normalize";
import type { Logger } from "@/lib/logger";

export interface DiscoveredArxivPaper {
  normalized: NormalizedArxivPaper;
  /** 命中该论文的查询组 id（去重后合并） */
  queryIds: string[];
}

export interface DiscoverArxivResult {
  papers: DiscoveredArxivPaper[];
  /** 各查询返回的条目总数（去重前） */
  fetched: number;
  /** 按发布时间窗口过滤掉的条数 */
  filteredByDate: number;
  /** 实际执行的查询组数 */
  groupsRun: number;
}

export interface DiscoverArxivOptions {
  /** 每个查询的最大结果数 */
  maxResultsPerQuery: number;
  /** 本次最多执行多少组（0 = 不限制） */
  maxGroups?: number;
  /** 只运行这些 id 的查询组（轮换用；空 = 全部） */
  groupIds?: string[];
  /** 发布时间窗口（天），超过窗口的论文丢弃；0 = 不过滤 */
  discoveryDays?: number;
  /** 只运行这些分类相关的组（如 ["cs.LG","eess.AS"]；空 = 全部） */
  categoryFilter?: string[];
  logger?: Logger;
}

/** 计算时间窗口起点（ISO）。 */
export function computeSinceIso(discoveryDays: number, now: Date = new Date()): string {
  if (discoveryDays <= 0) return "";
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - Math.max(1, Math.floor(discoveryDays)));
  return d.toISOString();
}

/**
 * 发现论文。
 * 单组失败（限流耗尽 / 网络 / 解析错误）不阻断其他组。
 */
export async function discoverArxivPapers(
  client: ArxivClient,
  opts: DiscoverArxivOptions
): Promise<DiscoverArxivResult> {
  const logger = opts.logger ?? { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };

  let groups = enabledArxivGroups();
  if (opts.groupIds && opts.groupIds.length > 0) {
    groups = groups.filter((g) => opts.groupIds!.includes(g.id));
  }
  if (opts.categoryFilter && opts.categoryFilter.length > 0) {
    groups = groups.filter((g) =>
      g.categories.some((c) => opts.categoryFilter!.includes(c))
    );
  }
  if (opts.maxGroups && opts.maxGroups > 0) {
    groups = groups.slice(0, opts.maxGroups);
  }

  const sinceIso = computeSinceIso(opts.discoveryDays ?? 0);
  const byId = new Map<string, DiscoveredArxivPaper>();
  let fetched = 0;
  let filteredByDate = 0;
  let groupsRun = 0;

  for (const group of groups) {
    try {
      const query = buildArxivQuery(group);
      logger.info("arxiv.discover.query", {
        group_id: group.id,
        search_query: query,
        max_results: opts.maxResultsPerQuery,
      });

      const result = await client.search({
        searchQuery: query,
        start: 0,
        maxResults: opts.maxResultsPerQuery,
        sortBy: "submittedDate",
        sortOrder: "descending",
      });

      groupsRun++;
      for (const entry of result.entries) {
        fetched++;
        const normalized = normalizeArxivEntry(entry);

        // 发布时间窗口过滤（arXiv API 无日期参数，客户端过滤）
        if (sinceIso && normalized.publishedAt && normalized.publishedAt < sinceIso) {
          filteredByDate++;
          continue;
        }

        const existing = byId.get(normalized.sourceItemId);
        if (existing) {
          if (!existing.queryIds.includes(group.id)) existing.queryIds.push(group.id);
          continue;
        }
        byId.set(normalized.sourceItemId, { normalized, queryIds: [group.id] });
      }
    } catch (err) {
      logger.warn("arxiv.discover.group_error", {
        group_id: group.id,
        error: err instanceof Error ? err.message : String(err),
      });
      // 单组失败不阻断其他组
    }
  }

  return {
    papers: [...byId.values()],
    fetched,
    filteredByDate,
    groupsRun,
  };
}
