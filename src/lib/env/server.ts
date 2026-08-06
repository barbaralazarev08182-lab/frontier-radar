/**
 * 服务端环境变量（含密钥，仅服务端可访问）。
 *
 * 设计原则：
 *  - 不在模块顶层对密钥取值，保证缺配置时 build 不崩。
 *  - 读取密钥统一走 requireSecret()，缺失时抛出清晰错误。
 *  - 这些变量绝不输出到客户端、日志、API 响应或快照。
 */

/** 读取一个必需的服务端密钥；缺失抛清晰错误 */
export function requireSecret(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `缺少必需的服务端环境变量 ${name}。请在 .env.local 或部署平台环境变量中配置。`
    );
  }
  return v;
}

/** 读取可选环境变量，缺省返回 undefined */
export function optionalEnv(name: string): string | undefined {
  const v = process.env[name];
  return v === "" ? undefined : v;
}

export const serverEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  /** 兼容新（publishable）/ 旧（anon）公开只读 Key */
  supabaseAnonKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  // 密钥不直接读取，通过 requireSecret / supabase-keys 在使用处显式调用：
  //   SUPABASE_SECRET_KEY（新） / SUPABASE_SERVICE_ROLE_KEY（旧）
  collectionTimezone: optionalEnv("COLLECTION_TIMEZONE") ?? "Asia/Shanghai",
  aiDailyTopN: Number(optionalEnv("AI_DAILY_TOP_N") ?? "30"),
} as const;

/** Supabase 是否已配置（服务端判断，供 health 使用；Publishable/anon 均可） */
export const isSupabaseConfigured = Boolean(
  serverEnv.supabaseUrl && serverEnv.supabaseAnonKey
);

/** AI Provider 是否已配置（需 base url + key + model 齐全） */
export const isAiConfigured = Boolean(
  optionalEnv("AI_BASE_URL") && optionalEnv("AI_API_KEY") && optionalEnv("AI_MODEL")
);

/** AI Provider 标识（默认值 tencent，见 .env.example） */
export const aiProviderSlug = optionalEnv("AI_PROVIDER") ?? "tencent";

/** AI 分析与评分配置（阶段 1.5） */
export const aiConfig = {
  provider: aiProviderSlug,
  baseUrl: optionalEnv("AI_BASE_URL"),
  model: optionalEnv("AI_MODEL"),
  requestTimeoutMs: Number(optionalEnv("AI_REQUEST_TIMEOUT_MS") ?? "60000"),
  maxRetries: Number(optionalEnv("AI_MAX_RETRIES") ?? "2"),
  batchSize: Number(optionalEnv("AI_ANALYSIS_BATCH_SIZE") ?? "10"),
  concurrency: Number(optionalEnv("AI_ANALYSIS_CONCURRENCY") ?? "1"),
  maxInputChars: Number(optionalEnv("AI_MAX_INPUT_CHARS") ?? "12000"),
  temperature: Number(optionalEnv("AI_TEMPERATURE") ?? "0.2"),
} as const;
