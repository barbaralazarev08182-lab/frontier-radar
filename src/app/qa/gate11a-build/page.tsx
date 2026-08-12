import { resolveTodaySynthesis } from "@/app/today/actions";
import { POST as postFeedback } from "@/app/api/feedback/route";
import { checkCronAuth } from "@/lib/cron/auth";
import { canWriteRuntimeData } from "@/lib/env/runtime-write-policy";

export const dynamic = "force-static";

const QA_VISITOR_ID = "33333333-3333-4333-8333-333333333333";
const QA_ITEM_ID = "44444444-4444-4444-8444-444444444444";

export default async function Gate11ABuildProbePage() {
  const vercelEnv = process.env.VERCEL_ENV ?? null;
  const writeAllowed = canWriteRuntimeData();

  const feedbackResponse = await postFeedback(
    new Request("https://gate11a.invalid/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        visitorId: QA_VISITOR_ID,
        itemId: QA_ITEM_ID,
        eventType: "interested",
        metadata: { surface: "gate11a-preview-build-probe" },
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
    todayResult = await resolveTodaySynthesis("2099-11-12", [
      {
        id: "gate11a-preview-build-signal-a",
        rank: 1,
        title: "Gate 11A Preview Build Probe",
        summary: "Synthetic signal used only to execute Preview persistence isolation.",
        tags: ["qa", "preview"],
        lane: "core",
        whyNow: "Vercel Preview environment verification",
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

  const result = {
    vercelEnv,
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
  };

  console.log(`GATE11A_BUILD_PROBE ${JSON.stringify(result)}`);

  return (
    <main>
      <h1>Gate 11A Preview Build Probe</h1>
      <pre>{JSON.stringify(result, null, 2)}</pre>
    </main>
  );
}
