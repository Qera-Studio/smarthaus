import { test, expect } from "./fixtures";
import {
  expectAccessible,
  expectHydrated,
  expectNoEmDash,
  expectNoHorizontalOverflow,
} from "./checks";

/**
 * The blog (2026-11-14): the articles page, with its search and tag filter,
 * and one article with the three to read next. Read from the ci dataset,
 * which holds the same four articles as the seed.
 */

const ARTICLE = "/blog/one-home-five-vendors";
const ARTICLE_TITLE = "One Home, Five Vendors: The Hidden Cost of a Piecemeal Smart Home";
const NEWEST = "What Actually Happens on Installation Day";
const ALL = [
  NEWEST,
  ARTICLE_TITLE,
  "Why the Best Smart Homes Still Have Something on the Wall",
  "Wi-Fi Isn’t Enough: The Network Your Smart Home Really Runs On",
];

for (const route of ["/blog", ARTICLE, "/blog/installation-day"]) {
  test.describe(route, () => {
    test("responds 200 with exactly one h1", async ({ page }) => {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
    });

    test("passes axe accessibility checks", async ({ page }) => {
      await page.goto(route);
      await expectAccessible(page);
    });

    test("fits the screen without scrolling sideways", async ({ page }) => {
      await page.goto(route);
      await expectNoHorizontalOverflow(page);
    });

    test("uses no em dash", async ({ page }) => {
      await page.goto(route);
      await expectNoEmDash(page.locator("main"));
    });
  });
}

test.describe("the articles page", () => {
  const titles = (page: import("./fixtures").Page) =>
    page.locator("[data-blog-index] h2").allInnerTexts();

  test("lists every article, newest first, the newest as the wide panel", async ({ page }) => {
    await page.goto("/blog");
    await expect(page.getByRole("heading", { level: 1, name: "Articles" })).toBeVisible();
    expect(await titles(page)).toEqual(ALL);
    await expect(page.locator("article[data-featured]")).toContainText(NEWEST);
  });

  test("searches titles and tags as you type", async ({ page }) => {
    await page.goto("/blog");
    await expectHydrated(page);
    const search = page.getByRole("searchbox", { name: "Search articles by title or tag" });
    await search.fill("network");
    await expect.poll(() => titles(page)).toEqual([ALL[3]]);
    await expect(page.getByRole("status").filter({ hasText: "found" })).toHaveText(
      "1 article found",
    );
    await expect(page.locator("article[data-featured]")).toHaveCount(0);
    await search.fill("");
    await expect.poll(() => titles(page)).toEqual(ALL);
    await expect(page.locator("article[data-featured]")).toHaveCount(1);
  });

  test("filters by tag", async ({ page }) => {
    await page.goto("/blog");
    await expectHydrated(page);
    await page.getByRole("combobox", { name: "Filter by tag" }).selectOption("Design");
    await expect.poll(() => titles(page)).toEqual([ALL[2]]);
  });

  test("offers a way back when nothing matches", async ({ page }) => {
    await page.goto("/blog");
    await expectHydrated(page);
    await page.getByRole("searchbox", { name: "Search articles by title or tag" }).fill("zzz");
    await expect(page.getByText("No articles match that.", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Clear the search" }).click();
    await expect.poll(() => titles(page)).toEqual(ALL);
  });

  test("opens an article from its card", async ({ page }) => {
    await page.goto("/blog");
    await page.getByRole("link", { name: ARTICLE_TITLE }).click();
    await expect(page).toHaveURL(ARTICLE);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(ARTICLE_TITLE);
  });

  test("lists every article without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/blog");
    expect(await titles(page)).toEqual(ALL);
    await context.close();
  });
});

test.describe("an article", () => {
  test("says who wrote it, about what, and when", async ({ page }) => {
    await page.goto(ARTICLE);
    const meta = page.locator("dl");
    await expect(meta).toContainText("Sunil Pareek");
    await expect(meta).toContainText("Planning");
    await expect(meta).toContainText("5 November 2026");
  });

  test("draws its main picture through our own image optimiser", async ({ page }) => {
    await page.goto(ARTICLE);
    const hero = page.locator("article img").first();
    await expect(hero).toHaveAttribute("fetchpriority", "high");
    expect(await hero.getAttribute("src")).toMatch(/^\/_next\/image\?url=/);
  });

  test("goes back to the articles page", async ({ page }) => {
    await page.goto(ARTICLE);
    await page.getByRole("link", { name: "Back" }).click();
    await expect(page).toHaveURL("/blog");
  });

  test("offers the three others to read next, and opens one", async ({ page }) => {
    await page.goto(ARTICLE);
    const related = page.getByRole("region", { name: "Related articles" });
    await expect(related.getByRole("listitem")).toHaveCount(3);
    await expect(related.getByRole("link", { name: ARTICLE_TITLE })).toHaveCount(0);
    await related.getByRole("link", { name: NEWEST }).click();
    await expect(page).toHaveURL("/blog/installation-day");
  });

  test("answers an address that is no article's with a 404", async ({ page }) => {
    const response = await page.goto("/blog/no-such-article");
    expect(response?.status()).toBe(404);
  });
});

test.describe("what an article tells crawlers", () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "Desktop Chrome", "the head is identical on every device");
  });

  test("an article in search is shared as an article, with its own picture", async ({ page }) => {
    await page.goto(ARTICLE);
    const head = page.locator("head");
    await expect(head.locator('meta[property="og:type"]')).toHaveAttribute("content", "article");
    await expect(head.locator('meta[property="og:image"]')).toHaveCount(1);
    expect(await head.locator('meta[property="og:image"]').getAttribute("content")).toMatch(
      /^https:\/\/cdn\.sanity\.io\/images\/.+\?w=1200&h=630&fit=crop&auto=format$/,
    );
    await expect(head.locator('meta[name="robots"]')).toHaveAttribute("content", /^index, follow/);
    const graph = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((els) =>
        els.flatMap(
          (el) => (JSON.parse(el.textContent ?? "{}")["@graph"] ?? []) as { "@type": string }[],
        ),
      );
    expect(graph.map((n) => n["@type"])).toContain("BlogPosting");
  });

  test("a drafted article stays out of search and is not described", async ({ page }) => {
    await page.goto("/blog/installation-day");
    await expect(page.locator('head meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, follow",
    );
    const types = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((els) =>
        els.flatMap(
          (el) => (JSON.parse(el.textContent ?? "{}")["@graph"] ?? []) as { "@type": string }[],
        ),
      );
    expect(types.map((n) => n["@type"])).not.toContain("BlogPosting");
  });

  test("the sitemap lists the articles page and the article in search, not the drafts", async ({
    request,
  }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    expect(xml).toContain("<loc>https://smarthaus.ae/blog</loc>");
    expect(xml).toContain(`<loc>https://smarthaus.ae${ARTICLE}</loc>`);
    expect(xml).not.toContain("installation-day");
  });
});

// 2026-11-14, Shivanshu's review of the first build.
test.describe("the review's fixes", () => {
  test("Back starts where the nav's logo does, from lg", async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 1024, "below lg the nav is the bottom bar");
    await page.goto(ARTICLE);
    // The wordmark the bar shows; the header also holds the dome alone,
    // hidden at rest, at the same place.
    const logo = (await page
      .getByRole("banner")
      .getByRole("link", { name: "Smarthaus — home" })
      .boundingBox())!;
    const back = (await page.getByRole("link", { name: "Back" }).boundingBox())!;
    expect(Math.abs(back.x - logo.x)).toBeLessThanOrEqual(2);
  });

  test("Back stays inside the screen, at the page's gutter, on a phone", async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) >= 1024, "a phone's gutter");
    await page.goto(ARTICLE);
    const back = (await page.getByRole("link", { name: "Back" }).boundingBox())!;
    const title = (await page.getByRole("heading", { level: 1 }).boundingBox())!;
    expect(back.x).toBeGreaterThan(0);
    expect(Math.abs(back.x - title.x)).toBeLessThanOrEqual(1);
  });

  test("sets the details 4px under the design: 12px labels and tags, 16px values", async ({
    page,
  }) => {
    await page.goto(ARTICLE);
    const size = (selector: string) =>
      page
        .locator(`article dl ${selector}`)
        .first()
        .evaluate((el) => getComputedStyle(el).fontSize);
    expect(await size("dt")).toBe("12px");
    expect(await size("dd")).toBe("16px");
    expect(await size("time")).toBe("16px");
    expect(await size("li")).toBe("12px");
  });

  test("the search is a line under its words, with a button on the line", async ({
    page,
    hasTouch,
  }) => {
    await page.goto("/blog");
    const search = page.getByRole("searchbox", { name: "Search articles by title or tag" });
    const line = search.locator("..");
    await expect(search).toHaveCSS("border-top-style", "none");
    await expect(line).toHaveCSS("border-bottom-style", "solid");
    await expect(line).toHaveCSS("border-top-style", "none");
    await expect(line).toHaveCSS("border-left-style", "none");
    await expect(line).toHaveCSS("border-right-style", "none");
    const button = page.getByRole("search").getByRole("button", { name: "Search" });
    const field = (await line.boundingBox())!;
    const box = (await button.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(field.x + field.width + 0.5);
    // A finger gets 44px; a mouse 32px, past the 24px it needs (2026-11-15).
    const target = hasTouch ? 44 : 32;
    expect(Math.round(box.width)).toBe(target);
    expect(Math.round(box.height)).toBe(target);
    await expect(search).toHaveCSS("font-size", hasTouch ? "16px" : "14px");
  });

  test("the search and the filter are one height, a size down under a mouse", async ({
    page,
    hasTouch,
  }) => {
    await page.goto("/blog");
    const search = page.getByRole("searchbox", { name: "Search articles by title or tag" });
    const select = page.getByRole("combobox", { name: "Filter by tag" });
    const target = hasTouch ? 44 : 32;
    expect(Math.round((await search.boundingBox())!.height)).toBe(target);
    expect(Math.round((await select.boundingBox())!.height)).toBe(target);
    await expect(select).toHaveCSS("font-size", hasTouch ? "16px" : "14px");
    const icon = await page
      .getByRole("search")
      .getByRole("button", { name: "Search" })
      .locator("span")
      .first()
      .boundingBox();
    expect(Math.round(icon!.width)).toBe(hasTouch ? 20 : 16);
  });

  test("the search button keeps the matches and puts the field down", async ({ page }) => {
    await page.goto("/blog");
    await expectHydrated(page);
    const search = page.getByRole("searchbox", { name: "Search articles by title or tag" });
    await search.fill("network");
    await expect.poll(() => page.locator("[data-blog-index] h2").allInnerTexts()).toEqual([ALL[3]]);
    await page.getByRole("search").getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL("/blog");
    await expect(search).not.toBeFocused();
    await expect(search).toHaveValue("network");
    expect(await page.locator("[data-blog-index] h2").allInnerTexts()).toEqual([ALL[3]]);
  });

  test("Enter in the search does not reload the page", async ({ page }) => {
    await page.goto("/blog");
    await expectHydrated(page);
    const search = page.getByRole("searchbox", { name: "Search articles by title or tag" });
    await search.fill("wall");
    await search.press("Enter");
    await expect(page).toHaveURL("/blog");
    await expect(search).toHaveValue("wall");
  });

  test("the filter draws its arrow inside its frame, a padding in from the end", async ({
    page,
    hasTouch,
  }) => {
    await page.goto("/blog");
    const select = page.getByRole("combobox", { name: "Filter by tag" });
    await expect(select).toHaveCSS("appearance", "none");
    await expect(select).toHaveCSS("padding-right", hasTouch ? "40px" : "32px");
    const frame = (await select.boundingBox())!;
    const arrow = await select.locator("..").evaluate((box) => {
      const after = getComputedStyle(box, "::after");
      return { right: after.right, width: after.width, mask: after.maskImage };
    });
    const wrapper = (await select.locator("..").boundingBox())!;
    expect(Math.abs(wrapper.x + wrapper.width - (frame.x + frame.width))).toBeLessThanOrEqual(0.5);
    expect(arrow).toMatchObject({ right: "12px", width: hasTouch ? "16px" : "12px" });
    expect(arrow.mask).toContain("/blog/chevron-down.svg");
  });

  test("the search's line and the filter's frame end level, side by side", async ({ page }) => {
    test.skip(
      (page.viewportSize()?.width ?? 0) < 768,
      "below md the filter wraps under the search",
    );
    await page.goto("/blog");
    const line = (await page
      .getByRole("searchbox", { name: "Search articles by title or tag" })
      .locator("..")
      .boundingBox())!;
    const frame = (await page.getByRole("combobox", { name: "Filter by tag" }).boundingBox())!;
    expect(frame.x).toBeGreaterThan(line.x + line.width);
    expect(Math.abs(line.y + line.height - (frame.y + frame.height))).toBeLessThanOrEqual(1);
  });

  test("the featured picture is fetched at once and first", async ({ page }) => {
    await page.goto("/blog");
    const img = page.locator("article[data-featured] img");
    await expect(img).toHaveAttribute("loading", "eager");
    await expect(img).toHaveAttribute("fetchpriority", "high");
    await expect(page.locator('[data-blog-index] img[fetchpriority="high"]')).toHaveCount(1);
  });
});

/**
 * How long each article takes to read (Shivanshu, 2026-11-15): on its card,
 * as a second line under the tag and the date with the arrow at its end, and
 * in the article's details. 238 words a minute, rounded up; the four
 * articles read in two or three minutes, and none may read longer than five.
 */
test.describe("the reading time", () => {
  const MINUTES: Record<string, number> = {
    [NEWEST]: 2,
    [ARTICLE_TITLE]: 3,
    "Why the Best Smart Homes Still Have Something on the Wall": 2,
    "Wi-Fi Isn’t Enough: The Network Your Smart Home Really Runs On": 2,
  };

  test("every card says it, in whole minutes, five at most", async ({ page }) => {
    await page.goto("/blog");
    for (const [title, minutes] of Object.entries(MINUTES)) {
      const card = page.locator("[data-blog-index] article").filter({ hasText: title });
      await expect(card).toContainText(`${minutes} min read`);
      expect(minutes).toBeLessThanOrEqual(5);
    }
  });

  test("sits under the tag and the date, with the arrow at its end, inside the card", async ({
    page,
  }) => {
    await page.goto("/blog");
    const rows = await page.locator("[data-blog-index] article").evaluateAll((cards) =>
      cards.map((card) => {
        const box = (el: Element) => el.getBoundingClientRect();
        const meta = card.lastElementChild!.lastElementChild!;
        const [tag, , date, read, arrow] = Array.from(meta.children);
        const c = box(card);
        return {
          dateBesideTag: Math.abs(box(tag!).top - box(date!).top) <= 1,
          readUnder: box(read!).top >= box(date!).bottom,
          readAtStart: Math.abs(box(read!).left - box(tag!).left) <= 1,
          arrowOnReadLine:
            Math.abs(
              box(arrow!).top + box(arrow!).height / 2 - (box(read!).top + box(read!).height / 2),
            ) <= 1,
          arrowAtEnd: Math.abs(box(arrow!).right - c.right) <= 1,
          inside: Array.from(meta.children).every(
            (el) => box(el).left >= c.left - 0.5 && box(el).right <= c.right + 0.5,
          ),
          oneLineEach: [tag, date, read].every((el) => box(el!).height <= 24),
        };
      }),
    );
    expect(rows).toHaveLength(4);
    for (const row of rows) {
      expect(row).toEqual({
        dateBesideTag: true,
        readUnder: true,
        readAtStart: true,
        arrowOnReadLine: true,
        arrowAtEnd: true,
        inside: true,
        oneLineEach: true,
      });
    }
  });

  test("every card's foot is the same height, so a row of cards lines up", async ({ page }) => {
    await page.goto("/blog");
    const heights = await page
      .locator("[data-blog-index] article")
      .evaluateAll((cards) =>
        cards.map((card) => Math.round(card.lastElementChild!.lastElementChild!.clientHeight)),
      );
    expect(new Set(heights).size).toBe(1);
  });

  test("the article's details end with it", async ({ page }) => {
    await page.goto(ARTICLE);
    const terms = await page.locator("main dl dt").allInnerTexts();
    expect(terms).toEqual(["by:", "tags:", "date:", "read:"]);
    await expect(page.locator("main dl dd").last()).toHaveText("3 min");
  });

  test("the article and its card agree", async ({ page }) => {
    for (const [title, minutes] of Object.entries(MINUTES)) {
      await page.goto("/blog");
      await page
        .locator("[data-blog-index] article")
        .filter({ hasText: title })
        .getByRole("link")
        .click();
      await expect(page.locator("main dl dd").last()).toHaveText(`${minutes} min`);
    }
  });
});
