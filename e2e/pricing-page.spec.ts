import { test, expect } from "./fixtures";
import { expectAccessible, expectNoEmDash, expectNoHorizontalOverflow } from "./checks";

/**
 * The /pricing page: four cards, then the comparison.
 *
 * What the unit suite cannot see is here: that the sticky feature column and
 * the sideways scroll only exist in a real layout, that the page itself never
 * scrolls sideways, and that axe is happy with a focusable scroll region full
 * of nested <details>.
 *
 * Keyed on [data-pricing-comparison]: the module's class names are hashed.
 */

const comparison = (page: import("@playwright/test").Page) =>
  page.locator("[data-pricing-comparison]");

test.beforeEach(async ({ page }) => {
  await page.goto("/pricing");
});

test("responds 200, with one h1 and the comparison under an h2", async ({ page }) => {
  const response = await page.goto("/pricing");
  expect(response?.status()).toBe(200);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1, name: "Pricing" })).toBeVisible();
  await expect(
    comparison(page).getByRole("heading", { level: 2, name: "Compare all features" }),
  ).toBeVisible();
});

test("shows the four tiers, each reaching the enquiry form", async ({ page }) => {
  await expect(page.locator("[data-tone]")).toHaveCount(4);
  const ctas = page.getByRole("link", { name: "Get started" });
  await expect(ctas).toHaveCount(4);
  for (const cta of await ctas.all()) await expect(cta).toHaveAttribute("href", "/contact");
});

test("opens every section on load", async ({ page }) => {
  const sections = comparison(page).locator("details:not(details details)");
  const count = await sections.count();
  expect(count).toBeGreaterThan(0);
  for (const s of await sections.all()) await expect(s).toHaveAttribute("open", "");
});

test("reveals a row's description on click and hides it again", async ({ page }) => {
  const row = comparison(page).locator("details details").first();
  const description = row.locator("p");

  await expect(row).not.toHaveAttribute("open", "");
  await expect(description).toBeHidden();

  await row.locator("summary").click();
  await expect(row).toHaveAttribute("open", "");
  await expect(description).toBeVisible();

  await row.locator("summary").click();
  await expect(row).not.toHaveAttribute("open", "");
});

test("collapses a whole section from its summary", async ({ page }) => {
  const section = comparison(page).locator("details:not(details details)").first();
  await section.locator("> summary").click();
  await expect(section).not.toHaveAttribute("open", "");
  await expect(section.locator("details details").first()).toBeHidden();
});

/**
 * The scroll region scrolls; the page does not. Both halves matter: a table
 * that fits by crushing its columns passes the second and fails the visitor,
 * and one that overflows the document passes neither.
 */
test("scrolls the comparison sideways at phone width, not the page", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await comparison(page).scrollIntoViewIfNeeded();

  await expectNoHorizontalOverflow(page);

  const region = comparison(page).getByRole("group", { name: /feature comparison/i });
  const regionOverflows = await region.evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(regionOverflows).toBe(true);
});

test("pins the feature column while the tier columns scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await comparison(page).scrollIntoViewIfNeeded();

  const region = comparison(page).getByRole("group", { name: /feature comparison/i });
  const firstCell = comparison(page).locator("details details").first();
  const regionLeft = (await region.boundingBox())!.x;

  const before = (await firstCell.boundingBox())!.x;
  await region.evaluate((el) => {
    el.scrollLeft = 200;
  });
  const after = (await firstCell.boundingBox())!.x;

  // Sticky: it did not move with the scroll, and it sits at the region's edge.
  expect(Math.abs(after - before)).toBeLessThan(2);
  expect(after - regionLeft).toBeLessThan(2);
});

/**
 * The header row holds still against the viewport once the table is scrolled
 * past, under the nav capsule at desktop and at the top edge where the nav is
 * at the bottom. Desktop and tablet only: below md the region is a horizontal
 * scroll container, and nothing inside one can pin to the page.
 */
test("freezes the header row under the nav while the table scrolls", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "Desktop Chrome", "the region scrolls sideways on phones");

  const head = comparison(page).locator("[aria-hidden='true']").first();
  const midTable = await comparison(page)
    .locator("details:not(details details)")
    .nth(3)
    .evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  await page.evaluate((y) => window.scrollTo(0, y), midTable);

  // The painted box starts at the viewport's top edge, so nothing scrolling
  // past shows between the capsule and the row; the text sits below the
  // capsule. 76 = --nav-float-inset + --nav-bar-block-size.
  const box = (await head.boundingBox())!;
  expect(Math.round(box.y)).toBe(0);
  const textTop = await head.evaluate((el) => {
    const s = getComputedStyle(el);
    return el.getBoundingClientRect().top + parseFloat(s.paddingTop);
  });
  const nav = (await page.getByRole("banner").boundingBox())!;
  expect(textTop).toBeGreaterThanOrEqual(nav.y + nav.height);
  expect(Math.round(textTop)).toBe(76 + 12);
});

test("tells crawlers to wait while the figures are unconfirmed", async ({ page }) => {
  const robots = page.locator('meta[name="robots"]');
  await expect(robots).toHaveAttribute("content", /noindex/);
  await expect(robots).toHaveAttribute("content", /follow/);
});

test("carries no placeholder marks and no em dashes", async ({ page }) => {
  await expect(page.locator("[data-placeholder]")).toHaveCount(0);
  await expectNoEmDash(page.locator("main"));
});

test("answers a handful of pricing questions in the FAQ accordion", async ({ page }) => {
  const faqs = page.locator('section[aria-labelledby="pricing-faqs"]');
  await expect(
    faqs.getByRole("heading", { level: 2, name: "Frequently Asked Questions" }),
  ).toBeVisible();

  const entries = faqs.locator("details");
  expect(await entries.count()).toBeGreaterThanOrEqual(4);

  const first = entries.first();
  await expect(first).not.toHaveAttribute("open", "");
  await first.locator("summary").click();
  await expect(first).toHaveAttribute("open", "");
});

test("closes with a primary to the form and a secondary to the full FAQ", async ({ page }) => {
  await expect(page.getByRole("link", { name: "Book a site visit" }).last()).toHaveAttribute(
    "href",
    "/contact",
  );
  await expect(page.getByRole("link", { name: "Read the full FAQ" })).toHaveAttribute(
    "href",
    "/faq",
  );
});

test("passes axe with no violations", async ({ page }) => {
  await expectAccessible(page);
});

test("the homepage's comparison button now lands here", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "View detailed pricing" })).toHaveAttribute(
    "href",
    "/pricing",
  );
});
