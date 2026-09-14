import { test, expect } from "@playwright/test";

/**
 * The footer's two load-bearing behaviours, both of which are invisible to a
 * DOM assertion and easy to break silently:
 *
 *   1. Only the gap flexes. The top and bottom halves keep their natural
 *      height at any viewport, and the spacer between them absorbs the slack.
 *   2. The ground bleeds past the 1440px body cap to both viewport edges,
 *      without creating horizontal overflow.
 */

/**
 * These are viewport-geometry tests: they drive the window to specific sizes
 * and assert the resulting layout. On a mobile device profile that is not
 * meaningful — Playwright's mobile contexts carry their own isMobile and
 * deviceScaleFactor, so a setViewportSize to 1800px does not produce an
 * 1800px layout viewport (it measured 1784px), and the emulated device is
 * being asked to behave like a desktop window it will never be. The
 * behaviours under test are not device-specific, so they run once.
 *
 * The mobile profiles still cover the footer through smoke.spec.ts, and
 * through the mobile-specific case below, which sets its own phone viewport.
 */
test.skip(
  ({ isMobile }) => Boolean(isMobile),
  "viewport-geometry assertions; runs on the desktop project only",
);

/** Read the three children of the footer: top, spacer, bottom. */
async function measure(page: import("@playwright/test").Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto("/");
  return page.evaluate(() => {
    const kids = Array.from(document.querySelector("footer")!.children);
    const h = (i: number) => Math.round(kids[i]!.getBoundingClientRect().height);
    return { top: h(0), spacer: h(1), bottom: h(2) };
  });
}

test("only the gap flexes as the viewport grows", async ({ page }) => {
  const short = await measure(page, 1440, 800);
  const tall = await measure(page, 1440, 1080);

  // Both halves keep their natural height...
  expect(tall.top).toBe(short.top);
  expect(tall.bottom).toBe(short.bottom);
  // ...and the extra viewport height lands in the spacer, nowhere else.
  expect(tall.spacer).toBeGreaterThan(short.spacer);
});

test("footer fills the viewport on a tall desktop window", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto("/");
  const box = (await page.getByRole("contentinfo").boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(1080);
});

test("footer grows past the viewport rather than crushing on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const m = await measure(page, 390, 844);
  // The spacer is at its floor — the content, not the viewport, sets the height.
  expect(m.top).toBeGreaterThan(400);
  const box = (await page.getByRole("contentinfo").boundingBox())!;
  expect(box.height).toBeGreaterThan(844);
});

test("the ground bleeds past the content cap without horizontal overflow", async ({ page }) => {
  // Wider than --content-max (1440px), so the cap and the viewport differ.
  await page.setViewportSize({ width: 1800, height: 900 });
  await page.goto("/");

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflows).toBe(false);

  // The footer box itself stops at the 1440px cap — that is expected. What
  // must be true is that its painted ground still reaches both edges.
  const footer = (await page.getByRole("contentinfo").boundingBox())!;
  expect(Math.round(footer.width)).toBe(1440);

  // Compare the rendered pixels — a 1x1 capture at each viewport edge and one
  // inside the footer, all of which must be byte-identical because all three
  // are flat brown-950.
  const y = Math.round(Math.max(footer.y + footer.height / 2, 1));
  const px = (x: number) => page.screenshot({ clip: { x, y, width: 1, height: 1 } });
  const [left, right, inside] = await Promise.all([px(1), px(1798), px(900)]);

  expect(left.equals(inside)).toBe(true);
  expect(right.equals(inside)).toBe(true);

  // And the ground is the FOOTER for hit testing, not just paint. It used to
  // be a box-shadow, which paints but is not hit-testable, so the pointer in
  // the gutter was over <html> and kept the dark cursor dot on the dark
  // ground. The bleed is a pseudo-element now, so a hit test at the edge
  // resolves to the footer and inherits its light dot.
  const edge = await page.evaluate((y) => {
    const el = document.elementFromPoint(1, y);
    const footer = el?.closest("footer");
    return { isFooter: Boolean(footer), cursor: footer ? getComputedStyle(footer).cursor : "" };
  }, y);
  expect(edge.isFooter).toBe(true);
  expect(edge.cursor).toContain("F8F5F0");
});
