import type { Metadata } from "next";
import { screen, within } from "@testing-library/react";

import AboutPage, { generateMetadata } from "../page";
import { ABOUT_PAGE } from "../../../../sanity/seed/about-page";
import { DESCRIPTION_RANGE } from "../../../lib/metadata";
import { renderServer } from "../../../__tests__/helpers/server";

// The page's metadata is built from its document in Sanity; the seed stands in.
let metadata: Metadata;
beforeAll(async () => {
  metadata = await generateMetadata();
});

const ABOUT_FAQS = ABOUT_PAGE.faqs;
const APPROACH = ABOUT_PAGE.approach;
const MISSION = ABOUT_PAGE.mission;
const VALUES = ABOUT_PAGE.values;
const VISION = ABOUT_PAGE.vision;

/**
 * /about is the page James & Emma read to decide whether the company is
 * real, so what fails silently here is structural: a heading out of order, a
 * value whose answer only exists once opened, a row that escapes the
 * one-at-a-time group, or the page sliding back to noindex.
 */

// The enquiry is the homepage's own section, with its own suites; here it is
// a marker, because its form imports the server action and jsdom cannot load
// the mail client behind it.
jest.mock("../../../components/HomeEnquiry", () => ({
  HomeEnquiry: () => <section data-testid="home-enquiry" aria-labelledby="home-enquiry" />,
}));

const values = () => document.querySelectorAll<HTMLDetailsElement>("[data-about-values] details");

describe("About page", () => {
  describe("structure", () => {
    it("has one h1, About Us", async () => {
      await renderServer(<AboutPage />);
      const h1s = screen.getAllByRole("heading", { level: 1 });
      expect(h1s).toHaveLength(1);
      expect(h1s[0]).toHaveTextContent("About Us");
    });

    it("has the five sections as h2, in order", async () => {
      await renderServer(<AboutPage />);
      const h2s = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
      expect(h2s).toEqual([
        "Our Approach",
        "Mission",
        "Vision",
        "Values",
        "Frequently Asked Questions",
      ]);
    });

    it("names each section by its heading", async () => {
      await renderServer(<AboutPage />);
      for (const name of ["About Us", "Our Approach", "Mission", "Vision", "Values"]) {
        expect(screen.getByRole("region", { name })).toBeInTheDocument();
      }
    });

    it("keeps both photographs and every icon decorative, so the words carry the meaning", async () => {
      const { container } = await renderServer(<AboutPage />);
      const images = container.querySelectorAll("img");
      expect(images).toHaveLength(2 + APPROACH.length);
      images.forEach((img) => expect(img).toHaveAttribute("alt", ""));
    });

    it("holds Mission and Vision in one dark ground, for the focus ring and cursor", async () => {
      await renderServer(<AboutPage />);
      const mission = screen.getByRole("region", { name: "Mission" });
      const vision = screen.getByRole("region", { name: "Vision" });
      const ground = mission.closest('[data-ground="dark"]');
      expect(ground).not.toBeNull();
      expect(vision.closest('[data-ground="dark"]')).toBe(ground);
    });

    it("gives each photograph its own parallax layer", async () => {
      const { container } = await renderServer(<AboutPage />);
      const layers = Array.from(container.querySelectorAll("[data-parallax]"));
      expect(layers.map((el) => el.getAttribute("data-parallax"))).toEqual(["hero", "mission"]);
      layers.forEach((layer) => expect(layer.querySelector("img")).not.toBeNull());
    });
  });

  describe("approach", () => {
    const cards = () =>
      within(screen.getByRole("region", { name: "Our Approach" })).getAllByRole("listitem");

    it("lists the six steps in order, each an h3 over its paragraph", async () => {
      await renderServer(<AboutPage />);
      expect(cards()).toHaveLength(APPROACH.length);
      cards().forEach((card, index) => {
        const step = APPROACH[index]!;
        expect(within(card).getByRole("heading", { level: 3 })).toHaveTextContent(step.title);
        expect(within(card).getByText(step.body).tagName).toBe("P");
      });
    });

    it("draws each step's own icon from public/about/icons", async () => {
      const { container } = await renderServer(<AboutPage />);
      const icons = Array.from(container.querySelectorAll('[aria-labelledby="approach"] img')).map(
        (img) => img.getAttribute("src"),
      );
      expect(icons).toEqual(APPROACH.map((step) => `/about/icons/${step.icon}`));
    });

    it("sits between the hero and the mission", async () => {
      const { container } = await renderServer(<AboutPage />);
      const order = Array.from(container.querySelectorAll("section")).map((el) =>
        el.getAttribute("aria-labelledby"),
      );
      expect(order).toEqual([
        "about-title",
        "approach",
        "mission",
        "vision",
        "values",
        "home-enquiry",
        "about-faqs",
      ]);
    });
  });

  describe("mission and vision", () => {
    it.each([
      ["Mission", MISSION],
      ["Vision", VISION],
    ])("%s sets its lead and body as two paragraphs", async (name, statement) => {
      await renderServer(<AboutPage />);
      const region = screen.getByRole("region", { name });
      const paragraphs = Array.from(region.querySelectorAll("p")).map((p) => p.textContent);
      expect(paragraphs).toEqual([statement.lead, statement.body]);
    });
  });

  describe("values", () => {
    it("renders one row per value, in order", async () => {
      await renderServer(<AboutPage />);
      expect(values()).toHaveLength(VALUES.length);
      values().forEach((row, index) => {
        expect(row.querySelector("summary")).toHaveTextContent(VALUES[index]!.title);
      });
    });

    it("puts every row in one named group, so only one opens at a time", async () => {
      await renderServer(<AboutPage />);
      values().forEach((row) => expect(row).toHaveAttribute("name", "values"));
    });

    it("starts with every row closed", async () => {
      await renderServer(<AboutPage />);
      values().forEach((row) => expect(row.open).toBe(false));
    });

    it("has every answer in the HTML while closed", async () => {
      const { container } = await renderServer(<AboutPage />);
      for (const value of VALUES) expect(container).toHaveTextContent(value.body);
    });

    it("numbers the rows 01 to 05, hidden from assistive technology", async () => {
      await renderServer(<AboutPage />);
      const numbers = Array.from(values()).map((row) => {
        const number = row.querySelector('summary [aria-hidden="true"]');
        return number?.textContent;
      });
      expect(numbers).toEqual(["01", "02", "03", "04", "05"]);
    });

    it("names each row by its value alone, not its number", async () => {
      await renderServer(<AboutPage />);
      const region = screen.getByRole("region", { name: "Values" });
      const titles = within(region)
        .getAllByText((_, el) => el?.tagName === "SPAN" && !el.hasAttribute("aria-hidden"))
        .map((el) => el.textContent);
      expect(titles).toEqual(VALUES.map((value) => value.title));
    });
  });

  describe("faq and enquiry", () => {
    const faqRows = () =>
      document.querySelectorAll<HTMLDetailsElement>("[data-about-faqs] details");

    it("asks each question once, in order, with its answer in the HTML", async () => {
      const { container } = await renderServer(<AboutPage />);
      expect(faqRows()).toHaveLength(ABOUT_FAQS.length);
      faqRows().forEach((row, index) => {
        const entry = ABOUT_FAQS[index]!;
        expect(row.querySelector("summary")).toHaveTextContent(entry.question);
        expect(row).toHaveAttribute("id", entry.id);
      });
      for (const entry of ABOUT_FAQS) expect(container).toHaveTextContent(entry.answer[0]!);
    });

    it("opens one question at a time, apart from the values", async () => {
      await renderServer(<AboutPage />);
      faqRows().forEach((row) => expect(row).toHaveAttribute("name", "about-faq"));
    });

    it("sets only the FAQ's title at the smaller, form-side size", async () => {
      // A long title at the section size dwarfed the form beside it; the
      // About sections keep the larger size from the mockup.
      await renderServer(<AboutPage />);
      const classes = screen
        .getAllByRole("heading", { level: 2 })
        .map((h) => [h.textContent, h.className]);
      expect(classes).toEqual([
        ["Our Approach", "approachTitle"],
        ["Mission", "title"],
        ["Vision", "title"],
        ["Values", "title"],
        ["Frequently Asked Questions", "titleSmall"],
      ]);
    });

    it("puts the FAQ last, directly below the enquiry", async () => {
      // 2026-10-07, at Shivanshu's call: the form, then the questions.
      const { container } = await renderServer(<AboutPage />);
      const sections = container.querySelectorAll("section");
      expect(sections[sections.length - 1]).toHaveAttribute("data-about-faqs");
      expect(sections[sections.length - 2]).toHaveAttribute("data-testid", "home-enquiry");
    });

    it("emits no FAQPage structured data, only the page's own", async () => {
      // The contact page's rule: FAQ rich results are not what this is for,
      // and one JSON-LD block keeps the page's graph single.
      const { container } = await renderServer(<AboutPage />);
      const scripts = container.querySelectorAll('script[type="application/ld+json"]');
      expect(scripts).toHaveLength(1);
      expect(scripts[0]!.textContent).not.toContain("FAQPage");
    });
  });

  describe("metadata", () => {
    it("is indexable, and canonical to /about", async () => {
      expect(metadata.robots).toMatchObject({ index: true });
      expect(metadata.alternates?.canonical).toBe("/about");
    });

    it("describes the page within the SEO length range, claiming no heritage", async () => {
      const description = String(metadata.description);
      expect(description.length).toBeGreaterThanOrEqual(DESCRIPTION_RANGE[0]);
      expect(description.length).toBeLessThanOrEqual(DESCRIPTION_RANGE[1]);
      expect(description).not.toMatch(/years|since|leading|trusted/i);
    });

    it("emits the page's own structured data, naming /about", async () => {
      const { container } = await renderServer(<AboutPage />);
      const scripts = container.querySelectorAll('script[type="application/ld+json"]');
      expect(scripts).toHaveLength(1);
      expect(scripts[0]!.textContent).toContain("/about");
    });

    it("titles the page for search, not as a bare label", async () => {
      expect(String(metadata.title)).toMatch(/^About Smarthaus/);
    });
  });
});
