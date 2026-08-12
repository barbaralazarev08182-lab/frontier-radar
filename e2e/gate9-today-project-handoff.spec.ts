import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1600, height: 960 } });

const baseUrl = "https://frontier-radar-eosin.vercel.app";

test("Today signal opens the matching Project Intelligence and returns cleanly", async ({ page }) => {
  test.setTimeout(90_000);

  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const response = await page.goto(`${baseUrl}/today`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  expect(response?.ok()).toBeTruthy();

  const root = page.locator(".motion-lab-shell");
  await expect(root).toBeVisible({ timeout: 20_000 });
  await page.mouse.move(800, 500);

  for (let step = 0; step < 18; step += 1) {
    const stage = await root.getAttribute("data-scroll-stage");
    if (stage === "today") break;
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(650);
  }
  await expect(root).toHaveAttribute("data-scroll-stage", "today");

  const firstSignal = page.locator(".motion-lab-signal[data-item-id]").first();
  await expect(firstSignal).toBeVisible();
  const itemId = await firstSignal.getAttribute("data-item-id");
  expect(itemId).toMatch(/^[0-9a-f-]{36}$/i);
  const title = (await firstSignal.locator("h2").innerText()).trim();
  expect(title.length).toBeGreaterThan(0);
  console.log(`GATE9_TODAY_ITEM_ID=${itemId}`);
  console.log(`GATE9_TODAY_TITLE=${title}`);
  await page.screenshot({ path: "artifacts/gate9/01-today-selected-signal.png" });

  await firstSignal.click();
  await page.waitForURL(`${baseUrl}/project/${itemId}`, { timeout: 30_000 });

  const projectShell = page.locator(".project-intelligence-shell");
  const projectTitle = page.locator("h1.pi-title");
  await expect(projectShell).toBeVisible({ timeout: 20_000 });
  await expect(projectTitle).toHaveText(title);
  expect(page.url()).toBe(`${baseUrl}/project/${itemId}`);
  console.log("GATE9_ID_BINDING=true");
  console.log("GATE9_TITLE_BINDING=true");
  await page.screenshot({ path: "artifacts/gate9/02-project-intelligence.png" });

  await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 });
  await expect(projectShell).toBeVisible({ timeout: 20_000 });
  await expect(projectTitle).toHaveText(title);
  expect(page.url()).toBe(`${baseUrl}/project/${itemId}`);
  console.log("GATE9_PROJECT_RELOAD_PERSISTENCE=true");
  await page.screenshot({ path: "artifacts/gate9/03-project-reloaded.png" });

  await page.goBack({ waitUntil: "domcontentloaded", timeout: 30_000 });
  await expect(page).toHaveURL(`${baseUrl}/today`);
  await expect(root).toBeVisible({ timeout: 20_000 });

  const returnedStage = await root.getAttribute("data-scroll-stage");
  expect(["hero", "compression", "today", "weave"]).toContain(returnedStage);
  console.log(`GATE9_RETURN_STAGE=${returnedStage}`);

  if (returnedStage === "today") {
    await page.mouse.wheel(0, -160);
    await page.waitForTimeout(1_150);
    await expect(root).toHaveAttribute("data-scroll-stage", "compression");
  } else if (returnedStage === "compression") {
    await page.mouse.wheel(0, 160);
    await page.waitForTimeout(1_150);
    await expect(root).toHaveAttribute("data-scroll-stage", "today");
  } else if (returnedStage === "weave") {
    await page.mouse.wheel(0, -160);
    await page.waitForTimeout(1_150);
    await expect(root).toHaveAttribute("data-scroll-stage", "today");
  } else {
    for (let step = 0; step < 8; step += 1) {
      await page.mouse.wheel(0, 120);
      await page.waitForTimeout(650);
      if ((await root.getAttribute("data-scroll-stage")) === "compression") break;
    }
    await expect(root).toHaveAttribute("data-scroll-stage", "compression");
  }

  console.log("GATE9_RETURN_SCROLL_HEALTH=true");
  await page.screenshot({ path: "artifacts/gate9/04-returned-today.png" });

  expect(pageErrors).toEqual([]);
  console.log("GATE9_BROWSER_ERRORS=0");
});
