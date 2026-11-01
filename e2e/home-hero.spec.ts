import { expect, test, type Page } from "./fixtures";
import {
  expectAccessible,
  expectHydrated,
  expectNoEmDash,
  expectNoHorizontalOverflow,
  withConsentDecided,
} from "./checks";

/**
 * The homepage hero in a browser, on all three devices: the strip drifts,
 * stops under the pointer, under focus and on the pause button, shows each
 * card's overlay on hover (always on a touch screen), and never moves under
 * reduced motion. The unit suite pins the markup; this pins the CSS.
 */

// The strip is held still in every other spec (e2e/fixtures.ts).
test.use({ strip: true });

const hero = (page: Page) => page.locator("section[data-hero]");
const strip = (page: Page) => page.locator("[data-hero-strip]");
const track = (page: Page) => strip(page).locator("> div").first();
const cards = (page: Page) => strip(page).locator("ul:not([data-copy]) > li");
const overlayOf = (page: Page, index: number) => cards(page).nth(index).locator("> div");
const pause = (page: Page) => page.getByRole("button", { name: "Pause the images" });

/**
 * Hover a card by coordinates: hover() waits for a still element, and this
 * one moves. Near the card's top, clear of the consent banner in the bottom
 * corner, and kept on screen: the cards are wide enough that the third
 * one's centre can sit past the right edge.
 */
async function hoverCard(page: Page, index: number) {
  const box = (await cards(page).nth(index).boundingBox())!;
  const width = page.viewportSize()!.width;
  const x = Math.min(box.x + box.width / 2, width - 8);
  await page.mouse.move(Math.max(x, box.x + 8), box.y + box.height * 0.2);
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

test("the proof line, title, CTAs and SIRA line read top to bottom above the strip", async ({
  page,
}) => {
  const order = [
    page.getByText("180+ projects completed across Dubai"),
    page.getByRole("heading", { level: 1 }),
    page.getByRole("link", { name: "WhatsApp", exact: true }),
    page.getByText(/^SIRA Licence/),
    pause(page),
    strip(page),
  ];
  const tops = [];
  for (const locator of order) tops.push((await locator.boundingBox())!.y);
  expect(tops).toEqual([...tops].sort((a, b) => a - b));
});

test("the rating and the project count share one line on a wide screen", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 640, "phones stack the two");
  const rating = (await page.getByText(/4\.8 on Google reviews/).boundingBox())!;
  const count = (await page.getByText("180+ projects completed across Dubai").boundingBox())!;
  expect(Math.abs(rating.y - count.y)).toBeLessThan(2);
  expect(count.x).toBeGreaterThan(rating.x + rating.width);
  const fontSize = (text: RegExp | string) =>
    page.getByText(text).evaluate((el) => getComputedStyle(el).fontSize);
  expect(await fontSize("180+ projects completed across Dubai")).toBe(
    await fontSize(/4\.8 on Google reviews/),
  );
});

test("the rating line has no outline", async ({ page }) => {
  const line = page.getByText(/4\.8 on Google reviews/).locator("xpath=..");
  await expect(line).toHaveCSS("border-top-style", "none");
});

test("the strip is a share of the screen: about 42% of its height, or less", async ({ page }) => {
  const box = (await strip(page).boundingBox())!;
  const height = page.viewportSize()!.height;
  expect(box.height).toBeLessThanOrEqual(height * 0.42 + 1);
  expect(box.height).toBeGreaterThan(120);
});

test("the strip ends exactly at the bottom of the screen, or just above a phone's nav", async ({
  page,
}) => {
  await page.evaluate(() => scrollTo(0, 0));
  const stripBox = (await strip(page).boundingBox())!;
  const bottom = stripBox.y + stripBox.height;
  const height = page.viewportSize()!.height;
  if ((page.viewportSize()?.width ?? 0) >= 1024) {
    expect(Math.abs(bottom - height)).toBeLessThanOrEqual(1);
  } else {
    const nav = (await page.locator("header").boundingBox())!;
    expect(bottom).toBeLessThanOrEqual(nav.y);
    expect(nav.y - bottom).toBeLessThan(24);
  }
});

test("the cards are as tall as the strip, at 4:3", async ({ page }) => {
  const stripBox = (await strip(page).boundingBox())!;
  const card = (await cards(page).first().boundingBox())!;
  expect(Math.abs(card.height - stripBox.height)).toBeLessThanOrEqual(1);
  expect(Math.abs(card.width / card.height - 4 / 3)).toBeLessThan(0.01);
});

test.describe("the hand on the strip", () => {
  const firstX = (page: Page) =>
    cards(page)
      .first()
      .evaluate((el) => el.getBoundingClientRect().x);

  test.beforeEach(async ({ page }) => {
    // The banner would sit over the strip on a 1280x720 screen.
    await withConsentDecided(page);
    await page.goto("/");
    await expectHydrated(page);
    // Paused, so only the hand moves it.
    await pause(page).click();
  });

  test("a mouse dragged left carries the strip left with it", async ({ page, hasTouch }) => {
    test.skip(hasTouch, "a mouse drag");
    const box = (await strip(page).boundingBox())!;
    const y = box.y + box.height * 0.2;
    const before = await firstX(page);
    await page.mouse.move(box.x + 600, y);
    await page.mouse.down();
    await page.mouse.move(box.x + 500, y, { steps: 5 });
    await page.mouse.move(box.x + 400, y, { steps: 5 });
    await page.mouse.up();
    const moved = before - (await firstX(page));
    // 200px of hand, give or take the wrap of one pass.
    expect(Math.abs(moved - 200)).toBeLessThan(2);
  });

  test("a drag that ends on a card's link does not open it", async ({ page, hasTouch }) => {
    test.skip(hasTouch, "a mouse drag");
    const link = (await cards(page).first().getByRole("link").boundingBox())!;
    await cards(page).first().getByRole("link").focus();
    await page.mouse.move(link.x + link.width / 2 + 120, link.y + link.height / 2);
    await page.mouse.down();
    await page.mouse.move(link.x + link.width / 2, link.y + link.height / 2, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    await expect(page).toHaveURL(/\/$/);
  });

  test("a trackpad swiped sideways moves it; up and down still scrolls the page", async ({
    page,
    hasTouch,
  }) => {
    test.skip(hasTouch, "a trackpad");
    const box = (await strip(page).boundingBox())!;
    await page.mouse.move(box.x + 300, box.y + box.height * 0.2);
    const before = await firstX(page);
    await page.mouse.wheel(120, 0);
    await expect.poll(async () => before - (await firstX(page))).toBeGreaterThan(100);
    const scrolled = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 200);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(scrolled);
  });

  // Found 2026-10-28: the browser recomputes :hover only when the pointer
  // moves, so a swipe under a still pointer left the overlay on the card it
  // began on and none on the card it ended on.
  test("a swipe under a still pointer moves the overlay to the card now under it", async ({
    page,
    hasTouch,
  }) => {
    test.skip(hasTouch, "a trackpad");
    const first = (await cards(page).nth(1).boundingBox())!;
    const x = first.x + first.width / 2;
    const y = first.y + first.height / 2;
    await page.mouse.move(x, y);
    await expect(overlayOf(page, 1)).toHaveCSS("opacity", "1");
    // One card and a bit: the next card ends up under the pointer.
    for (let i = 0; i < 10; i++) await page.mouse.wheel(first.width / 8, 0);
    const under = await page.evaluate(
      ([px, py]) => {
        const li = document.elementFromPoint(px!, py!)?.closest("li");
        return [...li!.parentElement!.children].indexOf(li!);
      },
      [x, y],
    );
    expect(under).not.toBe(1);
    await expect(overlayOf(page, under)).toHaveCSS("opacity", "1");
    await expect(overlayOf(page, 1)).toHaveCSS("opacity", "0");
  });

  test("a mouse drag leaves the overlay on the card the hand ends on", async ({
    page,
    hasTouch,
  }) => {
    test.skip(hasTouch, "a mouse drag");
    const start = (await cards(page).nth(1).boundingBox())!;
    const y = start.y + start.height / 2;
    await page.mouse.move(start.x + start.width - 20, y);
    await page.mouse.down();
    await page.mouse.move(start.x + 20, y, { steps: 10 });
    await page.mouse.up();
    const under = await page.evaluate(
      ([px, py]) => {
        const li = document.elementFromPoint(px!, py!)?.closest("li");
        return [...li!.parentElement!.children].indexOf(li!);
      },
      [start.x + 20, y],
    );
    await expect(overlayOf(page, under)).toHaveCSS("opacity", "1");
    for (const other of [0, 1, 2, 3].filter((i) => i !== under)) {
      await expect(overlayOf(page, other)).toHaveCSS("opacity", "0");
    }
  });

  test("leaves a paused strip paused", async ({ page, hasTouch }) => {
    test.skip(hasTouch, "a mouse drag");
    const box = (await strip(page).boundingBox())!;
    const y = box.y + box.height * 0.2;
    await page.mouse.move(box.x + 600, y);
    await page.mouse.down();
    await page.mouse.move(box.x + 450, y, { steps: 5 });
    await page.mouse.up();
    await page.mouse.move(0, 0);
    const [a, b] = await drift(page);
    expect(a).toBe(b);
  });
});

test("the pause button is the hardware carousel's glass, at 32px", async ({ page }) => {
  const hardwarePause = page.getByRole("button", { name: "Pause automatic advance" });
  const props = ["border-top-style", "background-color", "box-shadow"];
  const read = (locator: import("@playwright/test").Locator) =>
    locator.evaluate(
      (el, names) => names.map((n) => getComputedStyle(el).getPropertyValue(n)),
      props,
    );
  expect(await read(pause(page))).toEqual(await read(hardwarePause));
  const box = (await pause(page).boundingBox())!;
  expect(Math.round(box.width)).toBe(32);
  expect(Math.round(box.height)).toBe(32);
});

test("there are no arrows on the strip any more", async ({ page }) => {
  await expect(page.getByRole("button", { name: /Previous image|Next image/ })).toHaveCount(0);
});

test("the two ruled lines are each centred as a whole, rule and both halves", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 640, "phones stack the halves, no rule");
  const centre = await page.evaluate(() => document.documentElement.clientWidth / 2);
  const rules = hero(page).locator("p > span[aria-hidden='true']:not(:has(*))");
  await expect(rules).toHaveCount(2);
  for (const rule of await rules.all()) {
    const [start, end] = await rule.evaluate((el) => {
      const first = el.previousElementSibling!.getBoundingClientRect();
      const last = el.nextElementSibling!.getBoundingClientRect();
      return [first.left, last.right];
    });
    expect(Math.abs((start + end) / 2 - centre)).toBeLessThan(1);
  }
});

test("the rating line is set exactly as the SIRA line", async ({ page }) => {
  const style = (text: RegExp) =>
    page
      .getByText(text)
      .first()
      .evaluate((el) => {
        const s = getComputedStyle(el.closest("p")!);
        return [s.fontSize, s.fontWeight, s.lineHeight, s.color, s.letterSpacing].join(" ");
      });
  expect(await style(/on Google reviews/)).toBe(await style(/^SIRA Licence/));
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

  test("a mouse drag scrolls the strip instead", async ({ page, hasTouch }) => {
    test.skip(hasTouch, "a mouse drag");
    await withConsentDecided(page);
    await page.goto("/");
    await expectHydrated(page);
    const box = (await strip(page).boundingBox())!;
    const y = box.y + box.height * 0.2;
    await page.mouse.move(box.x + 600, y);
    await page.mouse.down();
    await page.mouse.move(box.x + 300, y, { steps: 6 });
    await page.mouse.up();
    await expect.poll(() => strip(page).evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
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

test.describe("keyboard", () => {
  test("Tab runs CTAs, the three controls, then each card's link once", async ({ page }) => {
    await page.getByRole("link", { name: "WhatsApp", exact: true }).focus();
    const expected = [
      "Pause the images",
      "View lighting",
      "View curtains",
      "View cameras",
      "View controllers",
      "View smart locks",
      "View garage doors",
      "View air conditioning",
      "View audio",
    ];
    for (const name of expected) {
      await page.keyboard.press("Tab");
      const now = await page.evaluate(
        () =>
          document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.textContent,
      );
      expect(now?.trim()).toBe(name);
    }
  });

  test("every card Tab reaches is brought fully on screen, and the strip never scrolls", async ({
    page,
  }) => {
    // Found 2026-10-28: the browser half-revealed off-screen cards by
    // scrolling the clipped strip and left the offset behind.
    test.skip(
      test.info().project.name === "iPhone 17",
      "WebKit emulation does not scroll Tab focus into view (focus-visible.spec.ts)",
    );
    await expectHydrated(page);
    await page.getByRole("button", { name: "Pause the images" }).focus();
    const width = await page.evaluate(() => document.documentElement.clientWidth);
    for (let i = 0; i < 8; i += 1) {
      await page.keyboard.press("Tab");
      // The reveal runs just after the focus lands.
      await expect
        .poll(
          () =>
            page.evaluate((w) => {
              const b = document.activeElement!.getBoundingClientRect();
              return b.left >= 0 && b.right <= w ? "on screen" : `${b.left}..${b.right}`;
            }, width),
          { message: `card ${i}` },
        )
        .toBe("on screen");
    }
    await expect.poll(() => strip(page).evaluate((el) => el.scrollLeft)).toBe(0);
  });

  test("a focused card's link draws a visible ring", async ({ page }) => {
    const link = cards(page).first().getByRole("link");
    await link.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    const outline = await link.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).not.toBe("none");
  });

  test("Space on the pause button toggles it", async ({ page }) => {
    await pause(page).focus();
    await page.keyboard.press("Space");
    await expect(pause(page)).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Space");
    await expect(pause(page)).toHaveAttribute("aria-pressed", "false");
  });
});

test("the hero does not shift as its images arrive", async ({ page }) => {
  await page.goto("/", { waitUntil: "commit" });
  const shift = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let total = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as (PerformanceEntry & {
            value: number;
            hadRecentInput: boolean;
          })[]) {
            if (!entry.hadRecentInput) total += entry.value;
          }
        }).observe({ type: "layout-shift", buffered: true });
        addEventListener("load", () => setTimeout(() => resolve(total), 500));
        if (document.readyState === "complete") setTimeout(() => resolve(total), 500);
      }),
  );
  // CLAUDE.md's project target is CLS under 0.05 for the page.
  expect(shift).toBeLessThan(0.05);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the hero, the strip and the proof are all in the server HTML", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Home at your fingertips");
    await expect(cards(page)).toHaveCount(8);
    await expect(page.getByText("180+ projects completed across Dubai")).toBeVisible();
  });

  test("the strip still drifts, since it is CSS", async ({ page, hasTouch }) => {
    test.skip(hasTouch, "the drift check below moves the mouse off the strip");
    await page.mouse.move(0, 0);
    const [a, b] = await drift(page);
    expect(a).not.toBe(b);
  });

  test("a card's link is a plain link", async ({ page }) => {
    await page.goto("/solutions");
    await page.goBack();
    const href = await cards(page).first().getByRole("link").getAttribute("href");
    expect(href).toBe("/solutions");
  });
});

// Runs only in the zoom-200 project: a 1440px laptop at 200% zoom, 720 CSS px.
test.describe("200% zoom @zoom", () => {
  test("the hero fits the width and its copy is readable", async ({ page }) => {
    await page.goto("/");
    await expectNoHorizontalOverflow(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Book a site visit" }).first()).toBeVisible();
  });

  test("the proof line stays inside the screen", async ({ page }) => {
    await page.goto("/");
    const line = page.getByText(/4\.8 on Google reviews/).locator("xpath=..");
    const box = (await line.boundingBox())!;
    const width = await page.evaluate(() => document.documentElement.clientWidth);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
  });

  test("a screen too short to share keeps the strip usable", async ({ page }) => {
    await page.goto("/");
    const height = (await strip(page).boundingBox())!.height;
    expect(height).toBeGreaterThan(120);
  });
});

// Runs only in the forced-colors project.
test.describe("forced colours @forced-colors", () => {
  test("a focused card still shows its title, line and a bordered CTA", async ({ page }) => {
    await page.goto("/");
    const link = cards(page).first().getByRole("link");
    await link.focus();
    await expect(overlayOf(page, 0)).toHaveCSS("opacity", "1");
    await expect(cards(page).first().getByText("Lighting", { exact: true })).toBeVisible();
    expect(await link.evaluate((el) => getComputedStyle(el).borderTopStyle)).toBe("solid");
  });

  test("the pause button stays visible against the page", async ({ page }) => {
    await page.goto("/");
    await expect(pause(page)).toBeVisible();
    const box = (await pause(page).boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(24);
  });
});

test.describe("the loop", () => {
  /** Seek the strip's animation to a fraction of one pass, and hold it there. */
  async function seek(page: Page, fraction: number) {
    await track(page).evaluate((el, f) => {
      const [animation] = el.getAnimations();
      if (!animation) throw new Error("the strip is not animating");
      const duration = Number(animation.effect?.getComputedTiming().duration);
      animation.pause();
      animation.currentTime = duration * f;
    }, fraction);
  }

  /** Where the first card of each copy sits, in viewport pixels. */
  const firsts = (page: Page) =>
    strip(page)
      .locator("ul")
      .evaluateAll((lists) => lists.map((ul) => ul.firstElementChild!.getBoundingClientRect().x));

  test("has no seam: the copy lands exactly where the first copy started", async ({ page }) => {
    await seek(page, 0);
    const [start] = await firsts(page);
    await seek(page, 1 - 1e-9);
    const [, copyAtEnd] = await firsts(page);
    expect(Math.abs(copyAtEnd! - start!)).toBeLessThan(1);
  });

  test("the two copies are exactly one copy's width apart", async ({ page }) => {
    await seek(page, 0.3);
    const [first, copy] = await firsts(page);
    const width = await strip(page)
      .locator("ul")
      .first()
      .evaluate((ul) => ul.getBoundingClientRect().width);
    expect(Math.abs(copy! - first! - width)).toBeLessThan(1);
  });

  test("drifts slowly: tens of pixels a second, not hundreds", async ({ page }) => {
    const speed = await track(page).evaluate((el) => {
      const [animation] = el.getAnimations();
      const duration = Number(animation!.effect!.getComputedTiming().duration) / 1000;
      return el.getBoundingClientRect().width / 2 / duration;
    });
    expect(speed).toBeGreaterThan(10);
    expect(speed).toBeLessThan(80);
    // 8s a card, eight cards to a pass (2s a card faster than it was).
    const duration = await track(page).evaluate((el) =>
      Number(el.getAnimations()[0]!.effect!.getComputedTiming().duration),
    );
    expect(duration).toBe(64_000);
  });
});

test.describe("every card, with a mouse", () => {
  test.beforeEach(async ({ hasTouch, page }) => {
    test.skip(hasTouch, "hover is a pointer behaviour");
    // The banner covers the first cards on a 1280x720 screen.
    await withConsentDecided(page);
    await page.goto("/");
    await pause(page).click();
    await page.mouse.move(0, 0);
  });

  test("shows its own title and CTA on hover, and only its own", async ({ page }) => {
    const titles = [
      ["Lighting", "View lighting"],
      ["Curtains", "View curtains"],
      ["Cameras", "View cameras"],
    ] as const;
    for (const [index, [title, cta]] of titles.entries()) {
      await hoverCard(page, index);
      await expect(overlayOf(page, index)).toHaveCSS("opacity", "1");
      await expect(overlayOf(page, index).getByText(title, { exact: true })).toBeVisible();
      await expect(overlayOf(page, index).getByRole("link", { name: cta })).toBeVisible();
      const other = (index + 1) % titles.length;
      await expect(overlayOf(page, other)).toHaveCSS("opacity", "0");
    }
  });

  test("the CTA is brown-900 on brown-100, at full opacity", async ({ page }) => {
    await hoverCard(page, 0);
    const link = overlayOf(page, 0).getByRole("link");
    await expect(link).toHaveCSS("background-color", "rgb(240, 233, 221)");
    await expect(link).toHaveCSS("color", "rgb(20, 17, 14)");
    await expect(link).toHaveCSS("opacity", "1");
  });
});

test("the largest paint is the h1 or an eager strip image, never a lazy one", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  const lcp = await page.evaluate(
    () =>
      new Promise<{ tag: string; id: string; loading: string | null; src: string }>((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries() as (PerformanceEntry & { element: Element | null })[];
          const el = entries.at(-1)?.element;
          resolve({
            tag: el?.tagName ?? "",
            id: el?.id ?? "",
            loading: el?.getAttribute("loading") ?? null,
            src: el?.getAttribute("src") ?? "",
          });
        }).observe({ type: "largest-contentful-paint", buffered: true });
      }),
  );
  if (lcp.tag === "H1") {
    expect(lcp.id).toBe("hero-title");
  } else {
    expect(lcp.tag).toBe("IMG");
    expect(lcp.src).toContain("hero_carousel");
    expect(lcp.loading).not.toBe("lazy");
  }
});

test("every card's overlay content stays inside its card", async ({ page }) => {
  await pause(page).click();
  for (const index of [0, 2, 7]) {
    await cards(page).nth(index).getByRole("link").focus();
    const card = (await cards(page).nth(index).boundingBox())!;
    const link = (await cards(page).nth(index).getByRole("link").boundingBox())!;
    expect(link.x).toBeGreaterThanOrEqual(card.x);
    expect(link.y).toBeGreaterThanOrEqual(card.y);
    expect(link.x + link.width).toBeLessThanOrEqual(card.x + card.width + 0.5);
    expect(link.y + link.height).toBeLessThanOrEqual(card.y + card.height + 0.5);
  }
});

test("no faces are left on the page", async ({ page }) => {
  await expect(hero(page).locator("img[src*='s1.png']")).toHaveCount(0);
});

test.describe("under reduced motion, with a mouse", () => {
  test.use({ reducedMotion: "reduce" });

  test("hovering a card still shows its overlay", async ({ page, hasTouch }) => {
    test.skip(hasTouch, "hover is a pointer behaviour");
    await withConsentDecided(page);
    await page.goto("/");
    await hoverCard(page, 1);
    await expect(overlayOf(page, 1)).toHaveCSS("opacity", "1");
  });
});
