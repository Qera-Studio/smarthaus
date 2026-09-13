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

test.describe("404 particle physics", () => {
  // Desktop only — the canvas does not mount without a fine pointer.
  test.use({ viewport: { width: 1440, height: 900 } });

  /** Opaque pixels currently painted on the canvas. */
  const painted = (page: import("@playwright/test").Page) =>
    page.evaluate(() => {
      const c = document.querySelector("canvas") as HTMLCanvasElement | null;
      if (!c) return -1;
      const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i]! > 0) n++;
      return n;
    });

  test("the field keeps drifting when nothing is touching it", async ({ page }) => {
    await page.goto(MISSING);
    await page.waitForTimeout(2000);
    if ((await page.locator("canvas").count()) === 0) test.skip();

    // Cursor never enters. The field must still be moving: every particle
    // wanders slowly around its origin so the "404" reads as alive rather than
    // printed.
    //
    // This assertion is deliberately the INVERSE of what it used to be. An
    // earlier REST_EPSILON clamp pinned every particle to its origin, and the
    // test asserted a painted-pixel spread under 20 — which passed at exactly
    // 0, and was precisely the "completely static" problem. Drift now moves
    // this number by hundreds.
    const samples: number[] = [];
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(450);
      samples.push(await painted(page));
    }
    const spread = Math.max(...samples) - Math.min(...samples);
    expect(spread).toBeGreaterThan(20);

    // But the drift must stay a breath, not a shuffle: the glyphs have to stay
    // legible, so the painted area cannot swing wildly.
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    expect(spread).toBeLessThan(mean * 0.1);
  });

  test("momentum decays after the cursor stops", async ({ page }) => {
    await page.goto(MISSING);
    await page.waitForTimeout(2000);
    if ((await page.locator("canvas").count()) === 0) test.skip();

    /** Vertical spread of painted pixels — grows as particles leave the glyph. */
    const spread = () =>
      page.evaluate(() => {
        const c = document.querySelector("canvas") as HTMLCanvasElement;
        const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
        let min = Infinity;
        let max = -1;
        for (let y = 0; y < c.height; y++) {
          for (let x = 0; x < c.width; x += 2) {
            if (d[(y * c.width + x) * 4 + 3]! > 0) {
              if (y < min) min = y;
              if (y > max) max = y;
              break;
            }
          }
        }
        return max - min;
      });

    // Throw the field open, then stop dead and let it recover.
    await page.mouse.move(520, 450);
    await page.mouse.move(1000, 455, { steps: 4 });
    const justAfter = await spread();

    await page.mouse.move(1350, 860, { steps: 5 });
    await page.waitForTimeout(2500);
    const recovered = await spread();

    // The bloom must collapse back toward the glyph rather than leaving
    // particles stranded where the cursor left them.
    expect(recovered).toBeLessThanOrEqual(justAfter);
  });

  test("no particle enters the exclusion zone around the cursor", async ({ page }) => {
    await page.goto(MISSING);
    await page.waitForTimeout(1200);
    if ((await page.locator("canvas").count()) === 0) test.skip();

    // Park inside a solid stroke, NOT the hollow middle of the "0" — parking in
    // a counter measures the distance to the stroke edge rather than to a
    // cavity, which made earlier readings look random (2.4px to 33px).
    const CX = 536;
    const CY = 453;
    await page.mouse.move(CX, CY, { steps: 12 });
    await page.waitForTimeout(1800);

    const nearestCssPx = await page.evaluate(
      ([cx, cy]) => {
        const c = document.querySelector("canvas") as HTMLCanvasElement;
        const box = c.getBoundingClientRect();
        const dpr = c.width / box.width;
        const lx = (cx! - box.left) * dpr;
        const ly = (cy! - box.top) * dpr;
        const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
        let best = Infinity;
        for (let y = 0; y < c.height; y++) {
          for (let x = 0; x < c.width; x++) {
            // Threshold at half alpha: the outermost pixels of an anti-aliased
            // disc are a faint feather, not the particle's body, and counting
            // them understates the gap by most of a pixel.
            if (d[(y * c.width + x) * 4 + 3]! >= 128) {
              const dd = Math.hypot(x - lx, y - ly);
              if (dd < best) best = dd;
            }
          }
        }
        return best / dpr;
      },
      [CX, CY],
    );

    // The bubble is CLEAR_RADIUS (the 8px cursor dot + a 4px margin) plus each
    // particle's own drawn radius, enforced as a position clamp after
    // integration — so it holds even on a fast pass that would otherwise tunnel
    // a particle through the cursor.
    //
    // The lower bound is the point of the test: an earlier 4px bubble measured
    // a perfect 4.01px while particles still visibly buried the cursor, because
    // the bubble was smaller than the dot's own 8px radius. Anything at or below
    // the dot radius is a regression, however consistent it looks.
    expect(nearestCssPx).toBeGreaterThan(9);
    // And the cavity must stay proportionate to the cursor, not a wide soft
    // dent: before STATIC_PUSH was zeroed this measured up to 33px.
    expect(nearestCssPx).toBeLessThan(22);
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
