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

test("Explore -> Saved -> Idea Lab persists the user's signal-to-direction chain", async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    await page.goto(route("/explore"));

    const field = page.locator(".lf4");
    await expect(field).toBeVisible();

    const firstRecord = field.locator(".lf4-row").first();
    await expect(firstRecord).toBeVisible();
    await firstRecord.click();

    const focusCard = page.locator(".lf4-sheet");
    await expect(focusCard).toBeVisible();

    const sourceTitle = (await focusCard.locator("h2").innerText()).trim();
    expect(sourceTitle.length).toBeGreaterThan(0);

    const saveButton = focusCard.locator("button.lf4-save");
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

    await page.goto(route("/idea-lab"));
    await expect(page.getByText("SOURCE MATERIAL", { exact: true })).toBeVisible();

    const sourceCard = page.locator(".fr-idea-source-card").filter({ hasText: sourceTitle }).first();
    await expect(sourceCard).toBeVisible();
    await expect(sourceCard).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".fr-idea-source-slip")).toContainText(sourceTitle);

    const startIdeaButton = page.getByRole("button", { name: "START IDEA FROM THIS SIGNAL" });
    await expect(startIdeaButton).toBeVisible();
    await startIdeaButton.click();

    const ideaTitle = "QA Integration Direction";
    const ideaNote = "Verify that a saved frontier signal can become a persistent local direction.";

    await page.getByRole("textbox", { name: "Idea title" }).fill(ideaTitle);
    await page.getByRole("textbox", { name: "Idea working note" }).fill(ideaNote);

    const statusRail = page.locator(".fr-idea-status-rail");
    const shapingButton = statusRail.getByRole("button", { name: /SHAPING/ });
    await shapingButton.click();
    await expect(shapingButton).toHaveAttribute("aria-pressed", "true");
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `${artifactDir}/03-idea-lab-edited.png`, fullPage: true });

    await page.reload();
    await expect(page.getByRole("textbox", { name: "Idea title" })).toHaveValue(ideaTitle);
    await expect(page.getByRole("textbox", { name: "Idea working note" })).toHaveValue(ideaNote);
    await expect(
      page.locator(".fr-idea-status-rail").getByRole("button", { name: /SHAPING/ })
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".fr-idea-source-slip")).toContainText(sourceTitle);

    const directionCard = page.locator(".fr-idea-card").filter({ hasText: ideaTitle }).first();
    await expect(directionCard).toBeVisible();
    await directionCard.click();

    await expect(
      page.locator(".fr-idea-source-card").filter({ hasText: sourceTitle }).first()
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".fr-idea-source-slip")).toContainText(sourceTitle);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `${artifactDir}/04-idea-lab-reloaded.png`, fullPage: true });

    // Gate 2: removing the bookmark must not delete the user's derived direction.
    await page.goto(route("/saved"));
    await expect(page.locator(".fr-featured-book h1")).toHaveText(sourceTitle);
    await page.getByRole("button", { name: /REMOVE/ }).click();
    await expect(page.getByText("ARCHIVE EMPTY", { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `${artifactDir}/05-saved-source-removed.png`, fullPage: true });

    await page.goto(route("/idea-lab"));
    await expect(page.getByText("NO SOURCE MATERIAL", { exact: true })).toBeVisible();

    const orphanDirection = page.locator(".fr-idea-card").filter({ hasText: ideaTitle }).first();
    await expect(orphanDirection).toBeVisible();
    await orphanDirection.click();

    const orphanSlip = page.locator('.fr-idea-source-slip[data-orphan="true"]');
    await expect(orphanSlip).toBeVisible();
    await expect(orphanSlip).toContainText(sourceTitle);
    await expect(orphanSlip).toContainText("SOURCE NO LONGER SAVED");
    await expect(page.getByRole("textbox", { name: "Idea title" })).toHaveValue(ideaTitle);
    await expect(page.getByRole("textbox", { name: "Idea working note" })).toHaveValue(ideaNote);
    await expect(
      page.locator(".fr-idea-status-rail").getByRole("button", { name: /SHAPING/ })
    ).toHaveAttribute("aria-pressed", "true");

    const orphanNote = `${ideaNote} It remains editable after the source bookmark is removed.`;
    await page.getByRole("textbox", { name: "Idea working note" }).fill(orphanNote);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `${artifactDir}/06-orphan-idea-preserved.png`, fullPage: true });

    await page.reload();
    const reloadedOrphanDirection = page.locator(".fr-idea-card").filter({ hasText: ideaTitle }).first();
    await expect(reloadedOrphanDirection).toBeVisible();
    await reloadedOrphanDirection.click();
    await expect(page.locator('.fr-idea-source-slip[data-orphan="true"]')).toContainText("SOURCE NO LONGER SAVED");
    await expect(page.getByRole("textbox", { name: "Idea working note" })).toHaveValue(orphanNote);
    await expect(
      page.locator(".fr-idea-status-rail").getByRole("button", { name: /SHAPING/ })
    ).toHaveAttribute("aria-pressed", "true");
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `${artifactDir}/07-orphan-idea-reloaded.png`, fullPage: true });

    expect(pageErrors, `uncaught browser page errors: ${pageErrors.join(" | ")}`).toEqual([]);
  } catch (error) {
    await page.screenshot({
      path: `${artifactDir}/failure-${testInfo.retry}.png`,
      fullPage: true,
    }).catch(() => undefined);
    throw error;
  }
});
