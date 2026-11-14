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
