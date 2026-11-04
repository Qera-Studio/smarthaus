import { expectAccessible } from "./checks";
import { expect, test, type Page } from "./fixtures";

/**
 * The homepage opening (HomeHero.module.scss, "The opening"): the title and
 * subtitle word by word, then the CTAs with the strip, the nav and the contact
 * bar, then the proofs and the pause button, all in within five seconds.
 * Then the page's scroll runs the strip on going down and back going up, and
 * the photographs slide through their cards.
 *
 * Every other spec runs with the opening off (e2e/fixtures.ts).
 */
test.use({ intro: true });

const OPENING = /hero-in|hero-word|hero-arrive|nav-in|bar-in/;
/** The opening's own ceiling (WCAG 2.2.2), plus a page's load. */
const OPENING_MS = 7_000;

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
        starts.push({
          name,
          at: event.timeStamp,
          el: `${el.tagName}.${el.className}|${el.parentElement?.tagName}`,
        });
      },
      true,
    );
  });
}

const starts = (page: Page) =>
  page.evaluate(() =>
    (window as unknown as { __starts: { name: string; at: number; el: string }[] }).__starts.filter(
      (s) => /hero-in|hero-word|hero-arrive|nav-in|bar-in/.test(s.name),
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
  test("reveals the title and the subtitle a word at a time", async ({ page }) => {
    await recordStarts(page);
    await page.goto("/");
    await expect.poll(() => running(page), { timeout: OPENING_MS }).toBe(0);
    const list = await starts(page);
    const title = list.filter((s) => /word.*\|H1$/.test(s.el)).map((s) => s.at);
    const lede = list.filter((s) => /word.*\|P$/.test(s.el)).map((s) => s.at);
    expect(title).toHaveLength(4);
    expect(lede).toHaveLength(18);
    // In reading order: no word starts ahead of the one before it.
    for (const words of [title, lede]) {
      expect([...words].sort((a, b) => a - b)).toEqual(words);
    }
    expect(title.at(-1)! - title[0]!).toBeGreaterThan(300);
    expect(lede.at(-1)! - lede[0]!).toBeGreaterThan(600);
  });

  test("plays in order: title, subtitle, CTAs with the strip and nav, then the proofs", async ({
    page,
  }) => {
    await recordStarts(page);
    await page.goto("/");
    await expect.poll(() => running(page), { timeout: OPENING_MS }).toBe(0);
    const list = await starts(page);

    const title = startOf(list, /word.*\|H1$/);
    const lede = startOf(list, /word.*\|P$/);
    const ctas = startOf(list, /ctas/);
    const strip = startOf(list, /track/);
    const nav = startOf(list, /^HEADER\./);
    const bar = startOf(list, /^ASIDE\./);
    const proof = startOf(list, /proof/);

    // Starts are recorded after each delay, a frame apart at worst.
    expect(lede).toBeGreaterThan(title);
    expect(ctas).toBeGreaterThan(lede);
    for (const together of [strip, nav, bar]) expect(Math.abs(together - ctas)).toBeLessThan(100);
    expect(proof).toBeGreaterThan(ctas);
  });

  test("everything is in, at full opacity, within about four seconds", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(4_000);
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
    await expect.poll(() => running(page), { timeout: OPENING_MS }).toBe(0);
    const strip = page.locator("[data-hero-strip]");
    await expect(page.locator("html")).not.toHaveAttribute("data-intro");
    // Its first card about at the edge, the drift's few seconds on from it,
    // and the drift a single, running animation: nothing jumped as the
    // opening let go of it.
    const firstCard = await strip.locator("li").first().boundingBox();
    expect(firstCard!.x).toBeLessThanOrEqual(0);
    expect(firstCard!.x).toBeGreaterThan(-firstCard!.width);
    const drifting = await strip.evaluate(
      (el) => el.firstElementChild?.getAnimations()[0]?.playState,
    );
    expect(drifting).toBe("running");
  });

  test("the rail runs past: two cards go off the far edge before the first comes to rest", async ({
    page,
  }) => {
    await page.goto("/");
    const at = (fraction: number) =>
      page.locator("[data-hero-strip] > div").evaluate((track, f) => {
        const arrive = track
          .getAnimations()
          .find((a) => (a as CSSAnimation).animationName.endsWith("hero-arrive"))!;
        arrive.pause();
        arrive.currentTime = 800 + 1600 * f;
        const card = (selector: string) => track.querySelector(selector)!.getBoundingClientRect().x;
        return { lead: card("ul[data-lead] > li"), first: card("ul > li") };
      }, fraction);
    const width = await page.evaluate(() => document.documentElement.clientWidth);
    const start = await at(0);
    const leadCards = start.first - start.lead;
    // The first lead card sets off from the screen's right edge, give or take
    // the drift's clock.
    expect(Math.abs(start.lead - width)).toBeLessThan(width / 2);
    expect(leadCards).toBeGreaterThan(0);
    // A fifth of the way through its time, most of the way there: it starts
    // really fast.
    const early = await at(0.2);
    expect(early.first).toBeLessThan(start.first - (start.first - (await at(0.999)).first) * 0.6);
  });

  test("hovering the strip does not hold the opening up", async ({ page, hasTouch }) => {
    test.skip(hasTouch, "hover is a pointer behaviour");
    await page.goto("/");
    const box = (await page.locator("[data-hero-strip]").boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect.poll(() => running(page), { timeout: OPENING_MS }).toBe(0);
    await expect(page.locator("html")).not.toHaveAttribute("data-intro");
  });

  test("passes axe once it is in", async ({ page }) => {
    await page.goto("/");
    await expect.poll(() => running(page), { timeout: OPENING_MS }).toBe(0);
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
    await expect.poll(() => running(page), { timeout: OPENING_MS }).toBe(0);

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
    await expect.poll(() => running(page), { timeout: OPENING_MS }).toBe(0);
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
          const fade = document.querySelector("h1 span")?.getAnimations()[0];
          w.__held = fade ? Number(fade.currentTime) : null;
        }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-splash"] });
      });
      await page.goto("/");
      await expect.poll(() => running(page), { timeout: OPENING_MS + 3_000 }).toBe(0);
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
    await expect.poll(() => running(page), { timeout: OPENING_MS }).toBe(0);
  });

  const drift = (page: Page) =>
    page.locator("[data-hero-strip]").evaluate((el) => {
      const [animation] = el.firstElementChild!.getAnimations();
      return {
        at: Number(animation!.currentTime),
        now: performance.now(),
        paused: animation!.playState === "paused",
        rate: animation!.playbackRate,
        duration: Number(animation!.effect!.getComputedTiming().duration),
      };
    });
  type Drift = Awaited<ReturnType<typeof drift>>;

  /** What the scroll added, in ms of the drift's clock, within half a pass. */
  const added = (before: Drift, after: Drift) => {
    const clock = before.paused ? 0 : after.now - before.now;
    const raw = after.at - before.at - clock;
    const d = after.duration;
    return ((((raw + d / 2) % d) + d) % d) - d / 2;
  };

  /** Scrolls, then waits for the glide to run out. */
  const scrollAndSettle = async (page: Page, top: number) => {
    const strip = page.locator("[data-hero-strip]");
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), top);
    await expect(strip).toHaveAttribute("data-gliding", "");
    await expect(strip).not.toHaveAttribute("data-gliding", "", { timeout: 8_000 });
  };

  // Off the strip, so hover does not hold the drift and muddy the clock.
  test.beforeEach(async ({ page }) => page.mouse.move(1, 1));

  test("glides on as the page scrolls down, and back as it scrolls up", async ({ page }) => {
    let before = await drift(page);
    await scrollAndSettle(page, 200);
    expect(added(before, await drift(page))).toBeGreaterThan(1_000);

    before = await drift(page);
    await scrollAndSettle(page, 0);
    expect(added(before, await drift(page))).toBeLessThan(-1_000);
  });

  test("never jumps: a scroll changes the speed, then eases back to the drift", async ({
    page,
  }) => {
    const firstCardX = () =>
      page
        .locator("[data-hero-strip] li")
        .first()
        .evaluate((el) => el.getBoundingClientRect().x);
    const x = await firstCardX();
    await page.evaluate(() => window.scrollTo({ top: 400, behavior: "instant" }));
    await page.evaluate(() => new Promise(requestAnimationFrame));
    // Well short of the 850px it comes to in all, a frame or two in.
    expect(Math.abs((await firstCardX()) - x)).toBeLessThan(600);
    await expect.poll(async () => (await drift(page)).rate, { timeout: 8_000 }).toBe(1);
  });

  test("responds while only a sliver of the strip is on screen", async ({ page }) => {
    const bottom = await page
      .locator("[data-hero-strip]")
      .evaluate((el) => el.getBoundingClientRect().bottom);
    // The strip's last few pixels at the top of the screen.
    const sliver = Math.round(bottom - 6);
    await scrollAndSettle(page, sliver);
    const before = await drift(page);
    await scrollAndSettle(page, sliver - 150);
    expect(added(before, await drift(page))).toBeLessThan(-500);
  });

  test("still runs while the pointer rests on the strip and its drift is held", async ({
    page,
  }) => {
    test.skip(await page.evaluate(() => matchMedia("(hover: none)").matches), "no hover");
    // By coordinates: hover() waits for the card to stop moving, and it drifts.
    const box = (await page.locator("[data-hero-strip]").boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect.poll(async () => (await drift(page)).paused).toBe(true);
    const before = await drift(page);
    await scrollAndSettle(page, 100);
    const after = await drift(page);
    expect(added(before, after)).toBeGreaterThan(500);
    expect(after.paused).toBe(true);
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
    await page.evaluate(() => window.scrollTo({ top: 300, behavior: "instant" }));
    await page.evaluate(() => new Promise(requestAnimationFrame));
    const later = await offset();
    expect(later).toBeGreaterThan(start);
    expect(later).toBeLessThanOrEqual(0);
  });
});

test.describe("the strip's cards", () => {
  test("from lg, a card is at most 30vw wide", async ({ page }) => {
    await page.goto("/");
    const width = await page.evaluate(() => window.innerWidth);
    test.skip(width < 1024, "below lg the cards keep their size");
    const card = await page
      .locator("[data-hero-strip] li")
      .first()
      .evaluate((el) => el.getBoundingClientRect().width);
    // It gives way to the copy on a short screen, as it always has.
    expect(card).toBeLessThanOrEqual(width * 0.3 + 1);
  });
});
