/**
 * @jest-environment node
 */
import { FIXED_DOCUMENTS } from "../schema";
import { maxChars, type SchemaField } from "../schema/primitives";
import {
  ACTION_CHARS,
  MAX_PAIRS,
  pairsRule,
  SOLUTION_IDS,
  solutionPage,
  TRIGGER_CHARS,
} from "../schema/solution";
import { WORKS_WITH } from "../../../sanity/seed/works-with";

/**
 * The "Works with" section's content (Shivanshu, 2026-11-16), as editors
 * fill it. What the Studio has to hold: a pair with a solution that exists,
 * never the page's own and never twice, at most three, and chips short
 * enough for their box.
 */

const field = (from: { fields?: SchemaField[] }, name: string): SchemaField => {
  const found = from.fields?.find((f) => f.name === name);
  if (!found) throw new Error(`no field "${name}"`);
  return found;
};

/** Which rule methods a field's validation calls, with their arguments. */
function rules(target: SchemaField): [string, unknown[]][] {
  const called: [string, unknown[]][] = [];
  const rule: unknown = new Proxy(
    {},
    {
      get:
        (_t, prop: string) =>
        (...args: unknown[]) => {
          called.push([prop, args]);
          return rule;
        },
    },
  );
  target.validation?.(rule as never);
  return called;
}

/** The custom check a field's validation hands the Studio. */
function custom(target: SchemaField) {
  const found = rules(target).find(([name]) => name === "custom");
  if (!found) throw new Error(`${target.name} has no custom rule`);
  return found[1][0] as (value: unknown, context?: unknown) => true | string;
}

const worksWith = field(solutionPage, "worksWith");
const pairs = field(worksWith, "pairs");
const pair = pairs.of![0] as SchemaField;

describe("the solutions a pair can name", () => {
  it("are every solution with a page, and nothing else", () => {
    expect([...SOLUTION_IDS].sort()).toEqual(
      Object.keys(FIXED_DOCUMENTS.solutionPage)
        .map((id) => id.replace(/^solution-/, ""))
        .sort(),
    );
  });
});

describe("the Works with group", () => {
  // Shivanshu, 2026-11-16: no label above the heading, and only the pairs
  // drawn, so no line for the solutions that are not.
  it("holds, in order, the heading, the line under it, this solution's own line, and the pairs", () => {
    expect(worksWith.type).toBe("object");
    expect(worksWith.fields!.map((f) => f.name)).toEqual(["heading", "subtext", "line", "pairs"]);
  });

  it("is copy for an editor, in both languages, every field of it", () => {
    for (const name of ["heading", "line"]) {
      expect(field(worksWith, name).type).toBe("localeString");
    }
    expect(field(worksWith, "subtext").type).toBe("localeText");
  });

  it("is required: the section has nothing to draw without it", () => {
    expect(rules(worksWith).map(([name]) => name)).toContain("required");
  });

  it(`takes one to ${MAX_PAIRS} pairs, and checks them as a set`, () => {
    const called = rules(pairs);
    expect(called).toContainEqual(["min", [1]]);
    expect(called).toContainEqual(["max", [MAX_PAIRS]]);
    expect(custom(pairs)).toBe(pairsRule);
  });

  describe("a pair", () => {
    it("names the other solution from the list, and says what happens", () => {
      expect(pair.fields!.map((f) => f.name)).toEqual([
        "with",
        "title",
        "trigger",
        "action",
        "body",
      ]);
      const other = field(pair, "with");
      expect(other.type).toBe("string");
      expect((other.options as { list: string[] }).list).toEqual([...SOLUTION_IDS]);
    });

    it("is previewed in the Studio by its title", () => {
      expect(pair.preview).toEqual({ select: { title: "title.en" } });
    });

    it(`keeps the When chip to ${TRIGGER_CHARS} characters and the Then chip to ${ACTION_CHARS}`, () => {
      const when = custom(field(pair, "trigger"));
      const then = custom(field(pair, "action"));
      expect(when({ en: "x".repeat(TRIGGER_CHARS) })).toBe(true);
      expect(when({ en: "x".repeat(TRIGGER_CHARS + 1) })).toMatch(/At most 40 characters/);
      expect(then({ en: "x".repeat(ACTION_CHARS) })).toBe(true);
      expect(then({ en: "x".repeat(ACTION_CHARS + 1) })).toMatch(/At most 50 characters/);
    });
  });
});

describe("pairsRule", () => {
  const on = (id: string) => ({ document: { _id: id } });

  it("passes pairs with other solutions, each once", () => {
    expect(pairsRule([{ with: "lighting" }, { with: "garage" }], on("solution-cameras"))).toBe(
      true,
    );
  });

  it("refuses a pair with the page's own solution, on the document and on its draft", () => {
    const self = "A solution cannot pair with itself.";
    expect(pairsRule([{ with: "cameras" }], on("solution-cameras"))).toBe(self);
    expect(pairsRule([{ with: "cameras" }], on("drafts.solution-cameras"))).toBe(self);
  });

  it("does not mistake a solution whose id ends in the page's for the page's own", () => {
    expect(pairsRule([{ with: "lock" }], on("solution-smart-lock"))).toBe(true);
  });

  it("refuses the same solution twice", () => {
    expect(pairsRule([{ with: "ac" }, { with: "ac" }], on("solution-curtains"))).toBe(
      "Each solution can be paired once.",
    );
  });

  it("leaves an empty or missing list to the required and min rules", () => {
    expect(pairsRule(undefined)).toBe(true);
    expect(pairsRule([], on("solution-ac"))).toBe(true);
  });
});

describe("maxChars", () => {
  it("counts a locale string's English, or a plain string", () => {
    expect(maxChars(3)({ en: "abc" })).toBe(true);
    expect(maxChars(3)("abcd")).toBe("At most 3 characters, to fit its box: this is 4.");
  });

  it("leaves an empty field to the required rule", () => {
    expect(maxChars(3)(undefined)).toBe(true);
    expect(maxChars(3)({})).toBe(true);
  });
});

describe("the seeded pairs", () => {
  const PAGES = Object.entries(WORKS_WITH);

  it("cover every solution with a page", () => {
    expect(Object.keys(WORKS_WITH).sort()).toEqual([...SOLUTION_IDS].sort());
  });

  describe.each(PAGES)("%s", (id, section) => {
    it(`pairs with one to ${MAX_PAIRS} other solutions, each once`, () => {
      expect(section.pairs.length).toBeGreaterThanOrEqual(1);
      expect(section.pairs.length).toBeLessThanOrEqual(MAX_PAIRS);
      expect(pairsRule(section.pairs, { document: { _id: `solution-${id}` } })).toBe(true);
      for (const { with: other } of section.pairs) {
        expect(SOLUTION_IDS as readonly string[]).toContain(other);
      }
    });

    it("keeps its chips to their boxes", () => {
      for (const { trigger, action } of section.pairs) {
        expect([trigger, trigger.length <= TRIGGER_CHARS]).toEqual([trigger, true]);
        expect([action, action.length <= ACTION_CHARS]).toEqual([action, true]);
      }
    });

    it("titles each pair differently", () => {
      const titles = section.pairs.map((p) => p.title);
      expect(new Set(titles).size).toBe(titles.length);
    });

    it("carries no label above the heading and no line for unpaired solutions: nothing shows them", () => {
      expect(Object.keys(section).sort()).toEqual(["heading", "line", "pairs", "subtext"]);
    });
  });
});
