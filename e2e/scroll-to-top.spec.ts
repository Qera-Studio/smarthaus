import { test, expect } from "./fixtures";

/**
 * The button has two states and both are easy to break silently: it must be
 * genuinely out of reach while hidden (not merely transparent), and it must
 * actually return the page to the top when pressed.
 */

const button = "button:has-text('Back to top')";

test("stays hidden and unreachable at the top of the page", async ({ page }) => {
  await page.goto("/");

  // Not just invisible — `inert` must keep it out of the tab order, or keyboard
  // users get a stop on a control nobody can see.
  await expect(page.locator(button)).toBeHidden();
});

test("appears after scrolling and returns to the top", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.scrollTo(0, 2000));

  const backToTop = page.locator(button);
  await expect(backToTop).toBeVisible();

  await backToTop.click();

  // Smooth scrolling is async, so poll rather than reading once.
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

  // And it hides itself again once the top is back in view.
  await expect(backToTop).toBeHidden();
});

/**
 * /privacy rather than the homepage, deliberately. The homepage is shorter
 * than two viewports and its footer is min-block-size 100svh, so the footer
 * covers the button's strip at EVERY scroll position — there is no light
 * region to test the other half of the behaviour against. A long prose page
 * has one.
 */
test("inverts its colours over the dark footer", async ({ page }) => {
  await page.goto("/privacy");

  const backToTop = page.locator(button);
  const ink = () => backToTop.evaluate((el) => getComputedStyle(el).backgroundColor);

  // Mid-page, over light prose: brown-100 ground, brown-900 ink.
  await page.evaluate(() => window.scrollTo(0, 600));
  await expect(backToTop).toBeVisible();
  await expect.poll(ink).toBe("rgb(240, 233, 221)");

  // Over the footer, which carries data-ground="dark": brown-950.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect.poll(ink).toBe("rgb(10, 8, 7)");
});
