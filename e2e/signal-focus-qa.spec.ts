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
  expect(overflow.scrollWidth - overflow.clientWidth, "Signal Focus horizontal overflow").toBeLessThanOrEqual(1);
  expect(overflow.scrollHeight - overflow.clientHeight, "Signal Focus vertical overflow").toBeLessThanOrEqual(1);
}

test("Signal Focus R3.1 keeps one readable focus sheet and a truthful evidence rail", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto(route("/qa/signal-focus"));

  const shell = page.locator('[data-signal-focus="true"]');
  const index = page.getByRole("navigation", { name: "Signal Focus fixture states" });
  const buttons = index.getByRole("button");

  await expect(shell).toBeVisible();
  await expect(buttons).toHaveCount(7);
  await expect(shell).toHaveAttribute("data-selected-rank", "01");
  await expect(page.getByText("WHY NOW", { exact: true })).toBeVisible();
  await expect(page.getByText("WHY YOU", { exact: true })).toBeVisible();
  await expect(page.getByText("EVIDENCE TRACE", { exact: true })).toBeVisible();
  await expectViewportLocked(page);
  await page.screenshot({ path: `${artifactDir}/20-signal-focus-core.png`, fullPage: false });

  await buttons.nth(3).click();
  await expect(shell).toHaveAttribute("data-selected-rank", "04");
  await expect(page.getByText("WHY YOU", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Mocktail — Free, open-source mock API server with a built-in dashboard", exact: true })).toBeVisible();
  await expectViewportLocked(page);
  await page.screenshot({ path: `${artifactDir}/21-signal-focus-gap.png`, fullPage: false });

  await buttons.nth(5).click();
  await expect(shell).toHaveAttribute("data-selected-rank", "06");
  await expect(shell).toHaveAttribute("data-lane", "adjacent");
  await expectViewportLocked(page);
  await page.screenshot({ path: `${artifactDir}/22-signal-focus-adjacent.png`, fullPage: false });

  await buttons.nth(6).click();
  await expect(shell).toHaveAttribute("data-selected-rank", "07");
  await expect(shell).toHaveAttribute("data-lane", "wildcard");
  await expectViewportLocked(page);
  await page.screenshot({ path: `${artifactDir}/23-signal-focus-wildcard.png`, fullPage: false });

  expect(pageErrors, `uncaught browser errors: ${pageErrors.join(" | ")}`).toEqual([]);
});
