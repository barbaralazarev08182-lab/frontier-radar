import { expect, test } from "@playwright/test";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

function route(path: string): string {
  return new URL(path, baseUrl).toString();
}

test("Personal Radar preview renders one integrated three-view morph workspace", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto(route("/radar?demo=evidence"));

  await expect(page.getByText("06 PERSONAL RADAR · INTEREST FRONTIER", { exact: true })).toBeVisible();
  await expect(page.getByText("EVIDENCE-QUALIFIED · PREVIEW QA / SYNTHETIC", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "YOUR CURRENT INTEREST FRONTIER." })).toBeVisible();
  await expect(page.getByText("G9 · ONE PROFILE, THREE VIEWS", { exact: true })).toBeVisible();
  await expect(page.getByText("SYNTHETIC PREVIEW PROFILE · VISUAL QA ONLY", { exact: true })).toBeVisible();
  await expect(page.getByText("LIEFLAT G9 MORPH", { exact: false })).toBeVisible();
  await expect(page.getByText("F11 TICK GAUGE SMALL MULTIPLES", { exact: false })).toBeVisible();

  const strength = page.getByRole("button", { name: /01 · STRENGTH/i });
  const evidence = page.getByRole("button", { name: /02 · EVIDENCE/i });
  const freshness = page.getByRole("button", { name: /03 · FRESHNESS/i });

  const buttonTopsBefore = await Promise.all(
    [strength, evidence, freshness].map(async (button) => (await button.boundingBox())?.y ?? -1)
  );

  await expect(strength).toHaveAttribute("aria-pressed", "true");
  await evidence.click();
  await expect(evidence).toHaveAttribute("aria-pressed", "true");
  await freshness.click();
  await expect(freshness).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("FRESHNESS RUNG", { exact: true })).toBeVisible();

  const buttonTopsAfter = await Promise.all(
    [strength, evidence, freshness].map(async (button) => (await button.boundingBox())?.y ?? -1)
  );
  buttonTopsAfter.forEach((top, index) => {
    expect(Math.abs(top - buttonTopsBefore[index])).toBeLessThanOrEqual(1);
  });

  const morphCanvas = page.locator('[role="img"] canvas').first();
  await expect(morphCanvas).toBeVisible({ timeout: 15_000 });

  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
  }));
  expect(overflow.scrollWidth - overflow.clientWidth).toBeLessThanOrEqual(1);
  expect(overflow.scrollHeight - overflow.clientHeight).toBeLessThanOrEqual(1);

  await page.screenshot({ path: "artifacts/integration-qa/08-personal-radar.png", fullPage: true });
});
