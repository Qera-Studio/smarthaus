/**
 * @jest-environment node
 */
import { readdirSync, statSync } from "node:fs";
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
