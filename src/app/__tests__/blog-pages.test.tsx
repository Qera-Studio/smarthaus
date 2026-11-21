import { screen } from "@testing-library/react";
import type { Metadata } from "next";

import { BLOG_PAGE, POSTS } from "../../../sanity/seed/blog";
import { renderMarkup, renderServer } from "../../__tests__/helpers/server";
import { postInput } from "../../components/Blog/post-metadata";
import { INDEXABLE_ROBOTS, NOINDEX_ROBOTS } from "../../lib/metadata";
import { getDocs } from "../../sanity/fetch";
import BlogPage, { generateMetadata as indexMetadata } from "../blog/page";
import BlogPostPage, { generateMetadata, generateStaticParams } from "../blog/[slug]/page";

/**
 * The blog's two routes. An article's route is the first built from content:
 * what is tested is that every published article gets one, that an address
 * with no article is a 404, and that an article not yet in search says so
 * everywhere at once (robots line, structured data).
 */

const params = (slug: string) => ({ params: Promise.resolve({ slug }) });
const jsonLd = (html: string): { "@graph": Record<string, unknown>[] }[] =>
  Array.from(html.matchAll(/<script type="application\/ld\+json">([^<]*)<\/script>/g), (m) =>
    JSON.parse(m[1]!),
  );

const inSearch = POSTS.find((p) => p.seo.index)!;

describe("/blog", () => {
  it("takes its metadata from the articles page's document", async () => {
    const meta = (await indexMetadata()) as Metadata;
    expect(meta.title).toBe(BLOG_PAGE.seo.title);
    expect(meta.description).toBe(BLOG_PAGE.seo.description);
    expect(meta.alternates).toEqual({ canonical: "/blog" });
    expect(meta.robots).toEqual(INDEXABLE_ROBOTS);
  });

  it("renders the articles under one h1", async () => {
    await renderServer(<BlogPage />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole("article")).toHaveLength(POSTS.length);
  });

  it("describes itself as a page of the site, with a breadcrumb", async () => {
    const [graph] = jsonLd(await renderMarkup(<BlogPage />));
    expect(graph!["@graph"].map((n) => n["@type"])).toEqual(["WebPage", "BreadcrumbList"]);
    expect(graph!["@graph"][0]).toMatchObject({ url: "https://smarthaus.ae/blog" });
  });
});

describe("/blog/[slug]", () => {
  it("has one route per published article", async () => {
    const built = await generateStaticParams();
    expect(built.map((p) => p.slug).sort()).toEqual(POSTS.map((p) => p.slug).sort());
    for (const entry of built) expect(Object.keys(entry)).toEqual(["slug"]);
  });

  it.each(POSTS.map((p) => [p.slug, p] as const))(
    "gives %s its own title, description and canonical",
    async (slug, post) => {
      const meta = await generateMetadata(params(slug));
      expect(meta.title).toBe(post.seo.title);
      expect(meta.description).toBe(post.seo.description);
      expect(meta.alternates).toEqual({ canonical: `/blog/${slug}` });
      expect(meta.openGraph).toMatchObject({ url: `/blog/${slug}`, type: "article" });
    },
  );

  it.each(POSTS.map((p) => [p.slug, p] as const))(
    "keeps %s out of search until its own switch is on",
    async (slug, post) => {
      const meta = await generateMetadata(params(slug));
      expect(meta.robots).toEqual(post.seo.index ? INDEXABLE_ROBOTS : NOINDEX_ROBOTS);
    },
  );

  it("shares an article with its own picture, date and author", async () => {
    const meta = await generateMetadata(params(inSearch.slug));
    expect(meta.openGraph).toMatchObject({
      publishedTime: inSearch.date,
      authors: [inSearch.author],
      images: [
        {
          url: `${inSearch.image.src}?w=1200&h=630&fit=crop&auto=format`,
          width: 1200,
          height: 630,
          alt: inSearch.image.alt,
        },
      ],
    });
  });

  it("gives no metadata for an address that is no article's", async () => {
    expect(await generateMetadata(params("no-such-article"))).toEqual({});
  });

  it("answers an address that is no article's with a 404", async () => {
    // notFound() throws the error Next turns into the 404 page.
    await expect(BlogPostPage(params("no-such-article"))).rejects.toMatchObject({
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
  });

  it("renders the article under one h1, its title", async () => {
    await renderServer(await BlogPostPage(params(inSearch.slug)));
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(inSearch.title);
  });

  it("describes an article in search as one: who wrote it, when, and where it sits", async () => {
    const [graph] = jsonLd(await renderMarkup(await BlogPostPage(params(inSearch.slug))));
    const nodes = graph!["@graph"];
    expect(nodes.map((n) => n["@type"])).toEqual(["WebPage", "BlogPosting", "BreadcrumbList"]);
    expect(nodes[1]).toMatchObject({
      headline: inSearch.title,
      datePublished: inSearch.date,
      author: { "@type": "Person", name: inSearch.author },
      image: inSearch.image.src,
    });
    const crumbs = nodes[2]!.itemListElement as { name: string; item: string }[];
    expect(crumbs.map((c) => c.name)).toEqual(["Home", BLOG_PAGE.heading, inSearch.title]);
    expect(crumbs.map((c) => c.item)).toEqual([
      "https://smarthaus.ae",
      "https://smarthaus.ae/blog",
      `https://smarthaus.ae/blog/${inSearch.slug}`,
    ]);
  });

  it("gives an article not in search no structured data to be quoted from", async () => {
    // Every seeded article is in search since 2026-11-20: one is switched off.
    const draft = { ...POSTS[1]!, seo: { ...POSTS[1]!.seo, index: false } };
    const { seedDocs } =
      jest.requireActual<typeof import("../../../sanity/seed")>("../../../sanity/seed");
    const swap = (doc: unknown) => ((doc as { slug: string }).slug === draft.slug ? draft : doc);
    jest
      .mocked(getDocs)
      .mockImplementation(async (type: string) => seedDocs(type).map(swap) as never);
    try {
      const html = await renderMarkup(await BlogPostPage(params(draft.slug)));
      expect(jsonLd(html)).toEqual([]);
      expect(html).toContain(draft.title);
    } finally {
      jest.mocked(getDocs).mockImplementation(async (type: string) => seedDocs(type) as never);
    }
  });
});

describe("postInput", () => {
  it("builds an article's metadata from its own fields", () => {
    expect(postInput(inSearch)).toEqual({
      path: `/blog/${inSearch.slug}`,
      title: inSearch.seo.title,
      absolute: false,
      description: inSearch.seo.description,
      index: true,
      image: { src: inSearch.image.src, alt: inSearch.image.alt },
      article: { published: inSearch.date, author: inSearch.author },
    });
  });

  it("says when the article last changed, once Sanity knows", () => {
    const updatedAt = "2026-11-13T08:00:00Z";
    expect(postInput({ ...inSearch, updatedAt }).article).toEqual({
      published: inSearch.date,
      modified: updatedAt,
      author: inSearch.author,
    });
  });

  it("treats an article with no search switch as out of search", () => {
    const { index: _index, ...seo } = inSearch.seo;
    void _index;
    expect(postInput({ ...inSearch, seo }).index).toBe(false);
  });
});
