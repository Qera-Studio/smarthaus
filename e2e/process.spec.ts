import type { Page } from "@playwright/test";

import { test, expect } from "./fixtures";
import { expectAccessible, expectNoEmDash, expectNoHorizontalOverflow } from "./checks";

/**
 * The "Our Process" stack: six full-screen sheets, each pinned at the top of
 * the screen while the next rises from the bottom edge and covers it.
 *
 * What matters is what only a browser shows: that a sheet really holds still
 * and the next really paints over it, that every sheet's copy and pictures
 * fit the one screen it has (a pinned sheet's foot is otherwise covered
 * before anyone reads it), and that the stack steps aside where it cannot
 * work.
 */

const section = (page: Page) => page.locator("[data-process]");
const sheets = (page: Page) => section(page).locator("ol > li");

/** Where each sheet sits in the document before sticky moves it. */
async function naturalTops(page: Page) {
  return section(page)
    .locator("ol")
    .evaluate((list) => {
      let top = list.getBoundingClientRect().top + window.scrollY;
      return [...list.children].map((sheet) => {
        const at = top;
        top += (sheet as HTMLElement).offsetHeight;
        return at;
      });
    });
}

/**
 * Scrolls, then waits until the page is actually there and has painted.
 * One frame was enough locally; under CI load WebKit had not settled the
 * scroll by then, and the sheets read 17px short of where they would be.
 */
async function scrollTo(page: Page, y: number) {
  await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
  await expect
    .poll(() =>
      page.evaluate((top) => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        return Math.abs(window.scrollY - Math.min(top, max));
      }, y),
    )
    .toBeLessThan(1);
  await page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
  );
}

/**
 * Which sheet paints topmost at a point, or -1 when the page there is not a
 * sheet. Fixed overlays (the nav, the consent banner, back to top) are looked
 * through: they float over everything and say nothing about the stack.
 */
function sheetAt(page: Page, x: number, y: number) {
  return page.evaluate(
    ([px, py]) => {
      const floating = (el: Element | null): boolean =>
        !!el && (getComputedStyle(el).position === "fixed" || floating(el.parentElement));
      const hit = document.elementsFromPoint(px!, py!).find((el) => !floating(el));
      const sheet = hit?.closest("[data-process] ol > li");
      return sheet ? [...sheet.parentElement!.children].indexOf(sheet) : -1;
    },
    [x, y],
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("renders six sheets with their headings in order", async ({ page }) => {
  await expect(sheets(page)).toHaveCount(6);
  await expect(section(page).getByRole("heading", { level: 3 })).toHaveText([
    "Complete home automation cycle",
    "Site Assessment",
    "Proposal",
    "Installation",
    "Handover",
    "Care",
  ]);
});

test("keeps the homepage to one h1 and titles the section with an h2", async ({ page }) => {
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(
    section(page).getByRole("heading", { level: 2, name: "Our Process" }),
  ).toBeAttached();
});

test("passes axe accessibility checks", async ({ page }) => {
  await expectAccessible(page);
});

test("no em dashes in the copy", async ({ page }) => {
  await expectNoEmDash(section(page));
});

test("each sheet is one screen tall, and its copy and pictures fit inside it", async ({ page }) => {
  const viewport = page.viewportSize()!;
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  const sizes = await sheets(page).evaluateAll((all) =>
    all.map((sheet) => {
      const box = sheet.getBoundingClientRect();
      const floor = box.bottom - parseFloat(getComputedStyle(sheet).paddingBlockEnd);
      const parts = [...sheet.children].map((child) => child.getBoundingClientRect());
      return {
        height: box.height,
        width: box.width,
        overflow: Math.max(...parts.map((part) => part.bottom - floor)),
        // The smallest picture, so a frame squeezed to nothing fails.
        frame: Math.min(...parts.slice(1).map((part) => part.height), Infinity),
      };
    }),
  );
  for (const sheet of sizes) {
    expect(Math.abs(sheet.height - viewport.height)).toBeLessThanOrEqual(1);
    expect(sheet.width).toBe(clientWidth);
    expect(sheet.overflow).toBeLessThanOrEqual(1);
    expect(sheet.frame).toBeGreaterThanOrEqual(80);
  }
});

test("on a phone, a pinned sheet's copy and pictures stop above the floating nav", async ({
  page,
}) => {
  test.skip(page.viewportSize()!.width >= 1024, "the nav is a top capsule from lg");
  const tops = await naturalTops(page);
  // The site header is the floating bar below lg. Its top edge is the line
  // the copy must stay above; a locator that found something else would put
  // it near the top of the screen, so that is checked first.
  const navTop = await page
    .locator("header")
    .first()
    .evaluate((nav) => nav.getBoundingClientRect().top);
  expect(navTop).toBeGreaterThan(page.viewportSize()!.height / 2);
  for (const [index, top] of tops.entries()) {
    await scrollTo(page, top);
    const lowest = await sheets(page)
      .nth(index)
      .evaluate((sheet) =>
        Math.max(...[...sheet.children].map((child) => child.getBoundingClientRect().bottom)),
      );
    expect(lowest).toBeLessThanOrEqual(navTop);
  }
});

test("a sheet holds still while the next rises over it from the bottom", async ({ page }) => {
  const { width, height } = page.viewportSize()!;
  const tops = await naturalTops(page);

  // Halfway through the second sheet's arrival.
  await scrollTo(page, tops[1]! - height / 2);
  const boxes = await sheets(page).evaluateAll((all) =>
    all.slice(0, 2).map((sheet) => sheet.getBoundingClientRect().top),
  );
  expect(Math.abs(boxes[0]!)).toBeLessThanOrEqual(1);
  expect(Math.abs(boxes[1]! - height / 2)).toBeLessThanOrEqual(1);
  expect(await sheetAt(page, width / 2, height / 4)).toBe(0);
  expect(await sheetAt(page, width / 2, (height * 3) / 4)).toBe(1);

  // Arrived: the second covers the first entirely.
  await scrollTo(page, tops[1]!);
  expect(await sheetAt(page, width / 2, height / 4)).toBe(1);
  expect(await sheetAt(page, width / 2, (height * 3) / 4)).toBe(1);
  await expectNoHorizontalOverflow(page);
});

test("ends on Care, then the stack leaves together", async ({ page }) => {
  const { width, height } = page.viewportSize()!;
  const tops = await naturalTops(page);

  await scrollTo(page, tops[5]!);
  expect(await sheetAt(page, width / 2, height / 2)).toBe(5);

  // Half a screen on: every sheet has gone up with the last one, and the
  // lower half of the screen is the next section.
  await scrollTo(page, tops[5]! + height / 2);
  const bottoms = await sheets(page).evaluateAll((all) =>
    all.map((sheet) => sheet.getBoundingClientRect().bottom),
  );
  bottoms.forEach((bottom) => expect(bottom).toBeLessThanOrEqual(height / 2 + 1));
  expect(await sheetAt(page, width / 2, (height * 3) / 4)).toBe(-1);
});

test("leaves the section above alone: no overlap and nothing held", async ({ page }) => {
  const above = section(page).locator("xpath=preceding-sibling::*[1]");
  const [aboveBottom, top] = await Promise.all([
    above.evaluate((el) => el.getBoundingClientRect().bottom),
    section(page).evaluate((el) => el.getBoundingClientRect().top),
  ]);
  expect(top).toBeGreaterThanOrEqual(aboveBottom - 1);
  await expect(above).toHaveCSS("animation-name", "none");
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("lays the sheets out one after another, with nothing pinned", async ({ page }) => {
    await page.goto("/");
    const styles = await sheets(page).evaluateAll((all) =>
      all.map((sheet) => getComputedStyle(sheet).position),
    );
    expect(styles).toEqual(Array(6).fill("static"));
    await expectNoHorizontalOverflow(page);
  });
});

test.describe("a short screen", () => {
  test("stops pinning when a sheet could not fit, and gives the pictures their own height", async ({
    page,
  }) => {
    await page.setViewportSize({ width: page.viewportSize()!.width, height: 480 });
    const sizes = await sheets(page).evaluateAll((all) =>
      all.map((sheet) => ({
        position: getComputedStyle(sheet).position,
        frames: [...sheet.children].slice(1).map((frame) => frame.getBoundingClientRect().height),
      })),
    );
    for (const sheet of sizes) {
      expect(sheet.position).toBe("static");
      sheet.frames.forEach((frame) => expect(frame).toBeGreaterThan(80));
    }
  });
});
