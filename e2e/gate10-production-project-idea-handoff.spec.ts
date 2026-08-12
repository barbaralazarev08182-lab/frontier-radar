import { test, expect } from "@playwright/test";

const baseUrl = "https://frontier-radar-eosin.vercel.app";
const savedKey = "frontier_radar_saved_items_v1";
const targetId = "e71d7eb5-f29e-4eeb-b17a-1c55ae21f033";
const targetTitle = "Supply-Wizard; Start Selling Data with an Easy Vendor Checklist";

test.use({ viewport: { width: 1600, height: 960 } });

test("Project Intelligence CTA pins the matching saved source in Idea Lab", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.addInitScript(({ key, target, title }) => {
    localStorage.setItem(key, JSON.stringify([
      {
        id: "11111111-1111-4111-8111-111111111111",
        title: "Production QA Decoy Saved Signal",
        source: "github",
        contentType: "project",
        summary: "Intentionally first in Saved order.",
        score: 92,
        tags: ["qa-decoy"],
        savedAt: "2026-08-12T06:30:00.000Z",
      },
      {
        id: target,
        title,
        source: "hackernews",
        contentType: "project",
        summary: "Gate 10 production handoff target.",
        score: 84,
        tags: ["handoff"],
        savedAt: "2026-08-12T06:00:00.000Z",
      },
    ]));
    localStorage.setItem("frontier_radar_ideas_v1", "[]");
  }, { key: savedKey, target: targetId, title: targetTitle });

  await page.goto(`${baseUrl}/project/${targetId}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await expect(page.locator("h1.pi-title")).toHaveText(targetTitle);
  await page.screenshot({ path: "artifacts/gate10-production/01-project-before-handoff.png" });

  const ideaLab = page.locator(`a.pi-cta.secondary[href="/idea-lab?from=${targetId}"]`);
  await expect(ideaLab).toHaveCount(1);
  await ideaLab.click();
  await expect(page).toHaveURL(`${baseUrl}/idea-lab?from=${targetId}`);

  const activeSource = page.locator(".fr-idea-source-card.is-active");
  await expect(activeSource).toContainText(targetTitle);
  await expect(activeSource).not.toContainText("Production QA Decoy Saved Signal");
  await expect(page.locator(".fr-idea-source-slip")).toContainText(targetTitle);
  console.log("GATE10_PRODUCTION_CTA_BINDING=true");
  await page.screenshot({ path: "artifacts/gate10-production/02-idea-lab-target-pinned.png" });

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator(".fr-idea-source-card.is-active")).toContainText(targetTitle);
  await expect(page.locator(".fr-idea-source-slip")).toContainText(targetTitle);
  console.log("GATE10_PRODUCTION_RELOAD_PERSISTENCE=true");
  console.log(`GATE10_BROWSER_ERRORS=${errors.length}`);
  expect(errors).toEqual([]);
  await page.screenshot({ path: "artifacts/gate10-production/03-idea-lab-reloaded.png" });
});
