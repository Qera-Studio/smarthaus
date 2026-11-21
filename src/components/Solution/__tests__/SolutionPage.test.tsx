import { screen, within } from "@testing-library/react";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { POSTS } from "../../../../sanity/seed/blog";
import { SITE_SETTINGS } from "../../../../sanity/seed/site-settings";
import { SOLUTION_PAGES } from "../../../../sanity/seed/solutions";
import { stubBrowser } from "../../../__tests__/helpers/browser";
import { renderServer } from "../../../__tests__/helpers/server";
import { SOLUTION_PICTURE_SIZES } from "../../../lib/solution-picture";
import { getDoc, getDocs } from "../../../sanity/fetch";
import { FEATURE_COUNT, PROCESS_STEP_COUNT } from "../../../sanity/schema/solution";
import { PROCESS_DRAWINGS, SolutionPage } from "../SolutionPage";

/**
 * One solution's page (Figma 4903:4464), from the seed. jsdom draws no CSS,
 * so the grid's placing is styles.test.ts's and e2e/solutions.spec.ts's; what
 * is here is what each section says, in what order, and what the opening
 * looks for: the picture and the copy, marked.
 */

// The enquiry form imports the server action, which imports Resend, which
// wants a TextEncoder jsdom does not have. The action is not under test here.
jest.mock("../../../app/contact/actions", () => ({
  submitEnquiry: jest.fn(),
  submitShortEnquiry: jest.fn(),
  submitHeroLead: jest.fn(),
}));

const CAMERAS = SOLUTION_PAGES.cameras!;
const ITEM = SITE_SETTINGS.solutionsMenu.items.find((entry) => entry.id === "cameras")!;
const mockedGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
const mockedGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;

const render = () => renderServer(<SolutionPage slug="cameras" />);

// The "Works with" ring asks for matchMedia and IntersectionObserver on mount.
beforeEach(() => {
  stubBrowser();
});

/** The section a heading names. */
const section = (name: string | RegExp) =>
  screen.getByRole("heading", { name }).closest("section")!;

afterEach(() => {
  const actual =
    jest.requireActual<typeof import("../../../../sanity/seed")>("../../../../sanity/seed");
  mockedGetDocs.mockImplementation(async (type: string) => actual.seedDocs(type) as never);
  mockedGetDoc.mockImplementation(async (id: string) => actual.seedDoc(id) as never);
});

describe("SolutionPage", () => {
  describe("the hero", () => {
    it("names the solution in the page's one h1, its line under it", async () => {
      await render();
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
      const h1 = screen.getByRole("heading", { level: 1 });
      expect(h1).toHaveTextContent(CAMERAS.title);
      expect(h1.nextElementSibling).toHaveTextContent(CAMERAS.lede);
    });

    it("is a section named by its h1", async () => {
      await render();
      const h1 = screen.getByRole("heading", { level: 1 });
      expect(h1.closest("section")).toHaveAttribute("aria-labelledby", h1.id);
    });

    it("draws the menu item's own picture, the one the menu grows into it", async () => {
      const { container } = await render();
      const img = container.querySelector("[data-solution-picture] img")!;
      expect(decodeURIComponent(img.getAttribute("src")!)).toContain(ITEM.image.src);
    });

    it("marks the picture with its solution's id, and the copy, for the opening", async () => {
      const { container } = await render();
      expect(container.querySelector('[data-solution-picture="cameras"]')).not.toBeNull();
      const copy = container.querySelector("[data-solution-copy]")!;
      expect(within(copy as HTMLElement).getByRole("heading", { level: 1 })).toBeInTheDocument();
    });

    it("asks for the picture at the sizes the menu warms it at", async () => {
      const { container } = await render();
      const img = container.querySelector("[data-solution-picture] img")!;
      expect(img).toHaveAttribute("sizes", SOLUTION_PICTURE_SIZES);
    });

    it("fetches it first: it is the page's largest paint", async () => {
      const { container } = await render();
      const img = container.querySelector("[data-solution-picture] img")!;
      expect(img).toHaveAttribute("fetchpriority", "high");
      expect(img).toHaveAttribute("loading", "eager");
    });

    it("leaves it as decoration: the h1 says what it shows", async () => {
      const { container } = await render();
      expect(container.querySelector("[data-solution-picture] img")).toHaveAttribute("alt", "");
    });

    it("carries no transition name of its own: the opening names it only while it runs", async () => {
      const { container } = await render();
      const picture = container.querySelector<HTMLElement>("[data-solution-picture]")!;
      expect(picture.style.viewTransitionName).toBe("");
    });
  });

  describe("the features", () => {
    it("open on their heading and the line under it", async () => {
      await render();
      const features = section(CAMERAS.features.heading);
      expect(within(features).getByText(CAMERAS.features.standfirst)).toBeInTheDocument();
    });

    it(`are ${FEATURE_COUNT}, each an h3 with its line`, async () => {
      await render();
      const features = section(CAMERAS.features.heading);
      const titles = within(features).getAllByRole("heading", { level: 3 });
      expect(titles.map((h) => h.textContent)).toEqual(
        CAMERAS.features.items.map((item) => item.title),
      );
      CAMERAS.features.items.forEach((item, index) => {
        expect(titles[index]!.nextElementSibling).toHaveTextContent(item.text);
      });
    });

    it("each wear their icon, as decoration, at 28px: 4px under the design's 32", async () => {
      await render();
      const features = section(CAMERAS.features.heading);
      const icons = features.querySelectorAll("svg.lucide");
      expect(icons).toHaveLength(FEATURE_COUNT);
      icons.forEach((icon, index) => {
        expect(icon).toHaveAttribute("aria-hidden", "true");
        expect(icon).toHaveAttribute("width", "28");
        expect(icon).toHaveAttribute("height", "28");
        expect(icon).toHaveClass(`lucide-${CAMERAS.features.items[index]!.icon}`);
      });
    });

    it("draw their icons in a fine line", async () => {
      await render();
      const icon = section(CAMERAS.features.heading).querySelector("svg.lucide")!;
      expect(icon).toHaveAttribute("stroke-width", "1.5");
    });

    it("set the icon above the words, which come last in each box", async () => {
      await render();
      const box = section(CAMERAS.features.heading)
        .querySelector("h3")!
        .closest("div")!.parentElement!;
      expect(box.firstElementChild!.tagName.toLowerCase()).toBe("svg");
      expect(box.lastElementChild!.querySelector("h3")).not.toBeNull();
    });

    it("sit round the picture, decoration", async () => {
      await render();
      const features = section(CAMERAS.features.heading);
      const picture = Array.from(features.querySelectorAll("img")).find((img) =>
        decodeURIComponent(img.getAttribute("src")!).includes(CAMERAS.features.image.src),
      )!;
      expect(picture).toHaveAttribute("alt", "");
    });

    it("end on the dark box: its line, then its button to the contact page", async () => {
      await render();
      const features = section(CAMERAS.features.heading);
      const button = within(features).getByRole("link", { name: CAMERAS.features.ctaLabel });
      expect(button).toHaveAttribute("href", "/contact");
      const box = button.parentElement!;
      expect(box.firstElementChild).toHaveTextContent(CAMERAS.features.ctaText);
    });

    it("draw the button light, as on any dark ground", async () => {
      await render();
      const button = within(section(CAMERAS.features.heading)).getByRole("link", {
        name: CAMERAS.features.ctaLabel,
      });
      expect(button).toHaveAttribute("data-variant", "inverse");
    });

    it("mark the dark box for the cursor's light dot", async () => {
      await render();
      const button = within(section(CAMERAS.features.heading)).getByRole("link", {
        name: CAMERAS.features.ctaLabel,
      });
      expect(button.parentElement).toHaveAttribute("data-ground", "dark");
    });

    it("put the picture and the box after the nine, so they read last", async () => {
      await render();
      const features = section(CAMERAS.features.heading);
      const grid = features.querySelector("h3")!.closest("div")!.parentElement!.parentElement!;
      const kids = Array.from(grid.children);
      expect(kids).toHaveLength(FEATURE_COUNT + 2);
      expect(kids.slice(0, FEATURE_COUNT).every((kid) => kid.querySelector("h3"))).toBe(true);
      expect(kids[FEATURE_COUNT]!.querySelector("img")).not.toBeNull();
      expect(kids[FEATURE_COUNT + 1]!.querySelector("a")).not.toBeNull();
    });
  });

  // Shivanshu, 2026-11-16: visit, install, maintain, under the features.
  describe("the process", () => {
    const PROCESS = CAMERAS.process;

    it("is a section named by its h2, the line under it", async () => {
      await render();
      const heading = screen.getByRole("heading", { name: PROCESS.heading });
      expect(heading.tagName).toBe("H2");
      expect(heading.closest("section")).toHaveAttribute("aria-labelledby", heading.id);
      expect(heading.nextElementSibling).toHaveTextContent(PROCESS.subtext);
    });

    it("has nothing above its heading: no eyebrow", async () => {
      await render();
      const heading = screen.getByRole("heading", { name: PROCESS.heading });
      expect(heading.previousElementSibling).toBeNull();
      expect(heading.parentElement!.children).toHaveLength(2);
    });

    it(`is an ordered list of ${PROCESS_STEP_COUNT} steps, read in order`, async () => {
      await render();
      const list = within(section(PROCESS.heading)).getByRole("list");
      expect(list.tagName).toBe("OL");
      expect(within(list).getAllByRole("listitem")).toHaveLength(PROCESS_STEP_COUNT);
    });

    it("leaves the list its own role: an explicit one is redundant on an <ol>", async () => {
      await render();
      expect(section(PROCESS.heading).querySelector("ol")).not.toHaveAttribute("role");
    });

    it("titles each step with an h3, its line under it", async () => {
      await render();
      const titles = within(section(PROCESS.heading)).getAllByRole("heading", { level: 3 });
      expect(titles.map((h) => h.textContent)).toEqual(PROCESS.steps.map((step) => step.title));
      PROCESS.steps.forEach((step, index) => {
        expect(titles[index]!.nextElementSibling).toHaveTextContent(step.text);
      });
    });

    it("draws each step's own drawing, in order", async () => {
      await render();
      const drawings = section(PROCESS.heading).querySelectorAll("img");
      expect(Array.from(drawings, (img) => img.getAttribute("src"))).toEqual(
        PROCESS_DRAWINGS.map((file) => `/solutions/process/${file}`),
      );
    });

    it("leaves the drawings as decoration: each title says what it shows", async () => {
      await render();
      for (const img of section(PROCESS.heading).querySelectorAll("img")) {
        expect(img).toHaveAttribute("alt", "");
      }
    });

    it("gives each drawing its size, so nothing moves as it arrives", async () => {
      await render();
      for (const img of section(PROCESS.heading).querySelectorAll("img")) {
        expect(img).toHaveAttribute("width", "480");
        expect(img).toHaveAttribute("height", "440");
      }
    });

    it("loads them late: they are below the fold on every screen", async () => {
      await render();
      for (const img of section(PROCESS.heading).querySelectorAll("img")) {
        expect(img).toHaveAttribute("loading", "lazy");
        expect(img).not.toHaveAttribute("fetchpriority");
      }
    });

    it("sets the drawing first in each card and the words last, at its foot", async () => {
      await render();
      for (const card of within(section(PROCESS.heading)).getAllByRole("listitem")) {
        expect(card.children).toHaveLength(2);
        expect(card.firstElementChild!.tagName).toBe("IMG");
        expect(card.lastElementChild!.querySelector("h3")).not.toBeNull();
      }
    });

    it("links nowhere and asks for nothing: the dark box above already does", async () => {
      await render();
      expect(within(section(PROCESS.heading)).queryAllByRole("link")).toEqual([]);
    });
  });

  describe("the process's drawings", () => {
    const DIR = join(process.cwd(), "public/solutions/process");

    it(`are ${PROCESS_STEP_COUNT}, one per step`, () => {
      expect(PROCESS_DRAWINGS).toHaveLength(PROCESS_STEP_COUNT);
    });

    it("are numbered in the order they are drawn", () => {
      PROCESS_DRAWINGS.forEach((file, index) => {
        expect(file).toMatch(new RegExp(`^0${index + 1}-[a-z]+\\.svg$`));
      });
    });

    it.each(PROCESS_DRAWINGS)("%s exists, drawn at the 480 by 440 the page reserves", (file) => {
      const path = join(DIR, file);
      expect(existsSync(path)).toBe(true);
      const svg = readFileSync(path, "utf8");
      expect(svg).toMatch(/<svg[^>]*\bviewBox="0 0 480 440"/);
    });

    it.each(PROCESS_DRAWINGS)("%s carries no script and loads nothing", (file) => {
      const svg = readFileSync(join(DIR, file), "utf8");
      expect(svg).not.toMatch(/<script|\bon[a-z]+=|xlink:href="http|href="http|<image\b/i);
    });
  });

  describe("the questions", () => {
    it("are a section under their own h2", async () => {
      await render();
      const faqs = section(CAMERAS.faqHeading);
      expect(screen.getByRole("heading", { name: CAMERAS.faqHeading }).tagName).toBe("H2");
      expect(faqs.querySelectorAll("details")).toHaveLength(CAMERAS.faqs.length);
    });

    it("ask each question, with its answer in the page whether open or not", async () => {
      await render();
      const faqs = section(CAMERAS.faqHeading);
      CAMERAS.faqs.forEach((entry) => {
        const details = faqs.querySelector(`details#${entry.id}`)!;
        expect(details.querySelector("summary")).toHaveTextContent(entry.question);
        expect(details).toHaveTextContent(entry.answer[0]!);
      });
    });

    it("open one at a time", async () => {
      await render();
      const names = Array.from(section(CAMERAS.faqHeading).querySelectorAll("details")).map((d) =>
        d.getAttribute("name"),
      );
      expect(new Set(names)).toEqual(new Set(["solution-faq"]));
    });
  });

  describe("the enquiry", () => {
    it("follows the questions, under the page's own heading", async () => {
      await render();
      const heading = screen.getByRole("heading", { name: CAMERAS.enquiry.title });
      expect(heading.tagName).toBe("H2");
      expect(screen.getByText(CAMERAS.enquiry.standfirst)).toBeInTheDocument();
    });

    it("is the short form", async () => {
      await render();
      const form = section(CAMERAS.enquiry.title).querySelector("form")!;
      expect(within(form).getByLabelText("Name")).toBeInTheDocument();
      expect(within(form).getByLabelText("Email")).toBeInTheDocument();
    });
  });

  describe("the articles", () => {
    it("show three, those with the page's tag first", async () => {
      await render();
      const related = section(CAMERAS.articlesHeading);
      const links = within(related).getAllByRole("link");
      expect(links).toHaveLength(3);
      const tagged = POSTS.filter((post) => post.tags.includes(CAMERAS.articlesTag));
      expect(tagged.length).toBeGreaterThan(0);
      expect(links[0]).toHaveAttribute("href", `/blog/${tagged[0]!.slug}`);
    });

    it("fill up with the newest others", async () => {
      await render();
      const links = within(section(CAMERAS.articlesHeading)).getAllByRole("link");
      const others = [...POSTS]
        .filter((post) => !post.tags.includes(CAMERAS.articlesTag))
        .sort((a, b) => b.date.localeCompare(a.date));
      expect(links.slice(1).map((link) => link.getAttribute("href"))).toEqual(
        others.slice(0, 2).map((post) => `/blog/${post.slug}`),
      );
    });

    it("are not there at all when there are none", async () => {
      mockedGetDocs.mockResolvedValue([]);
      await render();
      expect(screen.queryByRole("heading", { name: CAMERAS.articlesHeading })).toBeNull();
    });
  });

  // Works with went under the hero on 2026-11-16 (Shivanshu).
  it("reads hero, works with, features, process, questions, enquiry, articles, in that order", async () => {
    await render();
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual([
      CAMERAS.worksWith.heading,
      CAMERAS.features.heading,
      CAMERAS.process.heading,
      CAMERAS.faqHeading,
      CAMERAS.enquiry.title,
      CAMERAS.articlesHeading,
    ]);
  });

  it("fails the build when its item has gone from the menu", async () => {
    const actual =
      jest.requireActual<typeof import("../../../../sanity/seed")>("../../../../sanity/seed");
    mockedGetDoc.mockImplementation(
      async (id: string) =>
        (id === "siteSettings"
          ? {
              ...SITE_SETTINGS,
              solutionsMenu: {
                ...SITE_SETTINGS.solutionsMenu,
                items: SITE_SETTINGS.solutionsMenu.items.filter((entry) => entry.id !== "cameras"),
              },
            }
          : actual.seedDoc(id)) as never,
    );
    await expect(render()).rejects.toThrow(/no item with that id in the Solutions menu/);
  });
});

/**
 * Every page, not only cameras (Shivanshu, 2026-11-15): one component draws
 * all eight, so what differs is the document. Each must draw its own nine
 * features with their icons, its picture, its dark box, its questions and
 * the same order of sections.
 */
describe.each(Object.entries(SOLUTION_PAGES))("SolutionPage: %s", (slug, page) => {
  const draw = () => renderServer(<SolutionPage slug={slug} />);

  // Works with went under the hero on 2026-11-16 (Shivanshu).
  it("reads its own hero, works with, features, process, questions, enquiry and articles, in that order", async () => {
    await draw();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(page.title);
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      page.worksWith.heading,
      page.features.heading,
      page.process.heading,
      page.faqHeading,
      page.enquiry.title,
      page.articlesHeading,
    ]);
  });

  it("draws its nine features, each under its own Lucide icon at 28px", async () => {
    await draw();
    const features = section(page.features.heading);
    expect(
      within(features)
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(page.features.items.map((item) => item.title));
    const icons = features.querySelectorAll("svg.lucide");
    expect(icons).toHaveLength(FEATURE_COUNT);
    icons.forEach((icon, index) => {
      expect(icon).toHaveClass(`lucide-${page.features.items[index]!.icon}`);
      expect(icon).toHaveAttribute("width", "28");
    });
  });

  it("draws its own features' picture and dark box", async () => {
    await draw();
    const features = section(page.features.heading);
    const picture = features.querySelector("img")!;
    expect(decodeURIComponent(picture.getAttribute("src")!)).toContain(page.features.image.src);
    const slab = features.querySelector("[data-ground=dark]")!;
    expect(slab).toHaveTextContent(page.features.ctaText);
    expect(
      within(slab as HTMLElement).getByRole("link", { name: page.features.ctaLabel }),
    ).toHaveAttribute("href", "/contact");
  });

  it("draws its own process: each step's title over its line, under its drawing", async () => {
    await draw();
    const steps = within(section(page.process.heading)).getAllByRole("listitem");
    expect(steps).toHaveLength(PROCESS_STEP_COUNT);
    steps.forEach((step, index) => {
      expect(step.querySelector("h3")).toHaveTextContent(page.process.steps[index]!.title);
      expect(step).toHaveTextContent(page.process.steps[index]!.text);
      expect(step.querySelector("img")).toHaveAttribute(
        "src",
        `/solutions/process/${PROCESS_DRAWINGS[index]}`,
      );
    });
  });

  it("lists its own questions", async () => {
    await draw();
    const questions = section(page.faqHeading).querySelectorAll("details summary");
    expect(Array.from(questions, (q) => q.textContent)).toEqual(
      page.faqs.map((entry) => entry.question),
    );
  });

  it("marks its picture and copy for the opening, by its own id", async () => {
    const { container } = await draw();
    expect(container.querySelector(`[data-solution-picture="${slug}"] img`)).not.toBeNull();
    expect(container.querySelector("[data-solution-copy] h1")).toHaveTextContent(page.title);
  });
});
