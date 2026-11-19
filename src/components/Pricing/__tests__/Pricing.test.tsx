import { screen, within } from "@testing-library/react";

import { Pricing } from "../Pricing";
import { formatPrice } from "../../PricingTiers/PricingTiers";
import { PRICING_PAGE } from "../../../../sanity/seed/pricing-page";
import { renderServer } from "../../../__tests__/helpers/server";

/**
 * Every package, device count and price here is the package deck's (Shivanshu,
 * 2026-11-19). What is asserted is that the cards print the deck as it is,
 * and that the section stays a reading surface rather than quietly becoming a
 * machine-readable one.
 *
 * Appearance is not asserted — jsdom applies no CSS Modules, so a test that
 * checked the card grounds would pass against an empty stylesheet. The tone
 * attribute IS asserted, because it is the hook the stylesheet keys on and a
 * typo there fails silently in a way no visual test at this level would catch.
 */
describe("Pricing", () => {
  it("renders the deck's four packages, each with its line and its home", async () => {
    await renderServer(<Pricing />);

    const cards = screen.getAllByRole("listitem").filter((li) => li.dataset.tone);
    expect(cards).toHaveLength(4);

    const names = cards.map((c) => within(c).getByRole("heading", { level: 3 }).textContent);
    expect(names).toEqual(["Starter", "Aura", "Elevate", "Luxe"]);
    // Distinct, so a copy-paste in the data is caught rather than shipped.
    expect(new Set(names).size).toBe(4);

    cards.forEach((card, i) => {
      const tier = PRICING_PAGE.tiers[i]!;
      expect(within(card).getByText(tier.tagline)).toBeInTheDocument();
      expect(within(card).getByText(tier.description)).toBeInTheDocument();
    });
  });

  /**
   * Shown from 2026-11-19 (Shivanshu); until then the site disclosed none
   * (2026-11-04). Starting prices, so each says so before its figure.
   */
  it("prints each package's starting price, as the deck does", async () => {
    await renderServer(<Pricing />);
    const cards = screen.getAllByRole("listitem").filter((li) => li.dataset.tone);
    // \s also matches the no-break space Intl puts after the currency code.
    const prices = cards.map((card) =>
      within(card).getByText("Starting from").parentElement?.textContent?.replace(/\s/g, " "),
    );
    expect(prices).toEqual([
      "Starting from AED 16,000",
      "Starting from AED 25,000",
      "Starting from AED 42,000",
      "Starting from AED 68,000",
    ]);
  });

  it("formats a price as whole dirhams with grouping, never with fils", () => {
    expect(formatPrice(16000)).toMatch(/^AED\s16,000$/);
    expect(formatPrice(68000.4)).toMatch(/^AED\s68,000$/);
  });

  it("gives every tier a non-empty feature list and a route to the form", async () => {
    await renderServer(<Pricing />);

    const cards = screen.getAllByRole("listitem").filter((li) => li.dataset.tone);

    for (const card of cards) {
      const features = within(card).getAllByRole("listitem");
      expect(features.length).toBeGreaterThan(0);
      expect(features.every((f) => (f.textContent ?? "").trim().length > 0)).toBe(true);

      // The enquiry is the only conversion event on the site, so a tier that
      // does not reach it is a dead end rather than a styling problem.
      expect(within(card).getByRole("link", { name: "Book a site visit" })).toHaveAttribute(
        "href",
        "/contact",
      );
    }
  });

  /**
   * The load-bearing one.
   *
   * A starting price is not an offer: the final price follows the site survey.
   * Printing it for a human reader is a product decision; feeding it to an
   * answer engine as an Offer it would quote as the price is not. Adding Offer
   * or Product markup means deliberately deleting this test, which is the
   * point of it.
   */
  it("emits no structured data for the starting prices", async () => {
    const { container } = await renderServer(<Pricing />);
    expect(container.querySelector('script[type="application/ld+json"]')).toBeNull();
  });

  it("marks each card with the tone its stylesheet keys on", async () => {
    await renderServer(<Pricing />);

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
   * The section sits on the page's own light ground: only the Luxe card
   * paints dark.
   */
  it("claims dark ground only on the one card that paints dark", async () => {
    const { container } = await renderServer(<Pricing />);

    expect(container.querySelector("section")).not.toHaveAttribute("data-ground");

    const dark = container.querySelectorAll('[data-ground="dark"]');
    expect(dark).toHaveLength(1);
    expect(dark[0]).toHaveAttribute("data-tone", "dark");
  });

  it("renders no raw braces to the reader", async () => {
    const { container } = await renderServer(<Pricing />);
    expect(container.textContent).not.toMatch(/[{}]/);
  });

  it("uses no em dashes in the copy", async () => {
    const { container } = await renderServer(<Pricing />);
    expect(container.textContent).not.toMatch(/—/);
  });
});
