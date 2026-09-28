/**
 * @jest-environment node
 */
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { Metadata } from "next";
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

/** Every page.tsx under src/app, as [route, file]. */
function pages(): [string, string][] {
  const app = join(__dirname, "../../app");
  const out: [string, string][] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        if (!name.startsWith("_") && name !== "__tests__" && !name.startsWith("api")) walk(full);
      } else if (name === "page.tsx") {
        const rel = relative(app, dir).split(sep).join("/");
        out.push([rel ? `/${rel}` : "/", full]);
      }
    }
  };
  walk(app);
  return out.sort();
}

// Routes that are not pages a visitor browses: a dev preview and the e2e
// error fixture. Both are noindex or 404 in production on their own terms.
const NOT_BROWSED = new Set(["/loader-preview", "/e2e-error"]);

describe("every page's metadata", () => {
  const all = pages();

  it("finds the pages, so the sweep below is not vacuous", () => {
    expect(all.map(([route]) => route)).toEqual(
      expect.arrayContaining(["/", "/contact", "/accessibility", "/privacy", "/pricing"]),
    );
  });

  it.each(all.filter(([route]) => !NOT_BROWSED.has(route)))(
    "%s names itself as canonical and og:url, with a robots line",
    async (route, file) => {
      const { metadata } = (await import(file)) as { metadata: Metadata };
      expect(metadata.alternates).toEqual({ canonical: route });
      expect(metadata.openGraph).toMatchObject({ url: route, images: OG_IMAGES });
      expect([INDEXABLE_ROBOTS, NOINDEX_ROBOTS]).toContainEqual(metadata.robots);
    },
  );
});
