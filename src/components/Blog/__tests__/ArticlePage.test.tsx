import { render, screen, within } from "@testing-library/react";

import { POSTS } from "../../../../sanity/seed/blog";
import { readMinutes } from "../../../lib/reading-time";
import type { Post } from "../../../sanity/types";
import { ArticlePage, related, RELATED } from "../ArticlePage";

/**
 * One article's page, and the three it sends the reader to next. The related
 * articles are chosen, never picked by hand, so the choosing is what is
 * tested: the article itself is never among them, and a shared tag comes
 * before a newer date.
 */

const posts = [...POSTS].sort((a, b) => b.date.localeCompare(a.date));
const bySlug = (slug: string) => posts.find((p) => p.slug === slug)!;
const POST = bySlug("one-home-five-vendors");

const page = (post: Post = POST, all: readonly Post[] = posts) =>
  render(<ArticlePage post={post} posts={all} />).container;

/** A made-up article, for cases the four published ones do not reach. */
const made = (slug: string, date: string, tags: string[]): Post => ({
  ...POST,
  slug,
  date,
  tags,
  title: `Article ${slug}`,
});

describe("related", () => {
  it("never includes the article itself", () => {
    for (const post of posts) {
      expect(related(post, posts).map((p) => p.slug)).not.toContain(post.slug);
    }
  });

  it("returns at most three", () => {
    expect(RELATED).toBe(3);
    const many = Array.from({ length: 8 }, (_, i) =>
      made(`x${"abcdefgh"[i]}`, `2026-01-0${i + 1}`, ["Design"]),
    );
    expect(related(made("self", "2026-02-01", ["Design"]), many)).toHaveLength(3);
  });

  it("puts those that share a tag first, newest first among them", () => {
    const self = made("self", "2026-05-01", ["Security"]);
    const others = [
      made("newest-unrelated", "2026-04-04", ["Design"]),
      made("newer-shared", "2026-04-03", ["Security", "Planning"]),
      made("older-unrelated", "2026-04-02", ["Networking"]),
      made("older-shared", "2026-04-01", ["Security"]),
    ];
    expect(related(self, [self, ...others]).map((p) => p.slug)).toEqual([
      "newer-shared",
      "older-shared",
      "newest-unrelated",
    ]);
  });

  it("fills with the newest others when none shares a tag", () => {
    const self = made("self", "2026-05-01", ["Security"]);
    const others = [
      made("a", "2026-04-04", ["Design"]),
      made("b", "2026-04-03", ["Design"]),
      made("c", "2026-04-02", ["Design"]),
      made("d", "2026-04-01", ["Design"]),
    ];
    expect(related(self, [self, ...others]).map((p) => p.slug)).toEqual(["a", "b", "c"]);
  });

  it("returns fewer when there are fewer, and none for an only article", () => {
    const self = made("self", "2026-05-01", ["Security"]);
    expect(related(self, [self, made("a", "2026-04-04", ["Design"])])).toHaveLength(1);
    expect(related(self, [self])).toEqual([]);
    expect(related(self, [])).toEqual([]);
  });

  it("does not reorder the list it was given", () => {
    const before = posts.map((p) => p.slug);
    related(POST, posts);
    expect(posts.map((p) => p.slug)).toEqual(before);
  });

  it.each(posts.map((p) => [p.slug, p] as const))(
    "offers the other three after %s, while there are four articles",
    (_slug, post) => {
      const next = related(post, posts);
      expect(next.map((p) => p.slug).sort()).toEqual(
        posts
          .filter((p) => p.slug !== post.slug)
          .map((p) => p.slug)
          .sort(),
      );
    },
  );
});

describe("ArticlePage", () => {
  it("has one h1, the article's title", () => {
    page();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(POST.title);
  });

  it("offers the way back to the articles page, first", () => {
    page();
    const back = screen.getByRole("link", { name: "Back" });
    expect(back).toHaveAttribute("href", "/blog");
    expect(screen.getAllByRole("link")[0]).toBe(back);
  });

  it("hides the back arrow from a screen reader", () => {
    const icon = page().querySelector(".backIcon")!;
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon).toBeEmptyDOMElement();
  });

  it("wraps the title, the picture and the text in one article", () => {
    const article = page().querySelector("article.article")!;
    expect(within(article as HTMLElement).getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(article.querySelector(".hero img")).not.toBeNull();
    expect(article.querySelector(".body")).not.toBeNull();
  });

  it("says who wrote it, what it is about, when, and how long it reads, as terms and values", () => {
    const root = page();
    const terms = Array.from(root.querySelectorAll("dl dt"), (dt) => dt.textContent);
    expect(terms).toEqual(["by:", "tags:", "date:", "read:"]);
    const values = root.querySelectorAll("dl dd");
    expect(values[0]).toHaveTextContent("Sunil Pareek");
    expect(values[2]).toHaveTextContent("5 November 2026");
    expect(values[3]).toHaveTextContent(/^3 min$/);
  });

  it("counts the reading time from this article's own text", () => {
    const short = { ...POST, body: POST.body.slice(0, 1) };
    expect(page(short).querySelectorAll("dl dd")[3]).toHaveTextContent(/^1 min$/);
  });

  it.each(posts.map((p) => [p.slug, p] as const))(
    "gives %s the same minutes as its card",
    (_slug, p) => {
      const value = page(p).querySelectorAll("dl dd")[3]!.textContent;
      expect(value).toBe(`${readMinutes(p.body)} min`);
    },
  );

  it("lists every tag the article carries, in order", () => {
    const tags = page().querySelectorAll("dl ul li");
    expect(Array.from(tags, (li) => li.textContent)).toEqual(POST.tags);
  });

  it("states the date for machines as well as people", () => {
    const time = page().querySelector("dl time")!;
    expect(time).toHaveAttribute("datetime", POST.date);
  });

  it("describes the main picture, which carries meaning here", () => {
    const img = page().querySelector(".hero img")!;
    expect(img).toHaveAttribute("alt", POST.image.alt);
    expect(img).toHaveAttribute("width", String(POST.image.width));
    expect(img).toHaveAttribute("height", String(POST.image.height));
  });

  it("fetches the main picture first: it is the page's largest paint", () => {
    const img = page().querySelector(".hero img")!;
    expect(img).toHaveAttribute("fetchpriority", "high");
    expect(img).toHaveAttribute("loading", "eager");
  });

  it("is the only picture fetched at high priority", () => {
    expect(page().querySelectorAll('img[fetchpriority="high"]')).toHaveLength(1);
  });

  it("prints the article's text", () => {
    const root = page();
    expect(root).toHaveTextContent("Most smart homes in Dubai aren’t designed. They pile up.");
    expect(
      screen.getByRole("heading", { level: 2, name: "Where it starts to break" }),
    ).toBeInTheDocument();
  });

  it("is hooked for tests and the page's own checks", () => {
    expect(page().firstElementChild).toHaveAttribute("data-blog-article", "");
  });
});

describe("ArticlePage, the related articles", () => {
  it("is a region named by its heading", () => {
    page();
    const region = screen.getByRole("region", { name: "Related articles" });
    expect(within(region).getByRole("heading", { level: 2 })).toHaveTextContent("Related articles");
  });

  it("comes after the article, not inside it", () => {
    const root = page();
    const article = root.querySelector("article.article")!;
    const region = screen.getByRole("region", { name: "Related articles" });
    expect(article.contains(region)).toBe(false);
    expect(article.compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("lists the chosen articles as cards titled one level under the heading", () => {
    page();
    const region = screen.getByRole("region", { name: "Related articles" });
    const cards = within(region).getAllByRole("listitem");
    expect(cards.map((li) => within(li).getByRole("heading", { level: 3 }).textContent)).toEqual(
      related(POST, posts).map((p) => p.title),
    );
  });

  it("links each card to its article", () => {
    page();
    for (const other of related(POST, posts)) {
      expect(screen.getByRole("link", { name: other.title })).toHaveAttribute(
        "href",
        `/blog/${other.slug}`,
      );
    }
  });

  it("does not link to the article being read", () => {
    page();
    expect(screen.queryByRole("link", { name: POST.title })).toBeNull();
  });

  it("is left out altogether for an only article", () => {
    page(POST, [POST]);
    expect(screen.queryByRole("region", { name: "Related articles" })).toBeNull();
    expect(screen.queryByRole("list", { name: /related/i })).toBeNull();
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).not.toContain(
      "Related articles",
    );
  });

  it("keeps the heading order whole: h1, then h2s, with h3 only under one", () => {
    const levels = Array.from(page().querySelectorAll("h1, h2, h3"), (h) => Number(h.tagName[1]));
    expect(levels[0]).toBe(1);
    levels.forEach((level, i) => {
      if (i > 0) expect(level - levels[i - 1]!).toBeLessThanOrEqual(1);
    });
  });
});

describe("ArticlePage, across the published articles", () => {
  it.each(posts.map((p) => [p.slug, p] as const))("renders %s whole", (_slug, post) => {
    const root = page(post);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(post.title);
    expect(root.querySelector("dl dd")).toHaveTextContent(post.author);
    expect(root.querySelectorAll(".body > *").length).toBeGreaterThan(5);
  });
});
