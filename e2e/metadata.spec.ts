import { test, expect } from "./fixtures";

/**
 * What the built HTML tells crawlers and social cards, per route. The unit
 * suite checks the helper; this checks what Next actually emits, since its
 * shallow metadata merge is where og:url "/" leaked onto every page before.
 *
 * Desktop Chrome only: the head is the same markup on every device.
 */
const SITE = "https://smarthaus.ae";
const INDEXABLE = ["/", "/contact", "/accessibility"];
const NOINDEX = [
  "/pricing",
  "/faq",
  "/privacy",
  "/terms",
  "/cookie-preferences",
  "/solutions",
  "/about",
  "/designers",
  "/developers",
];

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== "Desktop Chrome", "the head is identical on every device");
});

for (const route of [...INDEXABLE, ...NOINDEX]) {
  test(`${route}: canonical, og:url and robots agree`, async ({ page }) => {
    await page.goto(route);
    const url = route === "/" ? SITE : `${SITE}${route}`;
    const head = page.locator("head");
    // Next writes the root canonical with a trailing slash.
    const canonical = await head.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical?.replace(/\/$/, "")).toBe(url);
    const ogUrl = await head.locator('meta[property="og:url"]').getAttribute("content");
    expect(ogUrl?.replace(/\/$/, "")).toBe(url);
    await expect(head.locator('meta[property="og:image"]')).toHaveCount(2);
    await expect(head.locator('meta[property="og:site_name"]')).toHaveAttribute(
      "content",
      "Smarthaus",
    );

    const robots = await head.locator('meta[name="robots"]').getAttribute("content");
    if (INDEXABLE.includes(route)) {
      expect(robots).toBe(
        "index, follow, max-video-preview:-1, max-image-preview:large, max-snippet:-1",
      );
      const title = await page.title();
      expect(title.length).toBeGreaterThanOrEqual(30);
      expect(title.length).toBeLessThanOrEqual(60);
    } else {
      expect(robots).toBe("noindex, follow");
    }
  });
}

for (const route of [...INDEXABLE, ...NOINDEX]) {
  test(`${route}: its JSON-LD parses and stays within SEO System §9's limits`, async ({ page }) => {
    await page.goto(route);
    const blocks = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((els) => els.map((el) => el.textContent ?? ""));
    expect(blocks.length).toBeGreaterThanOrEqual(1);
    expect(blocks.length).toBeLessThanOrEqual(4);
    expect(blocks.join("").length).toBeLessThan(4096);
    const parsed = blocks.map(
      (block) => JSON.parse(block) as { "@graph"?: { "@type": string; url?: string }[] },
    );
    const graph = parsed.flatMap((block) => block["@graph"] ?? []);
    expect(graph.filter((node) => node["@type"] === "LocalBusiness")).toHaveLength(1);

    const pages = graph.filter((node) => node["@type"] === "WebPage");
    if (INDEXABLE.includes(route)) {
      expect(pages).toHaveLength(1);
      expect(pages[0]!.url).toBe(route === "/" ? SITE : `${SITE}${route}`);
    } else {
      // No page schema on a page that refuses indexing.
      expect(pages).toHaveLength(0);
    }
  });
}
