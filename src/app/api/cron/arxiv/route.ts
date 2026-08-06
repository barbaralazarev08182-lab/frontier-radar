import { NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron/auth";
import { runArxivCollection } from "@/lib/jobs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * arXiv 每日小批量采集 Cron（无需 Token）。
 * 最多 4 个轮换查询组，每组 20 条；部分查询失败返回 partial。
 */
export async function GET(request: Request) {
  const auth = checkCronAuth(request);
  if (!auth.authorized) return auth.response;

  const result = await runArxivCollection();
  const status = result.status === "failed" ? 500 : 200;
  return NextResponse.json(result, { status });
}
