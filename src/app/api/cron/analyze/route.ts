import { NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron/auth";
import { runAiAnalysis } from "@/lib/jobs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * AI 分析每日小批量 Cron（最多 10 条）。
 * 只分析无成功结果或输入变化的条目；单条失败不终止批次；
 * 更新 score_components 与 items.latest_score。
 * 缺少 TokenHub 配置时返回 200 + skipped。
 */
export async function GET(request: Request) {
  const auth = checkCronAuth(request);
  if (!auth.authorized) return auth.response;

  const result = await runAiAnalysis();
  const status = result.status === "failed" ? 500 : 200;
  return NextResponse.json(result, { status });
}
