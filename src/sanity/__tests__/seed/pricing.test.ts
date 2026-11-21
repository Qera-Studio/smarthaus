import { cardLine, PRICING_PAGE } from "../../../../sanity/seed/pricing-page";

const { comparison: COMPARISON, faqs: PRICING_FAQS, tiers: PRICING_TIERS } = PRICING_PAGE;

/**
 * Every package, device count and price is the package deck's, the source
 * Shivanshu named for them on 2026-11-19. The deck is pinned here line by line,
 * so a change to a package is a change to this file as well.
 *
 * The comparison is read POSITIONALLY: `values[2]` is the Elevate column
 * because Elevate is the third package. A row with three values renders a
 * missing cell and a row with five renders one into a column that does not
 * exist, and neither is a type error. Same shape of risk as the process rail's
 * image slots. These are the invariants that fail quietly.
 */

/** Every visible string in the module, for the copy guards. */
function allCopy(): string[] {
  const out: string[] = [];
  for (const tier of PRICING_TIERS) {
    out.push(tier.name, tier.tagline, tier.description, ...tier.includes);
  }
  for (const section of COMPARISON) {
    out.push(section.title);
    for (const row of section.rows) {
      out.push(row.feature, row.description);
      for (const value of row.values) if (value.note) out.push(value.note);
    }
  }
  for (const faq of PRICING_FAQS) out.push(faq.question, ...faq.answer);
  out.push(PRICING_PAGE.title, PRICING_PAGE.standfirst, ...PRICING_PAGE.notes);
  return out;
}

/** The deck's device counts by row id: Starter, Aura, Elevate, Luxe. */
const DECK: Record<string, [number, number, number, number]> = {
  "lighting-keypads": [3, 6, 13, 20],
  "colour-lighting": [0, 2, 4, 3],
  "ac-thermostats": [2, 3, 4, 6],
  curtains: [2, 3, 5, 7],
  "roller-shutters": [0, 0, 0, 2],
  "flood-sensors": [2, 3, 4, 5],
  "smoke-sensors": [0, 2, 3, 5],
  "co-sensors": [0, 0, 3, 3],
  "door-window-sensors": [2, 3, 4, 5],
  "motion-sensors": [0, 0, 0, 3],
  "smart-lock": [1, 1, 1, 1],
  cctv: [1, 1, 1, 4],
  yubii: [1, 1, 1, 1],
  "home-center": [0, 0, 1, 1],
  "key-fob": [0, 0, 0, 1],
  "smart-plugs": [0, 0, 0, 5],
};

const rows = () => COMPARISON.flatMap((section) => section.rows);
const row = (id: string) => rows().find((r) => r.id === id)!;

describe("pricing tiers", () => {
  it("has the deck's four packages, with unique ids, in ascending order", () => {
    expect(PRICING_TIERS.map((t) => t.name)).toEqual(["Starter", "Aura", "Elevate", "Luxe"]);
    expect(PRICING_TIERS.map((t) => t.tagline)).toEqual([
      "Smart essentials",
      "Smart comfort",
      "Smart prestige",
      "Smart signature",
    ]);
    const ids = PRICING_TIERS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("sizes each package by the deck's home: one living room and one to four bedrooms", () => {
    expect(PRICING_TIERS.map((t) => t.description)).toEqual([
      "One living room and one bedroom.",
      "One living room and two bedrooms.",
      "One living room and three bedrooms.",
      "One living room and four bedrooms.",
    ]);
  });

  /**
   * Shown from 2026-11-19 (Shivanshu), which reversed "no prices" of
   * 2026-11-04. The dataset is public, so these are published wherever stored.
   */
  it("carries the deck's starting prices, in AED, rising with the home", () => {
    expect(PRICING_TIERS.map((t) => t.price)).toEqual([16000, 25000, 42000, 68000]);
    expect(PRICING_PAGE.priceLabel).toBe("Starting from");
  });

  it("lists on each card exactly the devices the table gives it, then installation", () => {
    PRICING_TIERS.forEach((tier, i) => {
      const expected = rows()
        .filter((r) => r.id !== "installation" && r.values[i]!.included)
        .map((r) => r.values[i]!.note);
      const counts = tier.includes.slice(0, -1).map((line) => line.match(/^(\d+) /)?.[1] ?? "1");
      expect({ tier: tier.id, counts }).toEqual({ tier: tier.id, counts: expected });
      expect(tier.includes.at(-1)).toBe("Installation and configuration");
    });
  });

  it("matches the deck's line count for every package", () => {
    // Starter 9, Aura 11, Elevate 13, Luxe 17: each the deck's own rows.
    expect(PRICING_TIERS.map((t) => t.includes.length)).toEqual([9, 11, 13, 17]);
  });

  it("sends every package to a site visit, the deck's own call to action", () => {
    expect(PRICING_PAGE.tierCta).toBe("Book a site visit");
  });
});

describe("cardLine", () => {
  const device = { id: "x", feature: "X", description: "x", counts: [1, 1, 1, 1] as const };

  it("counts a device, singular for one and plural for more", () => {
    const keypad = { ...device, one: "lighting keypad", many: "lighting keypads" };
    expect(cardLine(keypad, 1)).toBe("1 lighting keypad");
    expect(cardLine(keypad, 13)).toBe("13 lighting keypads");
  });

  it("names a device with no plural alone, without a count", () => {
    expect(cardLine({ ...device, one: "Yubii home controller" }, 1)).toBe("Yubii home controller");
  });
});

describe("the device table", () => {
  it("holds every device count in the deck, and no device the deck lacks", () => {
    const table = Object.fromEntries(
      rows()
        .filter((r) => r.id !== "installation")
        .map((r) => [r.id, r.values.map((v) => (v.included ? Number(v.note) : 0))]),
    );
    expect(table).toEqual(DECK);
  });

  it("ticks installation and configuration in every package", () => {
    expect(row("installation").values).toEqual([
      { included: true },
      { included: true },
      { included: true },
      { included: true },
    ]);
  });

  it("names the makers the deck names, confirmed on 2026-11-19", () => {
    const text = rows()
      .map((r) => r.description)
      .join(" ");
    for (const maker of ["Apex", "NICE", "Fibaro", "Akubela", "Dahua"]) {
      expect(text).toContain(maker);
    }
    expect(row("yubii").feature).toBe("Yubii home controller");
  });

  it("offers both switch finishes on the keypads and thermostats", () => {
    for (const id of ["lighting-keypads", "ac-thermostats"]) {
      expect(row(id).description).toContain("crystal glass or classic metal");
    }
  });

  it("words smoke and CO sensors as alerts, never as fire protection", () => {
    expect(row("smoke-sensors").description).toContain(
      "alongside a home's fire alarm, not in place of it",
    );
    for (const id of ["smoke-sensors", "co-sensors"]) {
      expect(row(id).description).toMatch(/alert/);
      expect(row(id).description).not.toMatch(/protect|early warning|fire safety|compliant/i);
    }
  });
});

describe("package notes", () => {
  it("carries the deck's seven notes, in its order", () => {
    expect(PRICING_PAGE.notes).toHaveLength(7);
    expect(PRICING_PAGE.notes[1]).toMatch(/site survey/);
    expect(PRICING_PAGE.notes.at(-1)).toMatch(/quoted separately/);
  });
});

describe("pricing faqs", () => {
  it("has a handful of questions with unique ids and non-empty answers", () => {
    expect(PRICING_FAQS.length).toBeGreaterThanOrEqual(4);
    expect(PRICING_FAQS.length).toBeLessThanOrEqual(8);
    const ids = PRICING_FAQS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const faq of PRICING_FAQS) {
      expect(faq.question.trim()).not.toBe("");
      expect(faq.answer.length).toBeGreaterThan(0);
      expect(faq.answer.every((a) => a.trim() !== "")).toBe(true);
    }
  });

  /** The prices are on the cards; an answer that repeated one would drift. */
  it("quotes no figure in any answer", () => {
    for (const faq of PRICING_FAQS) {
      expect(faq.answer.join(" ")).not.toMatch(/AED|\d,\d{3}/);
    }
  });

  it("says the visit is free, and never that it is paid", () => {
    const text = PRICING_FAQS.flatMap((faq) => faq.answer).join(" ");
    expect(text).toContain("you owe nothing");
    expect(text).not.toMatch(/paid visit|credited in full/);
  });
});

describe("pricing comparison", () => {
  it("gives every row exactly one value per tier", () => {
    // Collected rather than asserted in the loop, so a failure names every
    // offending row at once instead of stopping at the first.
    const wrong = COMPARISON.flatMap((section) =>
      section.rows
        .filter((row) => row.values.length !== PRICING_TIERS.length)
        .map((row) => `${section.id}/${row.id}`),
    );
    expect(wrong).toEqual([]);
  });

  it("keeps every section and row id unique across the whole table", () => {
    const sectionIds = COMPARISON.map((s) => s.id);
    expect(new Set(sectionIds).size).toBe(sectionIds.length);

    // Across sections, not within: the row id is a key in one flat DOM.
    const rowIds = COMPARISON.flatMap((s) => s.rows.map((r) => r.id));
    expect(new Set(rowIds).size).toBe(rowIds.length);
  });

  it("gives every row a feature and a description", () => {
    for (const section of COMPARISON) {
      expect(section.rows.length).toBeGreaterThan(0);
      for (const row of section.rows) {
        expect(row.feature.trim()).not.toBe("");
        expect(row.description.trim()).not.toBe("");
      }
    }
  });

  it("uses no em dashes and no braces anywhere in the copy", () => {
    for (const text of allCopy()) {
      expect(text).not.toMatch(/—/);
      // Braces are the placeholder marker's syntax. None of this content is
      // braced, by decision: it prints plainly.
      expect(text).not.toMatch(/[{}]/);
    }
  });
});
