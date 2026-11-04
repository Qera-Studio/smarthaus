import type { Page } from "@playwright/test";

import { test, expect } from "./fixtures";
import {
  expectAccessible,
  expectHydrated,
  expectNoEmDash,
  expectNoHorizontalOverflow,
} from "./checks";

/**
 * "By the numbers", under the hardware carousel. What only a browser shows: that
 * the four cards really are one size, that they sit two by two at every
 * width, that the title takes the left half once the columns are side by
 * side, and that the cards' ground is the tint asked for, not the canvas.
 */

const section = (page: Page) => page.getByRole("region", { name: "By the numbers" });
const cards = (page: Page) => section(page).getByRole("listitem");

const boxes = async (page: Page) =>
  cards(page).evaluateAll((all) =>
    all.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    }),
  );

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await section(page).scrollIntoViewIfNeeded();
});

test.describe("the figures' roll", () => {
  const first = (page: Page) => section(page).locator("[data-stat-value]").first();
  const roll = (page: Page) => first(page).getAttribute("data-roll");

  test("waits at zero off screen, rolls up on arrival, and leaves the real figure", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, 0));
    await expectHydrated(page);
    // beforeEach came here once already, on the page before this one.
    await expect.poll(() => roll(page)).toBe("0+");
    await expect(first(page)).toHaveText("150+");

    await first(page).evaluate((el) => el.scrollIntoView({ block: "center" }));
    await expect.poll(() => roll(page).then((v) => v !== "0+")).toBe(true);
    // The real figure throughout, and the drawn one gone at the end.
    await expect(first(page)).toHaveText("150+");
    await expect(first(page)).not.toHaveAttribute("data-roll", /.*/, { timeout: 4_000 });
    await expect(first(page)).toHaveCSS("color", /rgb\(/);
  });

  test("while it rolls, only the drawn digits show", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, 0));
    await expectHydrated(page);
    await expect.poll(() => roll(page)).toBe("0+");
    const style = await first(page).evaluate((el) => ({
      ink: getComputedStyle(el).color,
      drawn: getComputedStyle(el, "::after").content,
      drawnInk: getComputedStyle(el, "::after").color,
    }));
    expect(style.ink).toBe("rgba(0, 0, 0, 0)");
    expect(style.drawn).toContain("0+");
    expect(style.drawnInk).not.toBe(style.ink);
  });

  test("a print of the page gets the real figures", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, 0));
    await expectHydrated(page);
    await expect.poll(() => roll(page)).toBe("0+");
    await page.emulateMedia({ media: "print" });
    await expect(first(page)).not.toHaveCSS("color", "rgba(0, 0, 0, 0)");
  });

  test.describe("under reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("the figures simply stand", async ({ page }) => {
      await page.goto("/");
      await expectHydrated(page);
      await expect(first(page)).not.toHaveAttribute("data-roll", /.*/);
      await expect(first(page)).toHaveText("150+");
    });
  });
});

test("sits directly below the hardware carousel", async ({ page }) => {
  // 2026-11-04, at Shivanshu's call, back where it was before 2026-10-28: the
  // carousel keeps the two plain sections apart.
  const next = await page
    .locator('main > section[aria-labelledby="hardware"]')
    .evaluate((el) => el.nextElementSibling?.getAttribute("aria-labelledby"));
  expect(next).toBe("stats");
});

test("shows the four figures, number first", async ({ page }) => {
  await expect(cards(page)).toHaveText([
    "150+ Residential clients served",
    "200+ Homes fitted in residential deals",
    "350+ Systems installed in all segments",
    "90% Contract renewal rate for annual maintenance packages",
  ]);
});

test("draws the cards two by two, every one the same size", async ({ page }) => {
  const [a, b, c, d] = await boxes(page);
  // Two rows of two: the first pair shares a top, as does the second, and
  // the columns line up.
  expect(b!.y).toBeCloseTo(a!.y, 0);
  expect(d!.y).toBeCloseTo(c!.y, 0);
  expect(c!.y).toBeGreaterThan(a!.y + a!.height - 1);
  expect(c!.x).toBeCloseTo(a!.x, 0);
  expect(d!.x).toBeCloseTo(b!.x, 0);
  for (const box of [b, c, d]) {
    expect(box!.width).toBeCloseTo(a!.width, 0);
    expect(box!.height).toBeCloseTo(a!.height, 0);
  }
});

test("keeps every label inside its card", async ({ page }) => {
  const overflowing = await cards(page).evaluateAll((all) =>
    all.filter((el) => el.scrollHeight > el.clientHeight + 1).map((el) => el.textContent),
  );
  expect(overflowing).toEqual([]);
});

test("puts the title on the left half once the columns sit side by side", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "The title stacks above the grid on a phone.");
  const heading = await section(page).getByRole("heading", { level: 2 }).boundingBox();
  const [first] = await boxes(page);
  const middle = await section(page).evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.x + r.width / 2;
  });
  expect(heading!.x + heading!.width).toBeLessThanOrEqual(middle);
  expect(first!.x).toBeGreaterThanOrEqual(middle);
  // Title and first row share a top line, as in the enquiry below.
  expect(Math.abs(heading!.y - first!.y)).toBeLessThan(heading!.height);
});

test("grounds each card in brown-200 at half strength over the canvas", async ({ page }) => {
  const backgrounds = await cards(page).evaluateAll((all) =>
    all.map((el) => getComputedStyle(el).backgroundColor),
  );
  expect(new Set(backgrounds)).toEqual(new Set(["rgba(216, 199, 172, 0.5)"]));
});

test("draws the cards square and borderless, on their ground alone", async ({ page }) => {
  // The 1px border came off on 2026-10-07, at Shivanshu's call.
  const edges = await cards(page).evaluateAll((all) =>
    all.map((el) => {
      const style = getComputedStyle(el);
      return [style.borderTopLeftRadius, style.borderTopWidth, style.borderLeftWidth];
    }),
  );
  edges.forEach((edge) => expect(edge).toEqual(["0px", "0px", "0px"]));
});

test("is accessible, and fits the screen", async ({ page }) => {
  await expectAccessible(page, { include: "[data-stats]" });
  await expectNoHorizontalOverflow(page);
  await expectNoEmDash(section(page));
});

test("the cards are 16px apart, across and down", async ({ page }) => {
  await page.goto("/");
  const grid = page.locator("[data-stats] ul");
  await grid.scrollIntoViewIfNeeded();
  const [row, column] = await grid.evaluate((el) => [
    getComputedStyle(el).rowGap,
    getComputedStyle(el).columnGap,
  ]);
  expect(row).toBe("16px");
  expect(column).toBe("16px");
});
