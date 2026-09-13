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

  // elementFromPoint cannot verify this: a box-shadow is painted but not
  // hit-testable, so a hit test at the edge returns the element behind it.
  // Compare the rendered pixels instead — a 1x1 capture at each viewport edge
  // and one inside the footer, all of which must be byte-identical because
  // all three are flat brown-950.
  const y = Math.round(Math.max(footer.y + footer.height / 2, 1));
  const px = (x: number) => page.screenshot({ clip: { x, y, width: 1, height: 1 } });
  const [left, right, inside] = await Promise.all([px(1), px(1798), px(900)]);

  expect(left.equals(inside)).toBe(true);
  expect(right.equals(inside)).toBe(true);
});
