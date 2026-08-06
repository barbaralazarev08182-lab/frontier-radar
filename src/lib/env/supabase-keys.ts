/**
 * Supabase 新旧密钥统一读取（阶段 1.7）。
 *
 * 规则：
 *  - 浏览器 / 公开只读查询优先使用 Publishable Key（NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY）；
 *  - 服务端采集写入优先使用 Secret Key（SUPABASE_SECRET_KEY）；
 *  - 新变量不存在时才回退旧变量（NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY）；
 *  - Secret Key 与 service role key 永远不得进入客户端。
 *
 * 统一读取函数，避免各模块自行判断变量。
 */

/** 公开只读 Key（Publishable Key 优先，回退 anon key）。 */
export function resolvePublishableKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    undefined
  );
}

/** 服务端采集写入 Key（Secret Key 优先，回退 service role key）。 */
export function resolveSecretKey(): string | undefined {
  return (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    undefined
  );
}

/** Supabase URL（旧变量名保持不变）。 */
export function resolveSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || undefined;
}

/** 只读访问是否已配置（URL + 任一公开 Key）。 */
export function isSupabaseReadConfigured(): boolean {
  return Boolean(resolveSupabaseUrl() && resolvePublishableKey());
}

/** 服务端写入是否已配置（URL + 任一服务端密钥）。 */
export function isSupabaseWriteConfigured(): boolean {
  return Boolean(resolveSupabaseUrl() && resolveSecretKey());
}
