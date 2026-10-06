import type { Page } from "@playwright/test";

import { test, expect } from "./fixtures";
import {
  expectAccessible,
  expectHydrated,
  expectNoEmDash,
  expectNoHorizontalOverflow,
} from "./checks";

/**
 * The partner cards on the homepage: TIS and Fibaro, with a toggle between
 * them. What only a browser shows: that the toggle swaps what is on screen,
 * that the stage does not change height when it does (the cards share one
 * cell), and that both logos actually load.
 */

const section = (page: Page) => page.getByRole("region", { name: "Our partners" });
const tab = (page: Page, name: string) => section(page).getByRole("tab", { name });
const card = (page: Page, name: string) =>
  section(page).getByRole("tabpanel", { name, includeHidden: true });

test.beforeEach(async ({ page, javaScriptEnabled }) => {
  await page.goto("/");
  // Nothing hydrates without JavaScript; those tests read the server HTML.
  if (javaScriptEnabled === false) return;
  // The toggle and the pause button are client behaviour: a key or a Tab
  // pressed before hydration meets the server HTML instead, which flaked on
  // CI's slower runners.
  await expectHydrated(page);
});

test("sits directly after the hero", async ({ page }) => {
  const next = await page
    .locator("main > section[data-hero]")
    .evaluate((hero) => hero.nextElementSibling?.getAttribute("aria-labelledby"));
  expect(next).toBe("partners");
});

test("shows TIS first, and the toggle swaps the card on screen", async ({ page }) => {
  await section(page).scrollIntoViewIfNeeded();
  await expect(card(page, "TIS")).toBeVisible();
  await expect(card(page, "Fibaro")).toBeHidden();

  await tab(page, "Fibaro").click();
  await expect(card(page, "Fibaro")).toBeVisible();
  await expect(card(page, "TIS")).toBeHidden();
  await expect(section(page).getByRole("link", { name: /Visit Fibaro/ })).toBeVisible();
});

test("the arrow keys move between the cards", async ({ page }) => {
  await tab(page, "TIS").focus();
  await page.keyboard.press("ArrowRight");
  await expect(tab(page, "Fibaro")).toBeFocused();
  await expect(card(page, "Fibaro")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(tab(page, "TIS")).toBeFocused();
  await expect(card(page, "TIS")).toBeVisible();
});

test("keeps the same height whichever card is showing", async ({ page }) => {
  const stage = section(page).getByRole("tabpanel").locator("..");
  const before = (await stage.boundingBox())!.height;
  await tab(page, "Fibaro").click();
  await expect(card(page, "Fibaro")).toBeVisible();
  expect((await stage.boundingBox())!.height).toBe(before);
});

test("loads both logos", async ({ page }) => {
  await section(page).scrollIntoViewIfNeeded();
  for (const name of ["TIS", "Fibaro"]) {
    const logo = section(page).getByRole("img", { name, includeHidden: true });
    await expect
      .poll(() => logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
      .toBe(true);
  }
});

test("each button opens its maker's site in a new tab", async ({ page }) => {
  for (const [name, href] of [
    ["TIS", "https://www.tiscontrol.com/"],
    ["Fibaro", "https://www.fibaro.com/en/"],
  ] as const) {
    await tab(page, name).click();
    const link = section(page).getByRole("link", { name: `Visit ${name} (opens in a new tab)` });
    await expect(link).toHaveAttribute("href", href);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
  }
});

test("passes axe, never scrolls sideways, and has no em dash", async ({ page }) => {
  await expectAccessible(page);
  await expectNoHorizontalOverflow(page);
  await expectNoEmDash(section(page));
});

test.describe("keyboard", () => {
  test("is one tab stop, then pause, then the visible card's button, never the hidden one's", async ({
    page,
  }) => {
    test.skip(
      test.info().project.name === "iPhone 17",
      "WebKit's Tab skips links by default, as in e2e/focus-visible.spec.ts",
    );
    const pause = section(page).getByRole("button", { name: "Pause the partner cards" });
    // The pause button arrives with hydration, once the carousel knows it may
    // autoplay; Tab pressed before then skips straight to the card.
    await expect(pause).toBeVisible();
    await expect(tab(page, "TIS")).toHaveAttribute("aria-selected", "true");
    await tab(page, "TIS").focus();
    // Tab, then the pause button beside the tabs, then the showing card.
    await page.keyboard.press("Tab");
    await expect(pause).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(section(page).getByRole("link", { name: /Visit TIS/ })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Shift+Tab");
    await expect(tab(page, "TIS")).toBeFocused();

    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(section(page).getByRole("link", { name: /Visit Fibaro/ })).toBeFocused();
  });

  test("keeps the hidden card's button out of the accessibility tree", async ({ page }) => {
    await expect(section(page).getByRole("link", { name: /Visit TIS/ })).toHaveCount(1);
    await expect(section(page).getByRole("link", { name: /Visit Fibaro/ })).toHaveCount(0);
    await tab(page, "Fibaro").click();
    await expect(section(page).getByRole("link", { name: /Visit TIS/ })).toHaveCount(0);
    await expect(section(page).getByRole("link", { name: /Visit Fibaro/ })).toHaveCount(1);
  });

  test("draws a focus ring on the focused tab", async ({ page }) => {
    await tab(page, "TIS").focus();
    await page.keyboard.press("ArrowRight");
    const outline = await tab(page, "Fibaro").evaluate((el) => {
      const style = getComputedStyle(el);
      return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
    });
    expect(outline.style).not.toBe("none");
    expect(outline.width).toBeGreaterThan(0);
  });
});

test.describe("the tabs", () => {
  test("mark the selected one with a rule, and only that one", async ({ page }) => {
    const rules = () =>
      section(page)
        .getByRole("tab")
        .evaluateAll((all) => all.map((el) => getComputedStyle(el).borderBottomColor));
    const [selected, other] = await rules();
    expect(selected).not.toBe("rgba(0, 0, 0, 0)");
    expect(other).toBe("rgba(0, 0, 0, 0)");
    await tab(page, "Fibaro").click();
    await expect.poll(async () => (await rules())[0]).toBe("rgba(0, 0, 0, 0)");
  });

  test("are at least 24px tall, WCAG 2.5.8's floor", async ({ page }) => {
    for (const name of ["TIS", "Fibaro"]) {
      const box = (await tab(page, name).boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(24);
    }
  });
});

test.describe("layout", () => {
  test("draws each logo at 384px wide in its own proportions", async ({ page }) => {
    test.skip(page.viewportSize()!.width < 768, "the logo panel narrows on a phone");
    for (const [name, ratio] of [
      ["TIS", 451 / 1152],
      ["Fibaro", 364 / 1152],
    ] as const) {
      await tab(page, name).click();
      const box = (await section(page).getByRole("img", { name }).boundingBox())!;
      expect(Math.round(box.width)).toBe(384);
      expect(box.height / box.width).toBeCloseTo(ratio, 2);
    }
  });

  test("puts the logo beside the copy on a desktop and under it on a phone", async ({ page }) => {
    await section(page).scrollIntoViewIfNeeded();
    const [copy, logo] = await Promise.all([
      card(page, "TIS").locator("h3").boundingBox(),
      section(page).getByRole("img", { name: "TIS" }).boundingBox(),
    ]);
    if (page.viewportSize()!.width >= 1024) {
      expect(logo!.x).toBeGreaterThan(copy!.x + copy!.width);
    } else {
      expect(logo!.y).toBeGreaterThan(copy!.y + copy!.height);
    }
  });

  test("shows each card's own copy, from the content file", async ({ page }) => {
    await expect(card(page, "TIS").getByRole("heading", { level: 3 })).toHaveText("A TIS partner");
    await tab(page, "Fibaro").click();
    await expect(card(page, "Fibaro").getByRole("heading", { level: 3 })).toHaveText(
      "A Fibaro partner",
    );
    await expect(card(page, "Fibaro")).toContainText("a Nice brand");
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("swaps the card with no fade", async ({ page }) => {
    await page.goto("/");
    await tab(page, "Fibaro").click();
    const duration = await card(page, "Fibaro").evaluate(
      (el) => parseFloat(getComputedStyle(el).animationDuration) * 1000,
    );
    expect(duration).toBeLessThan(1);
    await expect(card(page, "Fibaro")).toBeVisible();
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("shows the first card, and still serves both cards' copy", async ({ page }) => {
    await page.goto("/");
    await expect(card(page, "TIS")).toBeVisible();
    await expect(section(page).getByRole("link", { name: /Visit TIS/ })).toHaveAttribute(
      "href",
      "https://www.tiscontrol.com/",
    );
    const html = await section(page).innerHTML();
    expect(html).toContain("A Fibaro partner");
    expect(html).toContain("https://www.fibaro.com/en/");
  });
});

test.describe("the timer and the slide", () => {
  // The interval is 6s; a test shortens it rather than waiting. The variable
  // lives on the carousel root, the section's only element child.
  // Through the element's own style: an injected stylesheet is refused by
  // the strict report-only CSP on WebKit.
  const shorten = (page: Page) =>
    page
      .locator("[data-partners] > div")
      .evaluate((root: HTMLElement) => root.style.setProperty("--partners-interval", "400ms"));

  test("advances to the next card on its own while on screen", async ({ page }) => {
    await shorten(page);
    await section(page).scrollIntoViewIfNeeded();
    await expect(tab(page, "Fibaro")).toHaveAttribute("aria-selected", "true", { timeout: 5000 });
  });

  test("stays put once paused", async ({ page }) => {
    // Paused before the interval is shortened: on a phone the cards are on
    // screen at load, so a 400ms timer could run out before the click lands.
    await section(page).getByRole("button", { name: "Pause the partner cards" }).click();
    await shorten(page);
    await section(page).scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    await expect(tab(page, "TIS")).toHaveAttribute("aria-selected", "true");
  });

  test("slides the incoming card in from the end, and back from the start", async ({ page }) => {
    // The incoming card keeps its animation after it lands; the outgoing one
    // is released when it does, so only the incoming card is read, and the
    // read cannot lose a race with a slow runner.
    const animation = (name: string) =>
      card(page, name).evaluate((panel) => getComputedStyle(panel).animationName);
    await section(page).scrollIntoViewIfNeeded();
    await tab(page, "Fibaro").click();
    // CSS Modules prefix keyframe names with a hash; the end is ours.
    await expect.poll(() => animation("Fibaro")).toMatch(/partner-from-end$/);
    await tab(page, "TIS").click();
    await expect.poll(() => animation("TIS")).toMatch(/partner-from-start$/);
  });

  test.describe("under reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("never runs the timer, and offers no pause button", async ({ page }) => {
      await page.goto("/");
      await expect(section(page).getByRole("button", { name: /Pause/ })).toHaveCount(0);
      await expect(section(page).locator("span[data-running]")).toHaveAttribute(
        "data-running",
        "false",
      );
    });
  });
});

test("is as tall before hydration as after, so it never pushes the page down", async ({
  page,
  browser,
}) => {
  // Without JavaScript the section is exactly what the server sent. The timer
  // line once arrived only at hydration and moved everything below by 18px,
  // which is how the process stack's own test found it.
  const viewport = page.viewportSize()!;
  const bare = await browser.newContext({ javaScriptEnabled: false, viewport });
  const server = await bare.newPage();
  await server.goto(page.url());
  const before = (await section(server).boundingBox())!.height;
  await bare.close();

  await section(page).scrollIntoViewIfNeeded();
  await expect(
    section(page).getByRole("button", { name: "Pause the partner cards" }),
  ).toBeVisible();
  expect((await section(page).boundingBox())!.height).toBe(before);
});
