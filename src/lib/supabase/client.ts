import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env/public";

/**
 * 浏览器端 Supabase 客户端工厂（Client Components 使用）。
 * 只使用公开 Publishable Key（回退 anon key），绝不包含服务端密钥。
 * 仅在调用工厂时校验环境变量；缺配置时给出清晰错误，不影响构建。
 */
export function createClient() {
  if (!publicEnv.supabaseUrl || !publicEnv.supabaseKey) {
    throw new Error(
      "Supabase 浏览器端未配置：请设置 NEXT_PUBLIC_SUPABASE_URL 与 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY（或旧变量 NEXT_PUBLIC_SUPABASE_ANON_KEY）（.env.local）"
    );
  }
  return createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseKey);
}
