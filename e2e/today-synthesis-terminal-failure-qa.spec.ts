import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1600, height: 960 } });

test("terminal synthesis failure never permanently traps Today", async ({ page }) => {
  test.setTimeout(55_000);

  await page.goto("http://127.0.0.1:3000/today/qa-synthesis-failure", {
    waitUntil: "domcontentloaded",
  });

  const root = page.locator(".motion-lab-shell");
  const scroller = page.locator(".motion-lab-scroller");
  await expect(root).toBeVisible();
  await expect(page.locator('[data-synthesis-state="pending"]')).toBeAttached();
  await page.mouse.move(800, 500);

  for (let step = 0; step < 16; step += 1) {
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(650);
    const stage = await root.getAttribute("data-scroll-stage");
    if (stage === "today") break;
  }

  await expect(root).toHaveAttribute("data-scroll-stage", "today");

  await page.mouse.wheel(0, 180);
  await page.waitForTimeout(700);
  await expect(root).toHaveAttribute("data-scroll-stage", "today");
  await expect(root).toHaveAttribute("data-weave-intent", "pending");
  console.log("FAILURE_QA_PENDING_LOCK=true");
  await page.screenshot({ path: "artifacts/synthesis-failure/01-pending-lock.png" });

  await expect(page.locator('[data-synthesis-state="unavailable"]')).toBeVisible({ timeout: 25_000 });
  await expect(page.getByText("SYNTHESIS UNAVAILABLE", { exact: true })).toBeVisible();
  await expect(root).toHaveAttribute("data-scroll-stage", "weave", { timeout: 5_000 });
  await expect(root).not.toHaveAttribute("data-weave-intent", "pending");

  const progressAfterFailure = await scroller.evaluate((node) => {
    const el = node as HTMLElement;
    const travel = Math.max(1, el.scrollHeight - el.clientHeight);
    return el.scrollTop / travel;
  });

  console.log(`FAILURE_QA_WEAVE_PROGRESS=${progressAfterFailure.toFixed(4)}`);
  expect(progressAfterFailure).toBeGreaterThan(0.84);
  console.log("FAILURE_QA_TERMINAL_HANDOFF=true");
  await page.screenshot({ path: "artifacts/synthesis-failure/02-unavailable-closure.png" });
});
