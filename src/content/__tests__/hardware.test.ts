import { existsSync } from "node:fs";
import { join } from "node:path";

import { HARDWARE_ITEMS } from "../hardware";

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
