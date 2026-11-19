import {
  expectAccessible,
  expectHydrated,
  expectNoEmDash,
  expectNoHorizontalOverflow,
  withConsentDecided,
} from "./checks";
import { expect, test, type Page } from "./fixtures";
import { SITE_SETTINGS } from "../sanity/seed/site-settings";
import { SOLUTION_PAGES } from "../sanity/seed/solutions";

/**
 * A solution's page (Figma 4903:4464, 2026-11-15), and the opening that
 * takes a visitor there from the nav's Solutions menu: the menu's picture
 * grows into the page's, half the screen, in one view transition. Read from
 * the ci dataset, which holds the seed's cameras page.
 */

const PAGE = "/solutions/cameras";
const TITLE = "Cameras & CCTV";
// The features grid, by its heading: since 2026-11-16 the "Works with"
// section sits between it and the hero, with h3s and Lucide arrows of its own.
const FEATURES = 'section[aria-labelledby="solution-features"]';
// The process under the features (Shivanshu, 2026-11-16): visit, install, maintain.
const PROCESS = 'section[aria-labelledby="solution-process"]';

const header = (page: Page) => page.locator("header");
const zone = (page: Page) => header(page).locator("[data-menu-zone]");
const trigger = (page: Page) => zone(page).locator("> a");
const panel = (page: Page) => zone(page).locator("[data-menu-panel]");

/**
 * Records every view transition the page starts, and how it ends, from before
 * the page's own scripts run. A transition that fails to start rejects ready.
 */
async function watchTransitions(page: Page) {
  await page.addInitScript(() => {
    const start = document.startViewTransition?.bind(document);
    const log: { ready?: boolean; error?: string; finished?: boolean }[] = [];
    (window as unknown as { __transitions: typeof log }).__transitions = log;
    if (!start) return;
    document.startViewTransition = ((arg: Parameters<typeof start>[0]) => {
      const entry: (typeof log)[number] = {};
      log.push(entry);
      const transition = start(arg);
      transition.ready.then(
        () => {
          entry.ready = true;
          // The layers as they start: the bar's name, and what animates each.
          const bar = document.querySelector("[data-site-nav]");
          (window as unknown as { __layers: object }).__layers = {
            bar: bar ? getComputedStyle(bar).viewTransitionName : "",
            animations: document
              .getAnimations()
              .filter((a) => (a.effect as KeyframeEffect | null)?.pseudoElement)
              .map(
                (a) =>
                  `${(a.effect as KeyframeEffect).pseudoElement} ${(a as CSSAnimation).animationName}`,
              ),
          };
        },
        (error: unknown) => (entry.error = String(error)),
      );
      transition.finished.then(() => (entry.finished = true));
      return transition;
    }) as typeof document.startViewTransition;
  });
}

const transitions = (page: Page) =>
  page.evaluate(
    () =>
      (
        window as unknown as {
          __transitions: { ready?: boolean; error?: string; finished?: boolean }[];
        }
      ).__transitions,
  );

/** What the opening must leave behind: no names, no attribute. */
async function expectSettled(page: Page) {
  await expect(page.locator("html")).not.toHaveAttribute("data-solution-opening", "");
  await expect(page.locator("html")).not.toHaveAttribute("data-solution-leaving", "");
  await expect(page.locator("[data-site-nav]")).toHaveCSS("view-transition-name", "none");
  const named = await page.evaluate(
    () =>
      [...document.querySelectorAll<HTMLElement>("*")].filter((el) => el.style.viewTransitionName)
        .length,
  );
  expect(named).toBe(0);
}

/**
 * Every solution's page (Shivanshu, 2026-11-15: all eight), each read from
 * its own document. Cameras has its own describe below; these hold what every
 * page must do.
 */
for (const [slug, solution] of Object.entries(SOLUTION_PAGES)) {
  const path = `/solutions/${slug}`;

  test.describe(`every solution page: ${path}`, () => {
    test("responds 200 with one h1, its title, and passes axe", async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveText(solution.title);
      await expectAccessible(page);
    });

    test("fits the screen, with no em dash anywhere", async ({ page }) => {
      await page.goto(path);
      await expectNoHorizontalOverflow(page);
      await expectNoEmDash(page.locator("main"));
    });

    test("shows its nine features, its picture, and its dark box to the contact page", async ({
      page,
    }) => {
      await page.goto(path);
      await expect(page.locator(`${FEATURES} h3`).filter({ hasNot: page.locator("a") })).toHaveText(
        solution.features.items.map((item) => item.title),
      );
      await expect(page.locator(`${FEATURES} svg.lucide`)).toHaveCount(9);
      // Lazy, and WebKit loads it only near the screen: go to it, then wait.
      const picture = page.locator(FEATURES).locator("img").first();
      await picture.scrollIntoViewIfNeeded();
      await expect(picture).toBeVisible();
      await expect
        .poll(() => picture.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth))
        .toBeGreaterThan(0);
      await expect(
        page
          .locator(`${FEATURES} [data-ground=dark]`)
          .getByRole("link", { name: "Book a site visit" }),
      ).toHaveAttribute("href", "/contact");
    });

    test("shows its process: three steps, each under a drawing that loads", async ({ page }) => {
      await page.goto(path);
      await expect(page.locator(`${PROCESS} h2`)).toHaveText(solution.process.heading);
      await expect(page.locator(`${PROCESS} li h3`)).toHaveText(
        solution.process.steps.map((step) => step.title),
      );
      const drawings = page.locator(`${PROCESS} li img`);
      await expect(drawings).toHaveCount(3);
      // Lazy: go to each, then wait for it to decode.
      for (const drawing of await drawings.all()) {
        await drawing.scrollIntoViewIfNeeded();
        await expect
          .poll(() => drawing.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth))
          .toBeGreaterThan(0);
      }
    });

    test("stays out of search while the draft waits for review", async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    });
  });
}

test.describe(PAGE, () => {
  test("responds 200 with exactly one h1, the solution's name", async ({ page }) => {
    const response = await page.goto(PAGE);
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveText(TITLE);
  });

  test("passes axe accessibility checks", async ({ page }) => {
    await page.goto(PAGE);
    await expectAccessible(page);
  });

  test("fits the screen without scrolling sideways", async ({ page }) => {
    await page.goto(PAGE);
    await expectNoHorizontalOverflow(page);
  });

  test("uses no em dash, in the answers either", async ({ page }) => {
    await page.goto(PAGE);
    await expectNoEmDash(page.locator("main"));
  });

  // Works with went under the hero on 2026-11-16 (Shivanshu).
  test("reads hero, works with, features, process, questions, enquiry, articles, in that order", async ({
    page,
  }) => {
    await page.goto(PAGE);
    await expect(page.locator("main h2")).toHaveText([
      "Cameras that do more than watch",
      "How the cameras work",
      "One team, start to finish",
      "Questions about cameras",
      "Plan your cameras with us",
      "Related articles",
    ]);
  });

  test("shows nine features, each with its icon", async ({ page }) => {
    await page.goto(PAGE);
    const features = page.locator(`${FEATURES} h3`).filter({ hasNot: page.locator("a") });
    await expect(features).toHaveCount(9);
    await expect(page.locator(`${FEATURES} svg.lucide`)).toHaveCount(9);
    const icon = await page.locator(`${FEATURES} svg.lucide`).first().boundingBox();
    expect(icon).toMatchObject({ width: 28, height: 28 });
  });

  test("sends the dark box's button to the contact page", async ({ page }) => {
    await page.goto(PAGE);
    const button = page
      .locator("[data-ground=dark]")
      .getByRole("link", { name: "Book a site visit" });
    await expect(button).toHaveAttribute("href", "/contact");
    await expect(button).toBeVisible();
  });

  test("opens one question at a time", async ({ page }) => {
    await page.goto(PAGE);
    await expectHydrated(page);
    const questions = page.locator("details[name=solution-faq]");
    await expect(questions).toHaveCount(5);
    await questions.nth(0).locator("summary").click();
    await expect(questions.nth(0)).toHaveAttribute("open", "");
    await questions.nth(1).locator("summary").click();
    await expect(questions.nth(1)).toHaveAttribute("open", "");
    await expect(questions.nth(0)).not.toHaveAttribute("open", "");
  });

  test("offers the short enquiry form", async ({ page }) => {
    await page.goto(PAGE);
    const form = page.locator("section", {
      has: page.getByRole("heading", { name: "Plan your cameras with us" }),
    });
    await expect(form.getByLabel("Name")).toBeVisible();
    await expect(form.getByRole("button", { name: "Book a site visit" })).toBeVisible();
  });

  test("ends on three articles, the security one first", async ({ page }) => {
    await page.goto(PAGE);
    const related = page.locator("section", {
      has: page.getByRole("heading", { name: "Related articles" }),
    });
    const links = related.locator("h3 a");
    await expect(links).toHaveCount(3);
    await expect(links.first()).toHaveAttribute("href", "/blog/one-home-five-vendors");
  });

  test("stays out of search while the draft waits for review", async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(
      page.locator('script[type="application/ld+json"]', { hasText: "WebPage" }),
    ).toHaveCount(0);
  });

  // Every solution in the menu has a page since 2026-11-15, Lighting's too:
  // an address that is no solution's is the 404 now.
  test("answers an address that is no solution's with a 404", async ({ page }) => {
    const response = await page.goto("/solutions/sauna");
    expect(response?.status()).toBe(404);
  });
});

test.describe("its layout, from lg", () => {
  test.skip(({ isMobile }) => Boolean(isMobile), "the desktop's grid");
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await withConsentDecided(page);
    await page.goto(PAGE);
  });

  test("puts the picture on the screen's left half, from under the nav to the foot", async ({
    page,
  }) => {
    const picture = (await page.locator("[data-solution-picture]").boundingBox())!;
    const bar = (await page.locator("header").boundingBox())!;
    expect(picture.x).toBe(0);
    expect(picture.width).toBe(720);
    expect(picture.y).toBeLessThanOrEqual(bar.y);
    expect(Math.round(picture.y + picture.height)).toBe(900);
  });

  test("centres the title and its line beside it, 64px off, left aligned", async ({ page }) => {
    const title = (await page.locator("h1").boundingBox())!;
    const lede = (await page.locator("[data-solution-copy] p").boundingBox())!;
    expect(title.x).toBe(784);
    expect(lede.x).toBe(784);
    // Centred on the screen under the contact bar, within a line.
    const middle = (title.y + lede.y + lede.height) / 2;
    const bar = (await page.locator("header").boundingBox())!.y;
    expect(Math.abs(middle - (bar + 900) / 2)).toBeLessThan(40);
  });

  /**
   * Every box in the grid, against the grid's own corner, and the pitch of a
   * column and a row: a box and the 1px line after it. The columns are a
   * fifth of a width that is not a whole number of pixels, so positions are
   * compared to within a pixel and a half.
   */
  async function grid(page: Page) {
    return page.evaluate(() => {
      const grid = document.querySelector('section[aria-labelledby="solution-features"] h3')!
        .parentElement!.parentElement!.parentElement!;
      const g = grid.getBoundingClientRect();
      const boxes = [...grid.children].map((kid) => {
        const r = kid.getBoundingClientRect();
        return { x: r.x - g.x, y: r.y - g.y, w: r.width, h: r.height };
      });
      // 1px frame each side, 1px between: five columns and four lines.
      const column = (g.width - 2 + 1) / 5;
      const row = boxes[0]!.h + 1;
      return { boxes, column, row };
    });
  }

  const near = (actual: number, expected: number) =>
    expect(Math.abs(actual - expected)).toBeLessThanOrEqual(1.5);

  test("lays the nine features round the picture, five by three", async ({ page }) => {
    const { boxes, column, row } = await grid(page);
    expect(boxes).toHaveLength(11);
    const cells = [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
      [2, 1],
      [3, 1],
      [4, 1],
      [2, 2],
    ];
    cells.forEach(([col, line], index) => {
      near(boxes[index]!.x, 1 + col! * column);
      near(boxes[index]!.y, 1 + line! * row);
      near(boxes[index]!.w, column - 1);
    });
  });

  test("puts the picture at the bottom left, two by two", async ({ page }) => {
    const { boxes, column, row } = await grid(page);
    const picture = boxes[9]!;
    near(picture.x, 1);
    near(picture.y, 1 + row);
    near(picture.w, 2 * column - 1);
    near(picture.h, 2 * row - 1);
  });

  test("puts the dark box across the bottom row's last two", async ({ page }) => {
    const { boxes, column, row } = await grid(page);
    const slab = boxes[10]!;
    near(slab.x, 1 + 3 * column);
    near(slab.y, 1 + 2 * row);
    near(slab.w, 2 * column - 1);
    near(slab.h, row - 1);
    await expect(page.locator(`${FEATURES} [data-ground=dark]`)).toHaveCSS(
      "background-color",
      "rgb(10, 8, 7)",
    );
  });

  test("keeps each box about as tall as it is wide, as the design's are", async ({ page }) => {
    const box = (await page.locator(`${FEATURES} h3`).first().locator("../..").boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(260);
    expect(box.height / box.width).toBeLessThan(1.2);
  });

  test("pins each feature's words to its foot", async ({ page }) => {
    const box = (await page.locator(`${FEATURES} h3`).first().locator("../..").boundingBox())!;
    const words = (await page.locator(`${FEATURES} h3`).first().locator("..").boundingBox())!;
    expect(Math.round(words.y + words.height)).toBe(Math.round(box.y + box.height - 16));
  });

  // Shivanshu, 2026-11-15: 4px under the design's 24 over 20, and its 40px h2.
  test("sets a feature 20px over 16px, the dark box's line 20px", async ({ page }) => {
    await expect(page.locator(`${FEATURES} h3`).first()).toHaveCSS("font-size", "20px");
    await expect(page.locator(`${FEATURES} h3 + p`).first()).toHaveCSS("font-size", "16px");
    await expect(page.locator(`${FEATURES} [data-ground=dark] p`)).toHaveCSS("font-size", "20px");
    await expect(page.locator(`${FEATURES} h2`)).toHaveCSS("font-size", "36px");
  });

  // Shivanshu, 2026-11-15: the line top left, left aligned; the button bottom right.
  test("puts the dark box's line at its top left and the button at its bottom right", async ({
    page,
  }) => {
    const slab = page.locator(`${FEATURES} [data-ground=dark]`);
    const box = (await slab.boundingBox())!;
    const line = (await slab.locator("p").boundingBox())!;
    const button = (await slab.getByRole("link", { name: "Book a site visit" }).boundingBox())!;
    near(line.x, box.x + 24);
    near(line.y, box.y + 24);
    near(button.x + button.width, box.x + box.width - 24);
    near(button.y + button.height, box.y + box.height - 24);
    await expect(slab.locator("p")).toHaveCSS("text-align", "start");
  });

  // Shivanshu, 2026-11-16: the heading centred, the cards' words left aligned.
  test("centres the process's heading and its line on the page", async ({ page }) => {
    const section = (await page.locator(PROCESS).boundingBox())!;
    const middle = section.x + section.width / 2;
    for (const part of ["h2", "h2 + p"]) {
      const box = (await page.locator(`${PROCESS} ${part}`).boundingBox())!;
      near(box.x + box.width / 2, middle);
      await expect(page.locator(`${PROCESS} ${part}`)).toHaveCSS("text-align", "center");
    }
  });

  test("sets the three cards in one row, one height, every title level", async ({ page }) => {
    const cards = await page.locator(`${PROCESS} li`).evaluateAll((items) =>
      items.map((item) => {
        const box = item.getBoundingClientRect();
        const title = item.querySelector("h3")!.getBoundingClientRect();
        return { y: box.y, height: box.height, title: title.top };
      }),
    );
    expect(cards).toHaveLength(3);
    expect(new Set(cards.map((card) => Math.round(card.y))).size).toBe(1);
    expect(new Set(cards.map((card) => Math.round(card.height))).size).toBe(1);
    expect(new Set(cards.map((card) => Math.round(card.title))).size).toBe(1);
  });

  // The words' row is as tall as the longest; that one reaches the foot.
  test("sets the words in the card's lower part, the longest 16px off its foot", async ({
    page,
  }) => {
    const cards = await page.locator(`${PROCESS} li`).evaluateAll((items) =>
      items.map((item) => {
        const box = item.getBoundingClientRect();
        const drawing = item.querySelector("img")!.getBoundingClientRect();
        const words = item.lastElementChild!.getBoundingClientRect();
        return { foot: box.bottom, drawn: drawing.bottom, top: words.top, end: words.bottom };
      }),
    );
    for (const card of cards) expect(card.top).toBeGreaterThanOrEqual(card.drawn + 31);
    const lowest = Math.max(...cards.map((card) => card.end));
    near(lowest, cards[0]!.foot - 16);
  });

  test("draws each drawing large and centred at the card's head", async ({ page }) => {
    for (const card of await page.locator(`${PROCESS} li`).all()) {
      const box = (await card.boundingBox())!;
      const drawing = (await card.locator("img").boundingBox())!;
      near(drawing.x + drawing.width / 2, box.x + box.width / 2);
      near(drawing.y, box.y + 16);
      expect(drawing.width).toBe(320);
      near(drawing.height, (320 * 440) / 480);
    }
  });

  test("sets the words left aligned, 16px in, 24px over 16px", async ({ page }) => {
    for (const card of await page.locator(`${PROCESS} li`).all()) {
      const box = (await card.boundingBox())!;
      const title = (await card.locator("h3").boundingBox())!;
      near(title.x, box.x + 16);
      await expect(card.locator("h3")).toHaveCSS("text-align", "start");
      await expect(card.locator("h3")).toHaveCSS("font-size", "24px");
      await expect(card.locator("p")).toHaveCSS("font-size", "16px");
    }
  });
});

test.describe("the logo over the picture, from lg", () => {
  test.skip(({ isMobile }) => Boolean(isMobile), "the bar at rest is the desktop's");
  test.use({ viewport: { width: 1440, height: 900 } });

  const logo = (page: Page) => header(page).getByRole("link", { name: "Smarthaus — home" });
  const LINEN = "rgb(240, 233, 221)"; // brown-100
  const ESPRESSO = "rgb(20, 17, 14)"; // brown-900, the ink on every other page

  test.beforeEach(async ({ page }) => {
    await withConsentDecided(page);
  });

  test("is brown-100 on the picture, while the links and button keep the dark ink", async ({
    page,
  }) => {
    await page.goto(PAGE);
    await expect(logo(page)).toHaveCSS("color", LINEN);
    await expect(header(page).getByRole("link", { name: "About" })).toHaveCSS("color", ESPRESSO);
  });

  test("goes dark again on the glass, once the bar has shrunk", async ({ page }) => {
    await page.goto(PAGE);
    await expectHydrated(page);
    await page.evaluate(() => window.scrollTo({ top: 400, behavior: "instant" }));
    await expect(header(page)).toHaveAttribute("data-stuck", "true");
    // Both lockups: they cross-fade as the bar shrinks, so both are shown for
    // a moment, and neither may be light on the glass.
    const lockups = header(page).locator('a[aria-label="Smarthaus — home"]');
    await expect(lockups).toHaveCount(2);
    await expect(lockups.first()).toHaveCSS("color", ESPRESSO);
    await expect(lockups.last()).toHaveCSS("color", ESPRESSO);
  });

  test("stays dark on a page with no picture under it", async ({ page }) => {
    await page.goto("/about");
    await expect(logo(page)).toHaveCSS("color", ESPRESSO);
  });
});

test.describe("its layout on a phone", () => {
  test.skip(({ isMobile }) => !isMobile, "the phone's");

  test("spans the screen with the picture, the copy under it", async ({ page }) => {
    await page.goto(PAGE);
    const width = page.viewportSize()!.width;
    const picture = (await page.locator("[data-solution-picture]").boundingBox())!;
    expect(picture.x).toBe(0);
    expect(picture.width).toBe(width);
    const title = (await page.locator("h1").boundingBox())!;
    expect(title.y).toBeGreaterThan(picture.y + picture.height);
  });

  test("stacks the features in one column", async ({ page }) => {
    await page.goto(PAGE);
    const xs = await page
      .locator(`${FEATURES} h3`)
      .evaluateAll((titles) =>
        titles.slice(0, 9).map((t) => Math.round(t.getBoundingClientRect().x)),
      );
    expect(new Set(xs).size).toBe(1);
  });

  test("stacks the process's cards in one column, each drawing inside its card", async ({
    page,
  }) => {
    await page.goto(PAGE);
    const cards = await page.locator(`${PROCESS} li`).evaluateAll((items) =>
      items.map((item) => {
        const box = item.getBoundingClientRect();
        const drawing = item.querySelector("img")!.getBoundingClientRect();
        return {
          x: Math.round(box.x),
          top: box.top,
          bottom: box.bottom,
          inside: drawing.left >= box.left && drawing.right <= box.right,
        };
      }),
    );
    expect(new Set(cards.map((card) => card.x)).size).toBe(1);
    cards.slice(1).forEach((card, index) => {
      expect(card.top).toBeGreaterThan(cards[index]!.bottom);
    });
    expect(cards.every((card) => card.inside)).toBe(true);
  });
});

test.describe("the opening, from the Solutions menu", () => {
  test.describe("from lg", () => {
    test.skip(({ isMobile }) => Boolean(isMobile), "the panel is the desktop's");
    test.use({ viewport: { width: 1440, height: 900 } });

    async function openMenuOn(page: Page, cameras = true) {
      await trigger(page).hover();
      await expect(header(page)).toHaveAttribute("data-menu", /hover/);
      const link = panel(page).getByRole("link", { name: cameras ? "Cameras" : "Lighting" });
      await link.hover();
      await expect(link).toHaveAttribute("data-shown", "true");
      return link;
    }

    test.beforeEach(async ({ page }) => {
      await watchTransitions(page);
      await withConsentDecided(page);
      await page.goto("/about");
      await expectHydrated(page);
    });

    // Shivanshu, 2026-11-15: every solution in the menu has a page.
    test("links every solution to its own page", async ({ page }) => {
      // The panel is shut, and out of the accessibility tree while it is.
      for (const { id, label } of SITE_SETTINGS.solutionsMenu.items) {
        await expect(
          panel(page).getByRole("link", { name: label, exact: true, includeHidden: true }),
        ).toHaveAttribute("href", `/solutions/${id}`);
      }
    });

    test("warms the page's picture when the pointer reaches the link", async ({ page }) => {
      await openMenuOn(page);
      await expect(
        page.locator(
          'head link[rel=preload][as=image][imagesizes="(min-width: 64rem) 50vw, 100vw"]',
        ),
      ).toHaveCount(1);
    });

    test("grows the picture into the page in one view transition", async ({ page }) => {
      const link = await openMenuOn(page);
      await link.click();
      await expect(page).toHaveURL(PAGE);
      await expect(page.locator("h1")).toHaveText(TITLE);
      await expect.poll(() => transitions(page)).toEqual([{ ready: true, finished: true }]);
    });

    test("leaves nothing named and closes the menu once it lands", async ({ page }) => {
      const link = await openMenuOn(page);
      await link.click();
      await expect.poll(async () => (await transitions(page))[0]?.finished).toBe(true);
      await expectSettled(page);
      await expect(panel(page)).toHaveCSS("visibility", "hidden");
    });

    // Shivanshu, 2026-11-15: the picture grows over the page opened from,
    // which gives way near the end, and the bar stays above both.
    test("holds the page under the picture, and the bar still above it", async ({ page }) => {
      const link = await openMenuOn(page);
      await link.click();
      await expect.poll(async () => (await transitions(page))[0]?.finished).toBe(true);
      const layers = await page.evaluate(
        () => (window as unknown as { __layers: { bar: string; animations: string[] } }).__layers,
      );
      expect(layers.animations).toEqual(
        expect.arrayContaining([
          "::view-transition-old(root) solution-page-out",
          "::view-transition-new(root) solution-page-in",
        ]),
      );
      // Under its own name, not a module's renaming of it, and held still.
      expect(layers.bar).toBe("solution-nav");
      expect(layers.animations.filter((a) => a.includes("solution-nav"))).toEqual([]);
    });

    test("is a soft navigation: the page is not loaded again", async ({ page }) => {
      await page.evaluate(() => ((window as unknown as { __kept: boolean }).__kept = true));
      const link = await openMenuOn(page);
      await link.click();
      await expect(page).toHaveURL(PAGE);
      expect(await page.evaluate(() => (window as unknown as { __kept?: boolean }).__kept)).toBe(
        true,
      );
    });

    test("opens from the menu's picture too", async ({ page }) => {
      await openMenuOn(page);
      await panel(page).locator("[data-solutions-media]").click();
      await expect(page).toHaveURL(PAGE);
      await expect.poll(async () => (await transitions(page)).length).toBe(1);
    });

    // The opening for a solution with no page (a plain navigation) is the
    // unit tests' since 2026-11-15: no item in the seeded menu lacks a page.
    test("opens another solution the same way: lighting", async ({ page }) => {
      const link = await openMenuOn(page, false);
      await link.click();
      await expect(page).toHaveURL("/solutions/lighting");
      await expect(page.locator("h1")).toHaveText(SOLUTION_PAGES.lighting!.title);
      await expect.poll(() => transitions(page)).toEqual([{ ready: true, finished: true }]);
    });

    test("is a plain navigation under reduced motion", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      const link = await openMenuOn(page);
      await link.click();
      await expect(page).toHaveURL(PAGE);
      await expect(page.locator("h1")).toHaveText(TITLE);
      expect(await transitions(page)).toEqual([]);
    });

    test("lands with the logo brown-100 over the picture", async ({ page }) => {
      const link = await openMenuOn(page);
      await link.click();
      await expect.poll(async () => (await transitions(page))[0]?.finished).toBe(true);
      await expect(header(page).getByRole("link", { name: "Smarthaus — home" })).toHaveCSS(
        "color",
        "rgb(240, 233, 221)",
      );
    });

    test("passes axe once it has landed", async ({ page }) => {
      const link = await openMenuOn(page);
      await link.click();
      await expect.poll(async () => (await transitions(page))[0]?.finished).toBe(true);
      await expectAccessible(page);
    });
  });

  test.describe("below lg", () => {
    test.skip(({ isMobile }) => !isMobile, "the phone menu");

    test.beforeEach(async ({ page }) => {
      await watchTransitions(page);
      await withConsentDecided(page);
      await page.goto("/about");
      await expectHydrated(page);
    });

    async function openSolutions(page: Page) {
      await page.getByRole("button", { name: "Open menu" }).click();
      await expect(page.getByRole("button", { name: "Close menu" })).toBeVisible();
      await trigger(page).tap();
      await expect(header(page)).toHaveAttribute("data-sub", "true");
    }

    test("opens cameras from the phone menu, and closes the menu behind it", async ({ page }) => {
      await openSolutions(page);
      await header(page).getByRole("link", { name: "Cameras" }).filter({ visible: true }).tap();
      await expect(page).toHaveURL(PAGE);
      await expect(page.locator("h1")).toHaveText(TITLE);
      await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
      await expect(header(page)).not.toHaveAttribute("data-open", /.*/);
    });

    test("leaves nothing named once it lands", async ({ page }) => {
      await openSolutions(page);
      await header(page).getByRole("link", { name: "Cameras" }).filter({ visible: true }).tap();
      await expect(page).toHaveURL(PAGE);
      await expect
        .poll(async () => {
          const log = await transitions(page);
          return log.length === 0 || log.every((entry) => entry.finished || entry.error);
        })
        .toBe(true);
      await expectSettled(page);
    });

    test("closes the menu behind any link it follows", async ({ page }) => {
      await page.getByRole("button", { name: "Open menu" }).click();
      await header(page).getByRole("link", { name: "Pricing", exact: true }).tap();
      await expect(page).toHaveURL("/pricing");
      await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
    });
  });
});
