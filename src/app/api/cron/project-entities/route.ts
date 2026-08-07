import { NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron/auth";
import { materializeRecentProjectEntities } from "@/lib/feed/project-entity-materializer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 180;

export async function GET(request: Request) {
  const auth = checkCronAuth(request);
  if (!auth.authorized) return auth.response;

  const startedAt = Date.now();
  const parsedLimit = Number(process.env.PROJECT_ENTITY_BATCH_SIZE);
  const batchSize = Number.isFinite(parsedLimit)
    ? Math.max(40, Math.min(300, Math.floor(parsedLimit)))
    : 180;

  try {
    const result = await materializeRecentProjectEntities(batchSize);
    return NextResponse.json({
      job: "project-entities",
      status: result.conflictsSkipped > 0 ? "partial" : "succeeded",
      resolution_version: "runtime-cluster-v1",
      ...result,
      duration_ms: Date.now() - startedAt,
    });
  } catch (err) {
    return NextResponse.json(
      {
        job: "project-entities",
        status: "failed",
        message: err instanceof Error ? err.message : String(err),
        duration_ms: Date.now() - startedAt,
      },
      { status: 500 }
    );
  }
}
