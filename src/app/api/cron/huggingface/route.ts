import { NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron/auth";
import { runHuggingFaceCollection } from "@/lib/jobs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Hugging Face 每日小批量采集 Cron（允许匿名访问）。
 * 网络超时等写入 failed 状态；不删除已有数据。
 */
export async function GET(request: Request) {
  const auth = checkCronAuth(request);
  if (!auth.authorized) return auth.response;

  const result = await runHuggingFaceCollection();
  const status = result.status === "failed" ? 500 : 200;
  return NextResponse.json(result, { status });
}
