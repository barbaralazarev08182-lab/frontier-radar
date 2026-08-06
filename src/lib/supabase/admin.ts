/**
 * Supabase 管理客户端（Secret Key / service role，仅服务端脚本与 Cron Route 使用）。
 *
 * 用于采集器等后台任务写入数据，绕过 RLS。绝不暴露给浏览器 / Client Component。
 * 密钥读取：优先 SUPABASE_SECRET_KEY，回退 SUPABASE_SERVICE_ROLE_KEY。
 * 缺配置时抛出清晰错误（由调用方捕获，dry-run 不调用本工厂）。
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireSecret, optionalEnv } from "@/lib/env/server";
import { resolveSecretKey, resolveSupabaseUrl } from "@/lib/env/supabase-keys";

export function createAdminClient(): SupabaseClient {
  const url = optionalEnv("NEXT_PUBLIC_SUPABASE_URL") ?? resolveSupabaseUrl();
  if (!url) {
    throw new Error(
      "缺少 NEXT_PUBLIC_SUPABASE_URL：真实采集需要 Supabase 配置（dry-run 可无此配置）。"
    );
  }
  // 优先新变量 SUPABASE_SECRET_KEY，回退旧变量 SUPABASE_SERVICE_ROLE_KEY
  const secretKey = resolveSecretKey() ?? requireSecret("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
