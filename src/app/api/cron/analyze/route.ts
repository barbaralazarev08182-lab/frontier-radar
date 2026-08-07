import { NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron/auth";
import { runAiAnalysis } from "@/lib/jobs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 180;

/**
 * AI 分析每日小批量 Cron。
 * 生产环境先按 1 条/次运行，验证 DeepSeek → Supabase 全链路稳定后再放大。
 * 只分析无成功结果或输入变化的条目；单条失败不终止批次；
 * 更新 score_components 与 items.latest_score。
 */
export async function GET(request: Request) {
  const auth = checkCronAuth(request);
  if (!auth.authorized) return auth.response;

  const result = await runAiAnalysis({
    env: { AI_ANALYSIS_BATCH_SIZE: "1" },
  });
  const status = result.status === "failed" ? 500 : 200;
  return NextResponse.json(result, { status });
}
