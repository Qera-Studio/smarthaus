/**
 * @jest-environment node
 */

// Contrast, computed from the palette itself (src/styles/_variables.scss), for
// every pairing the site relies on. Accessibility System §4: 4.5:1 for text,
// 3:1 for large text and for the parts of a control that identify it (WCAG
// 1.4.3, 1.4.11). A token change that breaks one fails here, before a browser.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const scss = readFileSync(join(process.cwd(), "src/styles/_variables.scss"), "utf8");
const brown = Object.fromEntries(
  [...scss.matchAll(/^\$brown-(\d+): (#[0-9a-f]{6});/gim)].map((m) => [m[1]!, m[2]!]),
);

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function ratio(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

/** The palette step a custom property is set to, e.g. --color-border-input. */
function token(name: string, source = scss): string {
  const match = source.match(new RegExp(`${name}:\\s*#\\{\\$brown-(\\d+)\\}`));
  if (!match) throw new Error(`${name} is not a brown step`);
  return brown[match[1]!]!;
}

describe("the palette", () => {
  it("reads all eleven brown steps", () => {
    expect(Object.keys(brown).sort((a, b) => Number(a) - Number(b))).toEqual([
      "50",
      "100",
      "200",
      "300",
      "400",
      "500",
      "600",
      "700",
      "800",
      "900",
      "950",
    ]);
  });

  it("computes WCAG ratios correctly: black on white is 21:1", () => {
    expect(ratio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(ratio("#777777", "#777777")).toBeCloseTo(1, 5);
  });
});

describe("text on the canvas (4.5:1)", () => {
  const canvas = token("--color-bg-canvas");
  it.each(["--color-text-primary", "--color-text-secondary"])("%s", (name) => {
    expect(ratio(token(name), canvas)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("control edges and focus (3:1, WCAG 1.4.11)", () => {
  const canvas = token("--color-bg-canvas");

  it("a form field's edge on the canvas", () => {
    expect(ratio(token("--color-border-input"), canvas)).toBeGreaterThanOrEqual(3);
  });

  it("was failing with the old border, which is why the input token exists", () => {
    expect(ratio(token("--color-border"), canvas)).toBeLessThan(3);
  });

  it("the focus ring on the canvas", () => {
    expect(ratio(token("--color-border-focus"), canvas)).toBeGreaterThanOrEqual(3);
  });

  const globals = readFileSync(join(process.cwd(), "src/styles/globals.scss"), "utf8");
  const darkBlock = globals.slice(globals.indexOf('[data-ground="dark"] {'));
  const darkFocus = token("--color-border-focus", darkBlock);

  it.each(["950", "900", "800"])("the dark-ground focus ring on brown-%s", (step) => {
    expect(ratio(darkFocus, brown[step]!)).toBeGreaterThanOrEqual(3);
  });

  it("needed its own colour: the light-ground ring fails on brown-900", () => {
    expect(ratio(token("--color-border-focus"), brown["900"]!)).toBeLessThan(3);
  });
});
