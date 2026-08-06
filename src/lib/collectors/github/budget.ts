/**
 * 搜索请求预算控制（阶段 1.2.1）。
 *
 * 职责：
 *   - 运行前预估请求量
 *   - 运行中保护（reserve 逻辑）
 *   - 查询组轮换选择
 *   - 游标保存/恢复
 */
import type { DiscoveryGroup } from "@/config/github-discovery";
import type { Logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// 配置接口
// ---------------------------------------------------------------------------

export interface BudgetConfig {
  /** 单次运行最大 Search API 请求数 */
  searchRequestBudget: number;
  /** Search 速率限制保留额度 */
  searchRateLimitReserve: number;
  /** Core API 速率限制保留额度 */
  coreRateLimitReserve: number;
  /** 每次运行的查询组上限 */
  groupsPerRun: number;
}

/** 从环境变量读取预算配置（带默认值）。 */
export function loadBudgetConfig(): BudgetConfig {
  return {
    searchRequestBudget: numEnv("GITHUB_SEARCH_REQUEST_BUDGET", 24),
    searchRateLimitReserve: numEnv("GITHUB_SEARCH_RATE_LIMIT_RESERVE", 3),
    coreRateLimitReserve: numEnv("GITHUB_CORE_RATE_LIMIT_RESERVE", 50),
    groupsPerRun: numEnv("GITHUB_DISCOVERY_GROUPS_PER_RUN", 6),
  };
}

// ---------------------------------------------------------------------------
// 预估
// ---------------------------------------------------------------------------

/** 预估运行所需请求数。 */
export interface BudgetEstimate {
  /** 预计 Search 请求数 = 组数 × 每组查询数 × 每查询页数 */
  estimatedSearchRequests: number;
  /** 预计 Core 请求数（README enrichment） */
  estimatedCoreRequests: number;
  /** 选中的查询组数量 */
  selectedGroups: number;
  /** 总查询数（所有选中组的 queries 总和） */
  totalQueries: number;
  /** 每个查询的页数 */
  pagesPerQuery: number;
  /** 预计 enrichment 数量（≤ enrichLimit） */
  estimatedEnrichmentCount: number;
  /** 是否超出预算 */
  exceedsBudget: boolean;
  /** 超出原因 */
  exceedReason?: string;
}

/**
 * 计算预估。
 *
 * @param groups 候选查询组（已按优先级排序）
 * @param pagesPerQuery 每个查询的分页数
 * @param enrichLimit enrichment 上限
 * @param budget 预算配置
 * @param maxGroups 可选：CLI 强制覆盖的组数上限
 */
export function estimateBudget(
  groups: DiscoveryGroup[],
  pagesPerQuery: number,
  enrichLimit: number,
  budget: BudgetConfig,
  maxGroups?: number
): BudgetEstimate {
  const groupLimit = maxGroups ?? budget.groupsPerRun;
  const selected = groups.slice(0, Math.min(groupLimit, groups.length));

  let totalQueries = 0;
  for (const g of selected) {
    totalQueries += g.queries.length;
  }

  const estimatedSearchRequests = totalQueries * pagesPerQuery;
  // Core 请求预估：enrichLimit 个 README + 少量状态检查
  const estimatedCoreRequests = enrichLimit + 5;

  const exceedsBudget = estimatedSearchRequests > budget.searchRequestBudget;

  return {
    estimatedSearchRequests,
    estimatedCoreRequests,
    selectedGroups: selected.length,
    totalQueries,
    pagesPerQuery,
    estimatedEnrichmentCount: enrichLimit,
    exceedsBudget,
    exceedReason: exceedsBudget
      ? `预计 Search 请求数 (${estimatedSearchRequests}) 超出预算 (${budget.searchRequestBudget})`
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// 查询组轮换选择
// ---------------------------------------------------------------------------

/**
 * 选择本次运行的查询组。
 *
 * 策略：
 *   1. 按 priority 降序排列所有启用组
 *   2. 如果有 resume 游标，从游标位置继续
 *   3. 否则从第 0 组开始，取最多 groupsPerRun 个
 *   4. 返回选中的组和下一个游标位置
 */
export interface GroupSelection {
  /** 本次运行的组 */
  selected: DiscoveryGroup[];
  /** 未被选中的剩余组（下次运行候选） */
  remaining: DiscoveryGroup[];
  /** 游标值（保存到 collector_state） */
  cursor: string;
  /** 是否是 resume（从上次中断处继续） */
  isResume: boolean;
}

/**
 * 选择查询组。
 *
 * @param allGroups 所有启用的组（应已按优先级降序）
 * @param budget 预算配置
 * @param resumeCursor 上次保存的游标（可选）
 * @param maxGroups CLI 强制覆盖
 */
export function selectGroups(
  allGroups: DiscoveryGroup[],
  budget: BudgetConfig,
  resumeCursor?: string | null,
  maxGroups?: number
): GroupSelection {
  const limit = maxGroups ?? budget.groupsPerRun;
  let startIndex = 0;
  let isResume = false;

  if (resumeCursor) {
    // 游标格式："{groupId}" — 找到该组后从下一组开始
    const idx = allGroups.findIndex((g) => g.id === resumeCursor);
    if (idx >= 0) {
      startIndex = idx + 1;
      isResume = true;
    }
    // 游标指向的组不存在（可能配置变更），从头开始
  }

  if (startIndex >= allGroups.length) {
    // 已到末尾，循环回到开头
    startIndex = 0;
    isResume = false;
  }

  const selected = allGroups.slice(startIndex, startIndex + limit);
  const remaining = [
    ...allGroups.slice(startIndex + limit),
    ...allGroups.slice(0, startIndex),
  ];

  // 下一个游标：最后选中组的 ID（或最后一个剩余组的 ID）
  const lastSelected = selected.length > 0 ? selected[selected.length - 1] : null;
  const lastAll = allGroups.length > 0 ? allGroups[allGroups.length - 1] : null;
  const nextCursor = lastSelected?.id ?? lastAll?.id ?? "";

  return { selected, remaining, cursor: nextCursor, isResume };
}

// ---------------------------------------------------------------------------
// 运行时保护
// ---------------------------------------------------------------------------

/** 速率 limit 状态快照。 */
export interface RateLimitStatus {
  /** Search API 剩余次数 */
  searchRemaining: number;
  /** Core API 剩余次数 */
  coreRemaining: number;
  /** Search 重置时间（Unix ms） */
  searchResetAtMs: number | null;
  /** Core 重置时间（Unix ms） */
  coreResetAtMs: number | null;
}

/**
 * 检查是否应该停止发送搜索请求。
 *
 * @returns 应该停止的原因，null 表示可以继续
 */
export function shouldStopSearch(
  status: RateLimitStatus,
  budget: BudgetConfig
): string | null {
  if (status.searchRemaining <= budget.searchRateLimitReserve) {
    return `Search 速率限制剩余 (${status.searchRemaining}) 达到保留额度 (${budget.searchRateLimitReserve})，停止发送新搜索请求。重置时间：${status.searchResetAtMs ? new Date(status.searchResetAtMs).toISOString() : "未知"}`;
  }
  return null;
}

/**
 * 检查是否应该停止发送 Core 请求（README 等）。
 */
export function shouldStopCore(
  status: RateLimitStatus,
  budget: BudgetConfig
): string | null {
  if (status.coreRemaining <= budget.coreRateLimitReserve) {
    return `Core 速率限制剩余 (${status.coreRemaining}) 达到保留额度 (${budget.coreRateLimitReserve})，停止发送新 Core 请求。重置时间：${status.coreResetAtMs ? new Date(status.coreResetAtMs).toISOString() : "未知"}`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

function numEnv(key: string, fallback: number): number {
  const v = Number(process.env[key]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

export function formatEstimateReport(est: BudgetEstimate, logger: Logger): void {
  const logObj: Record<string, unknown> = {
    estimated_search_requests: est.estimatedSearchRequests,
    estimated_core_requests: est.estimatedCoreRequests,
    selected_groups: est.selectedGroups,
    total_queries: est.totalQueries,
    pages_per_query: est.pagesPerQuery,
    estimated_enrichment: est.estimatedEnrichmentCount,
    exceeds_budget: est.exceedsBudget,
  };
  if (est.exceedReason) logObj.reason = est.exceedReason;
  logger.info("github.budget.estimate", logObj);
}
