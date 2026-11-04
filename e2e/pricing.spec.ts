import { test, expect } from "./fixtures";
import { expectAccessible, expectNoHorizontalOverflow } from "./checks";

/**
 * The four-tier pricing section on the homepage.
 *
 * Two things here cannot be caught by the unit suite, and both are the reason
 * this file exists: contrast on the Connected card, whose ground is an image
 * rather than a token and so cannot be reasoned about from the stylesheet; and
 * the full-bleed ground, which depends on body's cap and the viewport width and
 * therefore only exists in a real browser.
 *
 * Keyed on [data-pricing]: the module's class names are hashed at build time.
 */

const pricing = (page: import("@playwright/test").Page) => page.locator("[data-pricing]");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("keeps the homepage to one h1 and titles the section with an h2", async ({ page }) => {
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(
    pricing(page).getByRole("heading", { level: 2, name: "Choose your level of intelligence" }),
  ).toBeVisible();
});

test("shows four tiers, each reaching the enquiry form", async ({ page }) => {
  const section = pricing(page);
  await expect(section.locator("[data-tone]")).toHaveCount(4);

  const ctas = section.getByRole("link", { name: "Get started" });
  await expect(ctas).toHaveCount(4);

  for (const cta of await ctas.all()) {
    await expect(cta).toHaveAttribute("href", "/contact");
  }
});

/**
 * The client does not want prices shown for now (2026-11-04). The section's own
 * standfirst must not point at a figure that is not there either.
 */
test("prints no price anywhere in the section", async ({ page }) => {
  await expect(pricing(page)).not.toContainText(/AED|\d,\d{3}/);
  await expect(pricing(page)).not.toContainText(/figure/);
});

/**
 * The section shipped with a full-bleed dark ground first, which put two dark
 * blocks back to back under the Process rail. It paints nothing of its own now
 * and sits on the page canvas, so a background reappearing here is a
 * regression rather than a style choice.
 */
test("paints no ground of its own", async ({ page }) => {
  const bg = await pricing(page).evaluate((el) => getComputedStyle(el).backgroundColor);
  // Transparent, in whichever spelling the engine reports.
  expect(["rgba(0, 0, 0, 0)", "transparent"]).toContain(bg);
});

/**
 * Four across in one row is the point of the layout: the tiers are meant to be
 * compared at a glance, not scrolled through. Below lg they wrap, which is
 * intended, so this is asserted at a desktop width only.
 */
test("puts all four tiers on one row at desktop width", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await pricing(page).scrollIntoViewIfNeeded();

  const tops = await pricing(page)
    .locator("[data-tone]")
    .evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));

  expect(tops).toHaveLength(4);
  expect(new Set(tops).size).toBe(1);
});

/**
 * The subgrid is what makes the set read as one comparison rather than four
 * cards: without it each card stacks independently and the buttons land at
 * four different heights.
 */
test("lines the four buttons up on one row", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await pricing(page).scrollIntoViewIfNeeded();

  const tops = await pricing(page)
    .getByRole("link", { name: "Get started" })
    .evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));

  expect(tops).toHaveLength(4);
  expect(new Set(tops).size).toBe(1);
});

/**
 * The Connected card's CTA is the solid band. Its hover swipes: the band
 * empties and the ground runs back in from the start edge in 300ms
 * (Shivanshu, 2026-11-04), ending as it began.
 */
test("swipes the Connected card's CTA on hover, ending as it began", async ({ page, isMobile }) => {
  test.skip(isMobile, "hover is a mouse concern");
  const cta = pricing(page)
    .locator('[data-tone="image"]')
    .getByRole("link", { name: "Get started" });
  await cta.scrollIntoViewIfNeeded();
  const BROWN_950 = "rgb(10, 8, 7)";
  expect(await cta.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(BROWN_950);
  const ink = await cta.evaluate((el) => getComputedStyle(el).color);

  await cta.hover();
  const swipe = await cta.evaluate((el) => {
    const [animation] = el.getAnimations();
    animation!.pause();
    const name = (animation as CSSAnimation).animationName;
    const duration = animation!.effect!.getComputedTiming().duration;
    animation!.currentTime = 0;
    const from = getComputedStyle(el).backgroundSize;
    animation!.finish();
    return { name, duration, from };
  });
  expect(swipe.name).toMatch(/button-swipe$/);
  expect(swipe.duration).toBe(300);
  expect(swipe.from).toBe("0% 100%");

  await expect.poll(() => cta.evaluate((el) => getComputedStyle(el).color)).toBe(ink);
  await expectAccessible(page);
});

/**
 * No horizontal scrollbar. Four columns at a fixed minimum would be the usual
 * way to cause one, so this guards the `minmax(0, 1fr)` tracks: without the 0
 * a grid column refuses to shrink below its content and the row pushes the
 * page sideways at narrow widths.
 */
test("does not introduce a horizontal scrollbar", async ({ page }) => {
  await expectNoHorizontalOverflow(page);
});

/**
 * The gate that matters. The Connected card puts brown-900 text over a rendered
 * swirl behind a bone scrim, and 4.5:1 body contrast is an Accessibility System
 * [Floor]. axe reads the composited pixels, so this catches a scrim that is too
 * light in a way reading the stylesheet cannot.
 */
test("passes axe with no violations", async ({ page }) => {
  await pricing(page).scrollIntoViewIfNeeded();

  await expectAccessible(page, { include: "[data-pricing]" });
});
