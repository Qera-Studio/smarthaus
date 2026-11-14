import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { BRAND_RUNS, BRANDS, BRANDS_LABEL } from "../brands";

/**
 * The makers in the hero's rail. Each is a claim (AGENTS.md, claims audit:
 * the client confirmed the list on 2026-11-14, TIS and Fibaro on 2026-10-06),
 * so the list is pinned and a new maker is a deliberate edit. What fails
 * quietly: a file that is not there (a broken image in the rail), a size that
 * stretches the mark, and a loop too short for a wide screen, which shows a
 * gap as it wraps.
 */

const DIR = join(process.cwd(), "public/hero/brands");

/** A mark's own shape: an SVG's viewBox, or a PNG's header. */
function shape(file: string): { width: number; height: number } {
  const path = join(DIR, file);
  if (file.endsWith(".svg")) {
    const box = readFileSync(path, "utf8").match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    if (!box) throw new Error(`${file} has no viewBox`);
    return { width: Number(box[1]), height: Number(box[2]) };
  }
  const bytes = readFileSync(path);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

describe("the makers' marks", () => {
  it("are the ten the client confirmed, in the order they run", () => {
    expect(BRANDS.map((b) => b.name)).toEqual([
      "Lutron",
      "Shelly",
      "Control4",
      "KNX",
      "LifeSmart",
      "Aqara",
      "Loxone",
      "Crestron",
      "TIS",
      "Fibaro",
    ]);
  });

  it("name no maker twice, and no file twice", () => {
    expect(new Set(BRANDS.map((b) => b.name)).size).toBe(BRANDS.length);
    expect(new Set(BRANDS.map((b) => b.logo)).size).toBe(BRANDS.length);
  });

  it.each(BRANDS.map((b) => [b.name, b] as const))("%s has its file", (_name, brand) => {
    expect(existsSync(join(DIR, brand.logo))).toBe(true);
    expect(brand.logo).toMatch(/^[a-z0-9]+\.(svg|png)$/);
  });

  it.each(BRANDS.map((b) => [b.name, b] as const))(
    "%s is drawn at its own shape, within 3%",
    (_name, brand) => {
      const own = shape(brand.logo);
      const drawn = brand.width / brand.height;
      expect(Math.abs(drawn / (own.width / own.height) - 1)).toBeLessThan(0.03);
    },
  );

  it.each(BRANDS.filter((b) => b.logo.endsWith(".svg")).map((b) => [b.name, b] as const))(
    "%s stands 2px under its own height (Shivanshu, 2026-11-14)",
    (_name, brand) => {
      expect(brand.height).toBe(shape(brand.logo).height - 2);
    },
  );

  it("keeps every mark under 28px tall, so the rail reads as one line", () => {
    for (const brand of BRANDS) expect(brand.height).toBeLessThanOrEqual(28);
  });

  it("has a name a screen reader can say for the rail", () => {
    expect(BRANDS_LABEL).toBe("Brands we work with");
  });

  it("is long enough that what the loop shows is wider than a 2560px screen", () => {
    // One run is every mark and the 80px after each (HomeHero.module.scss,
    // .brandList). The rail moves by one run, so the rest must fill a screen.
    const run = BRANDS.reduce((sum, b) => sum + b.width + 80, 0);
    expect(run * (BRAND_RUNS - 1)).toBeGreaterThan(2560);
  });

  it("lays out no more runs than that needs, for the page's element budget", () => {
    const run = BRANDS.reduce((sum, b) => sum + b.width + 80, 0);
    expect(run * (BRAND_RUNS - 2)).toBeLessThan(2560);
  });

  it("states nothing about any maker beyond its name", () => {
    for (const brand of BRANDS) {
      expect(Object.keys(brand).sort()).toEqual(["height", "logo", "name", "width"]);
    }
  });
});
