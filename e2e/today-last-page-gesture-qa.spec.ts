import { test, expect } from "@playwright/test";

const baseUrl = "https://frontier-radar-eosin.vercel.app";

async function stage(root: import("@playwright/test").Locator) {
  return root.getAttribute("data-scroll-stage");
}

async function progress(scroller: import("@playwright/test").Locator) {
  return scroller.evaluate((node) => {
    const el = node as HTMLElement;
    const travel = Math.max(1, el.scrollHeight - el.clientHeight);
    return el.scrollTop / travel;
  });
}

async function gesture(page: import("@playwright/test").Page, deltaY: number) {
  await page.mouse.wheel(0, deltaY);
  await page.waitForTimeout(1_150);
}

test("Today final-page can be entered and exited with vertical wheel gestures", async ({ page }) => {
  test.setTimeout(90_000);

  const response = await page.goto(`${baseUrl}/today`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Today · Frontier Radar/);

  const root = page.locator(".motion-lab-shell");
  const scroller = page.locator(".motion-lab-scroller");
  await expect(root).toBeVisible({ timeout: 20_000 });
  await page.mouse.move(800, 500);

  // Today's production synthesis is already cached; wait until the final Weave exists.
  const synthesis = page.locator('section[aria-label="Today\'s signal synthesis"]');
  await expect(synthesis).toBeAttached({ timeout: 20_000 });

  // Put the user at the stable Today chapter without bypassing the controller's wheel path.
  await scroller.evaluate((node) => {
    const el = node as HTMLElement;
    const travel = Math.max(1, el.scrollHeight - el.clientHeight);
    el.scrollTop = travel * 0.35;
  });
  await gesture(page, 120);
  await gesture(page, 120);

  console.log(`GATE7R_BEFORE_ENTRY_STAGE=${await stage(root)}`);
  console.log(`GATE7R_BEFORE_ENTRY_PROGRESS=${(await progress(scroller)).toFixed(4)}`);
  await expect(root).toHaveAttribute("data-scroll-stage", "today");
  await page.screenshot({ path: "artifacts/gate7r/01-today-before-final-page.png" });

  // User tries to bring the final page up.
  await gesture(page, 160);
  console.log(`GATE7R_AFTER_DOWN_STAGE=${await stage(root)}`);
  console.log(`GATE7R_AFTER_DOWN_PROGRESS=${(await progress(scroller)).toFixed(4)}`);
  await page.screenshot({ path: "artifacts/gate7r/02-after-down-gesture.png" });

  // If the first gesture was swallowed by gesture cooldown, try a second natural gesture.
  if ((await stage(root)) !== "weave") {
    await gesture(page, 160);
  }
  console.log(`GATE7R_ENTRY_FINAL_STAGE=${await stage(root)}`);
  console.log(`GATE7R_ENTRY_FINAL_PROGRESS=${(await progress(scroller)).toFixed(4)}`);
  await expect(root).toHaveAttribute("data-scroll-stage", "weave");
  await expect(synthesis).toBeVisible();
  await page.screenshot({ path: "artifacts/gate7r/03-final-page-visible.png" });

  // Move deeper into the continuous Weave region, like a real user reading the last page.
  await gesture(page, 420);
  await gesture(page, 420);
  console.log(`GATE7R_DEEP_WEAVE_PROGRESS=${(await progress(scroller)).toFixed(4)}`);

  // Now test the opposite interpretation too: can the user scroll back up out of the last page?
  let returned = false;
  for (let i = 0; i < 8; i += 1) {
    await gesture(page, -320);
    const currentStage = await stage(root);
    console.log(`GATE7R_UP_${i + 1}_STAGE=${currentStage}`);
    console.log(`GATE7R_UP_${i + 1}_PROGRESS=${(await progress(scroller)).toFixed(4)}`);
    if (currentStage !== "weave") {
      returned = true;
      break;
    }
  }

  await page.screenshot({ path: "artifacts/gate7r/04-after-up-gestures.png" });
  expect(returned).toBe(true);
  await expect(root).toHaveAttribute("data-scroll-stage", /today|compression|hero/);
});
