import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { serverEnv } from "@/lib/env/server";

/**
 * 服务端 Supabase 客户端工厂（Server Components / Route Handlers 使用）。
 * 使用公开只读 Key（Publishable 优先，回退 anon）+ cookie 会话；不读取服务端密钥。
 * 仅在调用工厂时校验环境变量；缺配置时给出清晰错误，不影响构建。
 */
export async function createClient() {
  if (!serverEnv.supabaseUrl || !serverEnv.supabaseAnonKey) {
    throw new Error(
      "Supabase 服务端未配置：请设置 NEXT_PUBLIC_SUPABASE_URL 与 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY（或旧变量 NEXT_PUBLIC_SUPABASE_ANON_KEY）（.env.local）"
    );
  }

  const cookieStore = await cookies();

  return createServerClient(serverEnv.supabaseUrl, serverEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // 从 Server Component 调用时忽略 set：会话刷新由后续 middleware 处理。
        }
      },
    },
  });
}
