/**
 * @jest-environment node
 */

// The legal pages and their markdown sources, held to what the build does.
// Legal System §5: a policy describing data flows the site does not have is a
// misrepresentation, worse than no policy. Each check below is a way the two
// have drifted apart before, or a fact that must match the one place it lives.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ADDRESS, EMAIL, PHONE_DISPLAY } from "../../lib/contact";
import { PRIVACY_POLICY_VERSION, TERMS_VERSION } from "../legal/versions";
import { CONSENT_COPY } from "../consent";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const privacyMd = read("src/content/legal/privacy-policy.md");
const termsMd = read("src/content/legal/terms-and-conditions.md");
const privacyPage = read("src/app/privacy/page.tsx");
const termsPage = read("src/app/terms/page.tsx");
const actions = read("src/app/contact/actions.ts");
const pkg = JSON.parse(read("package.json")) as { dependencies: Record<string, string> };

/** A frontmatter field from a markdown document. */
function frontmatter(md: string, key: string): string | undefined {
  const block = md.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  return block.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1]?.trim();
}

/** The markdown between one heading and the next heading of any level. */
function section(md: string, heading: string): string {
  const start = md.indexOf(heading);
  if (start < 0) throw new Error(`heading not found: ${heading}`);
  const rest = md.slice(start + heading.length);
  const next = rest.search(/\n#{1,6} /);
  return next < 0 ? rest : rest.slice(0, next);
}

/** The JSX between an <h3> with this text and the next <h3>. */
function pageSection(page: string, h3: string): string {
  const start = page.indexOf(`<h3>${h3}</h3>`);
  if (start < 0) throw new Error(`h3 not found: ${h3}`);
  const rest = page.slice(start);
  const next = rest.indexOf("<h3", 5);
  return next < 0 ? rest : rest.slice(0, next);
}

/** Visible prose of a page module: JSX text with tags and braces stripped. */
function prose(page: string): string {
  return page
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
}

/** Markdown without its HTML comments, which are drafting notes, not policy. */
const published = (md: string) => md.replace(/<!--[\s\S]*?-->/g, " ").replace(/\s+/g, " ");

describe("versions", () => {
  it("prints the privacy policy version its markdown source declares", () => {
    expect(frontmatter(privacyMd, "version")).toBe(PRIVACY_POLICY_VERSION);
  });

  it("prints the terms version its markdown source declares", () => {
    expect(frontmatter(termsMd, "version")).toBe(TERMS_VERSION);
  });

  it("bumped the privacy policy for the 2026-09-26 corrections", () => {
    expect(PRIVACY_POLICY_VERSION).toBe("0.2.0-draft");
    expect(frontmatter(privacyMd, "lastUpdated")).toBe("2026-09-26");
  });

  it.each([
    ["privacy", privacyMd],
    ["terms", termsMd],
  ])("gives the %s source a real calendar date", (_name, md) => {
    const date = frontmatter(md, "lastUpdated")!;
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10)).toBe(date);
  });

  it("keeps both pages marked as drafts until counsel signs off", () => {
    expect(PRIVACY_POLICY_VERSION).toMatch(/-draft$/);
    expect(TERMS_VERSION).toMatch(/-draft$/);
  });

  it("reads each page's version from the shared module, not a literal", () => {
    expect(privacyPage).toContain("version={PRIVACY_POLICY_VERSION}");
    expect(termsPage).toContain("version={TERMS_VERSION}");
    expect(privacyPage).not.toMatch(/const VERSION\s*=/);
    expect(termsPage).not.toMatch(/const VERSION\s*=/);
  });
});

describe("processors: the policy names what the build sends data to", () => {
  it("lists Resend as currently in use on the page, because the enquiry actions send through it", () => {
    expect(actions).toMatch(/from "resend"/);
    expect(pageSection(privacyPage, "Currently in use")).toContain('<th scope="row">Resend</th>');
  });

  it("does not also list Resend as not yet active on the page", () => {
    expect(pageSection(privacyPage, "Not yet active")).not.toContain("Resend");
  });

  it("lists Resend in the markdown's §4.1, and not in §4.2", () => {
    expect(section(privacyMd, "### 4.1")).toMatch(/^\| Resend\s+\|/m);
    expect(section(privacyMd, "### 4.2 Not yet active")).not.toMatch(/^\| Resend/m);
  });

  it.each([
    ["resend", "Resend"],
    ["@vercel/analytics", "Vercel Web Analytics"],
    ["@vercel/speed-insights", "Speed Insights"],
  ])("names %s in the page's current table because it is installed", (dependency, name) => {
    expect(pkg.dependencies).toHaveProperty(dependency);
    expect(pageSection(privacyPage, "Currently in use")).toContain(name);
  });

  it.each(["Sanity", "Cloudflare Turnstile"])(
    "keeps %s as not yet active while it is not a dependency",
    (name) => {
      const installed = Object.keys(pkg.dependencies).some((dep) =>
        dep.toLowerCase().includes(name.split(" ").pop()!.toLowerCase()),
      );
      expect(installed).toBe(false);
      expect(pageSection(privacyPage, "Not yet active")).toContain(name);
      expect(pageSection(privacyPage, "Currently in use")).not.toContain(name);
    },
  );

  it("leaves Resend's sending region as a registered placeholder until it is confirmed", () => {
    expect(privacyMd).toContain("[PLACEHOLDER: confirm Resend sending region]");
    expect(privacyMd).toMatch(/\[ \] Resend sending region/);
  });

  it("no longer carries the drafting note that Resend was misfiled", () => {
    expect(privacyMd).not.toContain("NEEDS ATTENTION: `resend`");
  });
});

describe("cookies: the only cookie is the consent record", () => {
  const spamCookie = /cookie[^.]*spam|spam[^.]*cookie|reject(?:ing)? spam/i;

  it.each([
    ["privacy page", prose(privacyPage)],
    ["privacy markdown", published(privacyMd)],
    ["consent panel copy", JSON.stringify(CONSENT_COPY)],
  ])("no longer credits a cookie with rejecting spam in the %s", (_where, text) => {
    expect(text).not.toMatch(spamCookie);
  });

  it("no longer credits a cookie with keeping the site secure", () => {
    expect(JSON.stringify(CONSENT_COPY)).not.toMatch(/keeping the site secure/i);
  });

  it("says there is one essential cookie, on the page and in the source", () => {
    expect(prose(privacyPage)).toContain("There is one: it remembers your cookie choice.");
    expect(privacyMd).toContain("There is one: it remembers your cookie choice.");
  });

  it("describes the essential row by what it does, in the singular", () => {
    expect(CONSENT_COPY.prefs.essential.body).toMatch(/^Remembering your cookie choice\. /);
    expect(CONSENT_COPY.prefs.essential.body).toContain("cannot work without it");
  });
});

describe("what the form collects", () => {
  it("no longer says unrequired fields are marked optional", () => {
    expect(prose(privacyPage)).not.toMatch(/marked\s+optional/);
    expect(published(privacyMd)).not.toMatch(/marked optional/);
  });

  it("says the needed fields are marked required, which is what the form does", () => {
    expect(prose(privacyPage)).toContain("The fields we need are marked required");
    expect(privacyMd).toContain("The fields we need are marked required");
  });

  it("describes the phone number as required, not optional, on the page and in the source", () => {
    expect(prose(privacyPage)).toContain("Every enquiry form requires it");
    expect(privacyMd).toContain("Every enquiry form requires it");
    expect(prose(privacyPage)).not.toContain("where you provide it");
    expect(published(privacyMd)).not.toContain("where you provide it");
  });

  it("gives the phone number the same lawful basis as the other required field", () => {
    const row = privacyMd.split("\n").find((line) => line.startsWith("| Phone number"))!;
    expect(row).toContain("Consent, and steps toward a contract");
  });
});

describe("identity: one source for the published contact facts", () => {
  it.each([
    ["privacy", privacyPage],
    ["terms", termsPage],
  ])("the %s page imports the address, email and phone rather than restating them", (_n, page) => {
    expect(page).toMatch(
      /import \{ ADDRESS, EMAIL, PHONE_DISPLAY \} from "\.\.\/\.\.\/lib\/contact";/,
    );
    expect(page).not.toContain("Iridium");
    expect(page).not.toContain("mapletech.ae");
    expect(page).not.toContain("375 5150");
  });

  it("publishes the registered address in the wording confirmed against the licence", () => {
    expect(ADDRESS).toBe(
      "The Iridium, 2nd Floor, Office 225, Umm Suqeim St, Al Barsha First, Dubai",
    );
  });

  it("states the same address in the terms source, in both places it appears", () => {
    const rows = termsMd.split("\n").filter((line) => line.includes("Iridium"));
    expect(rows).toHaveLength(2);
    for (const row of rows) expect(row).toContain(ADDRESS);
  });

  it("marks the address as confirmed in the privacy placeholder register", () => {
    expect(privacyMd).toMatch(/\[x\] Registered address/);
  });

  it("keeps the published email and phone formats", () => {
    expect(EMAIL).toBe("contact@mapletech.ae");
    expect(PHONE_DISPLAY).toBe("+971 54 375 5150");
  });
});

describe("placeholders: every marker on a page is registered in its source", () => {
  /** The significant words of a placeholder, for matching across wording. */
  const words = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !["the", "and", "to"].includes(word));

  const onPage = (page: string) =>
    [...page.matchAll(/<Placeholder>([^<]+)<\/Placeholder>/g)].map((match) => match[1]!.trim());
  const inSource = (md: string) =>
    [...md.matchAll(/\[PLACEHOLDER: ([^\]]+)\]/g)].map((match) => match[1]!);

  const registered = (marker: string, md: string) =>
    inSource(md).some((entry) => words(marker).every((word) => words(entry).includes(word)));

  it.each(onPage(privacyPage).map((marker) => [marker]))(
    "privacy page marker %j has a matching [PLACEHOLDER] in the markdown",
    (marker) => {
      expect(registered(marker, privacyMd)).toBe(true);
    },
  );

  it("terms page marker for the liability figure is registered in the markdown", () => {
    expect(registered("figure and currency: counsel to advise", termsMd)).toBe(true);
  });

  // KNOWN MISMATCH, reported 2026-09-26 and awaiting a decision. The terms page
  // renders the forum as a placeholder ("forum: counsel to confirm") while
  // terms-and-conditions.md states "The courts of Dubai, United Arab Emirates
  // have jurisdiction". The markdown's own notes say the forum is unsettled
  // until the licensing regime is confirmed. `it.failing` passes while the two
  // disagree and fails the day they agree, so resolving it is deliberate.
  it.failing("terms page forum marker is registered in the markdown", () => {
    expect(registered("forum: counsel to confirm", termsMd)).toBe(true);
  });

  it("finds markers on both pages, so a parsing change cannot pass this vacuously", () => {
    expect(onPage(privacyPage).length).toBeGreaterThan(3);
    expect(onPage(termsPage).length).toBeGreaterThan(1);
  });
});
