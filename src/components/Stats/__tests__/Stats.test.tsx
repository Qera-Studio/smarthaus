import { render, screen, within } from "@testing-library/react";

import { STATS } from "../../../content/stats";
import { Stats } from "../Stats";

/**
 * "By the numbers" makes four claims about Smarthaus's own record, so it sits
 * under the AGENTS.md claims audit. What fails silently: a figure dropped or
 * reordered, a label that no longer reads with its number, and a superlative
 * or "trusted by" slipping in beside the figures.
 */

const items = () => within(screen.getByRole("list")).getAllByRole("listitem");

describe("Stats", () => {
  it("is a region named by its h2", () => {
    render(<Stats />);
    const region = screen.getByRole("region", { name: "By the numbers" });
    expect(region.tagName).toBe("SECTION");
    expect(region).toHaveAttribute("data-stats");
    expect(within(region).getByRole("heading", { level: 2 })).toHaveTextContent("By the numbers");
  });

  it("lists every figure once, in order", () => {
    render(<Stats />);
    expect(items()).toHaveLength(STATS.length);
    items().forEach((item, index) => {
      const stat = STATS[index]!;
      expect(item).toHaveTextContent(`${stat.value} ${stat.label}`);
    });
  });

  it("reads each figure number first, as a sentence", () => {
    // The space between the two spans is what keeps a screen reader from
    // running "150+Residential" together.
    render(<Stats />);
    expect(items()[0]!.textContent).toBe("150+ Residential clients served");
  });

  it("adds no heading inside the cards", () => {
    render(<Stats />);
    expect(screen.getAllByRole("heading")).toHaveLength(1);
  });
});

describe("STATS content", () => {
  it("carries the four figures Shivanshu confirmed on 2026-10-07", () => {
    expect(STATS).toEqual([
      { value: "150+", label: "Residential clients served" },
      { value: "200+", label: "Homes fitted in residential deals" },
      { value: "350+", label: "Systems installed in all segments" },
      { value: "90%", label: "Contract renewal rate for annual maintenance packages" },
    ]);
  });

  it("keeps every value a bare figure", () => {
    for (const { value } of STATS) expect(value).toMatch(/^\d+(\+|%)$/);
  });

  it("keeps labels unique, since each is the list key", () => {
    const labels = STATS.map((stat) => stat.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it.each([/trusted/i, /leading/i, /best/i, /years/i, /\bover\b/i, /—/])(
    "claims nothing beyond the figures (%s)",
    (pattern) => {
      for (const { label } of STATS) expect(label).not.toMatch(pattern);
    },
  );
});
