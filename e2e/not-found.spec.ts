import { test, expect, devices } from "./fixtures";
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
  // These drive the field with `page.mouse` and measure a hovering cursor, so
  // they are desktop-only in the real sense: a mouse that stays where it was
  // put. Skipped on the touch projects rather than relying on the canvas being
  // absent there — it used to be, because the component required a fine
  // pointer, and the `count() === 0` guards in each test silently skipped the
  // mobile runs. Touch now mounts the canvas (see "404 particle physics on
  // touch" below), so that accidental skip is gone and the exclusion-zone
  // measurement started failing on iPhone 14 at a viewport it was never tuned
  // for. The intent was always "desktop"; this states it.
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(({ isMobile }) => {
    if (isMobile) test.skip();
  });

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

// Runs on the touch device profiles the config already declares (iPhone 17 and
// Galaxy S24) rather than pinning one here: `devices[...]` carries
// `defaultBrowserType`, which Playwright refuses inside a describe group, and
// gating on `isMobile` covers both engines instead of just WebKit.
test.describe("404 particle physics on touch", () => {
  /** Centre of mass of the painted pixels — moves when the field deforms. */
  const centroid = (page: import("@playwright/test").Page) =>
    page.evaluate(() => {
      const c = document.querySelector("canvas") as HTMLCanvasElement;
      const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      let sx = 0;
      let sy = 0;
      for (let i = 3; i < d.length; i += 4) {
        if (d[i]! > 10) {
          const px = (i - 3) / 4;
          n++;
          sx += px % c.width;
          sy += Math.floor(px / c.width);
        }
      }
      return { x: n ? sx / n : 0, y: n ? sy / n : 0 };
    });

  const shift = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

  /**
   * The STAGE box — where the glyphs actually are.
   *
   * Not the canvas box. The canvas is deliberately larger than the stage and
   * hangs outside it, so that it never clips a particle mid-flight; its own
   * vertical centre therefore sits well below the type. Dragging across the
   * canvas centre passed under the lockup and barely disturbed it (the shift
   * measured 10px against the 66px a drag through the glyphs produces), which
   * is a measurement artifact of the bleed rather than a physics change.
   */
  const stageBox = async (page: import("@playwright/test").Page) => {
    const box = await page.locator("canvas").evaluate((c) => {
      const r = (c.parentElement as HTMLElement).getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });
    return box;
  };

  /**
   * Drag a synthetic finger across the given box.
   *
   * PointerEvents are dispatched directly rather than driven through
   * `page.touchscreen`, because the component listens on `window` for a
   * *stream* of pointermove with `pointerType: "touch"`, and the touchscreen
   * API emits a tap rather than a sustained drag with intermediate moves.
   */
  // One drag, run inside the page on its own frame clock: a move every 28ms,
  // as a finger reports. It used to be fifteen page.evaluate round trips with
  // a 28ms wait between them, which only approximates 28ms where a round trip
  // is free. On the CI runner each trip cost far more, the finger moved at a
  // fraction of the intended speed, and a speed-driven field barely moved
  // (11 and 21px against ~66px locally). The assertions did not change.
  const drag = async (
    page: import("@playwright/test").Page,
    box: { x: number; y: number; width: number; height: number },
    opts: { down: boolean },
  ) => {
    await page.evaluate(
      ([bx, by, bw, bh, down]) =>
        new Promise<void>((resolve) => {
          const STEPS = 14;
          const INTERVAL = 28;
          const y = by + bh / 2;
          const mk = (type: string, x: number) =>
            new PointerEvent(type, {
              clientX: x,
              clientY: y,
              pointerType: "touch",
              isPrimary: true,
              bubbles: true,
              pointerId: 1,
            });
          let i = 0;
          let last = -Infinity;
          const tick = (now: number) => {
            if (now - last >= INTERVAL) {
              const x = bx + 8 + ((bw - 16) * i) / STEPS;
              if (i === 0 && down) window.dispatchEvent(mk("pointerdown", x));
              window.dispatchEvent(mk("pointermove", x));
              last = now;
              i += 1;
            }
            if (i <= STEPS) requestAnimationFrame(tick);
            else resolve();
          };
          requestAnimationFrame(tick);
        }),
      [box.x, box.y, box.width, box.height, opts.down] as const,
    );
  };

  test("a finger drag deforms the field, and lifting it lets the field recover", async ({
    page,
    isMobile,
  }) => {
    if (!isMobile) test.skip();
    await page.goto(MISSING);
    await page.locator("canvas").waitFor({ state: "attached" });
    await page.waitForTimeout(1200);

    const box = await stageBox(page);
    const atRest = await centroid(page);

    await drag(page, box, { down: true });
    const dragged = await centroid(page);

    // The swipe is the energy source, exactly as a mouse sweep is: the field
    // must actually move, not merely idle-drift. Measured ~66px.
    expect(shift(atRest, dragged)).toBeGreaterThan(25);

    // Lift, then let friction and the spring carry it home. A lifted finger is
    // not hovering anywhere, so nothing keeps pushing.
    await page.evaluate(() =>
      window.dispatchEvent(
        new PointerEvent("pointerup", {
          pointerType: "touch",
          isPrimary: true,
          bubbles: true,
          pointerId: 1,
        }),
      ),
    );
    await page.waitForTimeout(1800);
    const settled = await centroid(page);

    // Back to within the idle drift's own amplitude — no permanent dent left
    // where the finger was, which is the failure mode of treating a touch's
    // last position as a hover.
    expect(shift(atRest, settled)).toBeLessThan(15);
  });

  test("a hard flick never paints on the canvas edge", async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await page.goto(MISSING);
    await page.locator("canvas").waitFor({ state: "attached" });
    await page.waitForTimeout(1200);

    // This is the bug the canvas bleed exists to fix. Particles thrown past the
    // old canvas boundary were clipped by the bitmap, and the resulting straight
    // cut made the canvas rectangle visible on the page — reported from a phone,
    // where one fast flick throws the whole field at once.
    //
    // Ink touching the outermost row or column of the bitmap IS that clipping:
    // a particle drawn at the edge has had its disc cut off by the canvas. The
    // bleed is MAX_OFFSET plus slack, which is the hard cap on how far a
    // particle may stray, so a correct build cannot reach these pixels however
    // hard it is flicked.
    const box = await stageBox(page);
    for (let pass = 0; pass < 3; pass++) {
      await drag(page, { ...box, y: box.y + box.height * (0.2 * pass) }, { down: true });
      await page.evaluate(() =>
        window.dispatchEvent(
          new PointerEvent("pointerup", {
            pointerType: "touch",
            isPrimary: true,
            bubbles: true,
            pointerId: 1,
          }),
        ),
      );
    }

    const edge = await page.evaluate(() => {
      const c = document.querySelector("canvas") as HTMLCanvasElement;
      const { width: w, height: h } = c;
      const d = c.getContext("2d")!.getImageData(0, 0, w, h).data;
      const lit = (x: number, y: number) => d[(y * w + x) * 4 + 3]! > 10;
      let top = 0;
      let bottom = 0;
      let left = 0;
      let right = 0;
      for (let x = 0; x < w; x++) {
        if (lit(x, 0)) top++;
        if (lit(x, h - 1)) bottom++;
      }
      for (let y = 0; y < h; y++) {
        if (lit(0, y)) left++;
        if (lit(w - 1, y)) right++;
      }
      return { top, bottom, left, right };
    });

    expect(edge).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
  });

  test("pointermove with no finger down does not disturb the field", async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await page.goto(MISSING);
    await page.locator("canvas").waitFor({ state: "attached" });
    await page.waitForTimeout(1200);

    const box = await stageBox(page);
    const before = await centroid(page);

    // The same move stream, without the pointerdown. On touch this is what a
    // browser emits around scrolls and cancelled gestures, and it must be
    // ignored — otherwise the glyphs dent as the user scrolls past them.
    await drag(page, box, { down: false });
    const after = await centroid(page);

    expect(shift(before, after)).toBeLessThan(15);
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

  test("the canvas mounts on a touch device", async ({ browser }) => {
    // This assertion is the INVERSE of what it used to be. The component
    // previously required `(hover: hover) and (pointer: fine)` and shipped the
    // static fallback to every phone, on the reasoning that there is no cursor
    // to orbit. But a finger drag reports the same pointermove stream a mouse
    // does, so the field is drivable on touch — it just has to be driven only
    // while a finger is down, which is what the drag gating below covers.
    const context = await browser.newContext({ ...devices["iPhone 17"] });
    const page = await context.newPage();
    await page.goto(MISSING);
    await page.locator("canvas").waitFor({ state: "attached" });

    await expect(page.locator("canvas")).toHaveCount(1);
    // The real text stays in the accessibility tree, faded behind the canvas —
    // same contract as desktop.
    await expect(page.locator("h1")).toHaveCSS("opacity", "0");
    await expect(page.getByRole("heading", { level: 1, name: "404" })).toBeAttached();
    await context.close();
  });

  test("reduced motion still wins on touch", async ({ browser }) => {
    // Relaxing the pointer gate must not have relaxed the motion gate with it:
    // reduced-motion is a hard floor, and a rAF loop ignores the CSS reset.
    const context = await browser.newContext({
      ...devices["iPhone 17"],
      reducedMotion: "reduce",
    });
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
