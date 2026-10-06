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
 * One colour on every ground (2026-10-04): brown-600 holds 3:1 against the
 * light canvas and the dark footer alike, so nothing swaps. /privacy because
 * it is long enough to have both behind the button.
 */
test("keeps brown-600 over light prose and over the dark footer", async ({ page }) => {
  await page.goto("/privacy");

  const backToTop = page.locator(button);
  const paint = () =>
    backToTop.evaluate((el) => {
      const s = getComputedStyle(el);
      return [s.backgroundColor, s.color];
    });
  const BROWN_600_ON_BONE = ["rgb(122, 85, 55)", "rgb(248, 245, 240)"];

  await page.evaluate(() => window.scrollTo(0, 600));
  await expect(backToTop).toBeVisible();
  await expect.poll(paint).toEqual(BROWN_600_ON_BONE);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect.poll(paint).toEqual(BROWN_600_ON_BONE);
});
