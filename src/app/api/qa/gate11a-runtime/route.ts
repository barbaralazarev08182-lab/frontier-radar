import { resolveTodaySynthesis } from "@/app/today/actions";
import { POST as postFeedback } from "@/app/api/feedback/route";
import { checkCronAuth } from "@/lib/cron/auth";
import { canWriteRuntimeData } from "@/lib/env/runtime-write-policy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const QA_VISITOR_ID = "11111111-1111-4111-8111-111111111111";
const QA_ITEM_ID = "22222222-2222-4222-8222-222222222222";

export async function GET() {
  // Temporary Gate 11A probe. It must never be callable in Production or local
  // development, and will be deleted immediately after the runtime check.
  if (process.env.VERCEL_ENV !== "preview") {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const writeAllowed = canWriteRuntimeData();

  const feedbackResponse = await postFeedback(
    new Request("https://gate11a.invalid/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        visitorId: QA_VISITOR_ID,
        itemId: QA_ITEM_ID,
        eventType: "interested",
        metadata: { surface: "gate11a-preview-runtime-probe" },
      }),
    })
  );
  const feedbackBody = await feedbackResponse.json();

  const cron = checkCronAuth(
    new Request("https://gate11a.invalid/api/cron/github", {
      headers: { authorization: "Bearer deliberately-wrong-preview-token" },
    })
  );
  const cronBody = cron.response ? await cron.response.json() : null;

  // Force the Today action through its missing-AI failure persistence branch
  // without paying for a model call. The production DB lookup still occurs;
  // Preview must skip the failure upsert because writeAllowed is false.
  const previousAi = {
    baseUrl: process.env.AI_BASE_URL,
    apiKey: process.env.AI_API_KEY,
    model: process.env.AI_MODEL,
  };

  let todayResult: Awaited<ReturnType<typeof resolveTodaySynthesis>> = null;
  try {
    delete process.env.AI_BASE_URL;
    delete process.env.AI_API_KEY;
    delete process.env.AI_MODEL;
    todayResult = await resolveTodaySynthesis("2099-11-11", [
      {
        id: "gate11a-preview-signal-a",
        rank: 1,
        title: "Gate 11A Preview Probe",
        summary: "Synthetic signal used only to exercise Preview persistence isolation.",
        tags: ["qa", "preview"],
        lane: "core",
        whyNow: "Runtime verification",
        score: 1,
      },
    ]);
  } finally {
    if (previousAi.baseUrl === undefined) delete process.env.AI_BASE_URL;
    else process.env.AI_BASE_URL = previousAi.baseUrl;
    if (previousAi.apiKey === undefined) delete process.env.AI_API_KEY;
    else process.env.AI_API_KEY = previousAi.apiKey;
    if (previousAi.model === undefined) delete process.env.AI_MODEL;
    else process.env.AI_MODEL = previousAi.model;
  }

  return Response.json({
    vercelEnv: process.env.VERCEL_ENV ?? null,
    writeAllowed,
    feedback: {
      status: feedbackResponse.status,
      body: feedbackBody,
    },
    cron: {
      authorized: cron.authorized,
      status: cron.response?.status ?? 200,
      body: cronBody,
    },
    today: {
      returnedSnapshot: Boolean(todayResult),
      forcedBranch: "missing_ai_env",
    },
  });
}
