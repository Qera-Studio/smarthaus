/**
 * @jest-environment node
 */
import { BLOG_PAGE, POSTS } from "../../../sanity/seed/blog";
import { BLOG_SEED, SEED, seedDocs } from "../../../sanity/seed";
import { toDocument } from "../../../sanity/seed/to-documents";
import { getBlogPage, getPost, getPosts, postPath, ROUTES, routes } from "../content";
import { getDocs } from "../fetch";
import { localize } from "../localize";

/**
 * How the site reads the blog: one list of articles, newest first, that the
 * index, each article and the sitemap all share. jest.setup.ts serves the
 * seed in place of the dataset; fetch.test.ts tests the real query.
 */

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** What `sanity dataset import` does with an upload: an asset reference. */
function imported(value: Json): Json {
  if (Array.isArray(value)) return value.map(imported);
  if (value === null || typeof value !== "object") return value;
  const out: Record<string, Json> = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === "_sanityAsset") {
      out.asset = { _type: "reference", _ref: "image-0a1b2c-640x360-png" };
    } else out[key] = imported(child);
  }
  return out;
}

describe("the articles", () => {
  it("are read as one list of their type", async () => {
    await getPosts();
    expect(getDocs).toHaveBeenCalledWith("post");
  });

  it("come newest first", async () => {
    const dates = (await getPosts()).map((p) => p.date);
    expect(dates).toEqual([...dates].sort().reverse());
    expect(dates).toHaveLength(POSTS.length);
  });

  it("are the seed's, whole", async () => {
    expect(await getPosts()).toEqual([...POSTS].sort((a, b) => b.date.localeCompare(a.date)));
  });

  it.each(POSTS.map((p) => [p.slug, p] as const))("finds %s by its address", async (slug, post) => {
    expect(await getPost(slug)).toBe(post);
  });

  it.each(["", "no-such-article", "ONE-HOME-FIVE-VENDORS", "one-home"])(
    "finds nothing at %p",
    async (slug) => {
      expect(await getPost(slug)).toBeUndefined();
    },
  );

  it("puts an article under /blog/", () => {
    expect(postPath("installation-day")).toBe("/blog/installation-day");
  });
});

describe("the articles page's document", () => {
  it("is read by its fixed id", async () => {
    expect(await getBlogPage()).toBe(BLOG_PAGE);
  });

  it("is a route like any other page", () => {
    expect(ROUTES.map((r) => r.path)).toContain("/blog");
  });
});

describe("every route, content's included", () => {
  it("is the routes that are code, then one per article", async () => {
    const all = await routes();
    expect(all).toHaveLength(ROUTES.length + POSTS.length);
    expect(all.slice(0, ROUTES.length)).toEqual([...ROUTES]);
  });

  it("loads each article's own document, for its search switch and its date", async () => {
    const all = await routes();
    for (const post of POSTS) {
      const route = all.find((r) => r.path === `/blog/${post.slug}`)!;
      expect(await route.load()).toBe(post);
    }
  });

  it("gives no two routes one address", async () => {
    const paths = (await routes()).map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe("the seed's own list, which stands in for the dataset", () => {
  it("returns a type's documents newest first", () => {
    const dates = (seedDocs("post") as { date: string }[]).map((p) => p.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("returns nothing for a type with no documents", () => {
    expect(seedDocs("nope")).toEqual([]);
  });

  it("returns a singleton as a list of one", () => {
    expect(seedDocs("blogPage")).toEqual([BLOG_PAGE]);
  });
});

describe("what production was given", () => {
  // Production is never re-seeded (AGENTS.md). The blog's documents were
  // imported into it alone, once, without --replace.
  it("is the articles page and the articles, and nothing that already existed", () => {
    expect(BLOG_SEED.map((e) => e.type).sort()).toEqual(
      ["blogPage", ...POSTS.map(() => "post")].sort(),
    );
    const before = SEED.filter((e) => !BLOG_SEED.includes(e)).map((e) => e.id);
    for (const { id } of BLOG_SEED) expect(before).not.toContain(id);
  });

  it("carries no site settings, so no footer link reaches the live site early", () => {
    expect(BLOG_SEED.map((e) => e.id)).not.toContain("siteSettings");
  });
});

describe("an article's text, to Sanity and back", () => {
  const entry = SEED.find((e) => e.id === "post-one-home-five-vendors")!;
  const doc = toDocument(entry) as { body: { _type: string; en: Record<string, Json>[] } };
  const nodes = doc.body.en;

  it("is stored per language", () => {
    expect(doc.body._type).toBe("localeArticle");
    expect(nodes).toHaveLength((entry.value as { body: unknown[] }).body.length);
  });

  it("keeps each paragraph as it was written, key and all", () => {
    const written = (entry.value as { body: { _type: string }[] }).body;
    nodes.forEach((node, i) => {
      if (node._type === "block") expect(node).toEqual(written[i]);
    });
  });

  it("turns a picture between paragraphs into an upload, with its words", () => {
    const picture = nodes.find((n) => n._type === "articleImage")!;
    expect(picture._key).toEqual(expect.any(String));
    expect(picture.image).toEqual({
      _type: "figure",
      _sanityAsset: expect.stringMatching(/^image@file:\/\/.*\/public\/blog\/[a-z-]+\.png$/),
      alt: { _type: "localeString", en: "A garden of conifers and shrubs beside a lawn" },
      stock: true,
    });
  });

  it("reads back as what the page was given", () => {
    const back = localize(imported(doc as unknown as Json)) as { body: unknown[] };
    const written = (entry.value as { body: { _type: string }[] }).body;
    expect(back.body).toHaveLength(written.length);
    back.body.forEach((node, i) => {
      const original = written[i] as Record<string, unknown>;
      if (original._type === "block") expect(node).toEqual(original);
      else {
        expect(node).toMatchObject({ _type: "articleImage", _key: original._key });
        expect((node as { image: { alt: string; stock?: true } }).image).toMatchObject({
          alt: "A garden of conifers and shrubs beside a lawn",
          stock: true,
          width: 640,
          height: 360,
        });
      }
    });
  });

  it("refuses text that is not a list of blocks", () => {
    const broken = { ...entry, value: { ...(entry.value as object), body: "just words" } };
    expect(() => toDocument(broken)).toThrow("an article's text must be a list of blocks");
  });

  it("refuses a picture with no file", () => {
    const body = [{ _type: "articleImage", _key: "n0", image: { alt: "x" } }];
    const broken = { ...entry, value: { ...(entry.value as object), body } };
    expect(() => toDocument(broken)).toThrow("a picture needs a public path");
  });
});

describe("localize, on an article's text", () => {
  const ref = { _type: "reference", _ref: "image-abc123-1000x419-png" };
  const block = { _type: "block", _key: "n0", style: "normal", children: [] };

  it("hands an empty or missing text back as no blocks", () => {
    expect(localize({ _type: "localeArticle" })).toEqual([]);
    expect(localize({ _type: "localeArticle", en: [] })).toEqual([]);
  });

  it("leaves a block untouched, since the renderer needs its type and key", () => {
    expect(localize({ _type: "localeArticle", en: [block] })).toEqual([block]);
  });

  it("gives a picture its address and size, and its caption when it has one", () => {
    const image = { _type: "figure", asset: ref, alt: { _type: "localeString", en: "A garden" } };
    const [plain, captioned] = localize({
      _type: "localeArticle",
      en: [
        { _type: "articleImage", _key: "a", image },
        {
          _type: "articleImage",
          _key: "b",
          image,
          caption: { _type: "localeString", en: "The garden, in spring" },
        },
      ],
    }) as Record<string, unknown>[];
    expect(plain).toEqual({
      _type: "articleImage",
      _key: "a",
      image: {
        src: expect.stringMatching(/^https:\/\/cdn\.sanity\.io\/images\/.+\/abc123-1000x419\.png$/),
        width: 1000,
        height: 419,
        alt: "A garden",
      },
    });
    expect(plain).not.toHaveProperty("caption");
    expect(captioned).toMatchObject({ _key: "b", caption: "The garden, in spring" });
  });

  it("reads English only, until Arabic ships", () => {
    expect(
      localize({ _type: "localeArticle", en: [block], ar: [{ ...block, _key: "x" }] }),
    ).toEqual([block]);
  });
});
