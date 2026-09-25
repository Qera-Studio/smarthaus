import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

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
 * The prices are the reason anyone scrolls this far, so an empty card is worse
 * than a broken one: it looks intentional.
 */
test("prints a price on every tier", async ({ page }) => {
  const cards = pricing(page).locator("[data-tone]");

  for (const card of await cards.all()) {
    await expect(card).toContainText(/AED [\d,]+\+/);
  }
});

/**
 * The ground is painted by a pseudo-element escaping body's 1440px cap. If that
 * escape breaks the section still renders, just with bare canvas either side of
 * it, which no functional assertion would notice.
 *
 * Checked at a width well past the cap, which is the only place it can fail.
 */
test("paints its ground to both viewport edges past the content cap", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });

  const section = pricing(page);
  await section.scrollIntoViewIfNeeded();

  // The section box itself stays inside the cap; the ground behind it does not.
  // Sampling the page's own background at the far left, level with the section,
  // is the only way to see the pseudo-element from outside.
  const box = await section.boundingBox();
  expect(box).not.toBeNull();

  const groundAtEdge = await page.evaluate(
    (y) => {
      const el = document.elementFromPoint(4, y);
      return el ? getComputedStyle(el).backgroundColor : null;
    },
    Math.round(box!.y + box!.height / 2),
  );

  // Whatever is under the pointer at the edge must not be the page's own
  // brown-100 canvas showing through.
  expect(groundAtEdge).not.toBe("rgb(240, 233, 221)");
});

/**
 * No horizontal scrollbar. The ground overhangs the viewport by design and
 * relies on html's `overflow-x: clip` to contain it, which is exactly the kind
 * of thing a later change to globals.scss could remove without anyone noticing.
 */
test("does not introduce a horizontal scrollbar", async ({ page }) => {
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);
});

/**
 * The gate that matters. The Connected card puts brown-900 text over a rendered
 * swirl behind a bone scrim, and 4.5:1 body contrast is an Accessibility System
 * [Floor]. axe reads the composited pixels, so this catches a scrim that is too
 * light in a way reading the stylesheet cannot.
 */
test("passes axe with no violations", async ({ page }) => {
  await pricing(page).scrollIntoViewIfNeeded();

  const results = await new AxeBuilder({ page }).include("[data-pricing]").analyze();

  expect(results.violations).toEqual([]);
});
