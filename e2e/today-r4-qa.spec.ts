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

test("Today R4 opens on the first downward gesture and preserves the live cinematic aperture", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto(route("/qa/today-tear-aperture"));

  const shell = page.locator('[data-today-r4="true"]');
  const scroller = shell.locator(":scope > div").first();
  const stage = scroller.locator(":scope > div > div").first();
  const signalButtons = page.getByRole("navigation", { name: "Today R4 fixture signals" }).getByRole("button");
  const showcase = page.locator('[data-r4-showcase="true"]');
  const liveField = page.locator('[data-r4-live-field="true"]');

  await expect(shell).toBeVisible();
  await expect(shell).toHaveAttribute("data-open-state", "closed");
  await expect(shell).toHaveAttribute("data-r4-enhanced", "true");
  await expect(showcase).toBeVisible();
  await expect(liveField).toBeVisible();
  await expect(showcase.locator(".fr-r4-radar__blip")).toHaveCount(7);
  await expect(liveField.locator(".fr-r4-current")).toHaveCount(5);
  await expect(signalButtons).toHaveCount(7);
  await expect(page.getByText("FIND WHAT'S NEXT", { exact: true })).toBeVisible();
  await expect(page.getByText("BEFORE IT HAS", { exact: true })).toBeVisible();
  await expect(page.getByText("A NAME.", { exact: true })).toBeVisible();
  await expect(shell.locator("header")).toBeHidden();
  await expectViewportLocked(page);

  const navAppearance = await page.locator(".fr-site-nav").evaluate((element) => {
    const style = getComputedStyle(element);
    return { backgroundColor: style.backgroundColor, opacity: style.opacity };
  });
  expect(navAppearance.backgroundColor, "Today R4 nav should match the paper exactly").toBe("rgb(240, 239, 235)");
  expect(navAppearance.opacity, "Today R4 nav should be fully opaque").toBe("1");

  const ambientAnimation = await stage.evaluate((element) => getComputedStyle(element, "::before").animationName);
  expect(ambientAnimation, "Today R4 ambient field animation").toContain("ambientSweep");
  const fragmentAnimation = await signalButtons.first().evaluate((element) => getComputedStyle(element).animationName);
  expect(fragmentAnimation, "Today R4 peripheral signal idle animation").toContain("fragmentFloat");
  const radarSweepAnimation = await showcase.locator(".fr-r4-radar__sweep").evaluate((element) => getComputedStyle(element).animationName);
  expect(radarSweepAnimation, "Today R4 hero radar should remain alive while idle").toContain("r4RadarSweep");
  const currentAnimation = await liveField.locator(".fr-r4-current--blue").evaluate((element) => getComputedStyle(element).animationName);
  expect(currentAnimation, "Today R4 expanded signal current should keep moving").toContain("r4CurrentFlow");

  await page.mouse.move(320, 360);
  const pointerX = await shell.evaluate((element) => getComputedStyle(element).getPropertyValue("--r4-px"));
  expect(parseFloat(pointerX), "Today R4 inspection field should react to pointer position").toBeGreaterThan(100);

  await page.screenshot({ path: `${artifactDir}/30-today-r4-hero.png`, fullPage: false });

  await page.mouse.move(800, 520);
  await page.mouse.wheel(0, 18);
  await page.waitForTimeout(180);
  await expect(shell).toHaveAttribute("data-open-state", "opening");

  const heroHeading = page.locator("#today-r4-title");
  const tearSafety = await heroHeading.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      maskImage: style.maskImage,
      webkitMaskImage: style.getPropertyValue("-webkit-mask-image"),
      childOverflow: Array.from(element.children).map((child) => getComputedStyle(child).overflow),
    };
  });
  expect(
    tearSafety.maskImage !== "none" || (tearSafety.webkitMaskImage !== "" && tearSafety.webkitMaskImage !== "none"),
    "Today R4 hero should use a soft edge mask while tearing",
  ).toBeTruthy();
  expect(
    tearSafety.childOverflow.every((value) => value === "visible"),
    "Today R4 hero rows should not hard-clip moving type",
  ).toBeTruthy();
  await page.screenshot({ path: `${artifactDir}/30a-today-r4-triggered-tear.png`, fullPage: false });

  await page.waitForTimeout(900);
  await expect(shell).toHaveAttribute("data-open-state", "open");
  await expect(page.getByText("WHY NOW", { exact: true })).toBeVisible();
  await expect(page.getByText("BUILD DIRECTION", { exact: true })).toBeVisible();

  const aperture = shell.locator('article[aria-live="polite"]');
  const apertureScan = await aperture.evaluate((element) => getComputedStyle(element, "::before").animationName);
  expect(apertureScan, "Today R4 aperture should remain visibly alive after opening").toContain("r4ApertureScan");

  await scrollToRatio(scroller, 0.58);
  await page.waitForTimeout(420);
  await expect(shell).toHaveAttribute("data-lane", "core");

  const fragmentBox = await signalButtons.first().boundingBox();
  expect(fragmentBox, "Today R4 peripheral signal should have a measurable click target").not.toBeNull();
  expect(fragmentBox!.width, "Today R4 peripheral signal click width").toBeGreaterThanOrEqual(150);
  expect(fragmentBox!.height, "Today R4 peripheral signal click height").toBeGreaterThanOrEqual(36);
  const fragmentCursor = await signalButtons.nth(3).evaluate((element) => getComputedStyle(element).cursor);
  expect(fragmentCursor, "Today R4 peripheral signals should advertise click affordance").toBe("pointer");

  await signalButtons.nth(5).dispatchEvent("pointerenter");
  await expect(shell).toHaveAttribute("data-r4-hover-rank", "06");
  await page.waitForTimeout(260);
  await page.screenshot({ path: `${artifactDir}/31-today-r4-aperture.png`, fullPage: false });
  await signalButtons.nth(5).dispatchEvent("pointerleave");

  await scrollToRatio(scroller, 0.88);
  await page.waitForTimeout(420);
  await expect(shell).toHaveAttribute("data-selected-rank", "07");
  await expect(shell).toHaveAttribute("data-lane", "wildcard");
  await expect(page.getByRole("heading", { name: "Procedural Generated Graffiti Wall" })).toBeVisible();
  await page.screenshot({ path: `${artifactDir}/32-today-r4-wildcard.png`, fullPage: false });

  await expectViewportLocked(page);
  expect(pageErrors, `uncaught browser errors: ${pageErrors.join(" | ")}`).toEqual([]);
});
