import { test, expect, type Locator } from "./fixtures";
import { withConsentDecided } from "./checks";

/**
 * The cursor is the brown dot everywhere, controls included. It used to be
 * hidden over buttons (`cursor: none`) and component stylesheets set the hand
 * elsewhere; both are gone on the client's call. Asserted in a real browser
 * with a fine pointer: the computed cursor over each kind of control is the
 * same dot html carries, or the light dot on a dark ground.
 */

test.skip(({ isMobile }) => isMobile, "the cursor is a mouse concern");

test.beforeEach(async ({ page }) => {
  await withConsentDecided(page);
  await page.goto("/");
});

const DARK_DOT = "%2314110E";
const LIGHT_DOT = "%23F8F5F0";

async function cursorOf(control: Locator) {
  await control.scrollIntoViewIfNeeded();
  await control.hover();
  return control.evaluate((el) => getComputedStyle(el).cursor);
}

test("html carries the dark dot", async ({ page }) => {
  const root = await page.evaluate(() => getComputedStyle(document.documentElement).cursor);
  expect(root).toContain(DARK_DOT);
});

test("the nav and hero CTAs show the dot, not a hand and not nothing", async ({ page }) => {
  for (const link of [
    page.locator("header").getByRole("link", { name: "Book a site visit" }),
    // The hero's one CTA; Explore Villa left with the fluid hero (2026-09-28).
    page.locator("section[data-hero]").getByRole("link", { name: "Book a site visit" }),
  ]) {
    expect(await cursorOf(link)).toContain(DARK_DOT);
  }
});

test("a Button link and everything inside it show the dot", async ({ page }) => {
  const link = page.getByRole("link", { name: /Visit Maple Technologies/ });
  expect(await cursorOf(link)).toContain(DARK_DOT);
  const inner = await link.evaluate((el) =>
    Array.from(el.querySelectorAll("*")).map((c) => getComputedStyle(c).cursor),
  );
  for (const c of inner) expect(c).toContain(DARK_DOT);
});

test("the carousel's tabs and pause button show the dot", async ({ page }) => {
  expect(await cursorOf(page.getByRole("tab").first())).toContain(DARK_DOT);
  expect(await cursorOf(page.getByRole("button", { name: "Pause automatic advance" }))).toContain(
    DARK_DOT,
  );
});

test("a control on a dark ground shows the light dot", async ({ page }) => {
  const link = page.locator("footer").getByRole("link").first();
  expect(await cursorOf(link)).toContain(LIGHT_DOT);
});

test("form fields and their labels show the dot on the contact page", async ({ page }) => {
  await page.goto("/contact");
  const field = page.getByRole("textbox").first();
  expect(await cursorOf(field)).toContain("data:image/svg+xml");
  const label = page.locator("label").first();
  expect(await cursorOf(label)).toContain("data:image/svg+xml");
});

test("no element on the homepage uses any cursor but a dot", async ({ page }) => {
  const others = await page.evaluate(() =>
    Array.from(document.querySelectorAll("body *"))
      .map((el) => ({ el: el.outerHTML.slice(0, 80), cursor: getComputedStyle(el).cursor }))
      .filter(({ cursor }) => !cursor.includes("data:image/svg+xml")),
  );
  expect(others).toEqual([]);
});
