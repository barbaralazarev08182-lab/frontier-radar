import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const artifactDir = "artifacts/integration-qa";

mkdirSync(artifactDir, { recursive: true });

function route(path: string): string {
  return new URL(path, baseUrl).toString();
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));

  expect(
    overflow.scrollWidth - overflow.clientWidth,
    `horizontal overflow detected: ${overflow.scrollWidth}px > ${overflow.clientWidth}px`
  ).toBeLessThanOrEqual(1);
}

test("Today exposes one shared signal dossier and updates it from the existing signal objects", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto(route("/today"));

  const root = page.locator(".motion-lab-shell");
  await expect(root).toBeVisible();

  const cards = root.locator(".motion-lab-signal[role='link']");
  await expect(cards).toHaveCount(7);

  // Move through the accepted Motion Lab scroll controller rather than faking a
  // data attribute. 74% sits inside the Today inspection chapter (62%–86%).
  await page.evaluate(() => {
    const scroller = document.querySelector<HTMLElement>(".motion-lab-scroller");
    if (!scroller) return;
    const travel = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
    scroller.scrollTop = travel * 0.74;
    scroller.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await expect(root).toHaveAttribute("data-scroll-stage", "today", { timeout: 7_000 });
  await page.waitForTimeout(1_100);

  const dossier = page.locator('[data-today-signal-dossier="true"]');
  await expect(dossier).toBeVisible();
  await expect(dossier.getByText("WHY NOW", { exact: true })).toBeVisible();
  await expect(dossier.getByText("WHY YOU", { exact: true })).toBeVisible();
  await expect(dossier.getByText("EVIDENCE", { exact: true })).toBeVisible();
  await expect(dossier.getByText("BUILD", { exact: true })).toBeVisible();

  const first = cards.nth(0);
  const second = cards.nth(1);
  const firstId = await first.getAttribute("data-item-id");
  const secondId = await second.getAttribute("data-item-id");
  expect(firstId).toBeTruthy();
  expect(secondId).toBeTruthy();
  await expect(dossier).toHaveAttribute("data-signal-id", firstId!);
  await expect(first).toHaveAttribute("data-inspected", "true");

  await second.hover();
  await expect(dossier).toHaveAttribute("data-signal-id", secondId!);
  await expect(second).toHaveAttribute("data-inspected", "true");
  await expect(first).not.toHaveAttribute("data-inspected", "true");

  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `${artifactDir}/09-today-signal-dossier.png`, fullPage: true });
  expect(pageErrors, `uncaught browser page errors: ${pageErrors.join(" | ")}`).toEqual([]);
});
