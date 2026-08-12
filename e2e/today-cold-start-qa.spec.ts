import { test, expect } from "@playwright/test";

const baseUrl = process.env.QA_BASE_URL;
if (!baseUrl) throw new Error("QA_BASE_URL is required");

test("Today cold start warms immediately and keeps Weave locked until snapshot", async ({ page }) => {
  test.setTimeout(150_000);
  const startedAt = Date.now();

  const response = await page.goto(`${baseUrl}/today`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  console.log(`GATE7_HTTP_STATUS=${response?.status() ?? "none"}`);
  console.log(`GATE7_FINAL_URL=${page.url()}`);
  console.log(`GATE7_TITLE=${await page.title()}`);
  console.log(`GATE7_BODY=${(await page.locator("body").innerText()).slice(0, 500).replace(/\s+/g, " ")}`);
  await page.screenshot({ path: "artifacts/gate7/00-initial-response.png", fullPage: true });

  const root = page.locator(".motion-lab-shell");
  await expect(root).toBeVisible({ timeout: 20_000 });

  const pending = page.locator(".today-synthesis-pending");
  await expect(pending).toBeAttached({ timeout: 5_000 });

  const scroller = page.locator(".motion-lab-scroller");
  await scroller.evaluate((node) => {
    const el = node as HTMLElement;
    const travel = Math.max(1, el.scrollHeight - el.clientHeight);
    el.scrollTop = travel * 0.35;
  });

  await page.mouse.move(800, 500);
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(1_150);
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(1_150);
  await expect(root).toHaveAttribute("data-scroll-stage", "today");

  await page.mouse.wheel(0, 160);
  await page.waitForTimeout(900);
  await expect(root).toHaveAttribute("data-scroll-stage", "today");
  await page.screenshot({ path: "artifacts/gate7/01-locked-while-generating.png", fullPage: true });

  await pending.waitFor({ state: "detached", timeout: 120_000 });
  const snapshotReadyMs = Date.now() - startedAt;

  await page.mouse.wheel(0, 160);
  await page.waitForTimeout(1_150);
  await expect(root).toHaveAttribute("data-scroll-stage", "weave");
  await page.screenshot({ path: "artifacts/gate7/02-unlocked-after-snapshot.png", fullPage: true });

  console.log(`GATE7_SNAPSHOT_READY_MS=${snapshotReadyMs}`);
});
