import { expectAccessible } from "./checks";
import { expect, test, type Page } from "./fixtures";

/**
 * The homepage opening (HomeHero.module.scss, "The opening"): the title and
 * subtitle, then the CTAs with the strip, the nav and the contact bar, then
 * the two lines and the pause button, all in within three seconds.
 * Then the page's scroll runs the strip on going down and back going up, and
 * the photographs slide through their cards.
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

  test("everything is in, at full opacity, within three seconds", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(3_000);
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
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect.poll(() => running(page), { timeout: 4_000 }).toBe(0);
  });

  /**
   * How far the drift has run, in ms of its own clock, since `from`, less
   * what the clock alone ran: what the scroll added, signed, within half a
   * pass either way.
   */
  const sample = (page: Page) =>
    page.locator("[data-hero-strip]").evaluate((el) => {
      const [drift] = el.firstElementChild!.getAnimations();
      return {
        at: Number(drift!.currentTime),
        now: performance.now(),
        paused: drift!.playState === "paused",
        duration: Number(drift!.effect!.getComputedTiming().duration),
      };
    });
  type Sample = Awaited<ReturnType<typeof sample>>;
  const added = (before: Sample, after: Sample) => {
    const clock = after.paused ? 0 : after.now - before.now;
    const raw = after.at - before.at - clock;
    const d = after.duration;
    return ((((raw + d / 2) % d) + d) % d) - d / 2;
  };

  const scrollTo = async (page: Page, top: number) => {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), top);
    await page.evaluate(() => new Promise(requestAnimationFrame));
  };

  // Off the strip, so hover does not hold the drift and muddy the clock.
  test.beforeEach(async ({ page }) => page.mouse.move(1, 1));

  test("runs the strip on as the page scrolls down, and back as it scrolls up", async ({
    page,
  }) => {
    let before = await sample(page);
    for (const y of [40, 80, 120, 160]) await scrollTo(page, y);
    const down = added(before, await sample(page));
    // 160px at two strip pixels each: well over a second of drift.
    expect(down).toBeGreaterThan(1_000);

    before = await sample(page);
    for (const y of [120, 80, 40, 0]) await scrollTo(page, y);
    expect(added(before, await sample(page))).toBeLessThan(-1_000);
  });

  test("responds while only a sliver of the strip is on screen", async ({ page }) => {
    const bottom = await page
      .locator("[data-hero-strip]")
      .evaluate((el) => el.getBoundingClientRect().bottom);
    // The strip's last few pixels at the top of the screen.
    const sliver = Math.round(bottom - 6);
    await scrollTo(page, sliver - 40);
    await scrollTo(page, sliver);
    const before = await sample(page);
    await scrollTo(page, sliver - 40);
    expect(added(before, await sample(page))).toBeLessThan(-200);
  });

  test("still runs while the pointer rests on the strip and its drift is held", async ({
    page,
  }) => {
    test.skip(await page.evaluate(() => matchMedia("(hover: none)").matches), "no hover");
    // By coordinates: hover() waits for the card to stop moving, and it drifts.
    const box = (await page.locator("[data-hero-strip]").boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect.poll(async () => (await sample(page)).paused).toBe(true);
    const before = await sample(page);
    await scrollTo(page, 100);
    expect(added(before, await sample(page))).toBeGreaterThan(500);
  });

  test("the photographs slide down through their cards, slower than the page", async ({ page }) => {
    const supported = await page.evaluate(() => CSS.supports("animation-timeline: scroll()"));
    test.skip(!supported, "no scroll timelines in this engine: the photographs sit still");
    const image = page.locator("[data-hero-strip] img").first();
    const offset = () =>
      image.evaluate((el) => {
        const card = el.closest("li")!.getBoundingClientRect();
        return el.getBoundingClientRect().top - card.top;
      });
    const start = await offset();
    expect(start).toBeLessThan(0);
    await scrollTo(page, 300);
    const later = await offset();
    expect(later).toBeGreaterThan(start);
    expect(later).toBeLessThanOrEqual(0);
  });
});

test.describe("the strip's cards", () => {
  test("four to the screen from lg", async ({ page }) => {
    await page.goto("/");
    const width = await page.evaluate(() => window.innerWidth);
    test.skip(width < 1024, "below lg the cards keep their size");
    const card = await page
      .locator("[data-hero-strip] li")
      .first()
      .evaluate((el) => el.getBoundingClientRect().width);
    expect(card).toBeCloseTo((width - 3 * 8) / 4, 0);
  });
});
