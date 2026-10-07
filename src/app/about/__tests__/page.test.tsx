import { render, screen, within } from "@testing-library/react";

import AboutPage, { metadata } from "../page";
import { ABOUT_FAQS, APPROACH, MISSION, VALUES, VISION } from "../../../content/about";
import { DESCRIPTION_RANGE } from "../../../lib/metadata";

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
    it("has one h1, About Us", () => {
      render(<AboutPage />);
      const h1s = screen.getAllByRole("heading", { level: 1 });
      expect(h1s).toHaveLength(1);
      expect(h1s[0]).toHaveTextContent("About Us");
    });

    it("has the five sections as h2, in order", () => {
      render(<AboutPage />);
      const h2s = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
      expect(h2s).toEqual([
        "Our Approach",
        "Mission",
        "Vision",
        "Values",
        "Frequently Asked Questions",
      ]);
    });

    it("names each section by its heading", () => {
      render(<AboutPage />);
      for (const name of ["About Us", "Our Approach", "Mission", "Vision", "Values"]) {
        expect(screen.getByRole("region", { name })).toBeInTheDocument();
      }
    });

    it("keeps both photographs and every icon decorative, so the words carry the meaning", () => {
      const { container } = render(<AboutPage />);
      const images = container.querySelectorAll("img");
      expect(images).toHaveLength(2 + APPROACH.length);
      images.forEach((img) => expect(img).toHaveAttribute("alt", ""));
    });

    it("marks the mission's ground dark, for the focus ring and cursor", () => {
      render(<AboutPage />);
      expect(screen.getByRole("region", { name: "Mission" })).toHaveAttribute(
        "data-ground",
        "dark",
      );
    });
  });

  describe("approach", () => {
    const cards = () =>
      within(screen.getByRole("region", { name: "Our Approach" })).getAllByRole("listitem");

    it("lists the six steps in order, each an h3 over its paragraph", () => {
      render(<AboutPage />);
      expect(cards()).toHaveLength(APPROACH.length);
      cards().forEach((card, index) => {
        const step = APPROACH[index]!;
        expect(within(card).getByRole("heading", { level: 3 })).toHaveTextContent(step.title);
        expect(within(card).getByText(step.body).tagName).toBe("P");
      });
    });

    it("draws each step's own icon from public/about/icons", () => {
      const { container } = render(<AboutPage />);
      const icons = Array.from(container.querySelectorAll('[aria-labelledby="approach"] img')).map(
        (img) => img.getAttribute("src"),
      );
      expect(icons).toEqual(APPROACH.map((step) => `/about/icons/${step.icon}`));
    });

    it("sits between the hero and the mission", () => {
      const { container } = render(<AboutPage />);
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
    ])("%s sets its lead and body as two paragraphs", (name, statement) => {
      render(<AboutPage />);
      const region = screen.getByRole("region", { name });
      const paragraphs = Array.from(region.querySelectorAll("p")).map((p) => p.textContent);
      expect(paragraphs).toEqual([statement.lead, statement.body]);
    });
  });

  describe("values", () => {
    it("renders one row per value, in order", () => {
      render(<AboutPage />);
      expect(values()).toHaveLength(VALUES.length);
      values().forEach((row, index) => {
        expect(row.querySelector("summary")).toHaveTextContent(VALUES[index]!.title);
      });
    });

    it("puts every row in one named group, so only one opens at a time", () => {
      render(<AboutPage />);
      values().forEach((row) => expect(row).toHaveAttribute("name", "values"));
    });

    it("starts with every row closed", () => {
      render(<AboutPage />);
      values().forEach((row) => expect(row.open).toBe(false));
    });

    it("has every answer in the HTML while closed", () => {
      const { container } = render(<AboutPage />);
      for (const value of VALUES) expect(container).toHaveTextContent(value.body);
    });

    it("numbers the rows 01 to 05, hidden from assistive technology", () => {
      render(<AboutPage />);
      const numbers = Array.from(values()).map((row) => {
        const number = row.querySelector('summary [aria-hidden="true"]');
        return number?.textContent;
      });
      expect(numbers).toEqual(["01", "02", "03", "04", "05"]);
    });

    it("names each row by its value alone, not its number", () => {
      render(<AboutPage />);
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

    it("asks each question once, in order, with its answer in the HTML", () => {
      const { container } = render(<AboutPage />);
      expect(faqRows()).toHaveLength(ABOUT_FAQS.length);
      faqRows().forEach((row, index) => {
        const entry = ABOUT_FAQS[index]!;
        expect(row.querySelector("summary")).toHaveTextContent(entry.question);
        expect(row).toHaveAttribute("id", entry.id);
      });
      for (const entry of ABOUT_FAQS) expect(container).toHaveTextContent(entry.answer[0]!);
    });

    it("opens one question at a time, apart from the values", () => {
      render(<AboutPage />);
      faqRows().forEach((row) => expect(row).toHaveAttribute("name", "about-faq"));
    });

    it("sets only the FAQ's title at the smaller, form-side size", () => {
      // A long title at the section size dwarfed the form beside it; the
      // About sections keep the larger size from the mockup.
      render(<AboutPage />);
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

    it("puts the FAQ last, directly below the enquiry", () => {
      // 2026-10-07, at Shivanshu's call: the form, then the questions.
      const { container } = render(<AboutPage />);
      const sections = container.querySelectorAll("section");
      expect(sections[sections.length - 1]).toHaveAttribute("data-about-faqs");
      expect(sections[sections.length - 2]).toHaveAttribute("data-testid", "home-enquiry");
    });

    it("emits no FAQPage structured data, only the page's own", () => {
      // The contact page's rule: FAQ rich results are not what this is for,
      // and one JSON-LD block keeps the page's graph single.
      const { container } = render(<AboutPage />);
      const scripts = container.querySelectorAll('script[type="application/ld+json"]');
      expect(scripts).toHaveLength(1);
      expect(scripts[0]!.textContent).not.toContain("FAQPage");
    });
  });

  describe("metadata", () => {
    it("is indexable, and canonical to /about", () => {
      expect(metadata.robots).toMatchObject({ index: true });
      expect(metadata.alternates?.canonical).toBe("/about");
    });

    it("describes the page within the SEO length range, claiming no heritage", () => {
      const description = String(metadata.description);
      expect(description.length).toBeGreaterThanOrEqual(DESCRIPTION_RANGE[0]);
      expect(description.length).toBeLessThanOrEqual(DESCRIPTION_RANGE[1]);
      expect(description).not.toMatch(/years|since|leading|trusted/i);
    });

    it("emits the page's own structured data, naming /about", () => {
      const { container } = render(<AboutPage />);
      const scripts = container.querySelectorAll('script[type="application/ld+json"]');
      expect(scripts).toHaveLength(1);
      expect(scripts[0]!.textContent).toContain("/about");
    });

    it("titles the page for search, not as a bare label", () => {
      expect(String(metadata.title)).toMatch(/^About Smarthaus/);
    });
  });
});
