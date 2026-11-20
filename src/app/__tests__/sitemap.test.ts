/**
 * @jest-environment node
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { Metadata } from "next";
import sitemap from "../sitemap";
import { getDoc, getDocs } from "../../sanity/fetch";
import { ROUTES, routes } from "../../sanity/content";
import { POSTS } from "../../../sanity/seed/blog";
import { SOLUTION_PAGES } from "../../../sanity/seed/solutions";

type Params = { slug: string };

/** The seeded slugs a [slug] route is built for: articles, or solutions. */
const slugsFor = (route: string) =>
  route.startsWith("/solutions/") ? Object.keys(SOLUTION_PAGES) : POSTS.map(({ slug }) => slug);

/**
 * Every browsable page under src/app, as [route, file, params]. An article's
 * page is one file for as many routes as there are articles (2026-11-14, the
 * first route built from content): it is listed once per seeded article, with
 * the slug its metadata is asked for. A solution's page likewise, once per
 * seeded solution page (2026-11-15).
 */
function pages(): [string, string, Params?][] {
  const app = join(__dirname, "..");
  const out: [string, string, Params?][] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        // studio: next-sanity is ESM that Jest cannot load. Its noindex and its
        // absence from the sitemap are asserted in e2e/studio.spec.ts instead.
        if (!["__tests__", "api", "e2e-error", "loader-preview", "studio"].includes(name)) {
          walk(full);
        }
      } else if (name === "page.tsx") {
        const rel = relative(app, dir).split(sep).join("/");
        const route = rel ? `/${rel}` : "/";
        if (route.includes("[slug]")) {
          for (const slug of slugsFor(route)) {
            out.push([route.replace("[slug]", slug), full, { slug }]);
          }
        } else out.push([route, full]);
      }
    }
  };
  walk(app);
  return out;
}

async function indexableRoutes(): Promise<string[]> {
  const found: string[] = [];
  for (const [route, file, params] of pages()) {
    const page = (await import(file)) as {
      metadata?: Metadata;
      generateMetadata?: (props: { params: Promise<Params | undefined> }) => Promise<Metadata>;
    };
    const metadata =
      page.metadata ?? (await page.generateMetadata!({ params: Promise.resolve(params) }));
    const robots = metadata.robots as { index?: boolean } | undefined;
    if (robots?.index === true) found.push(route);
  }
  return found.sort();
}

const urls = async () => (await sitemap()).map((entry) => entry.url);
const route = (url: string) => new URL(url).pathname.replace(/^$/, "/");

describe("the sitemap", () => {
  it("lists exactly the pages whose metadata is indexable", async () => {
    // Each page's "Show in search" in the Studio decides both: the page's
    // robots line and its place here. The seed stands in for the dataset.
    const indexable = await indexableRoutes();
    expect(indexable.length).toBeGreaterThanOrEqual(3);
    expect((await urls()).map(route).sort()).toEqual(indexable);
  });

  it("knows every routed page, so a new route is not silently left out", async () => {
    const routed = (await routes()).map((r) => r.path).sort();
    expect(
      pages()
        .map(([path]) => path)
        .sort(),
    ).toEqual(routed);
  });

  it("adds one route per article to the routes that are code", async () => {
    const all = (await routes()).map((r) => r.path);
    expect(all.slice(0, ROUTES.length)).toEqual(ROUTES.map((r) => r.path));
    expect(all.slice(ROUTES.length).sort()).toEqual(POSTS.map((p) => `/blog/${p.slug}`).sort());
  });

  it("lists an article only once it is in search, and the articles page itself", async () => {
    // Every seeded article is in search since 2026-11-20, so one is switched
    // off here: neither half of the rule may be vacuous.
    const off = POSTS[1]!.slug;
    const seed = jest.requireActual("../../../sanity/seed") as {
      seedDocs: (type: string) => { slug: string; seo: object }[];
    };
    jest
      .mocked(getDocs)
      .mockImplementation(async (type: string) =>
        seed
          .seedDocs(type)
          .map((doc) => (doc.slug === off ? { ...doc, seo: { ...doc.seo, index: false } } : doc)),
      );
    try {
      const listed = (await urls()).map(route);
      expect(listed).toContain("/blog");
      for (const post of POSTS) {
        expect(listed.includes(`/blog/${post.slug}`)).toBe(post.slug !== off);
      }
    } finally {
      jest.mocked(getDocs).mockImplementation(async (type: string) => seed.seedDocs(type));
    }
  });

  it("uses absolute URLs on the canonical host, with no trailing slash on the root", async () => {
    expect(await urls()).toEqual(
      expect.arrayContaining(["https://smarthaus.ae", "https://smarthaus.ae/contact"]),
    );
    for (const url of await urls()) expect(url).toMatch(/^https:\/\/smarthaus\.ae(\/[a-z-]+)*$/);
  });

  it("dates an entry by its document's last edit in Sanity", async () => {
    const edited = "2026-11-11T08:00:00Z";
    const seed = jest.requireActual("../../../sanity/seed") as { seedDoc: (id: string) => object };
    jest
      .mocked(getDoc)
      .mockImplementation(async (id: string) =>
        id === "contactPage" ? { ...seed.seedDoc(id), updatedAt: edited } : seed.seedDoc(id),
      );
    const entries = await sitemap();
    expect(entries.find((e) => e.url === "https://smarthaus.ae/contact")?.lastModified).toBe(
      edited,
    );
    jest.mocked(getDoc).mockImplementation(async (id: string) => seed.seedDoc(id));
  });

  it("invents no date for a document that has none", async () => {
    // The seed carries no edit times; Sanity always does.
    for (const entry of await sitemap()) expect(entry).not.toHaveProperty("lastModified");
  });

  it("carries no changefreq or priority, which Google ignores", async () => {
    for (const entry of await sitemap()) {
      expect(entry).not.toHaveProperty("changeFrequency");
      expect(entry).not.toHaveProperty("priority");
    }
  });
});

describe("the Lighthouse gate", () => {
  type Group = { matchingUrlPattern: string; assertions: Record<string, unknown> };
  const lhci = JSON.parse(readFileSync(join(__dirname, "../../../lighthouserc.json"), "utf8"));
  const urls: string[] = lhci.ci.collect.url;
  const groups: Group[] = lhci.ci.assert.assertMatrix;
  const groupsFor = (url: string) =>
    groups.filter((group) => new RegExp(group.matchingUrlPattern).test(url));
  const routeOf = (url: string) => new URL(url).pathname;

  it("measures a phone with applied throttling, not the desktop preset or a simulation", () => {
    expect(lhci.ci.collect.settings).toEqual({ throttlingMethod: "devtools" });
  });

  it("errors on every assertion except the two the accepted-risk record names", () => {
    // Phase 5 merged with performance and TBT as warnings (decided
    // 2026-09-28); Phase 5b restores them. This fails if anything else is
    // downgraded, and fails once the risk row is resolved while they are
    // still warnings, so the downgrade cannot outlive its record.
    const warns = groups.flatMap((group) =>
      Object.entries(group.assertions)
        .filter(([, value]) => Array.isArray(value) && value[0] === "warn")
        .map(([id]) => id),
    );
    const risks = readFileSync(
      join(__dirname, "../../../docs/launch-gate/accepted-risks.md"),
      "utf8",
    );
    const open = risks
      .split("\n")
      .find((line) => line.includes("Total Blocking Time are warnings"));
    if (warns.length > 0) {
      expect(warns.sort()).toEqual(["categories:performance", "total-blocking-time"]);
      expect(open).toBeDefined(); // an accepted-risk row must name the warnings
      // The last cell is "Resolved": empty while the warnings stand.
      expect(
        open!
          .trim()
          .replace(/\|\s*$/, "")
          .split("|")
          .at(-1)!
          .trim(),
      ).toBe("");
    }
    for (const group of groups) {
      for (const value of Object.values(group.assertions)) {
        expect(["error", "warn"]).toContain((value as [string])[0]);
      }
    }
  });

  it("holds every URL to the performance, accessibility and budget assertions", () => {
    for (const url of urls) {
      const ids = groupsFor(url).flatMap((group) => Object.keys(group.assertions));
      expect({ url, ids }).toEqual({
        url,
        ids: expect.arrayContaining([
          "categories:performance",
          "categories:accessibility",
          "largest-contentful-paint",
          "resource-summary:script:size",
        ]),
      });
    }
  });

  it("holds every indexable URL to the whole SEO category, and exempts only noindex ones", async () => {
    const indexable = await indexableRoutes();
    for (const url of urls) {
      const hasCategory = groupsFor(url).some((group) => "categories:seo" in group.assertions);
      // A noindex page fails is-crawlable by design, so it is held to every
      // other SEO audit instead; an indexable page gets the category.
      expect({ url, hasCategory }).toEqual({ url, hasCategory: indexable.includes(routeOf(url)) });
      if (!hasCategory) {
        const ids = groupsFor(url).flatMap((group) => Object.keys(group.assertions));
        expect(ids).toEqual(
          expect.arrayContaining(["document-title", "meta-description", "canonical"]),
        );
        expect(ids).not.toContain("is-crawlable");
      }
    }
  });
});
