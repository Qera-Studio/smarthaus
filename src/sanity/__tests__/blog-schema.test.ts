/**
 * @jest-environment node
 */
import { MAX_READ_MINUTES, WORDS_PER_MINUTE } from "../../lib/reading-time";
import {
  articleClaimsRule,
  articleImage,
  articleTextRule,
  blogPage,
  BLOG_TAGS,
  localeArticle,
  post,
  readTimeRule,
  SLUG,
  slugRule,
} from "../schema/blog";
import { COLLECTIONS, schemaTypes, SINGLETONS } from "../schema";
import type { SchemaField } from "../schema/primitives";

/**
 * The blog's schema. It is the one type editors create, so what it lets them
 * type is what can reach the site: an address that is a real URL, tags from a
 * fixed list, and text that passes the claims audit (AGENTS.md).
 */

const field = (name: string): SchemaField => {
  const found = post.fields!.find((f) => f.name === name);
  if (!found) throw new Error(`post has no field "${name}"`);
  return found;
};

/** Which rule methods a field's validation calls, in order. */
function rules(target: SchemaField): string[] {
  const called: string[] = [];
  const rule: unknown = new Proxy(
    {},
    {
      get: (_t, prop: string) => () => {
        called.push(prop);
        return rule;
      },
    },
  );
  target.validation?.(rule as never);
  return called;
}

const span = (text: string) => ({ _type: "span", text });
const paragraph = (...texts: string[]) => ({ _type: "block", children: texts.map(span) });

describe("the blog's types", () => {
  it("are registered with the Studio", () => {
    const names = schemaTypes.map((t) => t.name);
    for (const type of [post, blogPage, localeArticle, articleImage]) {
      expect(names).toContain(type.name);
    }
  });

  it("makes the article the one type editors create", () => {
    expect(COLLECTIONS).toEqual([post.name]);
    expect(SINGLETONS).toContain(blogPage.name);
    expect(SINGLETONS).not.toContain(post.name);
  });
});

describe("an article", () => {
  it("has every field the page prints, in the order an editor fills them", () => {
    expect(post.fields!.map((f) => f.name)).toEqual([
      "title",
      "slug",
      "author",
      "date",
      "tags",
      "excerpt",
      "image",
      "body",
      "seo",
    ]);
  });

  it.each(["title", "slug", "author", "date", "tags", "excerpt", "image", "body", "seo"])(
    "requires its %s",
    (name) => {
      expect(rules(field(name))).toContain("required");
    },
  );

  it("is listed in the Studio by its title, its date and its picture", () => {
    expect(post.preview).toEqual({
      select: { title: "title.en", subtitle: "date", media: "image" },
    });
  });

  it("stores its date as a date, so articles sort by it", () => {
    expect(field("date").type).toBe("date");
  });

  it("checks its address", () => {
    expect(rules(field("slug"))).toEqual(["required", "custom"]);
  });
});

describe("an article's address", () => {
  it.each(["one-home-five-vendors", "installation-day", "wifi", "a-b-c"])("accepts %s", (slug) => {
    expect(slugRule(slug)).toBe(true);
    expect(SLUG.test(slug)).toBe(true);
  });

  it.each([
    "One-Home",
    "one home",
    "one_home",
    "-one-home",
    "one-home-",
    "one--home",
    "top-10-tips",
    "wi-fi?",
    "blog/one",
    "",
  ])("refuses %p", (slug) => {
    expect(slugRule(slug)).toMatch(/Lower-case letters and hyphens only/);
  });

  it.each([undefined, null, 42, {}])("refuses %p, which is not text", (value) => {
    expect(typeof slugRule(value)).toBe("string");
  });

  it("is a path the sitemap's own rule accepts", () => {
    // src/app/__tests__/sitemap.test.ts holds every URL to this pattern.
    const url = /^https:\/\/smarthaus\.ae(\/[a-z-]+)*$/;
    for (const slug of ["one-home-five-vendors", "wifi-is-not-enough"]) {
      expect(`https://smarthaus.ae/blog/${slug}`).toMatch(url);
    }
  });
});

describe("the tags", () => {
  const tags = field("tags");

  it("are a fixed list, offered to the editor as it is written", () => {
    expect(BLOG_TAGS).toEqual([
      "Planning",
      "Installation",
      "Security",
      "Networking",
      "Design",
      "Everyday use",
    ]);
    expect(tags.options).toEqual({ list: BLOG_TAGS.map((t) => ({ title: t, value: t })) });
  });

  it("has no two that read alike", () => {
    const folded = BLOG_TAGS.map((t) => t.toLowerCase());
    expect(new Set(folded).size).toBe(BLOG_TAGS.length);
  });

  it("asks for at least one, and none twice", () => {
    expect(rules(tags)).toEqual(["required", "min", "unique"]);
    expect(tags.of).toEqual([{ name: "tag", type: "string" }]);
  });
});

describe("an article's text", () => {
  const [en, ar] = localeArticle.fields!;
  type Block = SchemaField & {
    styles: { value: string }[];
    lists: { value: string }[];
    marks: { decorators: { value: string }[]; annotations: SchemaField[] };
  };
  const block = en!.of![0] as Block;

  it("is written per language, English required and Arabic waiting", () => {
    expect([en!.name, ar!.name]).toEqual(["en", "ar"]);
    expect(rules(en!)).toEqual(["required", "custom"]);
    expect(ar!.validation).toBeUndefined();
    expect(ar!.of).toBe(en!.of);
  });

  it("offers only the shapes the page can draw", () => {
    expect(en!.of!.map((m) => m.type)).toEqual(["block", "articleImage"]);
    expect(block.styles.map((s) => s.value)).toEqual([
      "normal",
      "h2",
      "h3",
      "blockquote",
      "callout",
    ]);
    expect(block.lists.map((l) => l.value)).toEqual(["bullet", "number"]);
    expect(block.marks.decorators.map((d) => d.value)).toEqual(["strong", "em"]);
    expect(block.marks.annotations.map((a) => a.name)).toEqual(["link"]);
  });

  it("offers no heading that would outrank the title, the page's h1", () => {
    expect(block.styles.map((s) => s.value)).not.toContain("h1");
  });

  it("holds a picture with words for a screen reader, and an optional caption", () => {
    const [image, caption] = articleImage.fields!;
    expect(image!.type).toBe("figure");
    expect(rules(image!)).toContain("required");
    expect(caption!.type).toBe("localeString");
    expect(caption!.validation).toBeUndefined();
  });
});

describe("the claims audit, over an article's text", () => {
  it("passes plain advice", () => {
    expect(
      articleClaimsRule([
        paragraph("Most smart homes are not designed. They pile up."),
        paragraph("The best system is the one you stop noticing."),
      ]),
    ).toBe(true);
  });

  it.each([
    ["We are a certified installer.", "certified"],
    ["Trusted by families across Dubai.", "trusted by"],
    ["A world-class system.", "superlative"],
    ["Book today!", "exclamation mark"],
    ["One team — one system.", "em dash"],
    ["With 10 years of experience behind us.", "track record"],
  ])("refuses %p", (text, reason) => {
    const result = articleClaimsRule([paragraph("A fine opening line."), paragraph(text)]);
    expect(result).toEqual(expect.stringContaining(reason));
  });

  it("reads every span of a paragraph, not only its first", () => {
    expect(typeof articleClaimsRule([paragraph("Fine.", "Still fine.", "Award-winning.")])).toBe(
      "string",
    );
  });

  it("leaves a picture between paragraphs alone", () => {
    expect(
      articleClaimsRule([
        { _type: "articleImage", caption: { en: "A cabinet" } },
        paragraph("Ok."),
      ]),
    ).toBe(true);
  });

  it.each([undefined, null, "text", { en: [] }])("has nothing to say about %p", (value) => {
    expect(articleClaimsRule(value)).toBe(true);
  });

  it("copes with a block that has no text yet", () => {
    expect(articleClaimsRule([{ _type: "block" }, { _type: "block", children: [{}] }])).toBe(true);
  });
});

/** `n` words, as one paragraph. */
const ofWords = (n: number) => paragraph(Array.from({ length: n }, () => "word").join(" "));

describe("the five-minute limit", () => {
  // Shivanshu, 2026-11-15: readers rarely give an article more than five
  // minutes, so a longer one cannot be published. 5 x 238 words.
  it("publishes an article that reads in five minutes, 1,190 words", () => {
    expect(readTimeRule([ofWords(1190)])).toBe(true);
  });

  it("publishes a short one", () => {
    expect(readTimeRule([ofWords(40)])).toBe(true);
  });

  it("refuses one a word longer, saying how long it reads and where the limit is", () => {
    expect(readTimeRule([ofWords(1191)])).toBe(
      "This reads in about 6 minutes. Keep an article to 5 minutes or less, about 1190 words.",
    );
  });

  it("counts the whole text, not one paragraph", () => {
    expect(readTimeRule([ofWords(600), ofWords(600)])).toEqual(
      expect.stringContaining("about 6 minutes"),
    );
  });

  it("does not count pictures towards it", () => {
    const picture = { _type: "articleImage", caption: { en: "A cabinet" } };
    expect(readTimeRule([picture, ofWords(1190), picture])).toBe(true);
  });

  it("states the limit from the constants, so they cannot drift apart", () => {
    const message = readTimeRule([ofWords(MAX_READ_MINUTES * WORDS_PER_MINUTE + 1)]);
    expect(message).toEqual(expect.stringContaining(`${MAX_READ_MINUTES} minutes or less`));
    expect(message).toEqual(
      expect.stringContaining(`about ${MAX_READ_MINUTES * WORDS_PER_MINUTE} words`),
    );
  });
});

describe("every check on an article's text", () => {
  it("passes a short, plain article", () => {
    expect(articleTextRule([ofWords(300)])).toBe(true);
  });

  it("refuses a claim", () => {
    expect(articleTextRule([paragraph("Trusted by families across Dubai.")])).toEqual(
      expect.stringContaining("trusted by"),
    );
  });

  it("refuses an article that is too long", () => {
    expect(articleTextRule([ofWords(1300)])).toEqual(expect.stringContaining("6 minutes"));
  });

  it("names the claim first when an article has both problems", () => {
    const both = [ofWords(1300), paragraph("Book today!")];
    expect(articleTextRule(both)).toEqual(expect.stringContaining("exclamation mark"));
  });

  it("is the check the English text runs", () => {
    const [en] = localeArticle.fields!;
    const passed: unknown[] = [];
    const rule: unknown = new Proxy(
      {},
      {
        get: (_t, prop: string) => (arg?: unknown) => {
          if (prop === "custom") passed.push(arg);
          return rule;
        },
      },
    );
    en!.validation?.(rule as never);
    expect(passed).toEqual([articleTextRule]);
  });
});

describe("the articles page", () => {
  it("is a document with search metadata and a heading", () => {
    expect(blogPage.type).toBe("document");
    expect(blogPage.fields!.map((f) => f.name)).toEqual(["seo", "heading"]);
  });
});
