import { FAQ_PAGE } from "../../../../sanity/seed/faq-page";
import { plainAnswer } from "../../../components/Faq/FaqAccordion";

const FAQ_CATEGORIES = FAQ_PAGE.categories;

/**
 * The FAQ content is data, and three consumers read it: the ToC rail, the page
 * body, and the FAQPage JSON-LD. The invariants below are the ones that fail
 * silently rather than loudly — a duplicate id produces a page that builds and
 * renders but whose anchors land on the wrong question, and a stray brace
 * produces a schema string with punctuation an answer engine repeats.
 */
describe("FAQ content", () => {
  const allEntries = FAQ_CATEGORIES.flatMap((c) => c.entries);

  it("has unique ids across categories and entries", () => {
    // One namespace: every id becomes a document-level anchor, so a category
    // colliding with a question is as broken as two questions colliding.
    const ids = [...FAQ_CATEGORIES.map((c) => c.id), ...allEntries.map((e) => e.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every entry a question and at least one answer paragraph", () => {
    for (const entry of allEntries) {
      expect(entry.question.trim()).not.toBe("");
      expect(entry.answer.length).toBeGreaterThan(0);
      expect(entry.answer.every((p) => p.trim() !== "")).toBe(true);
    }
  });

  it("quotes only the deck's starting prices, and only in the cost answer", () => {
    // Prices are shown from 2026-11-19 (Shivanshu), which reversed "no
    // prices" of 2026-11-04. They are the package deck's, as /pricing shows.
    const priced = allEntries.filter((entry) => /AED|\d,\d{3}/.test(entry.answer.join(" ")));
    expect(priced.map((entry) => entry.id)).toEqual(["system-cost"]);
    expect(priced[0]!.answer.join(" ").match(/AED [\d,]+/g)).toEqual(["AED 16,000", "AED 68,000"]);
  });

  it("holds no pending note: every answer was confirmed on 2026-11-19", () => {
    expect(allEntries.filter((entry) => entry.pending).map((entry) => entry.id)).toEqual([]);
    expect(FAQ_PAGE.seo.index).toBe(true);
  });

  it("states the confirmed founding year and the free visit", () => {
    const text = allEntries.flatMap((entry) => entry.answer).join(" ");
    expect(text).toContain("operating since 2019");
    expect(text).not.toMatch(/paid visit|visit is paid|credited in full/);
  });

  it("strips placeholder braces from the schema text", () => {
    // The braces are a render-time marker, not content. If one reaches the
    // JSON-LD, an answer engine quotes "AED {18,000}" back at a reader.
    for (const entry of allEntries) {
      expect(plainAnswer(entry)).not.toMatch(/[{}]/);
    }
  });

  it("pairs every braced placeholder with a pending note", () => {
    // The note is what tells a reviewer who confirms the fact. A braced value
    // without one is a placeholder nobody is assigned to clear.
    for (const entry of allEntries) {
      if (entry.answer.some((p) => /\{[^}]+\}/.test(p))) {
        expect(entry.pending).toBeDefined();
      }
    }
  });

  it("uses no em dashes in questions, answers or pending notes", () => {
    // The site-wide copy rule, asserted here as well as in e2e/faq.spec.ts so
    // it fails in the unit run rather than only after a build. The content is
    // the likeliest place for one to arrive, because it is pasted in from
    // elsewhere.
    for (const entry of allEntries) {
      const copy = [entry.question, ...entry.answer, entry.pending ?? ""].join(" ");
      expect(copy).not.toContain("—");
    }
    for (const category of FAQ_CATEGORIES) {
      expect(`${category.title} ${category.short ?? ""}`).not.toContain("—");
    }
  });

  it("balances every brace it opens", () => {
    for (const entry of allEntries) {
      for (const paragraph of entry.answer) {
        const opens = (paragraph.match(/\{/g) ?? []).length;
        const closes = (paragraph.match(/\}/g) ?? []).length;
        expect(opens).toBe(closes);
      }
    }
  });
});
