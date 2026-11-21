import { screen } from "@testing-library/react";

import { PricingComparison } from "../PricingComparison";
import { PRICING_PAGE } from "../../../../sanity/seed/pricing-page";
import { renderServer } from "../../../__tests__/helpers/server";

const COMPARISON = PRICING_PAGE.comparison;
const PRICING_TIERS = PRICING_PAGE.tiers;

/**
 * What the markup promises that the stylesheet cannot: every section starts
 * open, every description starts closed, and each cell names its column for a
 * screen reader because there is no <table> to do it.
 *
 * Appearance is not asserted; jsdom applies no CSS Modules.
 */
describe("PricingComparison", () => {
  it("opens every section and closes every description by default", async () => {
    const { container } = await renderServer(<PricingComparison />);

    const sections = container.querySelectorAll("details:not(details details)");
    expect(sections).toHaveLength(COMPARISON.length);
    for (const s of sections) expect(s).toHaveAttribute("open");

    const rows = container.querySelectorAll("details details");
    expect(rows).toHaveLength(COMPARISON.reduce((n, s) => n + s.rows.length, 0));
    for (const r of rows) expect(r).not.toHaveAttribute("open");
  });

  it("renders every section title and every feature with its description", async () => {
    await renderServer(<PricingComparison />);
    for (const section of COMPARISON) {
      expect(screen.getByRole("heading", { level: 3, name: section.title })).toBeInTheDocument();
      for (const row of section.rows) {
        expect(screen.getByText(row.feature)).toBeInTheDocument();
        expect(screen.getByText(row.description)).toBeInTheDocument();
      }
    }
  });

  /**
   * The load-bearing one. With no <table>, the only thing that tells a screen
   * reader which package a count or a tick belongs to is the hidden label in
   * the cell.
   */
  it("names the package in every cell so a count or a mark reads as a sentence", async () => {
    const { container } = await renderServer(<PricingComparison />);
    const text = container.textContent ?? "";
    for (const tier of PRICING_TIERS) {
      expect(text).toContain(`${tier.name}: Included`);
    }
    expect(text).toContain("Starter: Not included");
    // The deck's counts: lighting keypads, then CCTV cameras, by package.
    expect(text).toContain("Starter: 3Aura: 6Elevate: 13Luxe: 20");
    expect(text).toContain("Starter: 1Aura: 1Elevate: 1Luxe: 4");
  });

  it("gives every cell of a row one package, in the cards' order", async () => {
    const { container } = await renderServer(<PricingComparison />);
    const cells = [...container.querySelectorAll(".visually-hidden")].map((el) => el.textContent);
    const rows = COMPARISON.flatMap((section) => section.rows);
    expect(cells).toHaveLength(rows.length * PRICING_TIERS.length);
    cells.forEach((cell, i) => {
      expect(cell).toMatch(new RegExp(`^${PRICING_TIERS[i % PRICING_TIERS.length]!.name}: `));
    });
  });

  it("draws the not-included mark without a dash character", async () => {
    const { container } = await renderServer(<PricingComparison />);
    const text = container.textContent ?? "";
    // Em and en dash. Hyphens are legitimate in feature names (Multi-room).
    expect(text).not.toMatch(/[—–]/);
  });

  it("titles the comparison with an h2 and names the scroll region", async () => {
    await renderServer(<PricingComparison />);
    expect(
      screen.getByRole("heading", { level: 2, name: "What each package includes" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /feature comparison/i })).toHaveAttribute(
      "tabindex",
      "0",
    );
  });

  it("emits no structured data for the packages", async () => {
    const { container } = await renderServer(<PricingComparison />);
    expect(container.querySelector('script[type="application/ld+json"]')).toBeNull();
  });
});
