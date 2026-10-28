import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { SOLUTIONS_MENU_HREF, SOLUTIONS_MENU_ITEMS } from "../solutions-menu";

/**
 * The Solutions menu's content. What fails quietly: a picture path that does
 * not resolve (next/image draws a broken box, not a build error), a label
 * that drifts from the Figma, and a stand-in picture published as if final.
 */

const DIR = join(process.cwd(), "public/hero/navBar");

describe("solutions menu content", () => {
  it("has the eight solutions, in the Figma's order, each once", () => {
    expect(SOLUTIONS_MENU_ITEMS.map((item) => item.label)).toEqual([
      "Cameras",
      "Lighting",
      "Audio",
      "AC",
      "Garage",
      "Smart lock",
      "Wall controller",
      "Curtains",
    ]);
    const ids = SOLUTIONS_MENU_ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('says "Lighting", not the Figma\'s "Lightings"', () => {
    expect(SOLUTIONS_MENU_ITEMS.map((item) => item.label)).not.toContain("Lightings");
  });

  it("sends every solution to /solutions for now", () => {
    expect(SOLUTIONS_MENU_HREF).toBe("/solutions");
  });

  it("points each at a picture that exists", () => {
    for (const item of SOLUTIONS_MENU_ITEMS) {
      expect(existsSync(join(DIR, item.image))).toBe(true);
    }
  });

  it("uses each picture once, and every picture in the folder", () => {
    const used = SOLUTIONS_MENU_ITEMS.map((item) => item.image).sort();
    expect(new Set(used).size).toBe(used.length);
    const files = readdirSync(DIR).filter((name) => !name.startsWith("."));
    expect(files.sort()).toEqual(used);
  });

  it("names its files plainly: no spaces, served as JPEG", () => {
    for (const item of SOLUTIONS_MENU_ITEMS) {
      expect(item.image).toMatch(/^[a-z_]+\.jpg$/);
    }
  });

  // The pictures are licensed stock, a stand-in the client agreed to
  // (Shivanshu, 2026-10-28). This fails once the last marker is cleared, so
  // publishing final pictures is a deliberate act: update this test with it.
  it("marks every picture as pending", () => {
    for (const item of SOLUTIONS_MENU_ITEMS) expect(item.pendingImage).toBe(true);
  });

  it("slips in no em dash", () => {
    for (const item of SOLUTIONS_MENU_ITEMS) expect(item.label).not.toContain("—");
  });
});
