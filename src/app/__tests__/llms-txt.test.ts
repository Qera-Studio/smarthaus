/**
 * @jest-environment node
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

import { SITE_URL } from "../../components/Schema/schema";
import { getDoc } from "../../sanity/fetch";
import { ROUTES } from "../../sanity/content";
import { SITE_SETTINGS } from "../../../sanity/seed/site-settings";
import { GET, buildLlmsTxt } from "../llms.txt/route";

/**
 * /llms.txt is a summary for answer engines (llmstxt.org), built from the
 * same content as the site: the brand summary and facts from the site
 * settings, and one line per page that is in search. It may only point at
 * indexable pages (a noindex page is one the site has said is not ready to be
 * quoted), and every fact in it comes from the settings the rest of the site
 * prints (AGENTS.md, claims audit). The seed stands in for the dataset.
 */

let text: string;
let links: string[];

beforeAll(async () => {
  text = await buildLlmsTxt();
  links = Array.from(text.matchAll(/\]\((https?:\/\/[^)]+)\)/g), (m) => m[1]!);
});

const indexable = async () => {
  const docs = await Promise.all(ROUTES.map(async (r) => ({ path: r.path, doc: await r.load() })));
  return docs.filter(({ doc }) => doc.seo.index).map(({ path }) => path);
};

describe("llms.txt", () => {
  it("opens with the brand as its one H1 and the summary from the settings", () => {
    const lines = text.split("\n");
    expect(lines[0]).toBe("# Smarthaus");
    expect(lines.filter((l) => /^# /.test(l))).toHaveLength(1);
    expect(lines.find((l) => l.startsWith(">"))).toBe(`> ${SITE_SETTINGS.seo.llmsSummary}`);
  });

  it("links to every indexable page and to nothing else", async () => {
    const linked = links.map((link) => new URL(link).pathname);
    expect(linked.sort()).toEqual((await indexable()).sort());
    expect(linked.length).toBeGreaterThanOrEqual(3);
  });

  it("drops a page the moment it leaves search", async () => {
    const seed = jest.requireActual("../../../sanity/seed") as {
      seedDoc: (id: string) => { seo: object };
    };
    jest.mocked(getDoc).mockImplementation(async (id: string) => {
      const doc = seed.seedDoc(id);
      return id === "aboutPage" ? { ...doc, seo: { ...doc.seo, index: false } } : doc;
    });
    try {
      expect(await buildLlmsTxt()).not.toContain(`${SITE_URL}/about`);
    } finally {
      jest.mocked(getDoc).mockImplementation(async (id: string) => seed.seedDoc(id));
    }
  });

  it("names each page by its own search title and description", () => {
    expect(text).toContain(
      `- [${SITE_SETTINGS.seo.defaultTitle}](${SITE_URL}): ${SITE_SETTINGS.seo.defaultDescription}`,
    );
  });

  it("links on the same origin as the sitemap and the structured data", () => {
    for (const link of links) expect(new URL(link).origin).toBe(SITE_URL);
  });

  it("states the phone and email the rest of the site uses", () => {
    expect(text).toContain(SITE_SETTINGS.contact.phoneE164);
    expect(text).toContain(SITE_SETTINGS.contact.email);
  });

  it("states both licence numbers from the settings", () => {
    expect(text).toContain(`Dubai trade licence: ${SITE_SETTINGS.identity.tradeLicence}`);
    expect(text).toContain(
      `(Security Industry Regulatory Agency): ${SITE_SETTINGS.identity.siraLicence}`,
    );
  });

  it("makes no claim the claims audit forbids", () => {
    // No invented heritage, no superlatives.
    expect(text).not.toMatch(/years of experience|since \d{4}|trusted by|leading|best/i);
  });

  it("contains no em dashes", () => {
    expect(text).not.toContain("—");
  });

  it("is served as plain UTF-8 text", async () => {
    const response = await GET();
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(await response.text()).toBe(text);
  });

  it("replaced the static file, so the two cannot disagree", () => {
    expect(existsSync(join(process.cwd(), "public", "llms.txt"))).toBe(false);
  });
});
