import { test, expect, type Page } from "./fixtures";
import { expectHydrated } from "./checks";
import { NAV_LINKS } from "../src/lib/nav-links";

/**
 * The page by keyboard alone (WCAG 2.1.1, 2.1.2, 2.4.1, 2.4.3). Desktop Chrome
 * only: WebKit, like Safari on a Mac, skips links on Tab unless the reader
 * turns that on, so a Tab walk there tests a browser setting, not the page.
 */
test.beforeEach(async ({}, info) => {
  test.skip(info.project.name !== "Desktop Chrome", "Tab reaches links only in Chromium");
});

/**
 * What has focus: a stable id per element (so four links all named "Get
 * started" are still four stops), and a name a failure message can print.
 */
const focused = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __ids?: WeakMap<Element, number>; __next?: number };
    w.__ids ??= new WeakMap();
    w.__next ??= 0;
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body)
      return { id: -1, name: "body", inMain: false, inFooter: false };
    if (!w.__ids.has(el)) w.__ids.set(el, (w.__next += 1));
    const label =
      el.getAttribute("aria-label") ??
      el.querySelector("[aria-label]")?.getAttribute("aria-label") ??
      el.textContent?.trim().slice(0, 40) ??
      "";
    return {
      id: w.__ids.get(el)!,
      name: `${el.tagName.toLowerCase()} "${label}"`,
      inMain: !!el.closest("main"),
      inFooter: !!el.closest("footer"),
    };
  });

test("the first Tab lands on the skip link, and it shows", async ({ page }) => {
  await page.goto("/");
  await expectHydrated(page);
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await expect(skip).toBeFocused();
  // Visually hidden until focused: a 1px clip would pass toBeFocused and
  // still leave a sighted keyboard user with nothing to see.
  const box = (await skip.boundingBox())!;
  expect(box.width).toBeGreaterThan(40);
  expect(box.height).toBeGreaterThan(20);
  await expect(skip).toBeInViewport();
});

test("the skip link moves the next Tab into the main content", async ({ page }) => {
  await page.goto("/contact");
  await expectHydrated(page);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main-content$/);
  await page.keyboard.press("Tab");
  const now = await focused(page);
  expect(now.inMain, `the Tab after skipping landed on ${now.name}`).toBe(true);
});

/**
 * KNOWN FAILURE, found 2026-09-27. The header's source order is the panel of
 * nav links first, then the home link, then the CTA (NavShell.tsx: the panel
 * comes first so the phone menu grows upward from the bottom bar). On desktop
 * the home link sits at the far left, so Tab runs through the centre links,
 * jumps back to the logo, then right to the CTA (WCAG 2.4.3 Focus Order).
 * Fixing it trades against the phone layout, so it is Shivanshu's decision.
 * `test.fail` passes while the order is wrong and fails the day it is fixed.
 */
test("the header reads in order: skip, home, every nav link, then the CTA", async ({ page }) => {
  test.fail(true, "nav links precede the home link in source order; decision pending");
  await page.goto("/");
  await expectHydrated(page);
  const header = page.locator("header");
  const stops = [
    page.getByRole("link", { name: "Skip to main content" }),
    header.getByRole("link", { name: "Smarthaus — home" }).last(),
    ...NAV_LINKS.map((link) => header.getByRole("link", { name: link.label, exact: true })),
    header.getByRole("link", { name: "Book a site visit" }),
  ];
  for (const stop of stops) {
    await page.keyboard.press("Tab");
    await expect(stop).toBeFocused({ timeout: 1_000 });
  }
});

for (const route of ["/", "/contact", "/pricing"]) {
  test(`${route}: Tab walks the whole page to the footer without a trap`, async ({ page }) => {
    await page.goto(route);
    await expectHydrated(page);
    const names: string[] = [];
    let lastId = 0;
    let reachedFooter = false;
    let reachedMain = false;
    // A trap shows as focus that stops moving: the same element twice in a
    // row. The cap only bounds a runaway; the homepage has well under it.
    for (let i = 0; i < 250; i += 1) {
      await page.keyboard.press("Tab");
      const now = await focused(page);
      if (now.id !== -1 && now.id === lastId) {
        throw new Error(`focus stuck on ${now.name} after ${names.join(" > ")}`);
      }
      names.push(now.name);
      lastId = now.id;
      reachedMain ||= now.inMain;
      reachedFooter ||= now.inFooter;
      if (reachedFooter && !now.inFooter) break;
    }
    expect(reachedMain, "Tab never entered the main content").toBe(true);
    expect(reachedFooter, `Tab never reached the footer: ${names.join(" > ")}`).toBe(true);
  });
}
