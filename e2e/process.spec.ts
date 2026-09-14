import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * The "Our Process" rail.
 *
 * What matters here is the part a DOM assertion cannot see: that vertical
 * scrolling actually moves the track sideways, that the page itself never gains
 * a horizontal scrollbar while it does, and that the whole mechanism steps
 * aside under prefers-reduced-motion rather than trapping the reader in a
 * section that will not move.
 */

const rail = (page: import("@playwright/test").Page) => page.locator("[data-process]");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("renders six steps with headings in the accessibility tree", async ({ page }) => {
  const items = rail(page).locator("ol > li");
  await expect(items).toHaveCount(6);

  // Every heading is present at all times, whatever the track's offset. This is
  // what gives a screen-reader user the whole section linearly, without ever
  // scrolling sideways.
  for (const name of [
    "Complete home automation cycle",
    "Site Assessment",
    "Proposal",
    "Installation",
    "Handover",
    "Care",
  ]) {
    await expect(rail(page).getByRole("heading", { level: 3, name })).toBeAttached();
  }
});

test("keeps the homepage to one h1 and titles the section with an h2", async ({ page }) => {
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(rail(page).getByRole("heading", { level: 2, name: "Our Process" })).toBeVisible();
});

test("exposes the rail as a focusable, labelled scroll region", async ({ page }) => {
  // axe's scrollable-region-focusable. Without this the section fails the
  // accessibility gate, which is set to 1.0 with no slack. Same treatment as
  // LegalTable, where it first failed on the Pixel 7 profile.
  const region = rail(page).getByRole("group");
  await expect(region).toHaveAttribute("tabindex", "0");
  await expect(region).toHaveAttribute("aria-label", /process/i);
});

test("passes axe accessibility checks", async ({ page }) => {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("no em dashes in the copy", async ({ page }) => {
  const copy = await rail(page).textContent();
  expect(copy).not.toContain("—");
});

test("vertical scrolling drives the track sideways, and the page never scrolls sideways", async ({
  page,
}) => {
  const track = rail(page).locator("ol");
  const before = await track.evaluate((el) => getComputedStyle(el).translate);

  const box = await rail(page).evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return { top: rect.top + window.scrollY, height: rect.height };
  });
  // Halfway through the pin window.
  await page.evaluate(
    ({ top, height }) => window.scrollTo(0, top + (height - window.innerHeight) / 2),
    box,
  );
  await page.waitForTimeout(400);

  const after = await track.evaluate((el) => getComputedStyle(el).translate);
  expect(after).not.toBe(before);

  // The whole point of the clipped viewport: the rail moves, the document does
  // not. A horizontal scrollbar here would mean the track escaped its box.
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);
});

test("reaches the last page by the end of the pin window", async ({ page }) => {
  const box = await rail(page).evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return { top: rect.top + window.scrollY, height: rect.height };
  });
  await page.evaluate(({ top, height }) => window.scrollTo(0, top + height), box);
  await page.waitForTimeout(400);

  // Six pages, so the track travels five of them: -83.33% of its own width.
  // Asserted as a range rather than a string because the browser rounds.
  const percent = await rail(page)
    .locator("ol")
    .evaluate((el) => parseFloat(getComputedStyle(el).translate));
  expect(percent).toBeLessThan(0);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("drops the pin and hands the rail back to the reader", async ({ page }) => {
    await page.goto("/");

    // The spacer collapses: no pin means no scroll distance to absorb, and
    // leaving five viewports of empty height behind would strand the reader.
    const height = await rail(page).evaluate((el) => (el as HTMLElement).offsetHeight);
    expect(height).toBeLessThan(2000);

    // The track holds still and the region becomes a real scroll container, so
    // every page is still reachable by hand and by keyboard.
    const track = rail(page).locator("ol");
    await expect(track).toHaveCSS("translate", "none");
    await expect(rail(page).getByRole("group")).toHaveCSS("overflow-x", "auto");
  });
});
