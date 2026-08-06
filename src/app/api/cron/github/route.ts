import { NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron/auth";
import { runGithubCollection } from "@/lib/jobs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GitHub 每日小批量采集 Cron。
 * 缺少 GITHUB_TOKEN 时返回 200 + skipped；任务失败返回 500。
 */
export async function GET(request: Request) {
  const auth = checkCronAuth(request);
  if (!auth.authorized) return auth.response;

  const result = await runGithubCollection();
  const status = result.status === "failed" ? 500 : 200;
  return NextResponse.json(result, { status });
}
