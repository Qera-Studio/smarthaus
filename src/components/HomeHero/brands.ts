/**
 * The makers in the hero's logo rail, in the order they run. Every one was
 * confirmed by the client before it was added (Shivanshu, 2026-11-14; TIS and
 * Fibaro on 2026-10-06), and a new one is asked first: AGENTS.md, claims
 * audit. The rail shows the marks and says nothing more about any of them.
 *
 * In code, not Sanity: a logo is a file in public/hero/brands/, so an editor
 * could only ever pick from this list. Sizes are in CSS pixels: each mark's
 * own height less 2px (Shivanshu, 2026-11-14), so no logo is scaled up to
 * match a wider one.
 */
export interface Brand {
  name: string;
  /** File name in public/hero/brands/. */
  logo: string;
  width: number;
  height: number;
}

export const BRANDS: readonly Brand[] = [
  { name: "Lutron", logo: "lutron.svg", width: 94, height: 14 },
  { name: "Shelly", logo: "shelly.svg", width: 81, height: 22 },
  { name: "Control4", logo: "control4.svg", width: 100, height: 22 },
  { name: "KNX", logo: "knx.svg", width: 48, height: 22 },
  { name: "LifeSmart", logo: "lifesmart.svg", width: 113, height: 22 },
  { name: "Aqara", logo: "aqara.svg", width: 73, height: 21 },
  { name: "Loxone", logo: "loxone.svg", width: 91, height: 21 },
  { name: "Crestron", logo: "crestron.svg", width: 160, height: 18 },
  // ponytail: the two PNGs are 1152px wide (15KB and 44KB) for a 70px mark;
  // swap for SVGs when the makers' vector files are to hand.
  { name: "TIS", logo: "tis.png", width: 67, height: 26 },
  { name: "Fibaro", logo: "fibaro.png", width: 70, height: 22 },
];

/** What a screen reader calls the rail. */
export const BRANDS_LABEL = "Brands we work with";

/**
 * How many times the list is laid end to end. The rail moves by one run and
 * shows what the other two cover, so two runs must be wider than any screen:
 * one is about 1,700px. Three, not four, for the page's element budget
 * (e2e/dom-budget.spec.ts); the copies are bare images for the same reason.
 */
export const BRAND_RUNS = 3;
