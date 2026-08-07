import { NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeBasicScore } from "@/lib/scoring/basic-score";
import type { ItemAnalysisResult } from "@/lib/ai/types";
import {
  upsertBasicScore,
  updateLatestScore,
} from "@/lib/db/repositories/score-components";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 180;

interface FeedScoreRow {
  item_id: string;
  source_slug: string;
  content_type: string;
  title: string;
  description: string | null;
  published_at: string | null;
  updated_at: string | null;
  source_tags: unknown;
  metrics: Record<string, unknown> | null;
  analysis_result: Record<string, unknown> | null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function validAiResult(value: Record<string, unknown> | null): ItemAnalysisResult | null {
  if (!value) return null;
  if (
    typeof value.noveltyScore !== "number" ||
    typeof value.practicalValueScore !== "number" ||
    typeof value.researchValueScore !== "number" ||
    typeof value.confidence !== "number" ||
    !Array.isArray(value.tags) ||
    !Array.isArray(value.possibleUses)
  ) {
    return null;
  }
  return value as unknown as ItemAnalysisResult;
}

async function mapLimit<T>(
  values: T[],
  limit: number,
  worker: (value: T) => Promise<void>
): Promise<void> {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor++;
      await worker(values[index]!);
    }
  });
  await Promise.all(runners);
}

/**
 * 每日轻量重算最近项目的 Discovery Score。
 * 不调用 AI，只复用已缓存的 analysis_result + 最新指标，因此成本基本是数据库读写。
 */
export async function GET(request: Request) {
  const auth = checkCronAuth(request);
  if (!auth.authorized) return auth.response;

  const startedAt = Date.now();
  const parsedLimit = Number(process.env.RESCORE_BATCH_SIZE);
  const batchSize = Number.isFinite(parsedLimit)
    ? Math.max(10, Math.min(80, Math.floor(parsedLimit)))
    : 40;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("frontier_feed_v1")
      .select(
        "item_id,source_slug,content_type,title,description,published_at,updated_at,source_tags,metrics,analysis_result"
      )
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(batchSize);

    if (error) throw new Error(`读取待重算项目失败: ${error.message}`);
    const rows = (data ?? []) as unknown as FeedScoreRow[];

    let rescored = 0;
    let errors = 0;
    let firstError: string | null = null;

    await mapLimit(rows, 6, async (row) => {
      try {
        const metrics = row.metrics ?? {};
        const score = computeBasicScore({
          source: row.source_slug,
          itemType: row.content_type,
          title: row.title,
          description: row.description,
          topics: stringArray(row.source_tags),
          createdAtSource: row.published_at,
          pushedAtSource: row.updated_at,
          stars: numberOrNull(metrics.stars),
          forks: numberOrNull(metrics.forks),
          downloads: numberOrNull(metrics.downloads),
          likes: numberOrNull(metrics.likes),
          aiResult: validAiResult(row.analysis_result),
        });

        await upsertBasicScore(supabase, row.item_id, score);
        await updateLatestScore(supabase, row.item_id, score.total);
        rescored++;
      } catch (err) {
        errors++;
        if (!firstError) firstError = err instanceof Error ? err.message : String(err);
      }
    });

    return NextResponse.json({
      job: "rescore",
      status: errors > 0 ? "partial" : "succeeded",
      score_version: "discovery-frontier-v3",
      candidates: rows.length,
      rescored,
      errors,
      message: firstError ?? undefined,
      duration_ms: Date.now() - startedAt,
    });
  } catch (err) {
    return NextResponse.json(
      {
        job: "rescore",
        status: "failed",
        rescored: 0,
        errors: 1,
        message: err instanceof Error ? err.message : String(err),
        duration_ms: Date.now() - startedAt,
      },
      { status: 500 }
    );
  }
}
