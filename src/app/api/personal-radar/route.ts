import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { VISITOR_COOKIE, VISITOR_MAX_AGE_SECONDS } from "@/lib/personalization/constants";
import { loadPersonalRadarProfile } from "@/lib/personalization/personal-radar";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function profileResponse(profile: Awaited<ReturnType<typeof loadPersonalRadarProfile>>, bindVisitorId?: string) {
  const response = NextResponse.json(profile, {
    headers: { "Cache-Control": "private, no-store" },
  });

  if (bindVisitorId) {
    response.cookies.set(VISITOR_COOKIE, bindVisitorId, {
      path: "/",
      sameSite: "lax",
      maxAge: VISITOR_MAX_AGE_SECONDS,
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
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
    const supabase = createAdminClient();

    if (cookieVisitorId && cookieVisitorId !== visitorId) {
      return NextResponse.json({ error: "visitor_mismatch" }, { status: 403 });
    }

    if (!cookieVisitorId) {
      const { data: existingEvents, error: eventLookupError } = await supabase
        .from("user_events")
        .select("item_id")
        .eq("visitor_id", visitorId)
        .limit(1);

      if (eventLookupError) throw eventLookupError;
      if ((existingEvents ?? []).length > 0) {
        return NextResponse.json({ error: "visitor_cookie_required" }, { status: 403 });
      }

      const coldStartProfile = await loadPersonalRadarProfile(supabase, visitorId);
      return profileResponse(coldStartProfile, visitorId);
    }

    const profile = await loadPersonalRadarProfile(supabase, visitorId);
    return profileResponse(profile);
  } catch {
    return NextResponse.json({ error: "personal_radar_read_failed" }, { status: 500 });
  }
}
