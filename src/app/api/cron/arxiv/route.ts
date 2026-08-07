import { NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { collectArxiv } from "@/lib/collectors/arxiv/collector";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * arXiv 每日小批量采集 Cron（无需 Token）。
 * 生产环境先保持小批量，确保 Hobby 部署稳定完成。
 */
export async function GET(request: Request) {
  const auth = checkCronAuth(request);
  if (!auth.authorized) return auth.response;

  try {
    const supabase = createAdminClient();
    const result = await collectArxiv(supabase, {
      sourceId: "arxiv",
      maxResultsPerQuery: 10,
      maxGroups: 1,
      discoveryDays: Number(process.env.ARXIV_DISCOVERY_DAYS) || 7,
      dryRun: false,
      arxivClientOpts: {
        baseUrl: process.env.ARXIV_API_BASE_URL ?? "https://export.arxiv.org/api/query",
        timeoutMs: Number(process.env.ARXIV_REQUEST_TIMEOUT_MS) || 20_000,
        maxRetries: Number(process.env.ARXIV_MAX_RETRIES) || 2,
        requestIntervalMs: Number(process.env.ARXIV_REQUEST_INTERVAL_MS) || 3000,
      },
    });

    const status = result.status === "failed" ? 500 : 200;
    return NextResponse.json(result, { status });
  } catch (err) {
    return NextResponse.json(
      {
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
