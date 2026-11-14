import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { BLOG_PAGE, POSTS } from "../../../../sanity/seed/blog";
import { DESCRIPTION_RANGE, fullTitle, TITLE_RANGE } from "../../../lib/metadata";
import { claimProblem } from "../../claims";
import { articleClaimsRule, BLOG_TAGS, SLUG } from "../../schema/blog";
import type { ArticleBlock, ArticleImage, Post } from "../../types";

/**
 * The four articles the blog launched with. What fails quietly: a picture
 * path that does not resolve or a size that disagrees with the file, a tag
 * the filter does not offer, a date in the future, and a claim in the text
 * (AGENTS.md: three of the four were drafted, and say only what is confirmed).
 */

const PUBLIC = join(process.cwd(), "public");
const TODAY = "2026-11-14";

/** A PNG's pixel size, from its IHDR. */
function pngSize(path: string): { width: number; height: number } {
  const bytes = readFileSync(path);
  expect(bytes.readUInt32BE(0)).toBe(0x89504e47);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

const blocks = (post: Post) => post.body.filter((n): n is ArticleBlock => n._type === "block");
const text = (post: Post) =>
  blocks(post)
    .flatMap((b) => b.children.map((c) => c.text))
    .join(" ");
const words = (post: Post) => text(post).split(/\s+/).filter(Boolean).length;
const pictures = (post: Post) => [
  post.image,
  ...post.body.filter((n): n is ArticleImage => n._type === "articleImage").map((n) => n.image),
];
const each = POSTS.map((p) => [p.slug, p] as const);

describe("the articles page's document", () => {
  it("is headed as the design heads it", () => {
    expect(BLOG_PAGE.heading).toBe("Articles");
  });

  it("is in search, with a title and description inside SEO System §2's ranges", () => {
    expect(BLOG_PAGE.seo.index).toBe(true);
    const title = fullTitle(BLOG_PAGE.seo);
    expect(title.length).toBeGreaterThanOrEqual(TITLE_RANGE[0]);
    expect(title.length).toBeLessThanOrEqual(TITLE_RANGE[1]);
    expect(BLOG_PAGE.seo.description.length).toBeGreaterThanOrEqual(DESCRIPTION_RANGE[0]);
    expect(BLOG_PAGE.seo.description.length).toBeLessThanOrEqual(DESCRIPTION_RANGE[1]);
  });

  it("passes the claims audit", () => {
    for (const copy of [BLOG_PAGE.heading, BLOG_PAGE.seo.title, BLOG_PAGE.seo.description]) {
      expect(claimProblem(copy)).toBeNull();
    }
  });
});

describe("the articles", () => {
  it("are four, as the blog launched", () => {
    expect(POSTS.map((p) => p.slug).sort()).toEqual([
      "installation-day",
      "one-home-five-vendors",
      "something-on-the-wall",
      "wifi-is-not-enough",
    ]);
  });

  it("are listed newest first, with no two on one day", () => {
    const dates = POSTS.map((p) => p.date);
    expect(dates).toEqual([...dates].sort().reverse());
    expect(new Set(dates).size).toBe(dates.length);
  });

  it("have no two with one address or one title", () => {
    expect(new Set(POSTS.map((p) => p.slug)).size).toBe(POSTS.length);
    expect(new Set(POSTS.map((p) => p.title)).size).toBe(POSTS.length);
  });

  it("lead with the one the design features", () => {
    expect(POSTS[0]!.title).toBe("What Actually Happens on Installation Day");
  });

  it("use every tag at least once between them, or leave it out of the filter", () => {
    const used = new Set(POSTS.flatMap((p) => p.tags));
    for (const tag of used) expect(BLOG_TAGS).toContain(tag);
    expect(used.size).toBeGreaterThanOrEqual(4);
  });

  it("put Shivanshu's own article in search and hold the three drafts back", () => {
    // The drafts wait on his review (docs/launch-gate/pre-launch-fixes.md).
    // Turning one on is a deliberate edit, here and in the Studio.
    expect(POSTS.filter((p) => p.seo.index).map((p) => p.slug)).toEqual(["one-home-five-vendors"]);
    expect(POSTS.filter((p) => !p.seo.index)).toHaveLength(3);
  });
});

describe.each(each)("%s", (_slug, post) => {
  it("has an address that is a clean URL", () => {
    expect(post.slug).toMatch(SLUG);
    expect(post.slug.length).toBeLessThanOrEqual(40);
  });

  it("is by the confirmed byline", () => {
    expect(post.author).toBe("Sunil Pareek");
  });

  it("is dated as a calendar day, not in the future", () => {
    expect(post.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(`${post.date}T00:00:00Z`).toISOString().slice(0, 10)).toBe(post.date);
    expect(post.date <= TODAY).toBe(true);
  });

  it("carries one to three tags from the list, none twice", () => {
    expect(post.tags.length).toBeGreaterThanOrEqual(1);
    expect(post.tags.length).toBeLessThanOrEqual(3);
    for (const tag of post.tags) expect(BLOG_TAGS).toContain(tag);
    expect(new Set(post.tags).size).toBe(post.tags.length);
  });

  it("has an excerpt of one or two sentences that fits beside the picture", () => {
    expect(post.excerpt.length).toBeGreaterThanOrEqual(60);
    expect(post.excerpt.length).toBeLessThanOrEqual(180);
    expect(post.excerpt.trim()).toBe(post.excerpt);
    expect(post.excerpt).toMatch(/\.$/);
  });

  it("has a search title and description inside SEO System §2's ranges", () => {
    const title = fullTitle(post.seo);
    expect(title.length).toBeGreaterThanOrEqual(TITLE_RANGE[0]);
    expect(title.length).toBeLessThanOrEqual(TITLE_RANGE[1]);
    expect(post.seo.description.length).toBeGreaterThanOrEqual(DESCRIPTION_RANGE[0]);
    expect(post.seo.description.length).toBeLessThanOrEqual(DESCRIPTION_RANGE[1]);
  });

  it("does not repeat its excerpt as its search description", () => {
    expect(post.seo.description).not.toBe(post.excerpt);
  });

  it("points every picture at a file that exists, at the size it declares", () => {
    for (const picture of pictures(post)) {
      const file = join(PUBLIC, picture.src);
      expect(existsSync(file)).toBe(true);
      expect(pngSize(file)).toEqual({ width: picture.width, height: picture.height });
    }
  });

  it("keeps its pictures in the blog's own folder, named for the article", () => {
    for (const picture of pictures(post)) expect(picture.src).toMatch(/^\/blog\/[a-z-]+\.png$/);
  });

  it("describes every picture as it is on screen", () => {
    for (const { alt } of pictures(post)) {
      expect(alt.length).toBeGreaterThanOrEqual(20);
      expect(alt.length).toBeLessThanOrEqual(125);
      expect(alt).not.toMatch(/^(image|picture|photo) of/i);
      expect(alt).not.toMatch(/\.$/);
      expect(claimProblem(alt)).toBeNull();
    }
  });

  it("still marks every picture as pending replacement", () => {
    // Licensed stock, standing in (AGENTS.md, photography). This fails once
    // the last mark is cleared, so replacing them is a deliberate act.
    for (const picture of pictures(post)) expect(picture.stock).toBe(true);
  });

  it("is long enough to be worth reading and short enough to be read", () => {
    expect(words(post)).toBeGreaterThanOrEqual(250);
    expect(words(post)).toBeLessThanOrEqual(900);
  });

  it("opens with a paragraph, not a heading or a picture", () => {
    expect(post.body[0]).toMatchObject({ _type: "block", style: "normal" });
  });

  it("is broken up by at least three headings, none the same", () => {
    const headings = blocks(post)
      .filter((b) => b.style === "h2")
      .map((b) => b.children[0]!.text);
    expect(headings.length).toBeGreaterThanOrEqual(3);
    expect(new Set(headings).size).toBe(headings.length);
  });

  it("never follows a heading with another heading, or ends on one", () => {
    const styles = post.body.map((n) => (n._type === "block" ? n.style : "image"));
    styles.forEach((style, i) => {
      if (style === "h2" || style === "h3") {
        expect(styles[i + 1]).toBeDefined();
        expect(["h2", "h3"]).not.toContain(styles[i + 1]);
      }
    });
  });

  it("gives every block and span its own key, as Sanity needs", () => {
    const keys = post.body.map((n) => n._key);
    expect(new Set(keys).size).toBe(keys.length);
    const spans = blocks(post).flatMap((b) => b.children.map((c) => c._key));
    expect(new Set(spans).size).toBe(spans.length);
  });

  it("uses only the shapes the schema offers", () => {
    for (const block of blocks(post)) {
      expect(["normal", "h2", "h3", "blockquote", "callout"]).toContain(block.style);
      if (block.listItem) expect(["bullet", "number"]).toContain(block.listItem);
    }
  });

  it("leaves no block empty", () => {
    for (const block of blocks(post)) {
      expect(
        block.children
          .map((c) => c.text)
          .join("")
          .trim(),
      ).not.toBe("");
    }
  });

  it("passes the claims audit in its title, excerpt, metadata and every line", () => {
    for (const copy of [post.title, post.excerpt, post.seo.title, post.seo.description]) {
      expect(claimProblem(copy)).toBeNull();
    }
    expect(articleClaimsRule(post.body)).toBe(true);
  });

  it("quotes no price, and no figure in dirhams", () => {
    // The site discloses no prices for now (Shivanshu, 2026-11-04).
    expect(text(post)).not.toMatch(/\bAED\b|\bdirhams?\b|\bDhs?\b|\$\s?\d/i);
  });

  it("names no maker or partner, which would be a claim to ask about first", () => {
    expect(text(post)).not.toMatch(
      /\b(Lutron|Crestron|Control4|KNX|Loxone|Aqara|Shelly|LifeSmart|TIS|Fibaro)\b/,
    );
  });

  it("uses no em dash and no double hyphen standing in for one", () => {
    const all = [post.title, post.excerpt, text(post)].join(" ");
    expect(all).not.toMatch(/—|--/);
  });
});

describe("what the drafted articles say about Smarthaus itself", () => {
  // Only what AGENTS.md lists as confirmed (claims audit). A figure or a
  // promise beyond that list is a claim with no source.
  const drafts = POSTS.filter((p) => !p.seo.index);
  const all = drafts.map(text).join(" ");

  it("states the visit as it was confirmed: two people, about 90 minutes", () => {
    expect(all).toContain("A technician and a technical lead spend about 90 minutes in the home");
  });

  it("states the price as it was confirmed: fixed and itemised, with no figure", () => {
    expect(all).toContain("The price that follows is fixed and itemised");
  });

  it("uses no other number about the business", () => {
    const numbers = all.match(/\b\d+(\.\d+)?\+?%?/g) ?? [];
    // 90 minutes is the visit; 2 is the label "Dimmer 2", an example.
    expect(numbers.sort()).toEqual(["2", "90"]);
  });

  it("promises no response time, warranty or guarantee", () => {
    expect(all).not.toMatch(/\bwithin \d|\bguarantee|\bwarrant(y|ies)\b|\b24\/7\b|\bSLA\b/i);
  });

  it("claims no count of homes, clients or years", () => {
    expect(all).not.toMatch(
      /\b(hundreds|thousands|dozens) of\b|\byears\b.*\b(experience|business)\b/i,
    );
  });
});
