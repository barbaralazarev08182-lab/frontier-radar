import { NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { collectHuggingFace } from "@/lib/collectors/huggingface/collector";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 180;

/**
 * Hugging Face 每日项目发现 Cron。
 * 候选池明确偏向可试玩的 Spaces：12 Spaces + 2 Models + 2 Datasets。
 * Spaces 按 trendingScore 发现，并优先拿 Card/README。
 */
export async function GET(request: Request) {
  const auth = checkCronAuth(request);
  if (!auth.authorized) return auth.response;

  try {
    const supabase = createAdminClient();
    const result = await collectHuggingFace(supabase, {
      sourceId: "huggingface",
      limitPerType: 5,
      modelLimit: 2,
      datasetLimit: 2,
      spaceLimit: 12,
      enrichLimit: 6,
      skipCards: false,
      dryRun: false,
      hfClientOpts: {
        baseUrl: process.env.HF_API_BASE_URL ?? "https://huggingface.co",
        token: process.env.HF_TOKEN || undefined,
        timeoutMs: Number(process.env.HF_REQUEST_TIMEOUT_MS) || 15_000,
        maxRetries: Number(process.env.HF_MAX_RETRIES) || 2,
      },
    });

    const discovered =
      result.discovery.models.length +
      result.discovery.datasets.length +
      result.discovery.spaces.length;

    return NextResponse.json(
      {
        job: "huggingface",
        status: result.status === "success" ? "succeeded" : result.status,
        discovered,
        errors: result.stats.errors,
        message: result.error ?? undefined,
        stats: result.stats,
      },
      { status: result.status === "failed" ? 500 : 200 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        job: "huggingface",
        status: "failed",
        errors: 1,
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
