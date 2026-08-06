/**
 * 公开环境变量（仅 NEXT_PUBLIC_*）。
 * 模块加载时读取；缺失不抛错，由调用方判断是否可用（保证 build 不崩）。
 * 这里绝不允许出现任何密钥（secret / service role / AI apiKey 等）。
 */
import { resolvePublishableKey, resolveSupabaseUrl } from "./supabase-keys";

export const publicEnv = {
  supabaseUrl: resolveSupabaseUrl(),
  /** Publishable Key 优先，回退 anon key（均为公开只读用途） */
  supabaseKey: resolvePublishableKey(),
  appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",
} as const;

/** Supabase 是否已在公开侧配置（供 UI / health 检查使用） */
export const isSupabasePublicConfigured = Boolean(
  publicEnv.supabaseUrl && publicEnv.supabaseKey
);
