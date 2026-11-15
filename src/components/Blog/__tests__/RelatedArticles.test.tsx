import { render, screen, within } from "@testing-library/react";

import { POSTS } from "../../../../sanity/seed/blog";
import type { Post } from "../../../sanity/types";
import { byTags, RELATED, RelatedArticles } from "../RelatedArticles";

/**
 * The row of articles under an article and at a solution page's foot. The
 * choosing is byTags: those carrying a tag first, then the newest others, three
 * at most. The section is nothing at all when there is nothing to show.
 */

const newest = [...POSTS].sort((a, b) => b.date.localeCompare(a.date));
const made = (slug: string, date: string, tags: string[]): Post => ({
  ...POSTS[0]!,
  slug,
  date,
  tags,
  title: `Article ${slug}`,
});

describe("byTags", () => {
  it("puts the articles carrying a tag first, newest first among them", () => {
    const posts = [
      made("newest-other", "2026-04-04", ["Design"]),
      made("newer-security", "2026-04-03", ["Security"]),
      made("older-security", "2026-04-01", ["Planning", "Security"]),
    ];
    expect(byTags(["Security"], posts).map((p) => p.slug)).toEqual([
      "newer-security",
      "older-security",
      "newest-other",
    ]);
  });

  it("matches any of several tags", () => {
    const posts = [
      made("a", "2026-04-04", ["Design"]),
      made("b", "2026-04-03", ["Networking"]),
      made("c", "2026-04-02", ["Security"]),
    ];
    expect(byTags(["Security", "Networking"], posts).map((p) => p.slug)).toEqual(["b", "c", "a"]);
  });

  it("fills up with the newest others when too few carry it", () => {
    const picked = byTags(["Security"], newest);
    expect(picked).toHaveLength(RELATED);
    expect(picked[0]!.tags).toContain("Security");
    expect(picked.slice(1)).toEqual(newest.filter((p) => !p.tags.includes("Security")).slice(0, 2));
  });

  it("keeps the order it is given within each group", () => {
    const posts = [made("x", "2026-01-01", ["Design"]), made("y", "2026-02-01", ["Design"])];
    expect(byTags(["Security"], posts).map((p) => p.slug)).toEqual(["x", "y"]);
  });

  it("returns at most RELATED, which is three", () => {
    expect(RELATED).toBe(3);
    const many = Array.from({ length: 7 }, (_, i) => made(`p${i}`, "2026-01-01", ["Security"]));
    expect(byTags(["Security"], many)).toHaveLength(3);
  });

  it("returns what there is when there are fewer", () => {
    expect(byTags(["Security"], [made("one", "2026-01-01", ["Design"])])).toHaveLength(1);
    expect(byTags(["Security"], [])).toEqual([]);
  });

  it("with no tags, is the newest three", () => {
    expect(byTags([], newest)).toEqual(newest.slice(0, 3));
  });
});

describe("RelatedArticles", () => {
  const posts = newest.slice(0, 3);

  it("is a section named by its heading, an h2", () => {
    render(<RelatedArticles heading="Related articles" posts={posts} />);
    const heading = screen.getByRole("heading", { name: "Related articles", level: 2 });
    expect(heading.closest("section")).toHaveAttribute("aria-labelledby", heading.id);
  });

  it("takes its heading from the page", () => {
    render(<RelatedArticles heading="More on cameras" posts={posts} />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("More on cameras");
  });

  it("lists one card per article, each titled in an h3 that links to it", () => {
    render(<RelatedArticles heading="Related articles" posts={posts} />);
    const list = screen.getByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    const titles = within(list).getAllByRole("heading", { level: 3 });
    posts.forEach((post, index) => {
      expect(titles[index]).toHaveTextContent(post.title);
      expect(within(titles[index]!).getByRole("link")).toHaveAttribute(
        "href",
        `/blog/${post.slug}`,
      );
    });
  });

  it("is nothing at all with no articles", () => {
    const { container } = render(<RelatedArticles heading="Related articles" posts={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("carries the blog's tokens itself when it stands on another page", () => {
    const { container } = render(
      <RelatedArticles heading="Related articles" posts={posts} standalone />,
    );
    expect(container.querySelector("section")).toHaveClass("related", "standalone");
  });

  it("leaves them to the article's page otherwise", () => {
    const { container } = render(<RelatedArticles heading="Related articles" posts={posts} />);
    expect(container.querySelector("section")).toHaveClass("related");
    expect(container.querySelector("section")).not.toHaveClass("standalone");
  });
});
