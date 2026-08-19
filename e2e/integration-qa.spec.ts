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

test("Explore -> Saved persists the user's archive chain", async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    await page.goto(route("/explore"));

    const field = page.locator(".explore-field-shell");
    const focusCard = page.locator(".explore-focus-card");
    await expect(field).toBeVisible();
    await expect(focusCard).toBeVisible();

    const sourceTitle = (await focusCard.locator("h2").innerText()).trim();
    expect(sourceTitle.length).toBeGreaterThan(0);

    const saveButton = focusCard.locator("button.explore-save-action");
    await expect(saveButton).toHaveAttribute("aria-pressed", "false");
    await saveButton.click();
    await expect(saveButton).toHaveAttribute("aria-pressed", "true");
    await expect(saveButton).toContainText("SAVED");
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `${artifactDir}/01-explore-saved.png`, fullPage: true });

    await page.goto(route("/saved"));
    await expect(page.getByText("PRIVATE RESEARCH SHELF", { exact: true })).toBeVisible();
    await expect(page.locator(".fr-featured-book h1")).toHaveText(sourceTitle);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `${artifactDir}/02-saved-shelf.png`, fullPage: true });

    await page.reload();
    await expect(page.locator(".fr-featured-book h1")).toHaveText(sourceTitle);
    await expectNoHorizontalOverflow(page);

    await page.getByRole("button", { name: /REMOVE/ }).click();
    await expect(page.getByText("ARCHIVE EMPTY", { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `${artifactDir}/03-saved-source-removed.png`, fullPage: true });

    expect(pageErrors, `uncaught browser page errors: ${pageErrors.join(" | ")}`).toEqual([]);
  } catch (error) {
    await page.screenshot({
      path: `${artifactDir}/failure-${testInfo.retry}.png`,
      fullPage: true,
    }).catch(() => undefined);
    throw error;
  }
});
