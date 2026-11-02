import { expectAccessible } from "./checks";
import { expect, test, type Page } from "./fixtures";

/**
 * The homepage opening (HomeHero.module.scss, "The opening"): the title and
 * subtitle, then the CTAs with the strip, the nav and the contact bar, then
 * the two lines and the pause button, all in within two seconds. Then the
 * page's scroll runs the strip ahead of its drift.
 *
 * Every other spec runs with the opening off (e2e/fixtures.ts).
 */
test.use({ intro: true });

const OPENING = /hero-in|hero-arrive|nav-in|bar-in/;

/** Records when each opening animation starts, by keyframes and element. */
async function recordStarts(page: Page) {
  await page.addInitScript(() => {
    const starts: { name: string; at: number; el: string }[] = [];
    (window as unknown as { __starts: typeof starts }).__starts = starts;
    document.addEventListener(
      "animationstart",
      (event) => {
        const el = event.target as HTMLElement;
        const name = event.animationName;
        starts.push({ name, at: event.timeStamp, el: el.tagName + "." + el.className });
      },
      true,
    );
  });
}

const starts = (page: Page) =>
  page.evaluate(() =>
    (window as unknown as { __starts: { name: string; at: number; el: string }[] }).__starts.filter(
      (s) => /hero-in|hero-arrive|nav-in|bar-in/.test(s.name),
    ),
  );

/** The first start whose element class matches. */
function startOf(list: { at: number; el: string; name: string }[], el: RegExp) {
  const found = list.find((s) => el.test(s.el));
  if (!found) throw new Error(`no opening animation on ${el}`);
  return found.at;
}

const running = (page: Page) =>
  page.evaluate(
    (source) =>
      document
        .getAnimations()
        .filter((a) => new RegExp(source).test((a as CSSAnimation).animationName ?? ""))
        .filter((a) => a.playState !== "finished").length,
    OPENING.source,
  );

test.describe("the homepage opening", () => {
  test("plays in order: title, subtitle, CTAs with the strip and nav, then the lines", async ({
    page,
  }) => {
    await recordStarts(page);
    await page.goto("/");
    await expect.poll(() => running(page), { timeout: 4_000 }).toBe(0);
    const list = await starts(page);

    const title = startOf(list, /^H1\./);
    const lede = startOf(list, /^P\..*lede/);
    const ctas = startOf(list, /ctas/);
    const strip = startOf(list, /strip/);
    const nav = startOf(list, /^HEADER\./);
    const bar = startOf(list, /^ASIDE\./);
    const pair = startOf(list, /pair/);

    // Starts are recorded after each delay, a frame apart at worst.
    // 80ms apart: WebKit can deliver both starts in one frame.
    expect(lede).toBeGreaterThanOrEqual(title);
    expect(ctas).toBeGreaterThan(lede);
    for (const together of [strip, nav, bar]) expect(Math.abs(together - ctas)).toBeLessThan(100);
    expect(pair).toBeGreaterThan(ctas);
  });

  test("everything is in, at full opacity, within two seconds", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(2_000);
    expect(await running(page)).toBe(0);
    for (const target of [
      page.getByRole("heading", { level: 1 }),
      page.getByRole("link", { name: "Book a site visit" }).first(),
      page.locator("[data-hero-strip]"),
      page.locator("header").first(),
    ]) {
      await expect(target).toHaveCSS("opacity", "1");
    }
  });

  test("the strip ends where it rests, with its drift running", async ({ page }) => {
    await page.goto("/");
    await expect.poll(() => running(page), { timeout: 4_000 }).toBe(0);
    const strip = page.locator("[data-hero-strip]");
    await expect(strip).toHaveCSS("translate", "none");
    const drifting = await strip.evaluate(
      (el) => el.firstElementChild?.getAnimations()[0]?.playState,
    );
    expect(drifting).toBe("running");
  });

  test("passes axe once it is in", async ({ page }) => {
    await page.goto("/");
    await expect.poll(() => running(page), { timeout: 4_000 }).toBe(0);
    await expectAccessible(page);
  });

  test.describe("under reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("nothing arrives: the page is simply there", async ({ page }) => {
      await recordStarts(page);
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.waitForTimeout(1_000);
      expect(await starts(page)).toEqual([]);
    });
  });

  test("a soft navigation back to the homepage finds it at rest", async ({ page }) => {
    await page.goto("/");
    await expect.poll(() => running(page), { timeout: 4_000 }).toBe(0);

    await page.evaluate(
      () => ((window as unknown as { __sameDocument: boolean }).__sameDocument = true),
    );
    await page.locator("footer").getByRole("link", { name: "About", exact: true }).first().click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.locator("html")).not.toHaveAttribute("data-intro");

    // Home by the footer's logo too: the nav's own transitions are not under
    // test here (nav-footer.spec.ts and nav-shrink.spec.ts have them).
    await page.locator("footer").getByRole("link", { name: "Smarthaus — home" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("[data-hero]")).toBeVisible();
    // Still the same document, so this was a soft navigation, not a reload.
    expect(
      await page.evaluate(() => (window as unknown as { __sameDocument?: boolean }).__sameDocument),
    ).toBe(true);
    expect(await running(page)).toBe(0);
  });

  test("a reload plays it again", async ({ page }) => {
    await page.goto("/");
    await expect.poll(() => running(page), { timeout: 4_000 }).toBe(0);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-intro", "");
  });

  test.describe("behind the splash", () => {
    test.use({ splash: true });

    // A paused animation at its start still fires animationstart, so the
    // proof is where the title's fade stands as the splash starts leaving:
    // at its very start, held, however long the splash was up.
    test("holds at its start until the splash starts leaving", async ({ page }) => {
      await page.addInitScript(() => {
        new MutationObserver(() => {
          const w = window as unknown as { __held?: number | null };
          if (w.__held !== undefined || document.documentElement.dataset.splash !== "leaving")
            return;
          const fade = document.querySelector("h1")?.getAnimations()[0];
          w.__held = fade ? Number(fade.currentTime) : null;
        }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-splash"] });
      });
      await page.goto("/");
      await expect.poll(() => running(page), { timeout: 6_000 }).toBe(0);
      const held = await page.evaluate(
        () => (window as unknown as { __held?: number | null }).__held,
      );
      expect(held).toBe(0);
    });
  });
});

test.describe("the page's scroll", () => {
  test("runs the strip ahead of its drift, never behind it", async ({ page }) => {
    await page.goto("/");
    await expect.poll(() => running(page), { timeout: 4_000 }).toBe(0);
    // Off the strip, so hover does not pause it.
    await page.mouse.move(1, 1);

    const sample = () =>
      page.locator("[data-hero-strip]").evaluate((el) => {
        const [drift] = el.firstElementChild!.getAnimations();
        const duration = Number(drift!.effect!.getComputedTiming().duration);
        return { at: Number(drift!.currentTime), now: performance.now(), duration };
      });

    // Down then up, a few pixels at a time, staying with the strip on screen.
    const before = await sample();
    for (const y of [40, 80, 120, 160, 120, 80, 40, 0]) {
      await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
      await page.evaluate(() => new Promise(requestAnimationFrame));
    }
    const after = await sample();

    const drift = after.now - before.now;
    // Within one pass: the drift wraps round it.
    const moved = (((after.at - before.at) % after.duration) + after.duration) % after.duration;
    // 320px of scroll at SCROLL_BOOST, in ms of the animation: well over the
    // clock's own advance, whichever way the page went.
    expect(moved).toBeGreaterThan(drift + 1_000);
  });
});
