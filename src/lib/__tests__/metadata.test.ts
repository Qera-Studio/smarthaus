/**
 * @jest-environment node
 */
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { Metadata } from "next";
import { POSTS } from "../../../sanity/seed/blog";
import { SOLUTION_PAGES } from "../../../sanity/seed/solutions";
import {
  DESCRIPTION_RANGE,
  INDEXABLE_ROBOTS,
  NOINDEX_ROBOTS,
  OG_IMAGES,
  TITLE_RANGE,
  fullTitle,
  pageMetadata,
} from "../metadata";

const text = (n: number) => "x".repeat(n);
/** A title whose full form (with " | Smarthaus") is exactly n characters. */
const titleOf = (n: number) => text(n - " | Smarthaus".length);
const ok = { path: "/p", title: titleOf(40), description: text(140), index: true };

describe("pageMetadata", () => {
  it("sets the canonical and og:url from one path, so they cannot disagree", () => {
    const m = pageMetadata(ok);
    expect(m.alternates).toEqual({ canonical: "/p" });
    expect(m.openGraph).toMatchObject({ url: "/p" });
  });

  it("carries the shared card fields a page's own openGraph would otherwise drop", () => {
    const m = pageMetadata(ok);
    expect(m.openGraph).toMatchObject({
      type: "website",
      locale: "en_AE",
      siteName: "Smarthaus",
      images: OG_IMAGES,
    });
    expect(m.twitter).toMatchObject({ card: "summary_large_image", images: [OG_IMAGES[0]] });
  });

  it("puts the full title, template applied, on the cards", () => {
    const m = pageMetadata({ ...ok, title: "Accessibility statement" });
    expect(m.title).toBe("Accessibility statement");
    expect(m.openGraph).toMatchObject({ title: "Accessibility statement | Smarthaus" });
    expect(m.twitter).toMatchObject({ title: "Accessibility statement | Smarthaus" });
  });

  it("bypasses the template for an absolute title", () => {
    const title = "Book a site visit in Dubai | Smarthaus";
    const m = pageMetadata({ ...ok, title, absolute: true });
    expect(m.title).toEqual({ absolute: title });
    expect(m.openGraph).toMatchObject({ title });
  });

  it("gives an indexable page the full robots line, and a draft noindex", () => {
    expect(pageMetadata(ok).robots).toEqual(INDEXABLE_ROBOTS);
    expect(pageMetadata({ ...ok, index: false }).robots).toEqual(NOINDEX_ROBOTS);
    expect(INDEXABLE_ROBOTS).toMatchObject({ "max-image-preview": "large", "max-snippet": -1 });
  });

  describe("the length rule, on indexable pages", () => {
    const [tMin, tMax] = TITLE_RANGE;
    const [dMin, dMax] = DESCRIPTION_RANGE;

    it.each([tMin, tMax])("accepts a %i-character title", (n) => {
      expect(() => pageMetadata({ ...ok, title: titleOf(n) })).not.toThrow();
    });

    it.each([tMin - 1, tMax + 1])("refuses a %i-character title, naming the rule", (n) => {
      expect(() => pageMetadata({ ...ok, title: titleOf(n) })).toThrow(
        new RegExp(`${n} characters.*${tMin}-${tMax}`),
      );
    });

    it("counts an absolute title as written", () => {
      expect(() => pageMetadata({ ...ok, title: text(29), absolute: true })).toThrow();
      expect(() => pageMetadata({ ...ok, title: text(30), absolute: true })).not.toThrow();
    });

    it.each([dMin, dMax])("accepts a %i-character description", (n) => {
      expect(() => pageMetadata({ ...ok, description: text(n) })).not.toThrow();
    });

    it.each([dMin - 1, dMax + 1])("refuses a %i-character description", (n) => {
      expect(() => pageMetadata({ ...ok, description: text(n) })).toThrow(
        new RegExp(`${n} characters`),
      );
    });

    it("does not hold a draft to it: snippet length means nothing for a noindex page", () => {
      expect(() =>
        pageMetadata({ path: "/about", title: "About", description: "Short.", index: false }),
      ).not.toThrow();
    });
  });

  it.each(["contact", "//evil.example", "/a?b=1", "/a#b", ""])("refuses the path %p", (path) => {
    expect(() => pageMetadata({ ...ok, path })).toThrow("not a clean site-relative path");
  });

  it("builds the full title with the site name unless absolute", () => {
    expect(fullTitle({ title: "Pricing" })).toBe("Pricing | Smarthaus");
    expect(fullTitle({ title: "Pricing", absolute: true })).toBe("Pricing");
  });
});

type Params = { slug: string };

/**
 * Every page.tsx under src/app, as [route, file, params]. An article's page
 * is one file for every article: it is listed once per seeded article, and a
 * solution's once per seeded solution page.
 */
function pages(): [string, string, Params | undefined][] {
  const app = join(__dirname, "../../app");
  const out: [string, string, Params | undefined][] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        if (!name.startsWith("_") && name !== "__tests__" && !name.startsWith("api")) walk(full);
      } else if (name === "page.tsx") {
        const rel = relative(app, dir).split(sep).join("/");
        const route = rel ? `/${rel}` : "/";
        if (route.includes("[slug]")) {
          const slugs = route.startsWith("/solutions/")
            ? Object.keys(SOLUTION_PAGES)
            : POSTS.map((post) => post.slug);
          for (const slug of slugs) out.push([route.replace("[slug]", slug), full, { slug }]);
          // Three places even with no params: it.each hands a row's missing
          // third argument the test's done callback, not undefined.
        } else out.push([route, full, undefined]);
      }
    }
  };
  walk(app);
  return out.sort((a, b) => a[0].localeCompare(b[0]));
}

// Routes that are not pages a visitor browses: a dev preview and the e2e
// error fixture. Both are noindex or 404 in production on their own terms.
// The Studio is the editors' app, not a page: next-sanity's own noindex
// metadata, checked in src/app/studio/__tests__/page.test.tsx.
const NOT_BROWSED = new Set(["/loader-preview", "/e2e-error", "/studio/[[...tool]]"]);

describe("every page's metadata", () => {
  const all = pages();

  it("finds the pages, so the sweep below is not vacuous", () => {
    expect(all.map(([route]) => route)).toEqual(
      expect.arrayContaining(["/", "/contact", "/accessibility", "/privacy", "/pricing"]),
    );
  });

  it.each(all.filter(([route]) => !NOT_BROWSED.has(route)))(
    "%s names itself as canonical and og:url, with a robots line",
    async (route, file, params) => {
      // A page whose content is in Sanity builds its metadata from it
      // (generateMetadata); the seed stands in for the dataset here.
      const page = (await import(file)) as {
        metadata?: Metadata;
        generateMetadata?: (props: { params: Promise<Params | undefined> }) => Promise<Metadata>;
      };
      const metadata =
        page.metadata ?? (await page.generateMetadata!({ params: Promise.resolve(params) }));
      expect(metadata.alternates).toEqual({ canonical: route });
      // Every page shares the site's two cards, except an article, which is
      // shared with its own picture (2026-11-14).
      const images = route.startsWith("/blog/")
        ? [expect.objectContaining({ width: 1200, height: 630 })]
        : OG_IMAGES;
      expect(metadata.openGraph).toMatchObject({ url: route, images });
      expect([INDEXABLE_ROBOTS, NOINDEX_ROBOTS]).toContainEqual(metadata.robots);
    },
  );
});

describe("an article's metadata", () => {
  const article = {
    ...ok,
    path: "/blog/one-home-five-vendors",
    image: { src: "https://cdn.sanity.io/images/p/d/abc-1000x562.png", alt: "A living room" },
    article: { published: "2026-11-05", author: "Sunil Pareek" },
  };

  it("is shared as an article, with its date and its author", () => {
    expect(pageMetadata(article).openGraph).toMatchObject({
      type: "article",
      publishedTime: "2026-11-05",
      authors: ["Sunil Pareek"],
    });
  });

  it("says when it was last changed, once it has been", () => {
    const modified = "2026-11-10T09:00:00Z";
    const meta = pageMetadata({ ...article, article: { ...article.article, modified } });
    expect(meta.openGraph).toMatchObject({ modifiedTime: modified });
    expect(pageMetadata(article).openGraph).not.toHaveProperty("modifiedTime");
  });

  it("carries its own picture, cropped to a card, in place of the site's two", () => {
    const meta = pageMetadata(article);
    const card = {
      url: "https://cdn.sanity.io/images/p/d/abc-1000x562.png?w=1200&h=630&fit=crop&auto=format",
      width: 1200,
      height: 630,
      alt: "A living room",
    };
    expect(meta.openGraph).toMatchObject({ images: [card] });
    expect(meta.twitter).toMatchObject({ images: [card] });
  });

  it("leaves every other page a website with the site's cards", () => {
    const meta = pageMetadata(ok);
    expect(meta.openGraph).toMatchObject({ type: "website", images: OG_IMAGES });
    expect(meta.openGraph).not.toHaveProperty("publishedTime");
    expect(meta.openGraph).not.toHaveProperty("authors");
  });
});
