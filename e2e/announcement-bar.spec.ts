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

test("sits above the nav, edge to edge, brown-100 at 70% on brown-900", async ({ page }) => {
  const barBox = (await bar(page).boundingBox())!;
  const width = await page.evaluate(() => document.documentElement.clientWidth);
  expect(Math.round(barBox.y)).toBe(0);
  expect(Math.round(barBox.x)).toBe(0);
  expect(Math.round(barBox.width)).toBe(width);
  await expect(bar(page)).toHaveCSS("background-color", "rgb(20, 17, 14)");
  // brown-100 at 70%: Chromium reports the mix as color(srgb ... / 0.7).
  const color = await bar(page).evaluate((el) => getComputedStyle(el).color);
  expect(color).toMatch(/0\.7\)$/);
  expect(color).toMatch(/^color\(srgb 0\.94\d* 0\.91\d* 0\.86\d*|^rgba\(240, 233, 221/);
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

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("every link is in the HTML and works as a plain link", async ({ page }) => {
    await page.goto("/");
    for (const name of LINKS) {
      await expect(bar(page).getByRole("link", { name })).toHaveCount(1);
    }
    expect(await bar(page).getByRole("link", { name: LINKS[0] }).getAttribute("href")).toBe(
      "tel:+971543755150",
    );
  });

  test("a phone can still swipe to the other items", async ({ page }) => {
    test.skip(isWide(page), "wide screens show every item");
    await page.goto("/");
    await viewport(page).evaluate((el) => {
      el.scrollLeft = el.clientWidth;
    });
    await expect.poll(() => shown(page)).toBe(1);
  });
});

test.describe("keyboard, from md up", () => {
  test("Tab reaches the three links in reading order, and no arrow", async ({ page }) => {
    test.skip(!isWide(page), "phones get the arrows in the order");
    await page.goto("/");
    await expectHydrated(page);
    await page.getByRole("link", { name: "Skip to main content" }).focus();
    for (const name of LINKS) {
      await page.keyboard.press("Tab");
      await expect(bar(page).getByRole("link", { name })).toBeFocused();
    }
  });
});

test.describe("keyboard, below md", () => {
  test("Tab runs previous arrow, the links, then the next arrow", async ({ page }) => {
    test.skip(isWide(page), "wide screens hide the arrows");
    test.skip(
      test.info().project.name === "iPhone 17",
      "WebKit only tabs to links with the Safari option set",
    );
    await page.goto("/");
    await expectHydrated(page);
    await page.getByRole("link", { name: "Skip to main content" }).focus();
    const stops = [
      prev(page),
      ...LINKS.map((name) => bar(page).getByRole("link", { name })),
      next(page),
    ];
    for (const stop of stops) {
      await page.keyboard.press("Tab");
      await expect(stop).toBeFocused();
    }
  });

  test("Enter on next steps the bar", async ({ page }) => {
    test.skip(isWide(page), "wide screens hide the arrows");
    await page.goto("/");
    await expectHydrated(page);
    await next(page).focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => shown(page)).toBe(1);
  });
});

// Runs only in the zoom-200 project: 720 CSS px, below md.
test.describe("200% zoom @zoom", () => {
  test("becomes the one-at-a-time bar, and still fits", async ({ page }) => {
    await page.goto("/");
    await expect(next(page)).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await next(page).click();
    await expect.poll(() => shown(page)).toBe(1);
  });
});

// Runs only in the forced-colors project.
test.describe("forced colours @forced-colors", () => {
  test("the links stay readable on the bar", async ({ page }) => {
    await page.goto("/");
    for (const name of LINKS) {
      await expect(bar(page).getByRole("link", { name })).toBeVisible();
    }
    const [fg, bg] = await bar(page).evaluate((el) => [
      getComputedStyle(el).color,
      getComputedStyle(el).backgroundColor,
    ]);
    expect(fg).not.toBe(bg);
  });
});

test.describe("on a wide screen", () => {
  test.beforeEach(({ page }) => {
    test.skip(!isWide(page), "the one-row bar");
  });

  test("is one short line, as in the Figma", async ({ page }) => {
    const box = (await bar(page).boundingBox())!;
    expect(box.height).toBeLessThanOrEqual(40);
    await expect(bar(page)).toHaveCSS("font-size", "14px");
  });

  test("a link lightens to brown-100 under the pointer", async ({ page, hasTouch }) => {
    test.skip(hasTouch, "hover is a pointer behaviour");
    const link = bar(page).getByRole("link", { name: LINKS[1] });
    await link.hover();
    await expect(link).toHaveCSS("color", "rgb(240, 233, 221)");
  });

  test("a focused link draws a ring", async ({ page }) => {
    await page.getByRole("link", { name: "Skip to main content" }).focus();
    await page.keyboard.press("Tab");
    const link = bar(page).getByRole("link", { name: LINKS[0] });
    await expect(link).toBeFocused();
    expect(await link.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe("none");
  });

  test("the rules between items are in the paint, not the text", async ({ page }) => {
    const text = await bar(page).evaluate((el) => el.textContent ?? "");
    expect(text).not.toContain("|");
    const rule = await bar(page)
      .locator("li")
      .nth(1)
      .evaluate((el) => getComputedStyle(el, "::before").content);
    expect(rule).toContain("|");
  });
});

// Every page, since the bar lives in the root layout: above the nav, never
// inside main, so the skip link still lands past it.
for (const route of ["/about", "/pricing", "/faq", "/privacy", "/terms", "/solutions"]) {
  test(`${route}: the bar is the first thing on the page, outside main`, async ({ page }) => {
    await page.goto(route);
    await expect(bar(page)).toBeVisible();
    expect(Math.round((await bar(page).boundingBox())!.y)).toBe(0);
    await expect(page.locator("main aside[aria-label='Contact Smarthaus']")).toHaveCount(0);
  });
}

test.describe("on the narrowest phone", () => {
  test("every item fits between the arrows without clipping", async ({ page }) => {
    test.skip(isWide(page), "wide screens show every item on one row");
    await expectHydrated(page);
    const view = (await viewport(page).boundingBox())!;
    for (const [index, name] of LINKS.entries()) {
      const link = bar(page).getByRole("link", { name });
      // Measured where the item sits when it is the one shown.
      const width = await link.evaluate((el) => el.getBoundingClientRect().width);
      const text = await link.evaluate((el) => el.scrollWidth);
      expect(width, `item ${index} is wider than the space between the arrows`).toBeLessThanOrEqual(
        view.width,
      );
      expect(text).toBeLessThanOrEqual(Math.ceil(width));
    }
  });

  test("the arrows sit at the two ends of the bar", async ({ page }) => {
    test.skip(isWide(page), "wide screens hide the arrows");
    const barBox = (await bar(page).boundingBox())!;
    const left = (await prev(page).boundingBox())!;
    const right = (await next(page).boundingBox())!;
    expect(Math.round(left.x)).toBe(Math.round(barBox.x));
    expect(Math.round(right.x + right.width)).toBe(Math.round(barBox.x + barBox.width));
  });
});
