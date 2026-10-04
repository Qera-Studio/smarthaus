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
  it("opens on reassurance, not on a breakdown", () => {
    // The heading was "Friday, 9:14pm. The gate won't open." until 2026-10-02.
    // Shivanshu asked for something easing and direct: the section sells
    // being looked after, and leading with a failure frightened the reader it
    // was meant to settle.
    render(<Care />);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent("Looked after, long after installation.");
    expect(heading.textContent).not.toMatch(/won.t|broken|fail|\d+:\d+/i);
  });

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

  it("prints the confirmed six-hour response window plainly, with no pending note", () => {
    // Confirmed by Shivanshu on 2026-09-28. faq.ts "support-response" states
    // the same figure; the two move together.
    render(<Care />);
    expect(screen.getByText(/within 6 hours, seven days a week/)).toBeInTheDocument();
    expect(screen.queryByText(/to be confirmed/i)).toBeNull();
    expect(screen.queryByText(/pending/i)).toBeNull();
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
