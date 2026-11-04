import { expectAccessible, expectHydrated } from "./checks";
import { expect, test, type Page } from "./fixtures";

/**
 * The homepage's scroll reveal: what is below the screen waits, rises or fades
 * in once as it arrives, and then stays. Every other spec runs with it off
 * (e2e/fixtures.ts).
 */
test.use({ reveal: true });

const marked = (page: Page) => page.locator("[data-reveal]");
const waiting = (page: Page) => page.locator('[data-reveal="waiting"]');

/** Scrolls the whole page down a part-screen at a time, as a visitor would. */
async function walkDown(page: Page) {
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.6;
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo({ top: y, behavior: "instant" });
      await new Promise((done) => setTimeout(done, 40));
    }
  });
}

const settled = (page: Page) =>
  page.evaluate(
    () =>
      document
        .getAnimations()
        .filter((a) => /reveal-/.test((a as CSSAnimation).animationName ?? ""))
        .filter((a) => a.playState !== "finished").length,
  );

test.describe("on the homepage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expectHydrated(page);
  });

  test("what is below the screen waits, unseen", async ({ page }) => {
    await expect.poll(() => waiting(page).count()).toBeGreaterThan(10);
    await expect(waiting(page).first()).toHaveCSS("opacity", "0");
  });

  test("nothing in the hero, the sheets, the carousels or the form is ever marked", async ({
    page,
  }) => {
    for (const area of ["[data-hero]", "[data-process]", "[data-partners]", "form"]) {
      await expect(page.locator(`${area} [data-reveal]`)).toHaveCount(0);
    }
  });

  test("everything has arrived by the foot of the page, and stays", async ({ page }) => {
    await walkDown(page);
    await expect.poll(() => waiting(page).count()).toBe(0);
    await expect.poll(() => settled(page), { timeout: 5_000 }).toBe(0);
    const stuck = await marked(page).evaluateAll((all) =>
      all.filter((el) => getComputedStyle(el).opacity !== "1").map((el) => el.textContent),
    );
    expect(stuck).toEqual([]);
  });

  test("plays once: scrolling back up and down again starts nothing", async ({ page }) => {
    await walkDown(page);
    await expect.poll(() => settled(page), { timeout: 5_000 }).toBe(0);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await walkDown(page);
    expect(await settled(page)).toBe(0);
    await expect(waiting(page)).toHaveCount(0);
  });

  test("a heading's words start apart, in reading order", async ({ page }) => {
    const heading = page.locator("#pricing");
    await heading.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await expect(heading).toHaveAttribute("data-reveal", "in");
    const delays = await heading
      .locator("> span")
      .evaluateAll((words) => words.map((w) => getComputedStyle(w).animationDelay));
    expect(delays).toEqual(["0s", "0.06s", "0.12s", "0.18s", "0.24s"]);
    await expect(heading).toHaveText("Choose your level of intelligence");
  });

  test("words blur on a wide screen, and not on a phone", async ({ page }) => {
    const heading = page.locator("#pricing");
    await heading.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await expect(heading).toHaveAttribute("data-reveal", "in");
    const blur = await heading
      .locator("> span")
      .first()
      .evaluate((el) => getComputedStyle(el).getPropertyValue("--reveal-blur").trim());
    const wide = (page.viewportSize()?.width ?? 0) > 640;
    expect(blur).toBe(wide ? "6px" : "0px");
  });

  test("a group's members follow one another, with no layout shift", async ({ page }) => {
    const tiers = page.locator("[data-pricing] ul > li[data-reveal]");
    const before = await tiers.first().evaluate((el) => (el as HTMLElement).offsetTop);
    await tiers.first().evaluate((el) => el.scrollIntoView({ block: "center" }));
    await expect(tiers.first()).toHaveAttribute("data-reveal", "in");
    expect(await tiers.first().evaluate((el) => (el as HTMLElement).offsetTop)).toBe(before);
    expect(await tiers.nth(1).evaluate((el) => getComputedStyle(el).animationDelay)).toBe("0.09s");
  });

  test("a print of the page leaves nothing blank", async ({ page }) => {
    await expect.poll(() => waiting(page).count()).toBeGreaterThan(0);
    await page.emulateMedia({ media: "print" });
    await expect(waiting(page).first()).toHaveCSS("opacity", "1");
  });

  // Wherever the browser restores the scroll to, and however soon, what may never
  // happen is anything staying hidden once it is on screen.
  test("a reload part-way down leaves nothing hidden once it is on screen", async ({ page }) => {
    const onScreen = (selector: string) =>
      page
        .locator(selector)
        .first()
        .evaluate((el) => {
          el.scrollIntoView({ block: "center", behavior: "instant" });
        });
    await onScreen("[data-pricing] ul > li[data-reveal]");
    await page.reload();
    await expectHydrated(page);
    for (const selector of ["[data-pricing] ul > li[data-reveal]", "#hardware"]) {
      await onScreen(selector);
      await expect(page.locator(selector).first()).toHaveCSS("opacity", "1");
    }
  });

  test("passes axe once everything has arrived", async ({ page }) => {
    await walkDown(page);
    await expect.poll(() => waiting(page).count()).toBe(0);
    await expect.poll(() => settled(page), { timeout: 5_000 }).toBe(0);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expectAccessible(page);
  });
});

test.describe("elsewhere", () => {
  test("/pricing shares the tier cards, and nothing on it ever waits", async ({ page }) => {
    await page.goto("/pricing");
    await expectHydrated(page);
    await expect(marked(page).first()).toHaveAttribute("data-reveal", "");
    await expect(waiting(page)).toHaveCount(0);
    await expect(marked(page).first()).toHaveCSS("opacity", "1");
  });

  test("a soft navigation away and back leaves nothing stuck", async ({ page }) => {
    await page.goto("/");
    await expectHydrated(page);
    await page.locator("footer").getByRole("link", { name: "About", exact: true }).first().click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(waiting(page)).toHaveCount(0);
  });
});

test.describe("under reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("nothing waits and nothing moves", async ({ page }) => {
    await page.goto("/");
    await expectHydrated(page);
    await expect(waiting(page)).toHaveCount(0);
    await marked(page).first().scrollIntoViewIfNeeded();
    expect(await settled(page)).toBe(0);
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("every word and card is there, at full strength", async ({ page }) => {
    await page.goto("/");
    await expect(waiting(page)).toHaveCount(0);
    await expect(page.locator("#pricing")).toHaveText("Choose your level of intelligence");
    await expect(page.locator("#pricing")).toHaveCSS("opacity", "1");
  });
});
