import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1600, height: 960 } });

test("blocked Today→Weave intent is honored when readiness arrives", async ({ page }) => {
  test.setTimeout(45_000);

  await page.goto("http://127.0.0.1:3000/qa/today-pending-intent", {
    waitUntil: "domcontentloaded",
  });

  const root = page.locator(".motion-lab-shell");
  const scroller = page.locator(".motion-lab-scroller");
  await expect(root).toBeVisible();
  await expect(root).toHaveAttribute("data-qa-ready", "false");
  await page.mouse.move(800, 500);

  for (let step = 0; step < 16; step += 1) {
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(650);
    const stage = await root.getAttribute("data-scroll-stage");
    if (stage === "today") break;
  }

  await expect(root).toHaveAttribute("data-scroll-stage", "today");

  const progressBeforeIntent = await scroller.evaluate((node) => {
    const el = node as HTMLElement;
    const travel = Math.max(1, el.scrollHeight - el.clientHeight);
    return el.scrollTop / travel;
  });
  console.log(`PENDING_QA_TODAY_PROGRESS=${progressBeforeIntent.toFixed(4)}`);

  await page.mouse.wheel(0, 180);
  await page.waitForTimeout(700);

  await expect(root).toHaveAttribute("data-scroll-stage", "today");
  await expect(root).toHaveAttribute("data-weave-intent", "pending");
  console.log("PENDING_QA_INTENT_RECORDED=true");
  await page.screenshot({ path: "artifacts/pending-intent/01-intent-pending.png" });

  // No second wheel gesture is issued. The harness flips readiness after 20s.
  await expect(root).toHaveAttribute("data-qa-ready", "true", { timeout: 25_000 });
  await expect(root).toHaveAttribute("data-scroll-stage", "weave", { timeout: 5_000 });
  await expect(root).not.toHaveAttribute("data-weave-intent", "pending");

  const progressAfterReady = await scroller.evaluate((node) => {
    const el = node as HTMLElement;
    const travel = Math.max(1, el.scrollHeight - el.clientHeight);
    return el.scrollTop / travel;
  });
  console.log(`PENDING_QA_WEAVE_PROGRESS=${progressAfterReady.toFixed(4)}`);
  expect(progressAfterReady).toBeGreaterThan(0.84);
  console.log("PENDING_QA_AUTO_HANDOFF=true");
  await page.screenshot({ path: "artifacts/pending-intent/02-auto-handoff.png" });
});
