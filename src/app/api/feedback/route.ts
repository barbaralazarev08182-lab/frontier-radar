import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canWriteRuntimeData } from "@/lib/env/runtime-write-policy";
import { VISITOR_COOKIE, VISITOR_MAX_AGE_SECONDS } from "@/lib/personalization/constants";
import { rebuildUserInterestVector } from "@/lib/personalization/profile";
import { rebuildUserSemanticProfile } from "@/lib/personalization/semantic-profile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EVENT_TYPES = new Set([
  "interested",
  "not_interested",
  "open_source",
  "open_detail",
  "dwell",
]);

const METADATA_KEYS = new Set([
  "rank",
  "lane",
  "surface",
  "algorithm_variant",
  "source",
  "content_type",
  "measurement",
  "session_id",
]);

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function sanitizeMetadata(value: unknown): Record<string, string | number | boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  const output: Record<string, string | number | boolean> = {};

  for (const [key, raw] of Object.entries(input)) {
    if (!METADATA_KEYS.has(key)) continue;
    if (typeof raw === "string") {
      output[key] = raw.slice(0, 120);
    } else if (typeof raw === "number" && Number.isFinite(raw)) {
      output[key] = Math.max(-1_000_000, Math.min(1_000_000, raw));
    } else if (typeof raw === "boolean") {
      output[key] = raw;
    }
  }
  return output;
}

function feedbackResponse(visitorId: string, persisted: boolean): NextResponse {
  const response = NextResponse.json({ ok: true, persisted });
  response.cookies.set(VISITOR_COOKIE, visitorId, {
    path: "/",
    sameSite: "lax",
    maxAge: VISITOR_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const visitorId = body.visitorId;
    const itemId = body.itemId;
    const eventType = body.eventType;
    const dwellMs = body.dwellMs;
    const metadata = sanitizeMetadata(body.metadata);

    if (!isUuid(visitorId) || !isUuid(itemId)) {
      return NextResponse.json({ error: "invalid_id" }, { status: 400 });
    }
    if (typeof eventType !== "string" || !EVENT_TYPES.has(eventType)) {
      return NextResponse.json({ error: "invalid_event_type" }, { status: 400 });
    }

    let safeDwellMs: number | null = null;
    if (eventType === "dwell") {
      if (typeof dwellMs !== "number" || !Number.isFinite(dwellMs)) {
        return NextResponse.json({ error: "invalid_dwell_ms" }, { status: 400 });
      }
      safeDwellMs = Math.max(0, Math.min(3_600_000, Math.round(dwellMs)));
    }

    // Preview/development deployments may exercise the real UI and read the
    // production feed, but their QA behavior must not train the production
    // personalization profile.
    if (!canWriteRuntimeData()) {
      return feedbackResponse(visitorId, false);
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("user_events").insert({
      visitor_id: visitorId,
      item_id: itemId,
      event_type: eventType,
      dwell_ms: safeDwellMs,
      metadata,
    });

    if (error) {
      return NextResponse.json({ error: "feedback_write_failed" }, { status: 500 });
    }

    // Dwell 先作为训练/评估信号落库，不为每一次可见停留都重建用户向量；
    // 下一次显式反馈会把此前 dwell 一并吸收到画像中。
    if (eventType !== "dwell") {
      await Promise.allSettled([
        rebuildUserInterestVector(supabase, visitorId),
        rebuildUserSemanticProfile(supabase, visitorId),
      ]);
    }

    return feedbackResponse(visitorId, true);
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
}
