/**
 * @jest-environment node
 */
import { faqRule } from "../schema/faq";
import {
  HARDWARE_ICONS,
  HERO_LEDE_WORDS,
  HERO_TITLE_WORDS,
  IMAGES_PER_LAYOUT,
  processRule,
} from "../schema/home-page";
import { hasPlaceholder, legalRule } from "../schema/legal";
import { ABOUT_ICONS, pricingPage } from "../schema/pages";
import {
  link,
  list,
  maxWords,
  obj,
  optional,
  paragraphs,
  plain,
  singleton,
  str,
  type SchemaField,
} from "../schema/primitives";
import { seoRule } from "../schema/seo";
import { siteSettings } from "../schema/site-settings";
import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Runs a field's validation the way the Studio does, against a stand-in Rule
 * that records `required` and runs `custom`. Returns the first problem, or true.
 */
function validate(field: SchemaField, value: unknown, document?: unknown): true | string {
  let problem: true | string = true;
  let required = false;
  const rule = {
    required: () => {
      required = true;
      return rule;
    },
    min: () => rule,
    email: () => rule,
    custom: (fn: (v: unknown, ctx: { document: unknown }) => true | string) => {
      if (problem === true && value !== undefined) problem = fn(value, { document });
      return rule;
    },
  };
  field.validation?.(rule as never);
  if (required && (value === undefined || value === "")) return "Required";
  return problem;
}

const field = (parent: SchemaField, name: string) => parent.fields!.find((f) => f.name === name)!;

describe("the field helpers", () => {
  it("makes copy and plain values required, and optional() lifts it", () => {
    for (const f of [plain("a", "A"), str("b", "B")])
      expect(validate(f, undefined)).toBe("Required");
    expect(validate(optional(str("c", "C")), undefined)).toBe(true);
  });

  it("previews an object by its first field, reading the English of copy", () => {
    expect(obj("x", "X", [str("title", "T")]).preview).toEqual({ select: { title: "title.en" } });
    expect(obj("x", "X", [plain("id", "I")]).preview).toEqual({ select: { title: "id" } });
    expect(obj("x", "X", [plain("id", "I"), str("name", "N")], "name").preview).toEqual({
      select: { title: "name.en" },
    });
  });

  it("requires a list to have at least one item", () => {
    expect(list("l", "L", link).type).toBe("array");
    expect(validate(list("l", "L", link), undefined)).toBe("Required");
  });

  it("holds paragraphs as a list of localized text", () => {
    expect(paragraphs("body", "Body").of).toEqual([{ name: "localeText", type: "localeText" }]);
  });

  it("gives a singleton its groups only when it has some", () => {
    expect(singleton("a", "A", [])).not.toHaveProperty("groups");
    expect(singleton("a", "A", [], [{ name: "g", title: "G" }]).groups).toEqual([
      { name: "g", title: "G" },
    ]);
  });
});

describe("maxWords", () => {
  it("counts the words of copy, plain or localized", () => {
    expect(maxWords(3)("one two three")).toBe(true);
    expect(maxWords(3)({ en: "one two three four" })).toMatch(/At most 3 words/);
    expect(maxWords(3)({})).toBe(true);
  });

  it("holds the hero to the counts its stylesheet times", () => {
    expect(HERO_TITLE_WORDS).toBe(6);
    expect(HERO_LEDE_WORDS).toBe(24);
  });
});

describe("seoRule", () => {
  const ok = { title: { en: "x".repeat(40) }, description: { en: "y".repeat(140) }, index: true };

  it("leaves a page out of search to its own devices", () => {
    expect(seoRule({ ...ok, title: { en: "Short" }, index: false })).toBe(true);
    expect(seoRule(undefined)).toBe(true);
  });

  it("holds a page in search to the title range, counting the site name", () => {
    expect(seoRule(ok)).toBe(true);
    expect(seoRule({ ...ok, title: { en: "x".repeat(15) } })).toMatch(/is 27 characters/);
    expect(seoRule({ ...ok, title: { en: "x".repeat(70) }, absolute: true })).toMatch(/30-60/);
  });

  it("holds a page in search to the description range", () => {
    expect(seoRule({ ...ok, description: { en: "short" } })).toMatch(/description is 5/);
    expect(seoRule({ ...ok, description: undefined })).toMatch(/description is 0/);
  });

  it("counts an exact title as written", () => {
    expect(seoRule({ ...ok, title: { en: "x".repeat(30) }, absolute: true })).toBe(true);
    expect(seoRule({ ...ok, title: undefined, absolute: true })).toMatch(/is 0 characters/);
  });
});

describe("processRule", () => {
  it.each(Object.entries(IMAGES_PER_LAYOUT))("gives %s exactly its %i pictures", (layout, n) => {
    const images = Array.from({ length: n }, () => ({}));
    expect(processRule({ layout: layout as never, images })).toBe(true);
    expect(processRule({ layout: layout as never, images: [...images, {}] })).toMatch(
      `room for ${n} picture`,
    );
  });

  it("says nothing until a layout is chosen", () => {
    expect(processRule({ images: [] })).toBe(true);
    expect(processRule(undefined)).toBe(true);
  });

  it("counts a sheet with no pictures as none", () => {
    expect(processRule({ layout: "stacked" })).toMatch("it has 0");
  });
});

describe("faqRule", () => {
  it("refuses a braced value with no note saying what is pending", () => {
    expect(faqRule({ answer: [{ en: "Since {YEAR}." }] })).toMatch(/braced/);
    expect(faqRule({ answer: [{ en: "Since {YEAR}." }], pending: "  " })).toMatch(/braced/);
  });

  it("accepts it with the note, and plain answers without one", () => {
    expect(faqRule({ answer: [{ en: "Since {YEAR}." }], pending: "Year unconfirmed." })).toBe(true);
    expect(faqRule({ answer: [{ en: "Across Dubai." }] })).toBe(true);
    expect(faqRule({ answer: [{}] })).toBe(true);
    expect(faqRule(undefined)).toBe(true);
  });
});

describe("the legal documents", () => {
  const marked = [{ children: [{ marks: ["placeholder"] }] }];
  const plainBlocks = [{ children: [{ marks: ["strong"] }, {}] }, { _type: "legalTable" }];

  it("finds a placeholder mark anywhere in a body", () => {
    expect(hasPlaceholder(marked)).toBe(true);
    expect(hasPlaceholder(plainBlocks)).toBe(false);
    expect(hasPlaceholder(undefined)).toBe(false);
  });

  it("refuses to mark a document effective while a placeholder is left", () => {
    expect(legalRule({ status: "effective", sections: [{ body: { en: marked } }] })).toMatch(
      /cannot be effective/,
    );
    expect(legalRule({ status: "effective", intro: { en: marked }, sections: [] })).toMatch(
      /cannot be effective/,
    );
  });

  it("lets a draft keep its placeholders, and a clean document be effective", () => {
    expect(legalRule({ status: "draft", sections: [{ body: { en: marked } }] })).toBe(true);
    expect(legalRule({ status: "effective", sections: [{ body: { en: plainBlocks } }] })).toBe(
      true,
    );
    expect(legalRule({ status: "effective" })).toBe(true);
    expect(legalRule(undefined)).toBe(true);
  });
});

describe("the site settings", () => {
  const contact = field(siteSettings, "contact");

  it("dials E.164 only", () => {
    const phone = field(contact, "phoneE164");
    expect(validate(phone, "+971543755150")).toBe(true);
    expect(validate(phone, "+971 54 375 5150")).toMatch(/no spaces/);
    expect(validate(phone, "0543755150")).toMatch(/no spaces/);
  });

  it("takes the WhatsApp number as digits only", () => {
    const whatsapp = field(contact, "whatsapp");
    expect(validate(whatsapp, "971543755150")).toBe(true);
    expect(validate(whatsapp, "+971543755150")).toMatch(/Digits only/);
  });

  it("refuses a pending profile that does not say so", () => {
    const socials = field(siteSettings, "socials");
    const label = (en: string) => ({ en });
    expect(validate(socials, [{ label: label("Smarthaus on X"), pending: true }])).toMatch(
      /coming soon/,
    );
    expect(validate(socials, [{ label: label("Smarthaus on X") }])).toBe(true);
  });
});

describe("the pricing comparison", () => {
  const comparison = field(pricingPage, "comparison");
  const doc = { tiers: [{}, {}] };

  it("needs one cell per tier in every row", () => {
    const row = (n: number) => ({ values: Array.from({ length: n }, () => ({})) });
    expect(validate(comparison, [{ rows: [row(2)] }], doc)).toBe(true);
    expect(validate(comparison, [{ rows: [row(2), row(1)] }], doc)).toMatch(
      /one cell per tier \(2\)/,
    );
    expect(validate(comparison, [{}], doc)).toBe(true);
    expect(validate(comparison, [{ rows: [{}] }], {})).toBe(true);
  });
});

describe("the icon lists", () => {
  it.each([
    ...HARDWARE_ICONS.map((f) => ["hero/hardware/icons", f]),
    ...ABOUT_ICONS.map((f) => ["about/icons", f]),
  ])("offer %s/%s, which exists", (dir, file) => {
    expect(existsSync(join(process.cwd(), "public", dir, file))).toBe(true);
  });
});
