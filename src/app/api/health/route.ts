import { NextResponse } from "next/server";
import { isSupabaseConfigured, isAiConfigured, aiProviderSlug } from "@/lib/env/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health
 * 返回应用状态、运行环境、Supabase / AI Provider 是否已配置。
 * 安全：不返回任何密钥值，只返回布尔配置状态。
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV ?? "development",
      nodeVersion: process.version,
      runtime: "nodejs",
      platform: process.platform,
    },
    services: {
      supabase: {
        configured: isSupabaseConfigured,
      },
      ai: {
        provider: aiProviderSlug,
        configured: isAiConfigured,
      },
    },
  });
}
