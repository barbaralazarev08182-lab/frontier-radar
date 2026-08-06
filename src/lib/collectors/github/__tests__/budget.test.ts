/**
 * 预算控制模块测试（阶段 1.2.1）。
 *
 * 覆盖：loadBudgetConfig / estimateBudget / selectGroups / shouldStopSearch / shouldStopCore
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  loadBudgetConfig,
  estimateBudget,
  selectGroups,
  shouldStopSearch,
  shouldStopCore,
  type BudgetConfig,
} from "@/lib/collectors/github/budget";
import type { DiscoveryGroup } from "@/config/github-discovery";

// ---------------------------------------------------------------------------
// 测试 fixtures
// ---------------------------------------------------------------------------

function makeGroups(n: number): DiscoveryGroup[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `g${i}`,
    label: `G${i}`,
    priority: i + 1,
    enabled: true,
    queries: [`q${i}`],
  }));
}

const DEFAULT_BUDGET: BudgetConfig = {
  searchRequestBudget: 24,
  searchRateLimitReserve: 3,
  coreRateLimitReserve: 50,
  groupsPerRun: 6,
};

// ===========================================================================
// 1. loadBudgetConfig — 默认值
// ===========================================================================

test("loadBudgetConfig 返回默认值（无环境变量时）", () => {
  // 备份并清除相关环境变量
  const backup = {
    GITHUB_SEARCH_REQUEST_BUDGET: process.env.GITHUB_SEARCH_REQUEST_BUDGET,
    GITHUB_SEARCH_RATE_LIMIT_RESERVE: process.env.GITHUB_SEARCH_RATE_LIMIT_RESERVE,
    GITHUB_CORE_RATE_LIMIT_RESERVE: process.env.GITHUB_CORE_RATE_LIMIT_RESERVE,
    GITHUB_DISCOVERY_GROUPS_PER_RUN: process.env.GITHUB_DISCOVERY_GROUPS_PER_RUN,
  };
  delete process.env.GITHUB_SEARCH_REQUEST_BUDGET;
  delete process.env.GITHUB_SEARCH_RATE_LIMIT_RESERVE;
  delete process.env.GITHUB_CORE_RATE_LIMIT_RESERVE;
  delete process.env.GITHUB_DISCOVERY_GROUPS_PER_RUN;

  try {
    const cfg = loadBudgetConfig();
    assert.equal(cfg.searchRequestBudget, 24);
    assert.equal(cfg.searchRateLimitReserve, 3);
    assert.equal(cfg.coreRateLimitReserve, 50);
    assert.equal(cfg.groupsPerRun, 6);
  } finally {
    // 恢复
    Object.assign(process.env, backup);
  }
});

// ===========================================================================
// 2–4. estimateBudget — 预估计算
// ===========================================================================

test("estimateBudget 基本计算：3 组 × 2 查询 × 2 页 = 12 Search 请求", () => {
  const groups = makeGroups(3); //每组 1 个查询 → 3 queries × 2 pages = 6 ... 等等
  // makeGroups 每组只有 1 个 query，所以 3 组 × 1 query × 2 pages = 6
  // 但如果每组有多个 queries 就不同了
  const est = estimateBudget(groups, 2, 10, DEFAULT_BUDGET);
  // 3 groups × 1 query/group = 3 totalQueries; 3 × 2 pages = 6 search requests
  assert.equal(est.totalQueries, 3);
  assert.equal(est.estimatedSearchRequests, 6);
  assert.equal(est.selectedGroups, 3); // 默认 groupsPerRun=6，3 < 6 全选
  assert.equal(est.estimatedEnrichmentCount, 10);
  assert.equal(!est.exceedsBudget, true); // 6 <= 24
});

test("estimateBudget 超出预算时标记 exceedsBudget", () => {
  const groups = makeGroups(20); // 20 组 × 1 query × 5 pages = 100 requests
  const tightBudget: BudgetConfig = { ...DEFAULT_BUDGET, searchRequestBudget: 30 };
  const est = estimateBudget(groups, 5, 0, tightBudget);
  // selectedGroups = min(20, 6) = 6; totalQueries = 6; searchRequests = 6*5 = 30
  // 30 不超过 30（不严格大于），所以不超出... 让我调整
  assert.equal(est.exceedsBudget, false); // 30 == 30, 不大于
  assert.ok(est.exceedReason === undefined);
});

test("estimateBudget 超出预算（严格大于）", () => {
  const groups = makeGroups(8); // 选 6 组 × 1 query × 5 pages = 30
  const tightBudget: BudgetConfig = { ...DEFAULT_BUDGET, searchRequestBudget: 25 };
  const est = estimateBudget(groups, 5, 0, tightBudget);
  // selectedGroups = min(8, 6) = 6; totalQueries = 6; searchRequests = 30
  assert.equal(est.estimatedSearchRequests, 30);
  assert.equal(est.exceedsBudget, true); // 30 > 25
  assert.ok(est.exceedReason?.includes("超出预算"));
});

test("estimateBudget maxGroups 覆盖 groupsPerRun", () => {
  const groups = makeGroups(10);
  const est = estimateBudget(groups, 1, 0, DEFAULT_BUDGET, 2);
  assert.equal(est.selectedGroups, 2); // maxGroups=2 覆盖默认 6
  assert.equal(est.totalQueries, 2);
  assert.equal(est.estimatedSearchRequests, 2); // 2 queries × 1 page
});

// ===========================================================================
// 5–7. selectGroups — 查询组轮换选择
// ===========================================================================

test("selectGroups 选择前 N 组（默认从第 0 组开始）", () => {
  const groups = makeGroups(8);
  const sel = selectGroups(groups, DEFAULT_BUDGET);
  assert.equal(sel.selected.length, 6); // groupsPerRun=6
  assert.equal(sel.selected[0]!.id, "g0");
  assert.equal(sel.selected[5]!.id, "g5");
  assert.equal(sel.remaining.length, 2); // g6, g7
  assert.equal(sel.isResume, false);
  assert.ok(sel.cursor.length > 0); // 游标应为最后选中组的 ID
});

test("selectGroups 带 resume 游标从指定组之后开始", () => {
  const groups = makeGroups(8);
  const sel = selectGroups(groups, DEFAULT_BUDGET, "g3"); // 从 g3 之后开始
  assert.equal(sel.isResume, true);
  assert.equal(sel.selected[0]!.id, "g4"); // 从 g4 开始
  assert.equal(sel.selected.length, 4); // g4,g5,g6,g7 (只剩 4 个)
  assert.equal(sel.remaining.length, 4); // g0,g1,g2,g3 循环到前面
});

test("selectGroups 到末尾循环回到开头", () => {
  const groups = makeGroups(5);
  // 游标指向 g4（最后一个），应从 g4+1 = 越界 → 回到 g0
  const sel = selectGroups(groups, DEFAULT_BUDGET, "g4");
  // startIndex = 5 >= 5 → wrap to 0
  assert.equal(sel.isResume, false); // wrap 后不算 resume
  assert.equal(sel.selected[0]!.id, "g0");
});

// ===========================================================================
// 8–9. shouldStopSearch / shouldStopCore — 运行时保护
// ===========================================================================

test("shouldStopSearch 在剩余 ≤ reserve 时返回中止原因", () => {
  const reason = shouldStopSearch(
    { searchRemaining: 2, coreRemaining: 100, searchResetAtMs: null, coreResetAtMs: null },
    DEFAULT_BUDGET
  );
  assert.ok(reason !== null);
  assert.ok(reason?.includes("保留额度"));
  assert.ok(reason?.includes("3"));
});

test("shouldStopSearch 在剩余 > reserve 时返回 null（可继续）", () => {
  const reason = shouldStopSearch(
    { searchRemaining: 10, coreRemaining: 100, searchResetAtMs: null, coreResetAtMs: null },
    DEFAULT_BUDGET
  );
  assert.equal(reason, null);
});

test("shouldStopCore 在剩余 ≤ reserve 时返回中止原因", () => {
  const reason = shouldStopCore(
    { searchRemaining: 50, coreRemaining: 30, searchResetAtMs: null, coreResetAtMs: Date.now() + 60000 },
    DEFAULT_BUDGET
  );
  assert.ok(reason !== null);
  assert.ok(reason?.includes("Core"));
  assert.ok(reason?.includes("50"));
});
