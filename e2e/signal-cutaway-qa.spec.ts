import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const artifactDir = "artifacts/integration-qa";

mkdirSync(artifactDir, { recursive: true });

function route(path: string): string {
  return new URL(path, baseUrl).toString();
}

async function expectViewportLocked(page: Page) {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
  }));

  expect(overflow.scrollWidth - overflow.clientWidth, "Signal Cutaway horizontal overflow").toBeLessThanOrEqual(1);
  expect(overflow.scrollHeight - overflow.clientHeight, "Signal Cutaway vertical overflow").toBeLessThanOrEqual(1);
}

test("Signal Cutaway R2.1 exposes four isolated visual states without touching Today", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto(route("/qa/signal-cutaway"));

  const shell = page.locator('[data-cutaway-prototype="true"]');
  const cutaway = page.getByRole("article", { name: /Signal Cutaway/ });
  const controls = page.getByRole("navigation", { name: "Signal Cutaway fixture states" }).getByRole("button");

  await expect(shell).toBeVisible();
  await expect(cutaway).toBeVisible();
  await expect(controls).toHaveCount(4);
  await expect(shell).toHaveAttribute("data-selected-rank", "01");
  await expect(shell).toHaveAttribute("data-lane", "core");
  await expect(page.getByText("WHY YOU", { exact: true })).toBeVisible();
  await expectViewportLocked(page);
  await page.screenshot({ path: `${artifactDir}/10-cutaway-core-full.png`, fullPage: false });

  await controls.nth(1).click();
  await expect(shell).toHaveAttribute("data-selected-rank", "04");
  await expect(shell).toHaveAttribute("data-lane", "core");
  await expect(page.getByText("WHY YOU", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Mocktail — Free, open-source mock API server with a built-in dashboard", { exact: true })).toBeVisible();
  await expectViewportLocked(page);
  await page.screenshot({ path: `${artifactDir}/11-cutaway-core-gap.png`, fullPage: false });

  await controls.nth(2).click();
  await expect(shell).toHaveAttribute("data-selected-rank", "06");
  await expect(shell).toHaveAttribute("data-lane", "adjacent");
  await expect(page.getByText("ADJACENT SIGNAL", { exact: true })).toBeVisible();
  await expectViewportLocked(page);
  await page.screenshot({ path: `${artifactDir}/12-cutaway-adjacent.png`, fullPage: false });

  await controls.nth(3).click();
  await expect(shell).toHaveAttribute("data-selected-rank", "07");
  await expect(shell).toHaveAttribute("data-lane", "wildcard");
  await expect(page.getByText("WILDCARD SIGNAL", { exact: true })).toBeVisible();
  await expectViewportLocked(page);
  await page.screenshot({ path: `${artifactDir}/13-cutaway-wildcard.png`, fullPage: false });

  expect(pageErrors, `uncaught browser errors: ${pageErrors.join(" | ")}`).toEqual([]);
});
