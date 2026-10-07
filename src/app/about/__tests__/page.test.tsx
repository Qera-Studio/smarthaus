import { render, screen, within } from "@testing-library/react";

import AboutPage, { metadata } from "../page";
import { MISSION, VALUES, VISION } from "../../../content/about";
import { DESCRIPTION_RANGE } from "../../../lib/metadata";

/**
 * /about is the page James & Emma read to decide whether the company is
 * real, so what fails silently here is structural: a heading out of order, a
 * value whose answer only exists once opened, a row that escapes the
 * one-at-a-time group, or the page sliding back to noindex.
 */

const values = () => document.querySelectorAll<HTMLDetailsElement>("details");

describe("About page", () => {
  describe("structure", () => {
    it("has one h1, About Us", () => {
      render(<AboutPage />);
      const h1s = screen.getAllByRole("heading", { level: 1 });
      expect(h1s).toHaveLength(1);
      expect(h1s[0]).toHaveTextContent("About Us");
    });

    it("has the three sections as h2, in order", () => {
      render(<AboutPage />);
      const h2s = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
      expect(h2s).toEqual(["Mission", "Vision", "Values"]);
    });

    it("names each section by its heading", () => {
      render(<AboutPage />);
      for (const name of ["About Us", "Mission", "Vision", "Values"]) {
        expect(screen.getByRole("region", { name })).toBeInTheDocument();
      }
    });

    it("keeps both photographs decorative, so the words carry the meaning", () => {
      const { container } = render(<AboutPage />);
      const images = container.querySelectorAll("img");
      expect(images).toHaveLength(2);
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
