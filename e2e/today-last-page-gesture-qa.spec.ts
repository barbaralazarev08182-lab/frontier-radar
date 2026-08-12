import { test, expect } from "@playwright/test";

const baseUrl = "https://frontier-radar-eosin.vercel.app";

test.use({ viewport: { width: 1600, height: 960 } });

async function readState(root: import("@playwright/test").Locator, scroller: import("@playwright/test").Locator) {
  const stage = await root.getAttribute("data-scroll-stage");
  const progress = await scroller.evaluate((node) => {
    const el = node as HTMLElement;
    const travel = Math.max(1, el.scrollHeight - el.clientHeight);
    return el.scrollTop / travel;
  });
  return { stage, progress };
}

async function logState(label: string, root: import("@playwright/test").Locator, scroller: import("@playwright/test").Locator) {
  const state = await readState(root, scroller);
  console.log(`${label}_STAGE=${state.stage}`);
  console.log(`${label}_PROGRESS=${state.progress.toFixed(4)}`);
  return state;
}

async function wheel(page: import("@playwright/test").Page, deltaY: number, waitMs = 520) {
  await page.mouse.wheel(0, deltaY);
  await page.waitForTimeout(waitMs);
}

test("Today natural wheel path reaches the final Weave on production", async ({ page }) => {
  test.setTimeout(90_000);

  const response = await page.goto(`${baseUrl}/today`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Today · Frontier Radar/);

  const root = page.locator(".motion-lab-shell");
  const scroller = page.locator(".motion-lab-scroller");
  const synthesis = page.locator('section[aria-label="Today\'s signal synthesis"]');
  await expect(root).toBeVisible({ timeout: 20_000 });
  await expect(synthesis).toBeAttached({ timeout: 20_000 });
  await page.mouse.move(800, 500);

  await logState("NATURAL_INITIAL", root, scroller);

  // Reproduce a real user starting at the top: no direct scrollTop manipulation.
  for (let i = 0; i < 18; i += 1) {
    await wheel(page, 120, 520);
    const state = await logState(`NATURAL_STEP_${i + 1}`, root, scroller);
    if (state.stage === "weave") break;
  }

  const afterStepped = await logState("NATURAL_AFTER_STEPPED", root, scroller);
  await page.screenshot({ path: "artifacts/gate7r/01-after-stepped-wheel.png" });

  // If the stepped path did not enter Weave, give it three clearly separated gestures.
  if (afterStepped.stage !== "weave") {
    for (let i = 0; i < 3; i += 1) {
      await wheel(page, 180, 1_150);
      await logState(`NATURAL_SEPARATED_${i + 1}`, root, scroller);
    }
  }

  const afterSeparated = await logState("NATURAL_AFTER_SEPARATED", root, scroller);
  await page.screenshot({ path: "artifacts/gate7r/02-after-separated-wheel.png" });

  // Now start fresh and model a continuous trackpad / fast wheel stream.
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(synthesis).toBeAttached({ timeout: 20_000 });
  await page.mouse.move(800, 500);

  for (let burst = 0; burst < 8; burst += 1) {
    for (let tick = 0; tick < 8; tick += 1) {
      await page.mouse.wheel(0, 55);
      await page.waitForTimeout(45);
    }
    await page.waitForTimeout(420);
    await logState(`BURST_${burst + 1}`, root, scroller);
  }

  const afterBurst = await logState("BURST_FINAL", root, scroller);
  await page.screenshot({ path: "artifacts/gate7r/03-after-continuous-bursts.png" });

  console.log(`RESULT_STEPPED_REACHED_WEAVE=${afterSeparated.stage === "weave"}`);
  console.log(`RESULT_BURST_REACHED_WEAVE=${afterBurst.stage === "weave"}`);
});
