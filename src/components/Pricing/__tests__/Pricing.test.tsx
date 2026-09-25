import { render, screen, within } from "@testing-library/react";

import { Pricing } from "../Pricing";

/**
 * Every price and feature line in this section is an unconfirmed claim printed
 * plainly, which makes the guards here narrower than usual but more important:
 * what is asserted is that the section stays a reading surface and does not
 * quietly become a machine-readable one.
 *
 * Appearance is not asserted — jsdom applies no CSS Modules, so a test that
 * checked the card grounds would pass against an empty stylesheet. The tone
 * attribute IS asserted, because it is the hook the stylesheet keys on and a
 * typo there fails silently in a way no visual test at this level would catch.
 */
describe("Pricing", () => {
  it("renders four tiers, each with its own name, price and description", () => {
    render(<Pricing />);

    const cards = screen.getAllByRole("listitem").filter((li) => li.dataset.tone);
    expect(cards).toHaveLength(4);

    const names = cards.map((c) => within(c).getByRole("heading", { level: 3 }).textContent);
    expect(names).toEqual(["Essential", "Smart", "Connected", "Signature"]);
    // Distinct, so a copy-paste in the data is caught rather than shipped.
    expect(new Set(names).size).toBe(4);

    for (const card of cards) {
      expect(card.textContent).toMatch(/AED [\d,]+\+/);
    }
  });

  it("gives every tier a non-empty feature list and a route to the form", () => {
    render(<Pricing />);

    const cards = screen.getAllByRole("listitem").filter((li) => li.dataset.tone);

    for (const card of cards) {
      const features = within(card).getAllByRole("listitem");
      expect(features.length).toBeGreaterThan(0);
      expect(features.every((f) => (f.textContent ?? "").trim().length > 0)).toBe(true);

      // The enquiry is the only conversion event on the site, so a tier that
      // does not reach it is a dead end rather than a styling problem.
      expect(within(card).getByRole("link", { name: "Get started" })).toHaveAttribute(
        "href",
        "/contact",
      );
    }
  });

  /**
   * The load-bearing one.
   *
   * Every figure here came from a design reference rather than a package sheet.
   * Printing them for a human reader is a product decision; feeding them to an
   * answer engine as structured fact is not, and /faq withholds its FAQPage
   * schema for exactly this reason. Adding Offer or Product markup means
   * deliberately deleting this test, which is the point of it.
   */
  it("emits no structured data while the prices are unconfirmed", () => {
    const { container } = render(<Pricing />);
    expect(container.querySelector('script[type="application/ld+json"]')).toBeNull();
  });

  it("marks each card with the tone its stylesheet keys on", () => {
    render(<Pricing />);

    const tones = screen
      .getAllByRole("listitem")
      .filter((li) => li.dataset.tone)
      .map((li) => li.dataset.tone);

    expect(tones).toEqual(["sand", "sand", "image", "dark"]);
  });

  /**
   * data-ground marks a dark-painted box so globals.scss can invert the cursor
   * and ScrollToTop can pick its own colour. It inherits, so claiming it on the
   * section would say the light canvas and the two sand cards are dark ground.
   *
   * The section sits on the page's own light ground: only the Signature card
   * paints dark.
   */
  it("claims dark ground only on the one card that paints dark", () => {
    const { container } = render(<Pricing />);

    expect(container.querySelector("section")).not.toHaveAttribute("data-ground");

    const dark = container.querySelectorAll('[data-ground="dark"]');
    expect(dark).toHaveLength(1);
    expect(dark[0]).toHaveAttribute("data-tone", "dark");
  });

  it("renders no raw braces to the reader", () => {
    const { container } = render(<Pricing />);
    expect(container.textContent).not.toMatch(/[{}]/);
  });

  it("uses no em dashes in the copy", () => {
    const { container } = render(<Pricing />);
    expect(container.textContent).not.toMatch(/—/);
  });
});
