import { existsSync } from "node:fs";
import { join } from "node:path";

import { HARDWARE_ITEMS } from "../hardware";
import { HERO_CAROUSEL_ITEMS } from "../hero-carousel";

/**
 * Same invariants as process.test.ts: the carousel reads this array blind, so
 * a missing file is a broken image box rather than a build error, and a
 * duplicate id is two tabs pointing at one panel.
 */
describe("hardware content", () => {
  it("has eight items with unique ids", () => {
    expect(HARDWARE_ITEMS).toHaveLength(8);
    const ids = HARDWARE_ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("words each CTA as the hero strip's card for the same part", () => {
    // One name per component for its link, wherever it appears (2026-10-28).
    for (const item of HARDWARE_ITEMS) {
      const card = HERO_CAROUSEL_ITEMS.find((c) => c.title === item.title);
      expect(card).toBeDefined();
      expect(item.cta).toBe(card!.cta);
    }
  });

  it("gives every CTA its own text", () => {
    const ctas = HARDWARE_ITEMS.map((item) => item.cta);
    expect(new Set(ctas).size).toBe(ctas.length);
    for (const cta of ctas) expect(cta).toMatch(/^View [a-z]/);
  });

  it("opens on the house and ends on the cameras", () => {
    // Cameras moved to the end on 2026-10-02 at Shivanshu's request: the
    // carousel leads with living in the house, not watching it. The first
    // slide is also what a visitor sees before touching anything.
    expect(HARDWARE_ITEMS[0]!.id).toBe("smart-lock");
    expect(HARDWARE_ITEMS.at(-1)!.id).toBe("cameras");
  });

  it("gives every item a title, description and alt", () => {
    for (const item of HARDWARE_ITEMS) {
      expect(item.title.trim()).not.toBe("");
      expect(item.description.trim()).not.toBe("");
      expect(item.image.alt.trim()).not.toBe("");
    }
  });

  it("resolves every image and icon to a file in public/", () => {
    for (const item of HARDWARE_ITEMS) {
      expect(existsSync(join("public/hero/hardware", item.image.src))).toBe(true);
      expect(existsSync(join("public/hero/hardware/icons", item.icon))).toBe(true);
    }
  });

  it("contains no em dashes", () => {
    for (const item of HARDWARE_ITEMS) {
      expect(`${item.title}${item.description}${item.image.alt}`).not.toMatch(/—/);
    }
  });
});
