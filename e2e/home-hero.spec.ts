import { expect, test, type Page } from "./fixtures";
import { expectAccessible, expectNoEmDash, expectNoHorizontalOverflow } from "./checks";

/**
 * The homepage hero in a browser, on all three devices: the strip drifts,
 * stops under the pointer, under focus and on the pause button, shows each
 * card's overlay on hover (always on a touch screen), and never moves under
 * reduced motion. The unit suite pins the markup; this pins the CSS.
 */

const hero = (page: Page) => page.locator("section[data-hero]");
const strip = (page: Page) => page.locator("[data-hero-strip]");
const track = (page: Page) => strip(page).locator("> div").first();
const cards = (page: Page) => strip(page).locator("ul:not([data-copy]) > li");
const overlayOf = (page: Page, index: number) => cards(page).nth(index).locator("> div");
const pause = (page: Page) => page.getByRole("button", { name: "Pause the images" });

/** Hover a card by coordinates: hover() waits for a still element, and this one moves. */
async function hoverCard(page: Page, index: number) {
  const box = (await cards(page).nth(index).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
}

/** The track's offset now and a little later: equal means it is not moving. */
async function drift(page: Page): Promise<[string, string]> {
  const read = () => track(page).evaluate((el) => getComputedStyle(el).translate);
  const first = await read();
  await page.waitForTimeout(600);
  return [first, await read()];
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("passes axe, does not overflow, and has no em dash", async ({ page }) => {
  await expectAccessible(page, { include: "section[data-hero]" });
  await expectNoHorizontalOverflow(page);
  await expectNoEmDash(hero(page));
});

test("the h1 is the first thing in the hero, above the strip", async ({ page }) => {
  const title = page.getByRole("heading", { level: 1, name: "Home at your fingertips" });
  await expect(title).toBeVisible();
  const titleBox = await title.boundingBox();
  const stripBox = await strip(page).boundingBox();
  expect(titleBox!.y + titleBox!.height).toBeLessThan(stripBox!.y);
});

test("the strip runs edge to edge", async ({ page }) => {
  const box = await strip(page).boundingBox();
  const width = await page.evaluate(() => document.documentElement.clientWidth);
  expect(Math.round(box!.x)).toBe(0);
  expect(Math.round(box!.width)).toBeGreaterThanOrEqual(width);
});

test("the strip drifts right to left on its own", async ({ page }) => {
  const [before, after] = await drift(page);
  expect(before).not.toBe(after);
  // Leftward: the offset only ever grows more negative.
  expect(parseFloat(after)).toBeLessThan(parseFloat(before));
});

test("the pause button stops it, and a second press starts it again", async ({ page }) => {
  // Move the pointer off the strip first, so hover is not what stops it.
  await page.mouse.move(0, 0);
  await pause(page).click();
  await page.mouse.move(0, 0);
  await expect(pause(page)).toHaveAttribute("aria-pressed", "true");
  const [a, b] = await drift(page);
  expect(a).toBe(b);
  await pause(page).click();
  await page.mouse.move(0, 0);
  const [c, d] = await drift(page);
  expect(c).not.toBe(d);
});

test("keyboard focus on a card stops the strip and shows its overlay", async ({ page }) => {
  const link = cards(page).first().getByRole("link");
  await link.focus();
  await expect(overlayOf(page, 0)).toHaveCSS("opacity", "1");
  const [a, b] = await drift(page);
  expect(a).toBe(b);
});

test("each card's CTA leads to the solutions page", async ({ page }) => {
  const link = cards(page).nth(2).getByRole("link", { name: "View cameras" });
  await link.focus();
  await link.press("Enter");
  await expect(page).toHaveURL(/\/solutions$/);
});

test("the projects pill and the byline sit under the strip", async ({ page }) => {
  const pill = page.getByText("180+ projects completed across Dubai");
  const byline = page.getByText("SIRA Licence | Smarthaus by Maple Technologies.");
  await pill.scrollIntoViewIfNeeded();
  await expect(pill).toBeVisible();
  await expect(byline).toBeVisible();
  const stripBox = await strip(page).boundingBox();
  const pillBox = await pill.boundingBox();
  const bylineBox = await byline.boundingBox();
  expect(pillBox!.y).toBeGreaterThan(stripBox!.y + stripBox!.height);
  expect(bylineBox!.y).toBeGreaterThan(pillBox!.y + pillBox!.height);
});

test("the pause button does not cover any card's CTA", async ({ page }) => {
  await pause(page).click();
  const button = (await pause(page).boundingBox())!;
  for (const link of await cards(page).getByRole("link").all()) {
    const box = await link.boundingBox();
    if (!box) continue;
    const overlaps =
      box.x < button.x + button.width &&
      button.x < box.x + box.width &&
      box.y < button.y + button.height &&
      button.y < box.y + box.height;
    expect(overlaps).toBe(false);
  }
});

test.describe("with a mouse", () => {
  test.beforeEach(({ hasTouch }) => {
    test.skip(hasTouch, "hover is a pointer behaviour");
  });

  test("hides each overlay until the card is hovered", async ({ page }) => {
    await page.mouse.move(0, 0);
    await expect(overlayOf(page, 2)).toHaveCSS("opacity", "0");
  });

  test("hovering a card stops the strip, shows its overlay and blurs its foot", async ({
    page,
  }) => {
    await hoverCard(page, 2);
    await expect(overlayOf(page, 2)).toHaveCSS("opacity", "1");
    await expect
      .poll(() =>
        cards(page)
          .nth(2)
          .evaluate((el) => getComputedStyle(el, "::before").backdropFilter),
      )
      .toBe("blur(12px)");
    const [a, b] = await drift(page);
    expect(a).toBe(b);
  });

  test("the overlay's shade is black, 0% at the top to 30% at the foot", async ({ page }) => {
    const shade = await overlayOf(page, 0).evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(shade).toMatch(/linear-gradient\(rgba\(0, 0, 0, 0\), rgba\(0, 0, 0, 0\.3\)\)/);
  });

  test("leaving the card starts the strip again", async ({ page }) => {
    await hoverCard(page, 2);
    await page.mouse.move(0, 0);
    const [a, b] = await drift(page);
    expect(a).not.toBe(b);
  });
});

test.describe("on a touch screen", () => {
  test.beforeEach(({ hasTouch }) => {
    test.skip(!hasTouch, "no hover to stand in for");
  });

  test("every overlay shows without a hover", async ({ page }) => {
    for (const index of [0, 3, 7]) {
      await expect(overlayOf(page, index)).toHaveCSS("opacity", "1");
    }
  });
});

test.describe("under reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the strip never moves", async ({ page }) => {
    const [a, b] = await drift(page);
    expect(a).toBe(b);
    expect(await track(page).evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  });

  test("drops the loop's second copy and the pause button", async ({ page }) => {
    await expect(strip(page).locator("ul[data-copy]")).toBeHidden();
    await expect(pause(page)).toBeHidden();
  });

  test("scrolls sideways by hand instead", async ({ page }) => {
    await expect(strip(page)).toHaveCSS("overflow-x", "auto");
    // A whole strip's width along, so the snap cannot pull it back to 0.
    await strip(page).evaluate((el) => {
      el.scrollLeft = el.clientWidth;
    });
    await expect.poll(() => strip(page).evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  });

  // Here, not above: the moving strip never holds still for scrollIntoView,
  // and the lazy cards only load as they come near the screen.
  test("every card's image loads", async ({ page }) => {
    const images = cards(page).locator("img");
    await expect(images).toHaveCount(8);
    for (const img of await images.all()) {
      await img.scrollIntoViewIfNeeded();
      await expect
        .poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth))
        .toBeGreaterThan(0);
    }
  });

  test("still passes axe", async ({ page }) => {
    await expectAccessible(page, { include: "section[data-hero]" });
  });
});
