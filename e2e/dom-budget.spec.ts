import { test, expect } from "./fixtures";

/**
 * Element budgets. Every element is parsed, styled, laid out and hydrated on
 * load, on a phone, and they are repeated in the page's embedded React data.
 * On 2026-09-28 the footer alone was 1,284 of the homepage's 1,870 elements,
 * almost all of them RollingText's four spans per letter, and CI Lighthouse
 * measured 350-400ms of blocking time. One span per letter took the homepage
 * to 911, and rolling the footer's links by whole word to 658. The budgets are the measured counts plus about a quarter, so growth
 * is a decision rather than a drift.
 *
 * Desktop Chrome only: the markup is the same on every device.
 */
const BUDGETS = [
  { path: "/", page: 820, footer: 260 },
  { path: "/contact", page: 580, footer: 260 },
  { path: "/pricing", page: 1800, footer: 260 },
];

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== "Desktop Chrome", "the markup is identical on every device");
});

for (const { path, page: pageBudget, footer: footerBudget } of BUDGETS) {
  test(`${path} stays within its element budget`, async ({ page }) => {
    await page.goto(path);
    const counts = await page.evaluate(() => ({
      page: document.querySelectorAll("body *").length,
      footer: document.querySelectorAll("footer *").length,
    }));
    expect(counts.page, `${path}: ${counts.page} elements`).toBeLessThanOrEqual(pageBudget);
    expect(counts.footer, `footer: ${counts.footer} elements`).toBeLessThanOrEqual(footerBudget);
  });
}
