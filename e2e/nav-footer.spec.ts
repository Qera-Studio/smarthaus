import { test, expect, type Page } from "@playwright/test";

/**
 * The nav hides once the footer owns the screen.
 *
 * The footer carries the same links, so a bar over it is redundant — and below
 * lg, where the bar floats over the page, it physically covers the footer's
 * own links. This runs on every device profile: the behaviour is required at
 * every breakpoint, and the two bands hide the bar by different means (sticky
 * at the top, fixed at the bottom), so one passing does not imply the other.
 *
 * /terms rather than the homepage: it has enough content to scroll, where the
 * homepage is a single visually-hidden heading and the footer fills it from
 * the start.
 */

/** Fraction of the VIEWPORT the footer currently covers. */
function footerCoverage(page: Page) {
  return page.evaluate(() => {
    const r = document.querySelector("footer")!.getBoundingClientRect();
    const visible = Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0));
    return visible / window.innerHeight;
  });
}

/**
 * Scroll and let the IntersectionObserver deliver.
 *
 * The callback is queued, not synchronous, so asserting straight after a
 * scrollTo is a race — and one that only shows up on the short-viewport device
 * profiles, where the scroll is long enough for the difference to matter. Two
 * animation frames is the settled point for an observer with no root margin.
 */
async function scrollAndSettle(page: Page, to: "top" | "bottom") {
  await page.evaluate((where) => {
    window.scrollTo(0, where === "bottom" ? document.body.scrollHeight : 0);
  }, to);
  await page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );
}

/**
 * The nav bar. `banner` rather than "header": the legal pages carry their own
 * <header> for the page title, so a tag selector matches two elements.
 */
const bar = (page: Page) => page.getByRole("banner");
const hiddenBar = (page: Page) => page.locator("header[data-at-footer]");

test("the bar is visible at the top of a long page", async ({ page }) => {
  await page.goto("/terms");
  expect(await footerCoverage(page)).toBeLessThan(0.7);
  await expect(hiddenBar(page)).toHaveCount(0);
  await expect(bar(page)).toBeVisible();
});

test("the bar hides once the footer owns the screen", async ({ page }) => {
  await page.goto("/terms");
  await scrollAndSettle(page, "bottom");

  await expect(hiddenBar(page)).toHaveCount(1);
  expect(await footerCoverage(page)).toBeGreaterThanOrEqual(0.7);
  // Faded AND removed from the tab order — a bar nobody can see must not still
  // collect focus. `inert` flips with the state; `visibility` follows the fade.
  //
  // Asserted through hiddenBar, not bar(): `inert` takes the element out of
  // the accessibility tree, so the banner role stops matching it — which is
  // the point of the attribute, and would make a role-based assertion here
  // pass for the wrong reason.
  await expect(hiddenBar(page)).toHaveAttribute("inert", "");
  await expect(hiddenBar(page)).not.toBeVisible();
  await expect(bar(page)).toHaveCount(0);
});

test("the bar comes back on the way up", async ({ page }) => {
  await page.goto("/terms");
  await scrollAndSettle(page, "bottom");
  await expect(hiddenBar(page)).toHaveCount(1);

  await scrollAndSettle(page, "top");
  await expect(hiddenBar(page)).toHaveCount(0);
  await expect(bar(page)).toBeVisible();
  await expect(bar(page)).not.toHaveAttribute("inert", "");
});

test("an open menu does not survive the bar hiding", async ({ page, isMobile }) => {
  // The toggle only exists below lg.
  if (!isMobile) test.skip();

  await page.goto("/terms");
  await page.getByRole("button", { name: /open menu/i }).click();
  await expect(page.locator("header[data-open]")).toHaveCount(1);

  await scrollAndSettle(page, "bottom");
  await expect(hiddenBar(page)).toHaveCount(1);
  // Otherwise the panel would be stranded off-screen, still "open", and would
  // reappear mid-expansion on the way back up.
  await expect(page.locator("header[data-open]")).toHaveCount(0);
});
