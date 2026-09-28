/**
 * @jest-environment node
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { Metadata } from "next";
import sitemap from "../sitemap";
import { LAST_MODIFIED } from "../../content/last-modified";

/** Every browsable page under src/app, as [route, file]. */
function pages(): [string, string][] {
  const app = join(__dirname, "..");
  const out: [string, string][] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        if (!["__tests__", "api", "e2e-error", "loader-preview"].includes(name)) walk(full);
      } else if (name === "page.tsx") {
        const rel = relative(app, dir).split(sep).join("/");
        out.push([rel ? `/${rel}` : "/", full]);
      }
    }
  };
  walk(app);
  return out;
}

async function indexableRoutes(): Promise<string[]> {
  const routes: string[] = [];
  for (const [route, file] of pages()) {
    const { metadata } = (await import(file)) as { metadata: Metadata };
    const robots = metadata.robots as { index?: boolean } | undefined;
    if (robots?.index === true) routes.push(route);
  }
  return routes.sort();
}

describe("the sitemap", () => {
  it("lists exactly the pages whose metadata is indexable", async () => {
    const indexable = await indexableRoutes();
    expect(indexable.length).toBeGreaterThanOrEqual(3);
    expect(Object.keys(LAST_MODIFIED).sort()).toEqual(indexable);
  });

  it("uses absolute URLs on the canonical host, with no trailing slash on the root", () => {
    expect(sitemap().map((entry) => entry.url)).toEqual(
      expect.arrayContaining(["https://smarthaus.ae", "https://smarthaus.ae/contact"]),
    );
    for (const { url } of sitemap()) expect(url).toMatch(/^https:\/\/smarthaus\.ae(\/[a-z-]+)*$/);
  });

  it("gives every entry a real calendar date, not the build time", () => {
    for (const { lastModified } of sitemap()) {
      expect(lastModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const date = new Date(`${lastModified as string}T00:00:00Z`);
      expect(date.toISOString().slice(0, 10)).toBe(lastModified);
    }
  });

  it("never dates a page in the future", () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const { lastModified } of sitemap()) expect(lastModified! <= today).toBe(true);
  });

  it("carries no changefreq or priority, which Google ignores", () => {
    for (const entry of sitemap()) {
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
