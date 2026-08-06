/**
 * Feed Provider 工厂（阶段 1.6）。
 *
 * 页面不关心数据来自 fixture 还是 Supabase，统一调用 getFeed(query)。
 * 数据模式由 FRONTIER_DATA_MODE 控制：
 *   - fixture：固定演示数据，不访问数据库，页面带"演示数据"标记；
 *   - supabase：查询真实数据库；未配置时抛 FeedUnconfiguredError，
 *     页面显示清晰错误，不悄悄回退 fixture。
 * 生产环境（NODE_ENV=production）未显式配置时默认 supabase，禁止默认 fixture。
 */

import { FixtureFeedProvider } from "./fixture-provider";
import { SupabaseFeedProvider } from "./supabase-provider";

export type FeedDataMode = "fixture" | "supabase";

export class FeedUnconfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeedUnconfiguredError";
  }
}

export class FeedQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeedQueryError";
  }
}

export interface FeedProvider {
  readonly mode: FeedDataMode;
  getFeed(query: import("./types").FeedQuery): Promise<import("./types").FeedResult>;
}

/** 解析数据模式；未显式配置时开发环境默认 fixture，生产默认 supabase。 */
export function resolveDataMode(
  envValue: string | undefined,
  isProduction: boolean
): FeedDataMode {
  const v = envValue?.trim().toLowerCase();
  if (v === "fixture") return "fixture";
  if (v === "supabase") return "supabase";
  return isProduction ? "supabase" : "fixture";
}

/** 当前数据模式（供页面显示标记与 doctor 检查）。 */
export function getDataMode(): FeedDataMode {
  return resolveDataMode(
    process.env.FRONTIER_DATA_MODE,
    process.env.NODE_ENV === "production"
  );
}

/** 获取 Feed Provider（每次调用返回新实例，保持无状态）。 */
export function getFeedProvider(): FeedProvider {
  const mode = getDataMode();
  return mode === "fixture" ? new FixtureFeedProvider() : new SupabaseFeedProvider();
}
