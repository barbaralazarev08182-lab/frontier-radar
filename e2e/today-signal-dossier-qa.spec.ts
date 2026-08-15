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

  // The visual surface is stage-gated. Force the already-accepted Today stage
  // for this narrow dossier regression test rather than retesting scroll physics.
  await page.evaluate(() => {
    const shell = document.querySelector<HTMLElement>(".motion-lab-shell");
    if (shell) shell.dataset.scrollStage = "today";
  });

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
