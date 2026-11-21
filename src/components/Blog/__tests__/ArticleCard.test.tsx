import { render, screen, within } from "@testing-library/react";

import { POSTS } from "../../../../sanity/seed/blog";
import { readMinutes } from "../../../lib/reading-time";
import { ArticleCard, summary, type PostSummary } from "../ArticleCard";

/**
 * One article as a card. A card is one link named by the article's title: the
 * picture and the arrow are decoration, and a screen reader that hears "link,
 * image, link, arrow" for each of twelve cards has been failed.
 */

const POST = POSTS.find((p) => p.slug === "one-home-five-vendors")!;
const post: PostSummary = summary(POST);

const card = (props: Partial<Parameters<typeof ArticleCard>[0]> = {}) =>
  render(<ArticleCard post={post} level="h2" {...props} />).container;

describe("summary", () => {
  it("keeps what a card shows and leaves the article's text behind", () => {
    expect(Object.keys(summary(POST)).sort()).toEqual(
      ["date", "excerpt", "image", "minutes", "slug", "tags", "title"].sort(),
    );
    expect(summary(POST)).not.toHaveProperty("body");
    expect(summary(POST)).not.toHaveProperty("seo");
    expect(summary(POST)).not.toHaveProperty("author");
  });

  it("copies each value as it is, and counts how long the text takes to read", () => {
    expect(summary(POST)).toEqual({
      slug: POST.slug,
      title: POST.title,
      date: POST.date,
      tags: POST.tags,
      excerpt: POST.excerpt,
      image: POST.image,
      minutes: 3,
    });
  });

  it("takes its minutes from the article's own text", () => {
    const short = { ...POST, body: POST.body.slice(0, 1) };
    expect(summary(short).minutes).toBe(1);
    expect(summary(POST).minutes).toBe(readMinutes(POST.body));
  });

  it("carries the minutes as a number, so the browser gets no text to count", () => {
    expect(typeof summary(POST).minutes).toBe("number");
    expect(JSON.stringify(summary(POST))).not.toContain(
      (POST.body.find((n) => n._type === "block") as { children: { text: string }[] }).children[0]!
        .text,
    );
  });
});

describe("ArticleCard", () => {
  it("is an article", () => {
    expect(card().querySelector("article")).not.toBeNull();
  });

  it("is one link, named by the title, to the article", () => {
    card();
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName(POST.title);
    expect(links[0]).toHaveAttribute("href", "/blog/one-home-five-vendors");
  });

  it.each(["h2", "h3"] as const)("titles itself with the %s its page asks for", (level) => {
    card({ level });
    const heading = screen.getByRole("heading", { level: Number(level[1]) });
    expect(heading).toHaveTextContent(POST.title);
    expect(within(heading).getByRole("link")).toBeInTheDocument();
  });

  it("treats its picture as decoration beside the title", () => {
    const img = card().querySelector("img")!;
    expect(img).toHaveAttribute("alt", "");
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("reserves the picture's space", () => {
    const img = card().querySelector("img")!;
    expect(img).toHaveAttribute("width", String(POST.image.width));
    expect(img).toHaveAttribute("height", String(POST.image.height));
  });

  it("shows the first tag only, the one the article is filed under", () => {
    const root = card();
    expect(root).toHaveTextContent(POST.tags[0]!);
    expect(root).not.toHaveTextContent(POST.tags[1]!);
  });

  it("prints the date for people and states it for machines", () => {
    const time = card().querySelector("time")!;
    expect(time).toHaveAttribute("datetime", "2026-11-05");
    expect(time).toHaveTextContent("5 November 2026");
  });

  it("hides the dot and the arrow from a screen reader", () => {
    const hidden = card().querySelectorAll('[aria-hidden="true"]');
    expect(Array.from(hidden, (el) => el.className).sort()).toEqual(["dot", "open"]);
    for (const el of hidden) expect(el).toBeEmptyDOMElement();
  });

  it("says how long it takes to read, after the date and before the arrow", () => {
    const meta = card().querySelector(".cardMeta")!;
    expect(Array.from(meta.children, (el) => el.className || el.tagName)).toEqual([
      "SPAN",
      "dot",
      "TIME",
      "cardRead",
      "open",
    ]);
    const said = Array.from(meta.children)
      .filter((el) => el.getAttribute("aria-hidden") !== "true")
      .map((el) => el.textContent);
    expect(said).toEqual([POST.tags[0], "5 November 2026", "3 min read"]);
  });

  it.each([1, 5])("shows %p min read as the summary counts it", (minutes) => {
    render(<ArticleCard post={{ ...post, minutes }} level="h2" />);
    expect(screen.getByText(`${minutes} min read`)).toBeInTheDocument();
  });

  it("does not show the excerpt on an ordinary card", () => {
    expect(card()).not.toHaveTextContent(POST.excerpt);
    expect(card().querySelector("article")).not.toHaveAttribute("data-featured");
  });

  it("asks for a picture a third of the screen wide, or all of a phone's", () => {
    expect(card().querySelector("img")).toHaveAttribute(
      "sizes",
      "(min-width: 64rem) 30vw, (min-width: 40rem) 50vw, 100vw",
    );
  });
});

describe("ArticleCard, featured", () => {
  it("is marked for the stylesheet and shows its excerpt", () => {
    const root = card({ featured: true });
    expect(root.querySelector("article")).toHaveAttribute("data-featured", "");
    expect(root.querySelector("p.cardExcerpt")).toHaveTextContent(POST.excerpt);
  });

  it("is still one link named by the title", () => {
    card({ featured: true });
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link")).toHaveAccessibleName(POST.title);
  });

  it("fetches its picture at once and first: it is the articles page's largest paint", () => {
    const img = card({ featured: true }).querySelector("img")!;
    expect(img).toHaveAttribute("loading", "eager");
    expect(img).toHaveAttribute("fetchpriority", "high");
  });

  it("is the only card that does", () => {
    const img = card().querySelector("img")!;
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).not.toHaveAttribute("fetchpriority");
  });

  it("asks for a wider picture", () => {
    expect(card({ featured: true }).querySelector("img")).toHaveAttribute(
      "sizes",
      "(min-width: 64rem) 65vw, 100vw",
    );
  });

  it("puts the excerpt between the title and the tag line", () => {
    const text = card({ featured: true }).querySelector(".cardText")!;
    expect(Array.from(text.children, (el) => el.className)).toEqual([
      "cardTitle",
      "cardExcerpt",
      "cardMeta",
    ]);
  });
});

describe("ArticleCard, across the published articles", () => {
  it.each(POSTS.map((p) => [p.slug, p] as const))("links %s to its own address", (slug, p) => {
    render(<ArticleCard post={summary(p)} level="h3" />);
    expect(screen.getByRole("link", { name: p.title })).toHaveAttribute("href", `/blog/${slug}`);
  });
});
