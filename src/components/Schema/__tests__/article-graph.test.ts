import { articleGraph, pageGraph, SITE_URL } from "../schema";

/**
 * An article's structured data (SEO System §9, §18-19: an answer engine reads
 * BlogPosting as the cleanest statement of who wrote what and when). Every
 * value is one the page prints, and an article that is not in search gets
 * none, as pages do.
 */

type Node = Record<string, unknown>;

const input = {
  path: "/blog/one-home-five-vendors",
  title: "One home, five vendors: the piecemeal cost",
  absolute: false,
  description: "d".repeat(140),
  index: true,
};
const post = {
  title: "One Home, Five Vendors: The Hidden Cost of a Piecemeal Smart Home",
  author: "Sunil Pareek",
  date: "2026-11-05",
  image: { src: "https://cdn.sanity.io/images/p/d/abc-1000x562.png" },
};
const blog = { path: "/blog", name: "Articles" };
const URL = `${SITE_URL}/blog/one-home-five-vendors`;

const graph = articleGraph(input, post, blog);
const nodes = graph["@graph"] as Node[];
const byType = (type: string) => nodes.find((n) => n["@type"] === type)!;

describe("articleGraph", () => {
  it("is schema.org, with three nodes: the page, the article, the breadcrumb", () => {
    expect(graph["@context"]).toBe("https://schema.org");
    expect(nodes.map((n) => n["@type"])).toEqual(["WebPage", "BlogPosting", "BreadcrumbList"]);
  });

  it("gives each node a persistent id on the canonical host", () => {
    expect(nodes.map((n) => n["@id"])).toEqual([
      `${URL}#webpage`,
      `${URL}#article`,
      `${URL}#breadcrumb`,
    ]);
  });

  it("names the page as the search result does, and ties it to the site", () => {
    expect(byType("WebPage")).toMatchObject({
      url: URL,
      name: "One home, five vendors: the piecemeal cost | Smarthaus",
      description: input.description,
      inLanguage: "en",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      breadcrumb: { "@id": `${URL}#breadcrumb` },
    });
  });

  it("headlines the article with its own title, not the shortened search title", () => {
    expect(byType("BlogPosting").headline).toBe(post.title);
  });

  it("says who wrote it and when it was published", () => {
    expect(byType("BlogPosting")).toMatchObject({
      author: { "@type": "Person", name: "Sunil Pareek" },
      datePublished: "2026-11-05",
      inLanguage: "en",
    });
  });

  it("names the business the layout describes as its publisher, by id", () => {
    expect(byType("BlogPosting").publisher).toEqual({ "@id": `${SITE_URL}/#organization` });
  });

  it("points at its main picture and the page it is the subject of", () => {
    expect(byType("BlogPosting")).toMatchObject({
      image: post.image.src,
      mainEntityOfPage: { "@id": `${URL}#webpage` },
    });
  });

  it("walks home, the articles page, then the article", () => {
    const items = byType("BreadcrumbList").itemListElement as Node[];
    expect(items).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Articles", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: URL },
    ]);
  });

  it("names the middle step as the articles page names itself", () => {
    const renamed = articleGraph(input, post, { path: "/blog", name: "Journal" });
    const items = (renamed["@graph"] as Node[])[2]!.itemListElement as Node[];
    expect(items[1]).toMatchObject({ name: "Journal" });
  });

  it("states no date of change until Sanity has one", () => {
    expect(byType("WebPage")).not.toHaveProperty("dateModified");
    expect(byType("BlogPosting")).not.toHaveProperty("dateModified");
  });

  it("states the date of change on the page and the article once it is known", () => {
    const updatedAt = "2026-11-13T08:00:00Z";
    const edited = articleGraph(input, { ...post, updatedAt }, blog)["@graph"] as Node[];
    expect(edited[0]).toMatchObject({ dateModified: updatedAt });
    expect(edited[1]).toMatchObject({ dateModified: updatedAt, datePublished: "2026-11-05" });
  });

  it("makes no claim the page does not: no rating, price, or word count", () => {
    const flat = JSON.stringify(graph);
    for (const key of ["aggregateRating", "review", "offers", "price", "wordCount", "sameAs"]) {
      expect(flat).not.toContain(`"${key}"`);
    }
  });

  it("refuses an article that is not in search", () => {
    expect(() => articleGraph({ ...input, index: false }, post, blog)).toThrow(
      "articleGraph: /blog/one-home-five-vendors is noindex and gets no schema",
    );
  });

  it("shares its ids for the site and the business with every other page", () => {
    const page = pageGraph({ ...input, path: "/about" })["@graph"] as Node[];
    expect(byType("WebPage").isPartOf).toEqual(page[0]!.isPartOf);
  });
});
