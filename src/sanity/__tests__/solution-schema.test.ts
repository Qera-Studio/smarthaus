/**
 * @jest-environment node
 */
import { COLLECTIONS, FIXED_DOCUMENTS, schemaTypes, SINGLETONS } from "../schema";
import { BLOG_TAGS } from "../schema/blog";
import { faqEntry } from "../schema/faq";
import type { SchemaField } from "../schema/primitives";
import { FEATURE_COUNT, SOLUTION_ICONS, solutionPage } from "../schema/solution";
import { ROUTES, SOLUTION_SLUGS, solutionPath } from "../content";
import { SITE_SETTINGS } from "../../../sanity/seed/site-settings";
import { SOLUTION_PAGES } from "../../../sanity/seed/solutions";

/**
 * A solution's page, as editors fill it (2026-11-15). Fixed documents, like
 * every page: the code decides which solutions have one. What the schema
 * holds an editor to is what the layout has room for: nine features, icons
 * that exist, and a tag the blog has.
 */

const field = (from: { fields?: SchemaField[] }, name: string): SchemaField => {
  const found = from.fields?.find((f) => f.name === name);
  if (!found) throw new Error(`no field "${name}"`);
  return found;
};

/** Which rule methods a field's validation calls, with their arguments. */
function rules(target: SchemaField): [string, unknown[]][] {
  const called: [string, unknown[]][] = [];
  const rule: unknown = new Proxy(
    {},
    {
      get:
        (_t, prop: string) =>
        (...args: unknown[]) => {
          called.push([prop, args]);
          return rule;
        },
    },
  );
  target.validation?.(rule as never);
  return called;
}

const features = field(solutionPage, "features");
const items = field(features, "items");
const feature = items.of![0] as SchemaField;

describe("the solution page's type", () => {
  it("is registered with the Studio", () => {
    expect(schemaTypes.map((t) => t.name)).toContain("solutionPage");
  });

  // Shivanshu, 2026-11-15: every solution in the menu has a page.
  it("is a document, one per solution in the menu, in the menu's order", () => {
    expect(solutionPage.type).toBe("document");
    expect(Object.keys(FIXED_DOCUMENTS.solutionPage)).toEqual(
      SITE_SETTINGS.solutionsMenu.items.map((item) => `solution-${item.id}`),
    );
  });

  it("is fixed, never created or deleted by an editor: a route is code", () => {
    expect(COLLECTIONS as readonly string[]).not.toContain("solutionPage");
    expect(SINGLETONS as readonly string[]).not.toContain("solutionPage");
  });

  it("is named for an editor, each by its label in the menu", () => {
    expect(solutionPage.title).toBe("Solution page");
    for (const { id, label } of SITE_SETTINGS.solutionsMenu.items) {
      expect(
        FIXED_DOCUMENTS.solutionPage[`solution-${id}` as keyof typeof FIXED_DOCUMENTS.solutionPage],
      ).toBe(label);
    }
  });

  it("has an id with a hyphen, never a dot, which Sanity would keep private", () => {
    for (const id of Object.keys(FIXED_DOCUMENTS.solutionPage)) {
      expect(id).toMatch(/^solution-[a-z]+(-[a-z]+)*$/);
    }
  });

  it("holds, in order, what the page shows", () => {
    expect(solutionPage.fields!.map((f) => f.name)).toEqual([
      "seo",
      "title",
      "lede",
      "features",
      "faqHeading",
      "faqs",
      "enquiry",
      "articlesHeading",
      "articlesTag",
    ]);
  });

  it("asks for copy in both languages' shape, through the claims audit", () => {
    for (const name of ["title", "lede", "faqHeading", "articlesHeading"]) {
      expect(field(solutionPage, name).type).toBe("localeString");
    }
    expect(field(features, "standfirst").type).toBe("localeText");
  });

  it("requires every field it renders", () => {
    for (const name of ["title", "lede", "features", "faqHeading", "faqs", "enquiry"]) {
      expect(rules(field(solutionPage, name)).map(([m]) => m)).toContain("required");
    }
  });
});

describe("the features", () => {
  it("hold their heading, its line, the nine, the picture and the dark box's words", () => {
    expect(features.fields!.map((f) => f.name)).toEqual([
      "heading",
      "standfirst",
      "items",
      "image",
      "ctaText",
      "ctaLabel",
    ]);
  });

  it(`are exactly ${FEATURE_COUNT}: the grid has a box for each`, () => {
    expect(FEATURE_COUNT).toBe(9);
    expect(rules(items)).toEqual([
      ["required", []],
      ["length", [FEATURE_COUNT]],
    ]);
  });

  it("each pick an icon from the list, and have a title and one line", () => {
    expect(feature.fields!.map((f) => f.name)).toEqual(["icon", "title", "text"]);
    expect(field(feature, "icon").options).toEqual({ list: [...SOLUTION_ICONS] });
  });

  it("offer Lucide's names only, each once", () => {
    for (const name of SOLUTION_ICONS) expect(name).toMatch(/^[a-z]+(-[a-z]+)*$/);
    expect(new Set(SOLUTION_ICONS).size).toBe(SOLUTION_ICONS.length);
  });

  it("list them alphabetically, so an editor finds one in the Studio's list", () => {
    expect([...SOLUTION_ICONS]).toEqual([...SOLUTION_ICONS].sort());
  });

  it("show each by its title in the Studio's list", () => {
    expect(feature.preview).toEqual({ select: { title: "title.en" } });
  });

  it("put a picture beside them, which takes a hotspot", () => {
    const image = field(features, "image");
    expect(image.type).toBe("figure");
    expect(image.options).toEqual({ hotspot: true });
  });
});

describe("the rest of the page", () => {
  it("asks its questions as the other pages do", () => {
    expect(field(solutionPage, "faqs").of).toEqual([faqEntry]);
  });

  it("gives the enquiry form its own heading and line", () => {
    expect(field(solutionPage, "enquiry").fields!.map((f) => f.name)).toEqual([
      "title",
      "standfirst",
    ]);
  });

  it("picks the articles' tag from the blog's own list", () => {
    expect(field(solutionPage, "articlesTag").options).toEqual({ list: [...BLOG_TAGS] });
  });

  it("has search metadata like every page", () => {
    expect(field(solutionPage, "seo").type).toBe("seo");
  });
});

describe("the solutions with a page", () => {
  it("are read from the fixed documents' ids: every solution in the menu", () => {
    expect(SOLUTION_SLUGS).toEqual(SITE_SETTINGS.solutionsMenu.items.map((item) => item.id));
  });

  it("live under /solutions/", () => {
    expect(solutionPath("cameras")).toBe("/solutions/cameras");
  });

  it("are routes, so the sitemap and llms.txt know them", () => {
    const paths = ROUTES.map((r) => r.path);
    for (const slug of SOLUTION_SLUGS) expect(paths).toContain(`/solutions/${slug}`);
  });

  it("keep /solutions itself, which Solutions links to without JavaScript", () => {
    expect(ROUTES.map((r) => r.path)).toContain("/solutions");
  });

  it.each(Object.entries(SOLUTION_PAGES))("load their own documents: %s", async (slug, seeded) => {
    const route = ROUTES.find((r) => r.path === `/solutions/${slug}`)!;
    const page = (await route.load()) as { title?: string };
    expect(page.title).toBe(seeded.title);
  });
});
