import { screen, within } from "@testing-library/react";

import { BLOG_PAGE, POSTS } from "../../../../sanity/seed/blog";
import { renderMarkup, renderServer } from "../../../__tests__/helpers/server";
import { BLOG_TAGS } from "../../../sanity/schema/blog";
import { BlogIndex } from "../BlogIndex";

/**
 * The articles page, as the server sends it. Everything the search and the
 * filter choose among must already be in that HTML: a visitor without
 * JavaScript, and a crawler, see every article.
 */

const newest = [...POSTS].sort((a, b) => b.date.localeCompare(a.date));

describe("BlogIndex", () => {
  it("is headed by the articles page's own heading, from Sanity", async () => {
    await renderServer(<BlogIndex />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(BLOG_PAGE.heading);
  });

  it("sends every article in the server's HTML, each with its link", async () => {
    const html = await renderMarkup(<BlogIndex />);
    for (const post of POSTS) {
      expect(html).toContain(`href="/blog/${post.slug}"`);
    }
    expect(html.match(/<article/g)).toHaveLength(POSTS.length);
  });

  it("puts the newest first, as the wide panel", async () => {
    const { container } = await renderServer(<BlogIndex />);
    const featured = container.querySelector("article[data-featured]")!;
    expect(featured).toHaveTextContent(newest[0]!.title);
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(
      newest.map((p) => p.title),
    );
  });

  it("offers only the tags some article carries, in the schema's order", async () => {
    await renderServer(<BlogIndex />);
    const used = BLOG_TAGS.filter((tag) => POSTS.some((p) => p.tags.includes(tag)));
    const options = within(screen.getByRole("combobox", { name: "Filter by tag" }))
      .getAllByRole("option")
      .map((o) => o.textContent);
    expect(options).toEqual(["All tags", ...used]);
  });

  it("hands the cards no article text: only what a card shows crosses to the browser", async () => {
    const html = await renderMarkup(<BlogIndex />);
    expect(html).not.toContain("Where it starts to break");
    expect(html).not.toContain("Before anyone arrives");
  });

  it("is hooked for tests", async () => {
    const { container } = await renderServer(<BlogIndex />);
    expect(container.firstElementChild).toHaveAttribute("data-blog-index", "");
  });
});
