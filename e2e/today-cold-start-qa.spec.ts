import { test, expect } from "@playwright/test";

const visitorId = process.env.QA_VISITOR_ID;
if (!visitorId) throw new Error("QA_VISITOR_ID is required");

const productionCandidates = [
  "https://frontier-radar.vercel.app",
  "https://frontier-radar-barbaralazarev08182-3355s-projects.vercel.app",
  "https://frontier-radar-git-main-barbaralazarev08182-3355s-projects.vercel.app",
];

test("Today production cold start warms immediately and keeps Weave locked until snapshot", async ({ page, context }) => {
  test.setTimeout(200_000);

  let baseUrl: string | null = null;
  for (const candidate of productionCandidates) {
    try {
      const response = await page.goto(`${candidate}/today`, { waitUntil: "domcontentloaded", timeout: 15_000 });
      const title = await page.title();
      if ((response?.status() ?? 500) < 400 && title.includes("Frontier Radar") && new URL(page.url()).host.endsWith("vercel.app")) {
        baseUrl = candidate;
        break;
      }
    } catch {
      // Try the next known Vercel project alias.
    }
  }

  expect(baseUrl, "Could not resolve the production Frontier Radar alias").not.toBeNull();
  console.log(`GATE7_PRODUCTION_BASE=${baseUrl}`);

  await context.clearCookies();
  await context.addCookies([
    {
      name: "frontier_radar_visitor_id",
      value: visitorId,
      url: baseUrl!,
      sameSite: "Lax",
    },
  ]);

  const startedAt = Date.now();
  const response = await page.goto(`${baseUrl}/today`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  console.log(`GATE7_HTTP_STATUS=${response?.status() ?? "none"}`);
  console.log(`GATE7_FINAL_HOST=${new URL(page.url()).host}`);
  console.log(`GATE7_TITLE=${await page.title()}`);
  await page.screenshot({ path: "artifacts/gate7/00-today-cold-start.png", fullPage: true });

  const root = page.locator(".motion-lab-shell");
  await expect(root).toBeVisible({ timeout: 20_000 });

  const pending = page.locator(".today-synthesis-pending");
  await expect(pending).toBeAttached({ timeout: 5_000 });
  console.log("GATE7_CACHE_MISS=true");

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
  console.log("GATE7_WEAVE_LOCKED=true");
  await page.screenshot({ path: "artifacts/gate7/01-locked-while-generating.png", fullPage: true });

  await pending.waitFor({ state: "detached", timeout: 150_000 });
  const snapshotReadyMs = Date.now() - startedAt;
  console.log(`GATE7_SNAPSHOT_READY_MS=${snapshotReadyMs}`);

  await page.mouse.wheel(0, 160);
  await page.waitForTimeout(1_150);
  await expect(root).toHaveAttribute("data-scroll-stage", "weave");
  console.log("GATE7_WEAVE_UNLOCKED=true");
  await page.screenshot({ path: "artifacts/gate7/02-unlocked-after-snapshot.png", fullPage: true });
});
