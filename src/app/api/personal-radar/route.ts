import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { VISITOR_COOKIE } from "@/lib/personalization/constants";
import { loadPersonalRadarProfile } from "@/lib/personalization/personal-radar";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
    if (!isUuid(visitorId)) {
      return NextResponse.json({ error: "invalid_visitor_id" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const cookieVisitorId = cookieStore.get(VISITOR_COOKIE)?.value;
    if (cookieVisitorId !== visitorId) {
      return NextResponse.json({ error: "visitor_mismatch" }, { status: 403 });
    }

    const profile = await loadPersonalRadarProfile(createAdminClient(), visitorId);
    return NextResponse.json(profile, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "personal_radar_read_failed" }, { status: 500 });
  }
}
