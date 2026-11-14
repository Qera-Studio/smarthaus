import { createEvent, fireEvent, render, screen, within } from "@testing-library/react";

import { POSTS } from "../../../../sanity/seed/blog";
import { ArticleBrowser, matches } from "../ArticleBrowser";
import { summary, type PostSummary } from "../ArticleCard";

/**
 * The articles page's search and tag filter. It chooses among articles
 * already on the page, so the risks are in the choosing: a match hidden
 * behind the featured panel, a filter that leaves the count stale, an empty
 * result with no way back.
 */

const posts: PostSummary[] = [...POSTS].sort((a, b) => b.date.localeCompare(a.date)).map(summary);
const TAGS = ["Planning", "Installation", "Security", "Networking", "Design", "Everyday use"];

const mount = (list: PostSummary[] = posts) =>
  render(<ArticleBrowser heading="Articles" posts={list} tags={TAGS} />).container;

const search = () => screen.getByRole("searchbox", { name: "Search articles by title or tag" });
const filter = () => screen.getByRole("combobox", { name: "Filter by tag" });
const type = (value: string) => fireEvent.change(search(), { target: { value } });
const pick = (value: string) => fireEvent.change(filter(), { target: { value } });
const titles = () => screen.queryAllByRole("heading", { level: 2 }).map((h) => h.textContent);
const featured = (root: HTMLElement) => root.querySelector("article[data-featured]");

describe("matches", () => {
  const post = posts.find((p) => p.slug === "wifi-is-not-enough")!;

  it("matches everything when nothing is asked", () => {
    expect(matches(post, "", "")).toBe(true);
    expect(matches(post, "   ", "")).toBe(true);
  });

  it.each(["network", "NETWORK", "Wi-Fi", "smart home", "home smart", "runs  on"])(
    "finds %p in the title, in any case and any order",
    (query) => {
      expect(matches(post, query, "")).toBe(true);
    },
  );

  it.each(["networking", "planning", "Plan"])("finds %p among the tags", (query) => {
    expect(matches(post, query, "")).toBe(true);
  });

  it("needs every word typed, not any of them", () => {
    expect(matches(post, "network installation", "")).toBe(false);
  });

  it.each(["cabinet", "zzz", "installation"])("does not find %p", (query) => {
    expect(matches(post, query, "")).toBe(false);
  });

  it("does not search the excerpt: the search is titles and tags", () => {
    expect(post.excerpt).toMatch(/router/);
    expect(matches(post, "router", "")).toBe(false);
  });

  it("narrows to a tag the article carries", () => {
    expect(matches(post, "", "Networking")).toBe(true);
    expect(matches(post, "", "Design")).toBe(false);
  });

  it("needs both the tag and the words", () => {
    expect(matches(post, "network", "Planning")).toBe(true);
    expect(matches(post, "network", "Design")).toBe(false);
    expect(matches(post, "cabinet", "Planning")).toBe(false);
  });
});

describe("ArticleBrowser, as it arrives", () => {
  it("has the page's one h1", () => {
    mount();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Articles");
  });

  it("lists every article, the newest as the wide panel", () => {
    const root = mount();
    expect(titles()).toEqual(posts.map((p) => p.title));
    expect(featured(root)).toHaveTextContent(posts[0]!.title);
    expect(featured(root)).toHaveTextContent(posts[0]!.excerpt);
    expect(root.querySelectorAll("article[data-featured]")).toHaveLength(1);
  });

  it("puts the rest in one list under it, in order", () => {
    mount();
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items.map((li) => within(li).getByRole("heading").textContent)).toEqual(
      posts.slice(1).map((p) => p.title),
    );
  });

  it("puts the search and the filter in a search landmark, each with a name", () => {
    mount();
    const controls = screen.getByRole("search");
    expect(within(controls).getByRole("searchbox")).toBe(search());
    expect(within(controls).getByRole("combobox")).toBe(filter());
  });

  it("offers every tag it was given, after 'All tags'", () => {
    mount();
    expect(
      within(filter())
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["All tags", ...TAGS]);
    expect(filter()).toHaveValue("");
  });

  it("says nothing until something narrows the list", () => {
    mount();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("does not ask the browser to remember searches", () => {
    mount();
    expect(search()).toHaveAttribute("autocomplete", "off");
    expect(search()).toHaveAttribute("type", "search");
  });

  it("shows the one article as the panel, with no empty list, when there is only one", () => {
    const root = mount(posts.slice(0, 1));
    expect(featured(root)).toHaveTextContent(posts[0]!.title);
    expect(screen.queryByRole("list")).toBeNull();
  });
});

describe("ArticleBrowser, searching", () => {
  it("narrows to the articles whose title has the word", () => {
    mount();
    type("network");
    expect(titles()).toEqual(["Wi-Fi Isn’t Enough: The Network Your Smart Home Really Runs On"]);
  });

  it("finds by a tag as well as by a title", () => {
    mount();
    type("security");
    expect(titles()).toEqual([posts.find((p) => p.tags.includes("Security"))!.title]);
  });

  it("gives the wide panel up while narrowing, so no match hides behind it", () => {
    const root = mount();
    type("smart");
    expect(featured(root)).toBeNull();
    expect(root.querySelectorAll("article")).toHaveLength(titles().length);
    expect(titles().length).toBeGreaterThan(1);
  });

  it("says how many it found, in the singular for one", () => {
    mount();
    type("network");
    expect(screen.getByRole("status")).toHaveTextContent("1 article found");
    type("smart");
    expect(screen.getByRole("status")).toHaveTextContent(`${titles().length} articles found`);
  });

  it("keeps what was typed in the field", () => {
    mount();
    type("wall");
    expect(search()).toHaveValue("wall");
  });

  it("brings the panel back once the field is emptied", () => {
    const root = mount();
    type("network");
    type("");
    expect(featured(root)).toHaveTextContent(posts[0]!.title);
    expect(titles()).toEqual(posts.map((p) => p.title));
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("treats spaces alone as nothing typed", () => {
    const root = mount();
    type("   ");
    expect(featured(root)).not.toBeNull();
  });
});

describe("ArticleBrowser, filtering by tag", () => {
  it.each(TAGS)("shows exactly the articles tagged %s", (tag) => {
    mount();
    pick(tag);
    expect(titles()).toEqual(posts.filter((p) => p.tags.includes(tag)).map((p) => p.title));
  });

  it("gives the panel up while a tag is chosen", () => {
    const root = mount();
    pick("Planning");
    expect(featured(root)).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("3 articles found");
  });

  it("combines with the search", () => {
    mount();
    pick("Planning");
    type("network");
    expect(titles()).toEqual(["Wi-Fi Isn’t Enough: The Network Your Smart Home Really Runs On"]);
  });

  it("returns to everything on 'All tags'", () => {
    const root = mount();
    pick("Design");
    pick("");
    expect(titles()).toEqual(posts.map((p) => p.title));
    expect(featured(root)).not.toBeNull();
  });
});

describe("ArticleBrowser, with nothing to show", () => {
  it("says so, and offers the way back", () => {
    mount();
    type("zzz");
    expect(screen.getByText(/No articles match that/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear the search" })).toBeInTheDocument();
    expect(titles()).toEqual([]);
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("0 articles found");
  });

  it("is reached by a tag and a word that no article has together", () => {
    mount();
    pick("Design");
    type("network");
    expect(screen.getByText(/No articles match that/)).toBeInTheDocument();
  });

  it("clears the word and the tag together, and shows everything again", () => {
    const root = mount();
    pick("Design");
    type("network");
    fireEvent.click(screen.getByRole("button", { name: "Clear the search" }));
    expect(search()).toHaveValue("");
    expect(filter()).toHaveValue("");
    expect(titles()).toEqual(posts.map((p) => p.title));
    expect(featured(root)).not.toBeNull();
    expect(screen.queryByText(/No articles match that/)).toBeNull();
  });

  it("keeps the heading and the controls on screen", () => {
    mount();
    type("zzz");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Articles");
    expect(search()).toBeInTheDocument();
    expect(filter()).toBeInTheDocument();
  });

  it("shows the same message when there are no articles at all", () => {
    mount([]);
    expect(screen.queryAllByRole("article")).toHaveLength(0);
    expect(screen.getByText(/No articles match that/)).toBeInTheDocument();
  });
});

// 2026-11-14: a button at the end of the search's line (Shivanshu). The list
// already narrows as you type, so the button sends nothing; it puts the field
// down, which on a phone closes the keyboard that hides the results.
describe("ArticleBrowser, the search button", () => {
  const button = () => screen.getByRole("button", { name: "Search" });
  const form = () => screen.getByRole("search");

  it("is in the search landmark, which is the form it submits", () => {
    mount();
    expect(form().tagName).toBe("FORM");
    expect(within(form()).getByRole("button", { name: "Search" })).toBe(button());
    expect(button()).toHaveAttribute("type", "submit");
  });

  it("sits on the search's line, beside the field, not beside the filter", () => {
    mount();
    expect(button().parentElement).toBe(search().parentElement);
    expect(filter().parentElement).not.toBe(search().parentElement);
  });

  it("is named in words, and its drawn magnifier is hidden", () => {
    mount();
    expect(button()).toHaveAccessibleName("Search");
    expect(button()).toHaveTextContent("");
    expect(button().querySelector("span")).toHaveAttribute("aria-hidden", "true");
  });

  it("holds the submit: nothing is sent and the page stays", () => {
    mount();
    const submit = createEvent.submit(form());
    fireEvent(form(), submit);
    expect(submit.defaultPrevented).toBe(true);
  });

  it("leaves the list exactly as typing chose it", () => {
    mount();
    type("network");
    const before = titles();
    fireEvent.click(button());
    expect(titles()).toEqual(before);
    expect(search()).toHaveValue("network");
    expect(screen.getByRole("status")).toHaveTextContent("1 article found");
  });

  it("keeps a chosen tag through a press", () => {
    mount();
    pick("Design");
    fireEvent.click(button());
    expect(filter()).toHaveValue("Design");
  });

  it("puts the field down, so a phone's keyboard closes over the results", () => {
    mount();
    search().focus();
    expect(search()).toHaveFocus();
    fireEvent.submit(form());
    expect(search()).not.toHaveFocus();
  });

  it("leaves focus alone when the field did not have it", () => {
    mount();
    filter().focus();
    fireEvent.submit(form());
    expect(filter()).toHaveFocus();
  });

  it("keeps each control's name beside it: the filter's label is in its own box", () => {
    mount();
    const box = filter().parentElement!;
    expect(box.querySelector('label[for="blog-tag"]')).not.toBeNull();
    expect(search().parentElement!.querySelector('label[for="blog-search"]')).not.toBeNull();
  });
});
