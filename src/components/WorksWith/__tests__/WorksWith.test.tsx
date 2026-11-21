import { screen, within } from "@testing-library/react";

import { SITE_SETTINGS } from "../../../../sanity/seed/site-settings";
import { SOLUTION_PAGES } from "../../../../sanity/seed/solutions";
import { stubBrowser } from "../../../__tests__/helpers/browser";
import { renderServer } from "../../../__tests__/helpers/server";
import { getDoc } from "../../../sanity/fetch";
import { SOLUTION_IDS } from "../../../sanity/schema/solution";
import { lowerFirst, pairsSentence, WorksWith } from "../WorksWith";

/**
 * "Works with" on every solution page (Shivanshu, 2026-11-16), from the seed.
 * What it gathers is what can go wrong: the page's own copy, the menu's names,
 * only the pairs drawn and in the page's order, each in its row, and the
 * plain-text list a screen reader gets.
 */

const mockedGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const label = (id: string) => SITE_SETTINGS.solutionsMenu.items.find((i) => i.id === id)!.label;

beforeEach(() => {
  stubBrowser();
});

afterEach(() => {
  const actual =
    jest.requireActual<typeof import("../../../../sanity/seed")>("../../../../sanity/seed");
  mockedGetDoc.mockImplementation(async (id: string) => actual.seedDoc(id) as never);
});

const draw = (slug: string) => renderServer(<WorksWith slug={slug} />);
const section = () => screen.getByRole("region", { name: /./ });

describe.each(Object.entries(SOLUTION_PAGES))("WorksWith on %s", (slug, page) => {
  const { worksWith } = page;
  const paired = worksWith.pairs.map((p) => p.with);

  it("is a section named by its h2, with the line under it from the page's document", async () => {
    await draw(slug);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent(worksWith.heading);
    expect(section()).toHaveAttribute("aria-labelledby", heading.id);
    expect(heading.nextElementSibling).toHaveTextContent(worksWith.subtext);
  });

  // Shivanshu, 2026-11-16: the "Works with" label above the heading is gone.
  it("puts nothing above its heading", async () => {
    await draw(slug);
    expect(screen.getByRole("heading", { level: 2 }).previousElementSibling).toBeNull();
  });

  it("is a dark ground, which brings the light focus ring and cursor with it", async () => {
    await draw(slug);
    expect(section()).toHaveAttribute("data-ground", "dark");
  });

  it("gives the middle its own card: its line and what it pairs with, not the heading again", async () => {
    await draw(slug);
    const card = section().querySelector(`[data-panel="${slug}"]`)!;
    expect(card.querySelector("h3")).toHaveTextContent(worksWith.line);
    expect(card).toHaveTextContent(pairsSentence(paired.map(label)));
    expect(card).not.toHaveTextContent(worksWith.heading);
    expect(card).not.toHaveTextContent(worksWith.subtext);
  });

  it("puts the page's own solution in the middle, by its name in the menu", async () => {
    await draw(slug);
    const centre = section().querySelector("[data-node]")!;
    expect(centre).toHaveTextContent(label(slug));
    expect(centre.querySelector("[data-icon]")).toHaveAttribute("data-icon", slug);
  });

  // Shivanshu, 2026-11-16: only the connected ones.
  it("draws only the solutions it pairs with, in the page's order, by their names in the menu", async () => {
    await draw(slug);
    const tabs = Array.from(section().querySelectorAll("li [data-node]"));
    expect(tabs.map((n) => n.textContent)).toEqual(paired.map(label));
    const icons = Array.from(section().querySelectorAll("[data-icon]"));
    expect(icons.map((icon) => icon.getAttribute("data-icon"))).toEqual([slug, ...paired]);
  });

  it("names no other solution anywhere in the diagram or the panel", async () => {
    await draw(slug);
    const others = SOLUTION_IDS.filter((id) => id !== slug && !paired.includes(id));
    for (const id of others) {
      expect(section().querySelector(`[data-panel="${id}"]`)).toBeNull();
      expect(section().querySelector(`a[href="/solutions/${id}"]`)).toBeNull();
    }
  });

  it("sets its three tabs in the column's three rows, each wire with its tab", async () => {
    await draw(slug);
    const rows = ["top", "middle", "bottom"].slice(0, paired.length);
    const places = Array.from(section().querySelectorAll("li [data-node]")).map(
      (n) => n.parentElement!,
    );
    expect(places.map((li) => li.getAttribute("data-slot"))).toEqual(rows);
    const wires = Array.from(section().querySelectorAll("[aria-hidden='true'] > [data-slot]"));
    expect(wires.map((w) => w.getAttribute("data-slot"))).toEqual(rows);
  });

  it("opens on its first pair", async () => {
    await draw(slug);
    const shown = section().querySelector("[data-shown]")!;
    expect(shown).toHaveAttribute("data-panel", paired[0]);
    expect(within(shown as HTMLElement).getByRole("heading", { level: 3 })).toHaveTextContent(
      worksWith.pairs[0]!.title,
    );
  });

  it("links every pair to that solution's own page", async () => {
    await draw(slug);
    for (const id of paired) {
      const panel = section().querySelector(`[data-panel="${id}"]`)!;
      expect(panel.querySelector("a")).toHaveAttribute("href", `/solutions/${id}`);
    }
  });

  it("lists its pairs as plain text for a screen reader, hidden from sight", async () => {
    await draw(slug);
    const list = section().querySelector("ul.visually-hidden")!;
    const items = Array.from(list.querySelectorAll("li")).map((li) => li.textContent);
    expect(items).toEqual(
      worksWith.pairs.map(
        (p) =>
          `${label(p.with)}: ${p.title}. When ${lowerFirst(p.trigger)}, then ${lowerFirst(p.action)}. ${p.body}`,
      ),
    );
  });
});

describe("WorksWith", () => {
  it("fails the build when a solution has gone from the menu", async () => {
    const actual =
      jest.requireActual<typeof import("../../../../sanity/seed")>("../../../../sanity/seed");
    mockedGetDoc.mockImplementation(
      async (id: string) =>
        (id === "siteSettings"
          ? {
              ...SITE_SETTINGS,
              solutionsMenu: {
                ...SITE_SETTINGS.solutionsMenu,
                items: SITE_SETTINGS.solutionsMenu.items.filter((item) => item.id !== "garage"),
              },
            }
          : actual.seedDoc(id)) as never,
    );
    await expect(draw("cameras")).rejects.toThrow('Works with: no "garage" in the Solutions menu');
  });

  it("leaves out a pair with the page's own solution", async () => {
    const actual =
      jest.requireActual<typeof import("../../../../sanity/seed")>("../../../../sanity/seed");
    mockedGetDoc.mockImplementation(async (id: string) => {
      const doc = actual.seedDoc(id) as typeof SOLUTION_PAGES.cameras;
      if (id !== "solution-cameras") return doc as never;
      const pairs = [
        { ...doc!.worksWith.pairs[0]!, with: "cameras" },
        ...doc!.worksWith.pairs.slice(1),
      ];
      return { ...doc, worksWith: { ...doc!.worksWith, pairs } } as never;
    });
    await draw("cameras");
    expect(section().querySelectorAll("ul.visually-hidden li")).toHaveLength(2);
    expect(
      Array.from(section().querySelectorAll("li [data-node]")).map((n) => n.textContent),
    ).toEqual(["Garage", "Lighting"]);
    // Two left: the outer rows, so the drawing stays symmetrical.
    expect(
      Array.from(section().querySelectorAll("li[data-slot]")).map((li) =>
        li.getAttribute("data-slot"),
      ),
    ).toEqual(["top", "bottom"]);
  });
});

describe("pairsSentence", () => {
  it("names one pair, and asks for it to be picked", () => {
    expect(pairsSentence(["Smart lock"])).toBe(
      "Works with Smart lock, in the same app. Pick it to see what the two do together.",
    );
  });

  it("names two with and, and three with commas and and", () => {
    expect(pairsSentence(["Smart lock", "Garage"])).toBe(
      "Works with Smart lock and Garage, in the same app. Pick one to see what the two do together.",
    );
    expect(pairsSentence(["Smart lock", "Garage", "Lighting"])).toBe(
      "Works with Smart lock, Garage and Lighting, in the same app. Pick one to see what the two do together.",
    );
  });

  it("says nothing the claims audit would refuse", () => {
    const { claimProblem } =
      jest.requireActual<typeof import("../../../sanity/claims")>("../../../sanity/claims");
    expect(claimProblem(pairsSentence(["A", "B", "C"]))).toBeNull();
  });
});

describe("lowerFirst", () => {
  it("lowers a sentence's first letter, so it reads on after When or then", () => {
    expect(lowerFirst("Someone rings the door")).toBe("someone rings the door");
  });

  it("leaves an initialism, a number and a quotation as they are", () => {
    expect(lowerFirst("AC to sleep")).toBe("AC to sleep");
    expect(lowerFirst("7:00am on weekdays")).toBe("7:00am on weekdays");
    expect(lowerFirst("“Dinner” on the panel")).toBe("“Dinner” on the panel");
  });
});
