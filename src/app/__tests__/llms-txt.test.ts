import { readFileSync } from "node:fs";
import { join } from "node:path";

import { SITE_URL } from "../../components/Schema/schema";
import { LAST_MODIFIED } from "../../content/last-modified";
import { EMAIL, PHONE_E164 } from "../../lib/contact";

/**
 * public/llms.txt is a summary for answer engines (llmstxt.org). It is a
 * static file, so nothing keeps it in step with the site but this suite: it
 * may only point at indexable pages (a noindex page is one the site has said
 * is not ready to be quoted), and every fact in it has a source elsewhere in
 * the code that it must agree with (AGENTS.md, claims audit).
 */

const text = readFileSync(join(process.cwd(), "public", "llms.txt"), "utf8");
const links = Array.from(text.matchAll(/\]\((https?:\/\/[^)]+)\)/g), (m) => m[1]!);

describe("llms.txt", () => {
  it("opens with the brand as its one H1 and a summary blockquote", () => {
    const lines = text.split("\n");
    expect(lines[0]).toBe("# Smarthaus");
    expect(lines.filter((l) => /^# /.test(l))).toHaveLength(1);
    expect(lines.find((l) => l.startsWith(">"))).toMatch(/Dubai/);
  });

  it("links only to indexable pages", () => {
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      const path = new URL(link).pathname;
      expect(Object.keys(LAST_MODIFIED)).toContain(path);
    }
  });

  it("links on the same origin as the sitemap and the structured data", () => {
    for (const link of links) expect(new URL(link).origin).toBe(SITE_URL);
  });

  it("states the phone and email the rest of the site uses", () => {
    expect(text).toContain(PHONE_E164);
    expect(text).toContain(EMAIL);
  });

  it("states both licence numbers exactly as the schema does", () => {
    const schema = readFileSync(
      join(process.cwd(), "src", "components", "Schema", "schema.ts"),
      "utf8",
    );
    for (const licence of ["897839", "SSP202210037219"]) {
      expect(schema).toContain(licence);
      expect(text).toContain(licence);
    }
  });

  it("makes no claim the claims audit forbids", () => {
    // No invented heritage, no unconfirmed partners, no superlatives.
    expect(text).not.toMatch(/years of experience|since \d{4}|trusted by|TIS|Fibaro|leading|best/i);
  });

  it("contains no em dashes", () => {
    expect(text).not.toContain("—");
  });
});
