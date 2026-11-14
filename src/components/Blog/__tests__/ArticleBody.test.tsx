import { render, screen, within } from "@testing-library/react";

import { POSTS } from "../../../../sanity/seed/blog";
import type { ArticleBlock, ArticleNode } from "../../../sanity/types";
import { ArticleBody } from "../ArticleBody";

/**
 * An article's text, rendered. What fails silently here is text that goes
 * missing: a style the renderer does not know, a list that swallows the
 * paragraph after it, a link that opens the wrong way. So every shape the
 * schema offers is rendered, and anything it does not offer throws.
 */

let key = 0;
const span = (text: string, marks: string[] = []) => ({
  _type: "span" as const,
  _key: `s${(key += 1)}`,
  text,
  marks,
});
const block = (text: string, extra: Partial<ArticleBlock> = {}): ArticleBlock => ({
  _type: "block",
  _key: `b${(key += 1)}`,
  style: "normal",
  markDefs: [],
  children: [span(text)],
  ...extra,
});
const item = (text: string, listItem: "bullet" | "number" = "bullet") =>
  block(text, { listItem, level: 1 });
const picture = (caption?: string): ArticleNode => ({
  _type: "articleImage",
  _key: `i${(key += 1)}`,
  image: {
    src: "/blog/one-home-five-vendors-garden.png",
    width: 1000,
    height: 419,
    alt: "A garden",
  },
  ...(caption ? { caption } : {}),
});

const body = (nodes: ArticleNode[]) => render(<ArticleBody nodes={nodes} />).container;

describe("ArticleBody, block by block", () => {
  it("renders a paragraph as a paragraph", () => {
    const root = body([block("Most smart homes are not designed.")]);
    const p = root.querySelector("p")!;
    expect(p).toHaveTextContent("Most smart homes are not designed.");
    expect(p.className).toBe("");
  });

  it("treats a block with no style as a paragraph", () => {
    const { style: _style, ...plain } = block("No style set.");
    void _style;
    expect(body([plain as ArticleBlock]).querySelector("p")).toHaveTextContent("No style set.");
  });

  it.each([
    ["h2", 2],
    ["h3", 3],
  ] as const)("renders %s as a heading of that level", (style, level) => {
    body([block("Where it starts to break", { style })]);
    expect(screen.getByRole("heading", { level })).toHaveTextContent("Where it starts to break");
  });

  it.each(POSTS.map((p) => [p.slug, p] as const))(
    "never renders an h1 in %s: the article's title is the page's",
    (_slug, post) => {
      expect(body(post.body).querySelector("h1")).toBeNull();
    },
  );

  it("renders a quote as a blockquote", () => {
    const root = body([block("Fitting a device takes minutes.", { style: "blockquote" })]);
    expect(root.querySelector("blockquote")).toHaveTextContent("Fitting a device takes minutes.");
  });

  it("renders a box as a marked paragraph, not a landmark", () => {
    const root = body([block("A good installation day is uneventful.", { style: "callout" })]);
    const box = root.querySelector("p.box")!;
    expect(box).toHaveTextContent("A good installation day is uneventful.");
    expect(root.querySelector("aside")).toBeNull();
    expect(screen.queryByRole("complementary")).toBeNull();
  });

  it("wraps the text in one element the stylesheet sets", () => {
    const root = body([block("One."), block("Two.")]);
    expect(root.children).toHaveLength(1);
    expect(root.firstElementChild).toHaveClass("body");
    expect(root.firstElementChild!.children).toHaveLength(2);
  });

  it("keeps the blocks in the order they were written", () => {
    const root = body([
      block("First."),
      block("A heading", { style: "h2" }),
      block("Second."),
      picture(),
      block("Third."),
    ]);
    expect(Array.from(root.firstElementChild!.children, (el) => el.tagName)).toEqual([
      "P",
      "H2",
      "P",
      "FIGURE",
      "P",
    ]);
  });

  it("renders nothing but its wrapper for an article with no text yet", () => {
    expect(body([]).firstElementChild!.children).toHaveLength(0);
  });
});

describe("ArticleBody, lists", () => {
  it("gathers a run of bullets into one list", () => {
    body([item("Who installs it?"), item("Does it work with what I have?"), item("Who fixes it?")]);
    const list = screen.getByRole("list");
    expect(list.tagName).toBe("UL");
    expect(
      within(list)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["Who installs it?", "Does it work with what I have?", "Who fixes it?"]);
  });

  it("renders a numbered run as an ordered list", () => {
    body([item("Visit", "number"), item("Price", "number")]);
    expect(screen.getByRole("list").tagName).toBe("OL");
  });

  it("starts a new list when the kind changes", () => {
    body([
      item("A bullet"),
      item("Another"),
      item("Step one", "number"),
      item("Step two", "number"),
    ]);
    const lists = screen.getAllByRole("list");
    expect(lists.map((l) => l.tagName)).toEqual(["UL", "OL"]);
    expect(lists.map((l) => within(l).getAllByRole("listitem").length)).toEqual([2, 2]);
  });

  it("ends the list at the paragraph after it, and loses neither", () => {
    const root = body([block("Before."), item("One"), item("Two"), block("After.")]);
    expect(Array.from(root.firstElementChild!.children, (el) => el.tagName)).toEqual([
      "P",
      "UL",
      "P",
    ]);
    expect(root).toHaveTextContent("Before.OneTwoAfter.");
  });

  it("keeps two lists apart when a paragraph stands between them", () => {
    body([item("One"), block("Between."), item("Two")]);
    expect(screen.getAllByRole("list")).toHaveLength(2);
  });

  it("renders a list that ends the article", () => {
    const root = body([block("Ask:"), item("Last question?")]);
    expect(root.firstElementChild!.lastElementChild!.tagName).toBe("UL");
  });
});

describe("ArticleBody, marks and links", () => {
  it("renders bold and italic", () => {
    const root = body([
      block("", {
        children: [
          span("Plain, "),
          span("bold", ["strong"]),
          span(" and "),
          span("italic", ["em"]),
        ],
      }),
    ]);
    expect(root.querySelector("strong")).toHaveTextContent("bold");
    expect(root.querySelector("em")).toHaveTextContent("italic");
    expect(root.querySelector("p")).toHaveTextContent("Plain, bold and italic");
  });

  it("nests marks, the first outermost", () => {
    const root = body([block("", { children: [span("both", ["strong", "em"])] })]);
    expect(root.querySelector("strong > em")).toHaveTextContent("both");
  });

  it("opens a link to this site in place", () => {
    body([
      block("", {
        markDefs: [{ _type: "link", _key: "l1", href: "/contact" }],
        children: [span("Book a visit", ["l1"])],
      }),
    ]);
    const link = screen.getByRole("link", { name: "Book a visit" });
    expect(link).toHaveAttribute("href", "/contact");
    expect(link).not.toHaveAttribute("target");
  });

  it("opens a link elsewhere in a new tab, without handing over the opener", () => {
    body([
      block("", {
        markDefs: [{ _type: "link", _key: "l1", href: "https://www.sira.gov.ae" }],
        children: [span("SIRA", ["l1"])],
      }),
    ]);
    const link = screen.getByRole("link", { name: "SIRA" });
    expect(link).toHaveAttribute("href", "https://www.sira.gov.ae");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders a bold link as a link around bold text", () => {
    const root = body([
      block("", {
        markDefs: [{ _type: "link", _key: "l1", href: "/pricing" }],
        children: [span("Pricing", ["l1", "strong"])],
      }),
    ]);
    expect(root.querySelector("a > strong")).toHaveTextContent("Pricing");
  });

  it("renders links inside a list item and a quote too", () => {
    const linked = {
      markDefs: [{ _type: "link" as const, _key: "l1", href: "/about" }],
      children: [span("About us", ["l1"])],
    };
    body([
      item("", "bullet"),
      { ...item("x"), ...linked },
      block("", { style: "blockquote", ...linked }),
    ]);
    expect(screen.getAllByRole("link", { name: "About us" })).toHaveLength(2);
  });
});

describe("ArticleBody, pictures", () => {
  it("renders a picture as a figure with its words for a screen reader", () => {
    const root = body([picture()]);
    const img = within(root.querySelector("figure")!).getByRole("img", { name: "A garden" });
    expect(img).toHaveAttribute("width", "1000");
    expect(img).toHaveAttribute("height", "419");
  });

  it("reserves the picture's space, so the text under it does not jump", () => {
    const img = body([picture()]).querySelector("img")!;
    expect(Number(img.getAttribute("width")) / Number(img.getAttribute("height"))).toBeCloseTo(
      1000 / 419,
    );
  });

  it("does not fetch a picture far down the page until it is near", () => {
    expect(body([picture()]).querySelector("img")).toHaveAttribute("loading", "lazy");
  });

  it("is told how wide it is drawn, so a phone is not sent the desktop file", () => {
    expect(body([picture()]).querySelector("img")).toHaveAttribute(
      "sizes",
      "(min-width: 65rem) 1000px, 100vw",
    );
  });

  it("shows a caption only when one was written", () => {
    expect(body([picture()]).querySelector("figcaption")).toBeNull();
    expect(body([picture("The garden in spring")]).querySelector("figcaption")).toHaveTextContent(
      "The garden in spring",
    );
  });
});

describe("ArticleBody, what it does not know", () => {
  // jsdom logs the throw as an uncaught error; it is the point of the test.
  let error: jest.SpyInstance;
  beforeEach(() => {
    error = jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => error.mockRestore());

  it("throws on a block style the page cannot draw", () => {
    const odd = block("Shout", { style: "h1" as never });
    expect(() => body([odd])).toThrow('ArticleBody: unknown block style "h1"');
  });

  it("throws on a node of a type it was not written for", () => {
    const odd = { _type: "table", _key: "t1" } as unknown as ArticleNode;
    expect(() => body([odd])).toThrow('ArticleBody: unknown node "table"');
  });

  it("throws on a mark with no definition, rather than dropping the link", () => {
    const odd = block("", { children: [span("orphan", ["missing"])] });
    expect(() => body([odd])).toThrow('ArticleBody: unknown mark "missing"');
  });
});

describe("ArticleBody, on the published articles", () => {
  it.each(POSTS.map((p) => [p.slug, p] as const))("renders every word of %s", (_slug, post) => {
    const root = body(post.body);
    for (const node of post.body) {
      if (node._type !== "block") continue;
      for (const child of node.children) expect(root).toHaveTextContent(child.text);
    }
  });

  it.each(POSTS.map((p) => [p.slug, p] as const))(
    "renders one element per block of %s, lists gathered",
    (_slug, post) => {
      const root = body(post.body).firstElementChild!;
      const items = post.body.filter((n) => n._type === "block" && n.listItem).length;
      const lists = root.querySelectorAll(":scope > ul, :scope > ol").length;
      expect(root.querySelectorAll("li")).toHaveLength(items);
      expect(root.children).toHaveLength(post.body.length - items + lists);
    },
  );

  it("draws the picture Shivanshu placed mid-article", () => {
    const post = POSTS.find((p) => p.slug === "one-home-five-vendors")!;
    expect(body(post.body).querySelectorAll("figure")).toHaveLength(1);
  });
});
