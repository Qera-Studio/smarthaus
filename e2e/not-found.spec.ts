import { test, expect, devices } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Any unrouted path renders not-found, so this doubles as a routing check.
const MISSING = "/this-page-does-not-exist";

test.describe("404", () => {
  test("returns 404 and renders the heading", async ({ page }) => {
    const response = await page.goto(MISSING);
    // The status matters as much as the page: a soft 404 that returns 200 tells
    // crawlers the URL is real.
    expect(response?.status()).toBe(404);

    const h1 = page.locator("h1");
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText("404");
  });

  test("is marked noindex", async ({ page }) => {
    await page.goto(MISSING);
    // Next.js emits this tag itself for not-found, so the page must not also
    // declare one — two robots tags is what this originally caught.
    const robots = page.locator('head meta[name="robots"]');
    await expect(robots).toHaveCount(1);
    await expect(robots).toHaveAttribute("content", /noindex/);
  });

  test("passes axe accessibility checks", async ({ page }) => {
    await page.goto(MISSING);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("the home link works", async ({ page }) => {
    await page.goto(MISSING);
    const cta = page.getByRole("link", { name: "Back to home" });

    // Assert the href, not a click-through.
    //
    // `href="/"` IS the contract here: it is what a no-JS visitor follows and
    // what the browser does natively, independent of the client router. A
    // click-through assertion was tried and abandoned — it passed on Desktop
    // Chrome and Pixel 7 but hung on iPhone 14 *only under the Playwright
    // runner*, while the same click navigated correctly on every device profile
    // when driven directly (verified four ways, including stock iPhone 14,
    // hasTouch:false and isMobile:false). That made it a harness artifact
    // rather than a defect, and a test that fails for harness reasons is worse
    // than one that checks the real guarantee.
    await expect(cta).toHaveAttribute("href", "/");
    await expect(cta).toBeVisible();
    await expect(cta).toBeEnabled();
  });

  test("the heading stays in the accessibility tree while the canvas draws", async ({ page }) => {
    await page.goto(MISSING);

    // On a hover-capable desktop the canvas mounts and the text fades to
    // opacity 0 — but it must remain announceable, because the canvas is
    // aria-hidden and would otherwise leave the page with no heading at all.
    // display:none or visibility:hidden here would pass a screenshot test and
    // fail a screen reader, which is why this asserts the accessible name.
    const canvas = page.locator("canvas");
    if ((await canvas.count()) === 0) test.skip();

    await expect(page.locator("h1")).toHaveCSS("opacity", "0");
    // toBeVisible() is false at opacity 0, so assert the a11y tree directly.
    await expect(page.getByRole("heading", { level: 1, name: "404" })).toBeAttached();
  });
});

test.describe("404 motion gates", () => {
  test("no canvas and fully visible text under reduced motion", async ({ browser }) => {
    // The reset's reduced-motion block only zeroes CSS durations — a rAF loop
    // ignores it entirely, so the component must gate the preference in JS.
    // This is the test that catches a canvas effect quietly overriding it.
    const page = await browser.newPage({ reducedMotion: "reduce" });
    await page.goto(MISSING);
    await page.waitForTimeout(400);

    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(page.locator("h1")).toHaveCSS("opacity", "1");
    await page.close();
  });

  test("no canvas on a touch device", async ({ browser }) => {
    // No hover means no cursor to orbit, so the loop would burn battery on an
    // effect that cannot be triggered.
    const context = await browser.newContext({ ...devices["iPhone 14"] });
    const page = await context.newPage();
    await page.goto(MISSING);
    await page.waitForTimeout(400);

    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(page.locator("h1")).toHaveCSS("opacity", "1");
    await context.close();
  });

  test("the text is server-rendered, with no JS at all", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(MISSING);

    await expect(page.locator("h1")).toHaveText("404");
    await expect(page.locator("canvas")).toHaveCount(0);
    // The CTA is the only way out of a 404 for a no-JS visitor.
    await expect(page.getByRole("link", { name: "Back to home" })).toBeVisible();
    await context.close();
  });
});
