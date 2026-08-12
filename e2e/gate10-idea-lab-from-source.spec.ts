import { test, expect } from "@playwright/test";

const SAVED_KEY = "frontier_radar_saved_items_v1";
const IDEAS_KEY = "frontier_radar_ideas_v1";
const targetId = "22222222-2222-4222-8222-222222222222";
const decoyId = "11111111-1111-4111-8111-111111111111";
const missingId = "33333333-3333-4333-8333-333333333333";
const orphanId = "44444444-4444-4444-8444-444444444444";

test.use({ viewport: { width: 1600, height: 960 } });

test("Idea Lab honors requested saved source without silent substitution", async ({ page }) => {
  await page.addInitScript(({ savedKey, ideasKey, target, decoy }) => {
    localStorage.setItem(savedKey, JSON.stringify([
      {
        id: decoy,
        title: "Decoy Saved Signal",
        source: "github",
        contentType: "project",
        summary: "This item is intentionally first in the Saved shelf.",
        score: 91,
        tags: ["decoy"],
        savedAt: "2026-08-12T02:00:00.000Z",
      },
      {
        id: target,
        title: "Requested Project Signal",
        source: "hackernews",
        contentType: "project",
        summary: "This is the source requested by Project Intelligence.",
        score: 84,
        tags: ["handoff"],
        savedAt: "2026-08-12T01:00:00.000Z",
      },
    ]));
    if (!localStorage.getItem(ideasKey)) localStorage.setItem(ideasKey, "[]");
  }, { savedKey: SAVED_KEY, ideasKey: IDEAS_KEY, target: targetId, decoy: decoyId });

  await page.goto(`http://127.0.0.1:3000/idea-lab?from=${targetId}`, { waitUntil: "domcontentloaded" });
  const activeSource = page.locator(".fr-idea-source-card.is-active");
  await expect(activeSource).toContainText("Requested Project Signal");
  await expect(activeSource).not.toContainText("Decoy Saved Signal");
  await expect(page.locator(".fr-idea-source-slip")).toContainText("Requested Project Signal");
  console.log("GATE10_REQUESTED_SAVED_SOURCE=true");
  await page.screenshot({ path: "artifacts/gate10/01-requested-source-pinned.png" });

  await page.goto(`http://127.0.0.1:3000/idea-lab?from=${missingId}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".fr-idea-source-card.is-active")).toHaveCount(0);
  await expect(page.locator('[data-source-missing="true"]')).toBeVisible();
  await expect(page.getByText("SOURCE NOT IN SAVED", { exact: true })).toBeVisible();
  await expect(page.locator(".fr-idea-source-slip")).toHaveCount(0);
  console.log("GATE10_NO_SILENT_SUBSTITUTION=true");
  await page.screenshot({ path: "artifacts/gate10/02-missing-source-not-substituted.png" });

  await page.evaluate(({ ideasKey, sourceId }) => {
    localStorage.setItem(ideasKey, JSON.stringify([
      {
        id: "idea-orphan-gate10",
        sourceItemId: sourceId,
        sourceTitle: "Existing Orphan Direction Source",
        title: "Existing orphan direction",
        note: "Preserve the already accepted orphan-source behavior.",
        status: "shaping",
        createdAt: "2026-08-12T01:00:00.000Z",
        updatedAt: "2026-08-12T03:00:00.000Z",
      },
    ]));
  }, { ideasKey: IDEAS_KEY, sourceId: orphanId });

  await page.goto(`http://127.0.0.1:3000/idea-lab?from=${orphanId}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator('.fr-idea-source-slip[data-orphan="true"]')).toContainText("Existing Orphan Direction Source");
  await expect(page.getByLabel("Idea title")).toHaveValue("Existing orphan direction");
  console.log("GATE10_ORPHAN_BINDING_PRESERVED=true");
  await page.screenshot({ path: "artifacts/gate10/03-orphan-binding-preserved.png" });
});
