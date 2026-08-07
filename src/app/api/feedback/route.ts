import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { VISITOR_COOKIE, VISITOR_MAX_AGE_SECONDS } from "@/lib/personalization/constants";
import { rebuildUserInterestVector } from "@/lib/personalization/profile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EVENT_TYPES = new Set([
  "interested",
  "not_interested",
  "open_source",
  "open_detail",
  "dwell",
]);

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const visitorId = body.visitorId;
    const itemId = body.itemId;
    const eventType = body.eventType;
    const dwellMs = body.dwellMs;

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

    const supabase = createAdminClient();
    const { error } = await supabase.from("user_events").insert({
      visitor_id: visitorId,
      item_id: itemId,
      event_type: eventType,
      dwell_ms: safeDwellMs,
      metadata: {},
    });

    if (error) {
      return NextResponse.json({ error: "feedback_write_failed" }, { status: 500 });
    }

    // 0012 尚未执行时这里会失败，但不影响反馈本身；执行迁移后自动开始维护兴趣向量。
    await rebuildUserInterestVector(supabase, visitorId).catch(() => null);

    const response = NextResponse.json({ ok: true });
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      path: "/",
      sameSite: "lax",
      maxAge: VISITOR_MAX_AGE_SECONDS,
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
}
