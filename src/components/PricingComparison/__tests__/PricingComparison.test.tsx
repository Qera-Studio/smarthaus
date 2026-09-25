import { render, screen } from "@testing-library/react";

import { PricingComparison } from "../PricingComparison";
import { COMPARISON, PRICING_TIERS } from "../../../content/pricing";

/**
 * What the markup promises that the stylesheet cannot: every section starts
 * open, every description starts closed, and each cell names its column for a
 * screen reader because there is no <table> to do it.
 *
 * Appearance is not asserted; jsdom applies no CSS Modules.
 */
describe("PricingComparison", () => {
  it("opens every section and closes every description by default", () => {
    const { container } = render(<PricingComparison />);

    const sections = container.querySelectorAll("details:not(details details)");
    expect(sections).toHaveLength(COMPARISON.length);
    for (const s of sections) expect(s).toHaveAttribute("open");

    const rows = container.querySelectorAll("details details");
    expect(rows).toHaveLength(COMPARISON.reduce((n, s) => n + s.rows.length, 0));
    for (const r of rows) expect(r).not.toHaveAttribute("open");
  });

  it("renders every section title and every feature with its description", () => {
    render(<PricingComparison />);
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
   * reader which tier a tick belongs to is the hidden label in the cell.
   */
  it("names the tier in every cell so a mark reads as a sentence", () => {
    const { container } = render(<PricingComparison />);
    const text = container.textContent ?? "";
    for (const tier of PRICING_TIERS) {
      expect(text).toContain(`${tier.name}: Included`);
    }
    expect(text).toContain("Essential: Not included");
  });

  it("draws the not-included mark without a dash character", () => {
    const { container } = render(<PricingComparison />);
    const text = container.textContent ?? "";
    // Em and en dash. Hyphens are legitimate in feature names (Multi-room).
    expect(text).not.toMatch(/[—–]/);
  });

  it("titles the comparison with an h2 and names the scroll region", () => {
    render(<PricingComparison />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Compare all features" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /feature comparison/i })).toHaveAttribute(
      "tabindex",
      "0",
    );
  });

  it("emits no structured data while the figures are unconfirmed", () => {
    const { container } = render(<PricingComparison />);
    expect(container.querySelector('script[type="application/ld+json"]')).toBeNull();
  });
});
