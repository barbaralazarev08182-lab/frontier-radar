import { expect, test } from "@playwright/test";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

function route(path: string): string {
  return new URL(path, baseUrl).toString();
}

test("Personal Radar preview evidence mode renders the full truthful visual state", async ({ page }) => {
  await page.goto(route("/radar?demo=evidence"));

  await expect(page.getByText("06 PERSONAL RADAR · INTEREST FRONTIER", { exact: true })).toBeVisible();
  await expect(page.getByText("EVIDENCE-QUALIFIED · PREVIEW QA / SYNTHETIC", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "YOUR CURRENT INTEREST FRONTIER." })).toBeVisible();
  await expect(page.getByText("F5 · CURRENT INTEREST EVIDENCE", { exact: true })).toBeVisible();
  await expect(page.getByText("F8 · STRENGTH × CONFIDENCE", { exact: true })).toBeVisible();
  await expect(page.getByText("SYNTHETIC PREVIEW PROFILE · VISUAL QA ONLY", { exact: true })).toBeVisible();
  await expect(page.getByText("NO SEMANTIC COORDINATES", { exact: false })).toBeVisible();

  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(overflow.scrollWidth - overflow.clientWidth).toBeLessThanOrEqual(1);

  await page.screenshot({ path: "artifacts/integration-qa/08-personal-radar.png", fullPage: true });
});
