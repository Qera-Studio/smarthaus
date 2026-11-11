import { screen, within } from "@testing-library/react";

import { HOME_PAGE } from "../../../../sanity/seed/home-page";
import { Stats } from "../Stats";
import { renderServer } from "../../../__tests__/helpers/server";

const STATS = HOME_PAGE.stats.items;

/**
 * "By the numbers" makes four claims about Smarthaus's own record, so it sits
 * under the AGENTS.md claims audit. What fails silently: a figure dropped or
 * reordered, a label that no longer reads with its number, and a superlative
 * or "trusted by" slipping in beside the figures.
 */

const items = () => within(screen.getByRole("list")).getAllByRole("listitem");

// jsdom has no IntersectionObserver or matchMedia, which RollingFigures reads;
// its behaviour is tested in RollingFigures.test.tsx.
beforeAll(async () => {
  Object.defineProperty(window, "IntersectionObserver", {
    configurable: true,
    value: class {
      observe() {}
      disconnect() {}
    },
  });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({ matches: false }),
  });
});

describe("Stats", () => {
  it("is a region named by its h2", async () => {
    await renderServer(<Stats />);
    const region = screen.getByRole("region", { name: "By the numbers" });
    expect(region.tagName).toBe("SECTION");
    expect(region).toHaveAttribute("data-stats");
    expect(within(region).getByRole("heading", { level: 2 })).toHaveTextContent("By the numbers");
  });

  it("lists every figure once, in order", async () => {
    await renderServer(<Stats />);
    expect(items()).toHaveLength(STATS.length);
    items().forEach((item, index) => {
      const stat = STATS[index]!;
      expect(item).toHaveTextContent(`${stat.value} ${stat.label}`);
    });
  });

  it("reads each figure number first, as a sentence", async () => {
    // The space between the two spans is what keeps a screen reader from
    // running "150+Residential" together.
    await renderServer(<Stats />);
    expect(items()[0]!.textContent).toBe("150+ Residential clients served");
  });

  it("adds no heading inside the cards", async () => {
    await renderServer(<Stats />);
    expect(screen.getAllByRole("heading")).toHaveLength(1);
  });
});

describe("STATS content", () => {
  it("carries the four figures Shivanshu confirmed on 2026-10-07", async () => {
    expect(STATS).toEqual([
      { value: "150+", label: "Residential clients served" },
      { value: "200+", label: "Homes fitted in residential deals" },
      { value: "350+", label: "Systems installed in all segments" },
      { value: "90%", label: "Contract renewal rate for annual maintenance packages" },
    ]);
  });

  it("keeps every value a bare figure", async () => {
    for (const { value } of STATS) expect(value).toMatch(/^\d+(\+|%)$/);
  });

  it("keeps labels unique, since each is the list key", async () => {
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
