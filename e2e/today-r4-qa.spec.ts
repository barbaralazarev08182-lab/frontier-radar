import { expect, test, type Locator, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const artifactDir = "artifacts/integration-qa";
mkdirSync(artifactDir, { recursive: true });

function route(path: string): string {
  return new URL(path, baseUrl).toString();
}

async function scrollToRatio(scroller: Locator, ratio: number) {
  await scroller.evaluate((element, nextRatio) => {
    const node = element as HTMLElement;
    const travel = Math.max(1, node.scrollHeight - node.clientHeight);
    node.scrollTop = travel * Number(nextRatio);
    node.dispatchEvent(new Event("scroll"));
  }, ratio);
}

async function expectViewportLocked(page: Page) {
  const overflow = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    height: document.documentElement.scrollHeight - document.documentElement.clientHeight,
  }));
  expect(overflow.width, "Today R4 horizontal document overflow").toBeLessThanOrEqual(1);
  expect(overflow.height, "Today R4 vertical document overflow").toBeLessThanOrEqual(1);
}

test("Today R4 preserves the torn hero and opens signals inside one cinematic aperture", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto(route("/qa/today-tear-aperture"));

  const shell = page.locator('[data-today-r4="true"]');
  const scroller = shell.locator(":scope > div").first();
  const signalButtons = page.getByRole("navigation", { name: "Today R4 fixture signals" }).getByRole("button");

  await expect(shell).toBeVisible();
  await expect(signalButtons).toHaveCount(7);
  await expect(page.getByText("FIND WHAT'S NEXT", { exact: true })).toBeVisible();
  await expect(page.getByText("BEFORE IT HAS", { exact: true })).toBeVisible();
  await expect(page.getByText("A NAME.", { exact: true })).toBeVisible();
  await expectViewportLocked(page);
  await page.screenshot({ path: `${artifactDir}/30-today-r4-hero.png`, fullPage: false });

  await scrollToRatio(scroller, 0.58);
  await page.waitForTimeout(420);
  await expect(shell).toHaveAttribute("data-lane", "core");
  await expect(page.getByText("WHY NOW", { exact: true })).toBeVisible();
  await expect(page.getByText("BUILD DIRECTION", { exact: true })).toBeVisible();
  await page.screenshot({ path: `${artifactDir}/31-today-r4-aperture.png`, fullPage: false });

  await scrollToRatio(scroller, 0.88);
  await page.waitForTimeout(420);
  await expect(shell).toHaveAttribute("data-selected-rank", "07");
  await expect(shell).toHaveAttribute("data-lane", "wildcard");
  await expect(page.getByRole("heading", { name: "Procedural Generated Graffiti Wall" })).toBeVisible();
  await page.screenshot({ path: `${artifactDir}/32-today-r4-wildcard.png`, fullPage: false });

  expect(pageErrors, `uncaught browser errors: ${pageErrors.join(" | ")}`).toEqual([]);
});
