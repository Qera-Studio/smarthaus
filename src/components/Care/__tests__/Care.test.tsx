import { render, screen } from "@testing-library/react";

import { Care } from "../Care";

/**
 * The care packages carry prices and a support SLA, which makes them claims
 * under the AGENTS.md capability audit rather than ordinary copy. These are
 * the invariants that fail silently: two cards that say the same thing read as
 * unfinished, and an unconfirmed figure with no pending note is a placeholder
 * nobody is assigned to clear.
 */
describe("Care packages", () => {
  it("gives each package its own description", () => {
    // The section shipped with both cards carrying identical text, which read
    // as a copy placeholder and gave a reader no reason to choose Premium.
    render(<Care />);
    const descriptions = screen
      .getAllByRole("listitem")
      .map((li) => li.querySelector("p")?.textContent?.trim());

    expect(descriptions).toHaveLength(2);
    expect(descriptions[0]).not.toBe(descriptions[1]);
    expect(descriptions.every((d) => d && d.length > 0)).toBe(true);
  });

  it("marks the unconfirmed response window as pending", () => {
    // Same rule faq.ts is held to: a braced placeholder must be paired with a
    // note naming who confirms it. The window also lives in faq.ts
    // ("support-response") with the same brace — clear both together.
    render(<Care />);
    expect(screen.getByText(/to be confirmed with Sunil/i)).toBeInTheDocument();
  });

  it("renders no raw braces to the reader", () => {
    // The brace is a render-time marker, not content. One reaching the page is
    // a figure quoted back as "within {4} hours".
    const { container } = render(<Care />);
    expect(container.textContent).not.toMatch(/[{}]/);
  });

  it("uses no em dashes in the copy", () => {
    // The site-wide copy rule, asserted in the unit run rather than only in
    // e2e so it fails before a build.
    const { container } = render(<Care />);
    expect(container.textContent).not.toMatch(/—/);
  });
});
