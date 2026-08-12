import { test } from "node:test";
import assert from "node:assert/strict";
import { POST } from "@/app/api/feedback/route";

test("Vercel Preview accepts feedback UX but does not persist it", async () => {
  const previous = process.env.VERCEL_ENV;
  process.env.VERCEL_ENV = "preview";

  try {
    const request = new Request("http://localhost/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: "11111111-1111-4111-8111-111111111111",
        itemId: "22222222-2222-4222-8222-222222222222",
        eventType: "interested",
        metadata: { surface: "explore" },
      }),
    });

    const response = await POST(request);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, persisted: false });
  } finally {
    if (previous === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previous;
  }
});
