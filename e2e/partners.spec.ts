import type { Page } from "@playwright/test";

import { test, expect } from "./fixtures";
import { expectAccessible, expectNoEmDash, expectNoHorizontalOverflow } from "./checks";

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

test.beforeEach(async ({ page }) => {
  await page.goto("/");
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
  test("is one tab stop, then the visible card's button, never the hidden one's", async ({
    page,
  }) => {
    test.skip(
      test.info().project.name === "iPhone 17",
      "WebKit's Tab skips links by default, as in e2e/focus-visible.spec.ts",
    );
    await tab(page, "TIS").focus();
    await page.keyboard.press("Tab");
    await expect(section(page).getByRole("link", { name: /Visit TIS/ })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(tab(page, "TIS")).toBeFocused();

    await page.keyboard.press("ArrowRight");
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
      ["TIS", 545 / 1152],
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
