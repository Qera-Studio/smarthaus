import { render, screen, within } from "@testing-library/react";

import { MAPLE_URL, Maple } from "../Maple";

/**
 * The parent-company banner makes a claim about who stands behind the brand,
 * which puts it under the AGENTS.md capability audit rather than ordinary
 * copy. What fails silently here: the link drifting from the footer's, a new
 * tab that hands Maple's page the opener, a logo with no name for a screen
 * reader, and a figure (years, clients) slipping in with no source.
 */
describe("Maple banner", () => {
  describe("structure", () => {
    it("is a section labelled by its own h2", () => {
      render(<Maple />);
      const heading = screen.getByRole("heading", {
        level: 2,
        name: "A brand by Maple Technologies",
      });
      // aria-labelledby makes the section a named region; a missing or wrong
      // id silently turns it back into an anonymous one.
      const region = screen.getByRole("region", { name: "A brand by Maple Technologies" });
      expect(region.tagName).toBe("SECTION");
      expect(region).toContainElement(heading);
    });

    it("carries exactly one heading, so the page outline gains one entry", () => {
      render(<Maple />);
      expect(screen.getAllByRole("heading")).toHaveLength(1);
    });

    it("puts the title, description and action before the logo in source order", () => {
      // Reading order is source order. The logo is the evidence the copy
      // points to, so a screen reader should meet the claim first.
      const { container } = render(<Maple />);
      const heading = screen.getByRole("heading");
      const logo = screen.getByRole("img", { name: "Maple Technologies" });
      const all = Array.from(container.querySelectorAll("*"));
      expect(all.indexOf(heading)).toBeLessThan(all.indexOf(logo));
    });
  });

  describe("call to action", () => {
    it("links to Maple's site, the same URL the footer uses", () => {
      render(<Maple />);
      const link = screen.getByRole("link", { name: /Visit Maple Technologies/ });
      expect(link).toHaveAttribute("href", "https://www.mapletech.ae");
      expect(MAPLE_URL).toBe("https://www.mapletech.ae");
    });

    it("opens a new tab without handing over the opener", () => {
      // Same rule e2e/footer-links.spec.ts holds every external link to.
      render(<Maple />);
      const link = screen.getByRole("link", { name: /Visit Maple Technologies/ });
      expect(link).toHaveAttribute("target", "_blank");
      const rel = link.getAttribute("rel")?.split(/\s+/) ?? [];
      expect(rel).toEqual(expect.arrayContaining(["noopener", "noreferrer"]));
    });

    it("tells a screen reader the link opens a new tab", () => {
      // A new tab with no warning strands a screen reader user whose back
      // button suddenly does nothing.
      render(<Maple />);
      const link = screen.getByRole("link");
      expect(link).toHaveAccessibleName("Visit Maple Technologies (opens in a new tab)");
      const note = within(link).getByText("(opens in a new tab)");
      expect(note).toHaveClass("visually-hidden");
    });

    it("is the only interactive element in the section", () => {
      render(<Maple />);
      expect(screen.getAllByRole("link")).toHaveLength(1);
      expect(screen.queryAllByRole("button")).toHaveLength(0);
    });
  });

  describe("logo", () => {
    it("names the company in its alt text", () => {
      render(<Maple />);
      const logo = screen.getByRole("img", { name: "Maple Technologies" });
      expect(logo).toHaveAttribute("alt", "Maple Technologies");
    });

    it("serves the supplied SVG", () => {
      render(<Maple />);
      const logo = screen.getByRole("img", { name: "Maple Technologies" });
      expect(logo.getAttribute("src")).toContain("mapleLogo.svg");
    });

    it("reserves the SVG's own aspect ratio, so it cannot shift the layout", () => {
      // 10261 x 3654 is the file's viewBox. A ratio that drifts from it
      // either letterboxes the mark or moves the Hardware section on load,
      // against the project's CLS < 0.05.
      render(<Maple />);
      const logo = screen.getByRole("img", { name: "Maple Technologies" });
      expect(logo).toHaveAttribute("width", "10261");
      expect(logo).toHaveAttribute("height", "3654");
    });
  });

  describe("claims", () => {
    it("states only the relationship and the licence the repo already evidences", () => {
      render(<Maple />);
      const text = screen.getByRole("region").textContent ?? "";
      expect(text).toMatch(/SIRA-licensed/);
      expect(text).toMatch(/Dubai/);
    });

    it("quotes no figure (years, clients, installations) without a source", () => {
      // AGENTS.md: the founding year is a placeholder and no volume claim is
      // evidenced. Any digit in this copy is a claim that needs one first.
      render(<Maple />);
      const text = screen.getByRole("region").textContent ?? "";
      expect(text).not.toMatch(/\d/);
    });

    it("names no unconfirmed partner", () => {
      // TIS and Fibaro are unconfirmed; no copy may reference them.
      render(<Maple />);
      const text = screen.getByRole("region").textContent ?? "";
      expect(text).not.toMatch(/TIS|Fibaro/i);
    });

    it("uses no em dashes and no exclamation marks", () => {
      // The site-wide copy rule and the tone rule, asserted before a build.
      const { container } = render(<Maple />);
      expect(container.textContent).not.toMatch(/—/);
      expect(container.textContent).not.toMatch(/!/);
    });
  });
});
