import { NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureSourceId } from "@/lib/db/repositories/sources";
import { getState } from "@/lib/db/repositories/collector-state";
import { GitHubClient } from "@/lib/github/client";
import { GitHubCollector } from "@/lib/collectors/github/collector";
import { SupabaseCollectorSink } from "@/lib/collectors/github/sink";
import { loadBudgetConfig } from "@/lib/collectors/github/budget";
import { enabledGroups } from "@/config/github-discovery";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 180;

/**
 * GitHub 科技项目发现 Cron。
 * 生产环境保持“小而稳定”：2 个主题组 × 每组 1 条查询 × 每条最多 3 个仓库，
 * 跳过 README 富化，理论上单次最多发现约 6 个候选项目。
 */
export async function GET(request: Request) {
  const auth = checkCronAuth(request);
  if (!auth.authorized) return auth.response;

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json({
      job: "github",
      status: "skipped",
      errors: 0,
      message: "缺少 GITHUB_TOKEN，GitHub 采集跳过",
    });
  }

  try {
    const supabase = createAdminClient();
    const sourceId = await ensureSourceId(supabase, "github");
    const sink = new SupabaseCollectorSink(supabase, sourceId);

    const client = new GitHubClient({
      baseUrl: process.env.GITHUB_API_BASE_URL ?? "https://api.github.com",
      apiVersion: process.env.GITHUB_API_VERSION ?? "2026-03-10",
      token,
      timeoutMs: Number(process.env.GITHUB_REQUEST_TIMEOUT_MS) || 10_000,
      maxRetries: Number(process.env.GITHUB_MAX_RETRIES) || 1,
    });

    let resumeCursor: string | null = null;
    try {
      const state = await getState(supabase, sourceId, "__rotation_cursor__");
      const cursor = state?.state_value?.cursor;
      if (typeof cursor === "string" && cursor) resumeCursor = cursor;
    } catch {
      // 读取不到游标则从第一个启用组开始。
    }

    // 每个主题只执行最具代表性的第一条查询，靠轮换覆盖不同兴趣方向。
    const groups = enabledGroups().map((group) => ({
      ...group,
      queries: group.queries.slice(0, 1),
    }));

    const collector = new GitHubCollector({
      client,
      sink,
      sourceId,
      discoveryDays: Number(process.env.GITHUB_DISCOVERY_DAYS) || 10,
      pagesPerQuery: 1,
      perPage: 3,
      enrichLimit: 0,
      minStars: 0,
      readmeMaxBytes: 10_000,
      groups,
      budget: loadBudgetConfig(),
      maxGroups: 2,
      maxSearchRequests: 2,
      skipReadme: true,
      resumeCursor,
      getQueryEtag: (key) => sink.getQueryEtag(key),
      getReadmeEtag: (id) => sink.getReadmeEtag(id),
    });

    const result = await collector.collect();

    return NextResponse.json(
      {
        job: "github",
        status: result.status === "success" ? "succeeded" : result.status,
        discovered: result.discovered ?? result.itemsFetched,
        persisted: (result.inserted ?? 0) + (result.updated ?? 0),
        errors: result.errorCount,
        message: result.errors[0] ?? undefined,
        stats: {
          inserted: result.inserted ?? 0,
          updated: result.updated ?? 0,
          unchanged: result.unchanged ?? 0,
          snapshots: result.snapshots ?? 0,
          requests: result.requests ?? 0,
          duration_ms: result.durationMs,
        },
      },
      { status: result.status === "failed" ? 500 : 200 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        job: "github",
        status: "failed",
        errors: 1,
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
