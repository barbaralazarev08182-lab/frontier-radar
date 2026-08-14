import { expect, test } from "@playwright/test";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

function route(path: string): string {
  return new URL(path, baseUrl).toString();
}

test("Personal Radar renders an evidence-qualified truthful profile", async ({ page }) => {
  const now = "2026-08-14T08:00:00.000Z";
  await page.route("**/api/personal-radar", async (request) => {
    await request.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "evidence_qualified",
        modelVersion: "interest-keyword-v1",
        eventCount: 12,
        distinctItemCount: 6,
        evidenceDimensionCount: 4,
        lastEventAt: now,
        globalConfidence: 0.5,
        generatedAt: now,
        dimensions: [
          {
            key: "ai_agents",
            label: "AI AGENTS",
            priorWeight: 0.95,
            behaviorSignal: 8.4,
            evidenceCount: 6,
            positiveEvidence: 6,
            negativeEvidence: 0,
            lastEvidenceAt: now,
            freshness: 1,
            confidence: 0.333,
          },
          {
            key: "ai_ui_interaction",
            label: "AI UI / INTERACTION",
            priorWeight: 0.98,
            behaviorSignal: 6.2,
            evidenceCount: 5,
            positiveEvidence: 5,
            negativeEvidence: 0,
            lastEvidenceAt: now,
            freshness: 1,
            confidence: 0.294,
          },
          {
            key: "developer_tools",
            label: "DEVELOPER TOOLS",
            priorWeight: 0.9,
            behaviorSignal: 4.1,
            evidenceCount: 4,
            positiveEvidence: 4,
            negativeEvidence: 0,
            lastEvidenceAt: now,
            freshness: 1,
            confidence: 0.25,
          },
          {
            key: "speaker_recognition",
            label: "SPEAKER RECOGNITION",
            priorWeight: 0.45,
            behaviorSignal: -1.5,
            evidenceCount: 2,
            positiveEvidence: 1,
            negativeEvidence: 1,
            lastEvidenceAt: now,
            freshness: 1,
            confidence: 0.143,
          },
        ],
      }),
    });
  });

  await page.goto(route("/radar"));

  await expect(page.getByText("06 PERSONAL RADAR · INTEREST FRONTIER", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "YOUR CURRENT INTEREST FRONTIER." })).toBeVisible();
  await expect(page.getByText("F5 · CURRENT INTEREST EVIDENCE", { exact: true })).toBeVisible();
  await expect(page.getByText("F8 · STRENGTH × CONFIDENCE", { exact: true })).toBeVisible();
  await expect(page.getByText("INTERPRETABLE PROFILE · NOT A SEMANTIC EMBEDDING MAP", { exact: true })).toBeVisible();

  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(overflow.scrollWidth - overflow.clientWidth).toBeLessThanOrEqual(1);

  await page.screenshot({ path: "artifacts/integration-qa/08-personal-radar.png", fullPage: true });
});
