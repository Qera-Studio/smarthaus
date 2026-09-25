import { COMPARISON, PRICING_TIERS } from "../pricing";

/**
 * The comparison is read POSITIONALLY: `values[2]` is the Connected column
 * because Connected is the third tier. A row with three values renders a
 * missing cell and a row with five renders one into a column that does not
 * exist, and neither is a type error. Same shape of risk as the process rail's
 * image slots. These are the invariants that fail quietly.
 */

/** Every visible string in the module, for the copy guards. */
function allCopy(): string[] {
  const out: string[] = [];
  for (const tier of PRICING_TIERS) {
    out.push(tier.name, tier.price, tier.description, ...tier.includes);
  }
  for (const section of COMPARISON) {
    out.push(section.title);
    for (const row of section.rows) {
      out.push(row.feature, row.description);
      for (const value of row.values) if (typeof value === "string") out.push(value);
    }
  }
  return out;
}

describe("pricing tiers", () => {
  it("has four tiers with unique ids, in ascending order", () => {
    expect(PRICING_TIERS.map((t) => t.name)).toEqual([
      "Essential",
      "Smart",
      "Connected",
      "Signature",
    ]);
    const ids = PRICING_TIERS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every tier a price in the printed form and a non-empty list", () => {
    for (const tier of PRICING_TIERS) {
      expect(tier.price).toMatch(/^AED [\d,]+\+$/);
      expect(tier.includes.length).toBeGreaterThan(0);
    }
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
