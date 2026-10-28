import { expect, test, type Page } from "./fixtures";
import { expectAccessible, expectHydrated, expectNoHorizontalOverflow } from "./checks";

/**
 * The contact bar above the nav, on all three devices. From md (768px) the
 * three items share one row; below it the bar shows one at a time, stepped by
 * the arrows or swiped (native scroll snap).
 */

const bar = (page: Page) => page.getByRole("complementary", { name: "Contact Smarthaus" });
const viewport = (page: Page) => bar(page).getByRole("list").locator("..");
const prev = (page: Page) => page.getByRole("button", { name: "Previous contact" });
const next = (page: Page) => page.getByRole("button", { name: "Next contact" });
const LINKS = [/^call us at/, /^mail us at/, /^whatsapp at/];

/** Which item the scroller is showing, by the index of the one in view. */
async function shown(page: Page): Promise<number> {
  return viewport(page).evaluate((el) => Math.round(el.scrollLeft / el.clientWidth));
}

const isWide = (page: Page) => (page.viewportSize()?.width ?? 0) >= 768;

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("passes axe and does not overflow", async ({ page }) => {
  await expectAccessible(page, { include: "aside" });
  await expectNoHorizontalOverflow(page);
});

test("sits above the nav, edge to edge, on brown-900", async ({ page }) => {
  const barBox = (await bar(page).boundingBox())!;
  const width = await page.evaluate(() => document.documentElement.clientWidth);
  expect(Math.round(barBox.y)).toBe(0);
  expect(Math.round(barBox.x)).toBe(0);
  expect(Math.round(barBox.width)).toBe(width);
  await expect(bar(page)).toHaveCSS("background-color", "rgb(20, 17, 14)");
  await expect(bar(page)).toHaveCSS("color", "rgb(196, 163, 125)");
});

test("is on inner pages too", async ({ page }) => {
  await page.goto("/contact");
  await expect(bar(page)).toBeVisible();
});

test("shows no list bullets", async ({ page }) => {
  const style = await bar(page)
    .locator("li")
    .first()
    .evaluate((el) => getComputedStyle(el).listStyleType);
  expect(style).toBe("none");
});

test.describe("from md up", () => {
  test.beforeEach(({ page }) => {
    test.skip(!isWide(page), "phones get the one-at-a-time bar");
  });

  test("shows all three on one row, with no arrows", async ({ page }) => {
    const boxes = [];
    for (const name of LINKS) {
      const link = bar(page).getByRole("link", { name });
      await expect(link).toBeVisible();
      boxes.push((await link.boundingBox())!);
    }
    expect(new Set(boxes.map((box) => Math.round(box.y))).size).toBe(1);
    await expect(prev(page)).toBeHidden();
    await expect(next(page)).toBeHidden();
  });
});

test.describe("below md", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(isWide(page), "wide screens show every item");
    await expectHydrated(page);
  });

  test("shows one item, between two arrows", async ({ page }) => {
    await expect(prev(page)).toBeVisible();
    await expect(next(page)).toBeVisible();
    expect(await shown(page)).toBe(0);
    const viewBox = (await viewport(page).boundingBox())!;
    const second = (await bar(page).getByRole("link", { name: LINKS[1] }).boundingBox())!;
    expect(second.x).toBeGreaterThanOrEqual(viewBox.x + viewBox.width - 1);
  });

  test("the arrows are at least 24px, WCAG 2.5.8", async ({ page }) => {
    for (const arrow of [prev(page), next(page)]) {
      const box = (await arrow.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(24);
      expect(box.height).toBeGreaterThanOrEqual(24);
    }
  });

  test("next steps through all three and wraps to the first", async ({ page }) => {
    for (const expected of [1, 2, 0]) {
      await next(page).click();
      await expect.poll(() => shown(page)).toBe(expected);
    }
  });

  test("previous wraps from the first to the last", async ({ page }) => {
    await prev(page).click();
    await expect.poll(() => shown(page)).toBe(2);
  });

  test("the item a finger leaves half-way snaps to one whole item", async ({ page }) => {
    await expect(viewport(page)).toHaveCSS("scroll-snap-type", "x mandatory");
    await expect(viewport(page)).toHaveCSS("overflow-x", "auto");
    await viewport(page).evaluate((el) => {
      el.scrollLeft = el.clientWidth * 0.8;
    });
    await expect
      .poll(() => viewport(page).evaluate((el) => (el.scrollLeft / el.clientWidth) % 1))
      .toBe(0);
  });

  test("tabbing to a hidden item brings it into view", async ({ page }) => {
    await bar(page).getByRole("link", { name: LINKS[2] }).focus();
    await expect.poll(() => shown(page)).toBe(2);
  });
});
