import { expectAccessible, expectHydrated, withConsentDecided } from "./checks";
import { expect, test, type Page } from "./fixtures";

/**
 * The Solutions menu (Figma 4678:50257, built 2026-10-28).
 *
 * From lg it is a panel under the bar, exactly the scrolled capsule's width
 * and place, so a menu open while the bar shrinks never changes size: under
 * the tall bar it floats 8px below with its own frame, and once the bar has
 * shrunk the two join into one box. Below lg a tap on Solutions slides the
 * links out and the eight solutions in, with Back to return; a swipe on the
 * picture moves through them.
 */

const header = (page: Page) => page.locator("header");
const zone = (page: Page) => header(page).locator("[data-menu-zone]");
const trigger = (page: Page) => zone(page).locator("> a");
const panel = (page: Page) => zone(page).locator("[data-menu-panel]");
const panelLinks = (page: Page) => panel(page).locator("ul a");
const activeIndex = (links: ReturnType<typeof panelLinks>) =>
  links.evaluateAll((all) => all.findIndex((a) => a.hasAttribute("data-shown")));

/** The panel fully open: its last item has finished arriving. */
async function expectOpen(page: Page) {
  await expect(header(page)).toHaveAttribute("data-menu", /^(hover|focus)$/);
  await expect(panel(page).locator("li").last()).toHaveCSS("opacity", "1");
}

async function box(page: Page, selector: string) {
  return page
    .locator(selector)
    .first()
    .evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, bottom: r.bottom };
    });
}

test.describe("from lg", () => {
  test.skip(({ isMobile }) => Boolean(isMobile), "the panel is the desktop's");
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await withConsentDecided(page);
    await page.goto("/");
    await expectHydrated(page);
  });

  test("hovering Solutions opens the eight solutions under the bar", async ({ page }) => {
    await expect(panel(page)).toBeHidden();
    await trigger(page).hover();
    await expectOpen(page);
    await expect(panelLinks(page)).toHaveText([
      "Cameras",
      "Lighting",
      "Audio",
      "AC",
      "Garage",
      "Smart lock",
      "Wall controller",
      "Curtains",
    ]);
    await expectAccessible(page);
  });

  test("under the tall bar it is the capsule's width, 8px below, on the page's centre", async ({
    page,
  }) => {
    await trigger(page).hover();
    await expectOpen(page);
    const menu = await box(page, "[data-menu-panel]");
    const bar = await box(page, "header");
    const capsule = await header(page).evaluate(
      (el) =>
        parseFloat(getComputedStyle(el).getPropertyValue("--nav-stuck-size")) ||
        // calc() is not resolved in a custom property: measure it on a probe.
        (() => {
          const probe = document.createElement("div");
          probe.style.inlineSize = "var(--nav-stuck-size)";
          el.append(probe);
          const width = probe.getBoundingClientRect().width;
          probe.remove();
          return width;
        })(),
    );
    expect(Math.abs(menu.width - capsule)).toBeLessThan(1);
    expect(Math.abs(menu.y - (bar.bottom + 8))).toBeLessThan(1);
    const centre = await page.evaluate(() => document.documentElement.clientWidth / 2);
    expect(Math.abs(menu.x + menu.width / 2 - centre)).toBeLessThan(1);
  });

  test("scrolled with the menu open, the bar closes in to meet it as one box", async ({ page }) => {
    await trigger(page).hover();
    await expectOpen(page);
    const before = await box(page, "[data-menu-panel]");
    // Keep the pointer on the panel while the page scrolls under it.
    await page.mouse.move(before.x + before.width / 2, before.y + 100);
    await page.mouse.wheel(0, 500);
    await expect(header(page)).toHaveAttribute("data-stuck", "true");
    await expect
      .poll(async () => {
        const [menu, bar] = [await box(page, "[data-menu-panel]"), await box(page, "header")];
        return Math.round(menu.y - bar.bottom) + " " + Math.round(bar.width - menu.width);
      })
      .toBe("0 0");
    const after = await box(page, "[data-menu-panel]");
    expect(Math.abs(after.width - before.width)).toBeLessThan(1);
    expect(Math.abs(after.x - before.x)).toBeLessThan(1);
    await expect(header(page)).toHaveAttribute("data-menu", /^(hover|focus)$/);
    // No frame between the two: both edges are transparent.
    await expect(header(page)).toHaveCSS("border-bottom-color", "rgba(0, 0, 0, 0)");
    await expect(panel(page)).toHaveCSS("border-top-color", "rgba(0, 0, 0, 0)");
    // And no shadow across the seam: the bar's own would show through the
    // panel's glass as a band.
    await expect(header(page)).toHaveCSS("box-shadow", "none");
    // The same glass on both: the panel blurs the page, which it cannot do
    // inside a header that carries backdrop-filter itself.
    await expect(header(page)).toHaveCSS("backdrop-filter", "none");
    expect(
      await header(page).evaluate((el) => getComputedStyle(el, "::after").backdropFilter),
    ).toBe(await panel(page).evaluate((el) => getComputedStyle(el).backdropFilter));
  });

  test("on the shrunk bar it opens downward from the capsule's foot", async ({ page }) => {
    await page.mouse.wheel(0, 500);
    await expect(header(page)).toHaveAttribute("data-stuck", "true");
    await page.waitForTimeout(600);
    await trigger(page).hover();
    await expectOpen(page);
    const [menu, bar] = [await box(page, "[data-menu-panel]"), await box(page, "header")];
    expect(Math.abs(menu.y - bar.bottom)).toBeLessThan(1);
    expect(Math.abs(menu.x - bar.x)).toBeLessThan(1);
    expect(Math.abs(menu.width - bar.width)).toBeLessThan(1);
  });

  test("the pointer can cross from Solutions down to the panel without closing it", async ({
    page,
  }) => {
    await trigger(page).hover();
    await expectOpen(page);
    const link = (await trigger(page).boundingBox())!;
    const target = (await panelLinks(page).nth(2).boundingBox())!;
    await page.mouse.move(target.x + 10, target.y + target.height / 2, { steps: 12 });
    await page.waitForTimeout(400);
    await expect(header(page)).toHaveAttribute("data-menu", /^(hover|focus)$/);
    expect(target.y).toBeGreaterThan(link.y);
  });

  test("hovering a solution shows its picture and moves the highlight", async ({ page }) => {
    await trigger(page).hover();
    await expectOpen(page);
    expect(await activeIndex(panelLinks(page))).toBe(0);
    await panelLinks(page).nth(4).hover();
    expect(await activeIndex(panelLinks(page))).toBe(4);
    const pictures = panel(page).locator("img");
    await expect(pictures.nth(4)).toHaveCSS("opacity", "1");
    await expect(pictures.nth(0)).toHaveCSS("opacity", "0");
    await expect(panelLinks(page).nth(4)).toHaveCSS("background-color", "rgb(216, 199, 172)");
  });

  test("hovered, it opens on the hover's timing, not the keyboard's", async ({ page }) => {
    await trigger(page).hover();
    await expect(header(page)).toHaveAttribute("data-menu", "hover");
    await expect(panel(page).locator("li").last()).toHaveCSS("opacity", "0");
  });

  test("leaving it closes it", async ({ page }) => {
    await trigger(page).hover();
    await expectOpen(page);
    await page.mouse.move(100, 800);
    await expect(header(page)).not.toHaveAttribute("data-menu");
    await expect(panel(page)).toBeHidden();
  });

  test("a solution opens /solutions and the menu closes behind it", async ({ page }) => {
    await trigger(page).hover();
    await expectOpen(page);
    await panelLinks(page).nth(1).click();
    await expect(page).toHaveURL(/\/solutions$/);
    await expect(header(page)).not.toHaveAttribute("data-menu");
  });

  test("by keyboard: Tab opens it and goes on into the solutions; Escape closes it", async ({
    page,
  }) => {
    await trigger(page).focus();
    await expect(header(page)).toHaveAttribute("data-menu", "focus");
    await expect(trigger(page)).toHaveAttribute("aria-expanded", "true");
    // Shown at once for the keyboard: the next Tab lands on a visible item.
    await expect(panel(page).locator("li").last()).toHaveCSS("opacity", "1");
    await page.keyboard.press("Tab");
    await expect(panelLinks(page).first()).toBeFocused();
    await expect(panelLinks(page).first()).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(panelLinks(page).nth(1)).toBeFocused();
    expect(await activeIndex(panelLinks(page))).toBe(1);
    await page.keyboard.press("Escape");
    await expect(header(page)).not.toHaveAttribute("data-menu");
    await expect(trigger(page)).toBeFocused();
    await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");
  });

  test("shut, it is out of the tab order", async ({ page }) => {
    await trigger(page).focus();
    await page.keyboard.press("Escape");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Pricing" }).first()).toBeFocused();
  });

  test("under reduced motion it opens at once", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await trigger(page).hover();
    await page.waitForTimeout(100);
    await expect(panel(page).locator("li").last()).toHaveCSS("opacity", "1");
    const height = (await panel(page).boundingBox())!.height;
    expect(height).toBeGreaterThan(300);
  });
});

test.describe("below lg", () => {
  test.skip(({ isMobile }) => !isMobile, "the phone menu");

  const back = (page: Page) => page.getByRole("button", { name: "Back" });
  const sub = (page: Page) => back(page).locator("..");
  const subLinks = (page: Page) => sub(page).locator("ul a");
  const picture = (page: Page) => sub(page).locator("[data-solutions-media]");

  async function openSolutions(page: Page) {
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("button", { name: "Close menu" })).toBeVisible();
    // A tap, not click(): click() reports a mouse, whose hover would pick
    // whichever solution lands under it, which a finger never does.
    await trigger(page).tap();
    await expect(header(page)).toHaveAttribute("data-sub", "true");
    await expect(sub(page)).toHaveCSS("opacity", "1");
    expect(await activeIndex(subLinks(page))).toBe(0);
  }

  test.beforeEach(async ({ page }) => {
    await withConsentDecided(page);
    await page.goto("/");
    await expectHydrated(page);
  });

  test("tapping Solutions shows the eight in place of the links, without leaving", async ({
    page,
  }) => {
    await openSolutions(page);
    await expect(page).toHaveURL(/\/$/);
    await expect(subLinks(page)).toHaveCount(8);
    await expect(header(page).locator("nav")).toHaveCSS("opacity", "0");
    await expect(back(page)).toBeFocused();
    await expectAccessible(page);
  });

  test("Back's chevron sits on the panel's start edge, with no side padding", async ({ page }) => {
    await openSolutions(page);
    const button = (await back(page).boundingBox())!;
    const chevron = (await back(page).locator("svg").boundingBox())!;
    const inner = (await sub(page).boundingBox())!;
    expect(Math.abs(button.x - inner.x)).toBeLessThan(1);
    expect(Math.abs(chevron.x - button.x)).toBeLessThan(1);
  });

  test("the picture is on top at full width, the eight centred below it", async ({ page }) => {
    await openSolutions(page);
    const pic = (await picture(page).boundingBox())!;
    const list = (await sub(page).locator("ul").boundingBox())!;
    const first = (await subLinks(page).first().boundingBox())!;
    const inner = (await sub(page).boundingBox())!;
    expect(pic.y + pic.height).toBeLessThanOrEqual(list.y + 1);
    expect(Math.abs(pic.width - inner.width)).toBeLessThan(1);
    for (const link of await subLinks(page).all()) {
      const b = (await link.boundingBox())!;
      expect(Math.abs(b.x + b.width / 2 - (inner.x + inner.width / 2))).toBeLessThan(1);
    }
    expect(first.y).toBeGreaterThan(pic.y);
  });

  test("the whole menu stays on the screen", async ({ page }) => {
    await openSolutions(page);
    const bar = (await header(page).boundingBox())!;
    expect(bar.y).toBeGreaterThanOrEqual(0);
  });

  test("Back slides the links back in and returns focus to Solutions", async ({ page }) => {
    await openSolutions(page);
    await back(page).click();
    await expect(header(page)).not.toHaveAttribute("data-sub");
    await expect(header(page).locator("nav")).toHaveCSS("opacity", "1");
    await expect(trigger(page)).toBeFocused();
  });

  test("swiping the picture moves through the solutions", async ({ page }) => {
    await openSolutions(page);
    const pic = (await picture(page).boundingBox())!;
    const y = pic.y + pic.height / 2;
    const swipe = async (from: number, to: number) => {
      await picture(page).dispatchEvent("pointerdown", {
        pointerType: "touch",
        clientX: from,
        clientY: y,
        isPrimary: true,
      });
      await picture(page).dispatchEvent("pointerup", {
        pointerType: "touch",
        clientX: to,
        clientY: y,
        isPrimary: true,
      });
    };
    await swipe(pic.x + pic.width - 20, pic.x + 20);
    expect(await activeIndex(subLinks(page))).toBe(1);
    await swipe(pic.x + 20, pic.x + pic.width - 20);
    await swipe(pic.x + 20, pic.x + pic.width - 20);
    expect(await activeIndex(subLinks(page))).toBe(7);
    await expect(picture(page).locator("img").nth(7)).toHaveCSS("opacity", "1");
    // A swipe's own click does not navigate.
    await expect(page).toHaveURL(/\/$/);
  });

  test("a tap on the picture opens /solutions", async ({ page }) => {
    await openSolutions(page);
    await picture(page).click();
    await expect(page).toHaveURL(/\/solutions$/);
  });

  test("closed on the solutions, the menu opens next time on the links", async ({ page }) => {
    await openSolutions(page);
    await page.getByRole("button", { name: "Close menu" }).click();
    await expect(header(page)).not.toHaveAttribute("data-sub");
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(header(page).locator("nav")).toHaveCSS("opacity", "1");
    await expect(trigger(page)).toBeVisible();
  });

  test("the desktop panel never shows", async ({ page }) => {
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(panel(page)).toBeHidden();
  });
});

test("@zoom at 200%, the solutions scroll inside the menu rather than run off screen", async ({
  page,
}) => {
  await withConsentDecided(page);
  await page.goto("/");
  await expectHydrated(page);
  await page.getByRole("button", { name: "Open menu" }).click();
  await trigger(page).click();
  await expect(header(page)).toHaveAttribute("data-sub", "true");
  const bar = (await header(page).boundingBox())!;
  expect(bar.y).toBeGreaterThanOrEqual(0);
  const back = page.getByRole("button", { name: "Back" });
  const scroller = back.locator("..");
  const [scroll, client] = await scroller.evaluate((el) => [el.scrollHeight, el.clientHeight]);
  expect(scroll).toBeGreaterThan(client);
  await scroller.getByRole("link", { name: "Curtains" }).focus();
  await expect(scroller.getByRole("link", { name: "Curtains" })).toBeInViewport();
});
