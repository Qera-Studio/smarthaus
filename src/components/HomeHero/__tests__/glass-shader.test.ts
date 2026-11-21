import { readFileSync } from "node:fs";
import { join } from "node:path";

import { FRAGMENT, LUMINANCE_CAP, REEDS_ACROSS, UNIFORMS, VERTEX } from "../glass-shader";

/**
 * Static checks on the glass's GLSL. jsdom cannot compile it, so this pins
 * what a compile would catch late, and what no compile would catch at all:
 * a uniform glass.ts sets and the shader never declares (silently a no-op in
 * WebGL), and a glass bright enough to take the hero's text under 4.5:1.
 */

const declared = (source: string) =>
  [...source.matchAll(/^uniform\s+\w+\s+(\w+);/gm)].map((m) => m[1]);
const constant = (name: string) => {
  const match = FRAGMENT.match(new RegExp(`const (?:float|vec3) ${name} = ([^;]+);`));
  if (!match?.[1]) throw new Error(`no constant ${name}`);
  return match[1];
};
const number = (name: string) => Number(constant(name));

describe("the glass's GLSL", () => {
  it.each([
    ["vertex", VERTEX],
    ["fragment", FRAGMENT],
  ])("the %s shader opens on the GLSL ES 3.00 version line", (_name, source) => {
    expect(source.startsWith("#version 300 es\n")).toBe(true);
  });

  it.each([
    ["vertex", VERTEX],
    ["fragment", FRAGMENT],
  ])("the %s shader's braces and brackets balance", (_name, source) => {
    for (const [open, close] of [
      ["{", "}"],
      ["(", ")"],
      ["[", "]"],
    ] as const) {
      expect(source.split(open).length).toBe(source.split(close).length);
    }
  });

  it("declares exactly the uniforms glass.ts sets", () => {
    expect(declared(FRAGMENT).sort()).toEqual([...UNIFORMS].sort());
    expect(declared(VERTEX)).toEqual([]);
  });

  it("uses every uniform it declares", () => {
    for (const name of UNIFORMS) {
      const used = FRAGMENT.split(name).length - 1 > 1;
      expect({ name, used }).toEqual({ name, used: true });
    }
  });

  it("takes the quad's corners through the attribute glass.ts binds to 0", () => {
    expect(VERTEX).toMatch(/^in vec2 aPosition;/m);
    expect(VERTEX).toMatch(/gl_Position = vec4\(aPosition, 0\.0, 1\.0\);/);
  });

  it("sets its float precision, which WebGL requires of a fragment shader", () => {
    expect(FRAGMENT).toMatch(/^precision highp float;/m);
  });

  it("reads the picture once a pixel: the cost per frame is one lookup", () => {
    expect(FRAGMENT.match(/texture\(/g)).toHaveLength(1);
  });

  it("writes one colour, opaque", () => {
    expect(FRAGMENT).toMatch(/^out vec4 color;/m);
    expect(FRAGMENT).toMatch(/color = vec4\(glass, 1\.0\);\s*\}\s*$/);
  });

  it("carries the cap from TypeScript, so the test and the shader share one number", () => {
    expect(constant("CAP")).toBe(String(LUMINANCE_CAP));
  });
});

describe("the glass, as fitted to the design", () => {
  it("has the design's reeds: 1440 / 59.25 across", () => {
    expect(REEDS_ACROSS).toBeCloseTo(1440 / 59.25, 1);
  });

  it("magnifies and bends as the fit found", () => {
    // Fitted to "Rectangle 96" on 2026-11-14, to under 2 levels in 255.
    expect(number("MAGNIFY")).toBe(3.25);
    expect(number("CURVE")).toBe(0.18);
    expect(number("TINT")).toBeCloseTo(0.046);
  });

  it("finds each pixel's reed from the screen's centre, so a reed edge is on it", () => {
    expect(FRAGMENT).toMatch(/float r = \(p\.x - 0\.5 \* uResolution\.x\) \/ uReed;/);
  });

  it("adds the glow behind the glass, before the reeds' tint and edges", () => {
    const glow = FRAGMENT.indexOf("scene += GLOW");
    expect(glow).toBeGreaterThan(-1);
    expect(glow).toBeLessThan(FRAGMENT.indexOf("vec3 glass = mix(scene"));
  });

  it("keeps the glow small, round and faint (Shivanshu, 2026-11-14)", () => {
    // 60% smaller than the first, then smaller and softer again: under a reed
    // in radius, and bent far less than the picture so it stays round.
    expect(number("GLOW_RADIUS")).toBeLessThan(1);
    expect(number("GLOW_BEND")).toBeLessThan(number("MAGNIFY") / 2);
    expect(number("GLOW_STRENGTH")).toBeLessThan(0.5);
  });

  it("caps the light last, after everything that adds to it", () => {
    const cap = FRAGMENT.indexOf("glass *= pow(min(1.0, CAP");
    expect(cap).toBeGreaterThan(FRAGMENT.indexOf("glass += edge"));
    expect(cap).toBeGreaterThan(FRAGMENT.indexOf("scene += GLOW"));
  });
});

describe("the cap, and the text on the glass", () => {
  const tokens = readFileSync(join(process.cwd(), "src/styles/_variables.scss"), "utf8");
  const token = (name: string) => {
    const match = tokens.match(new RegExp(`^\\$${name}:\\s*(#[0-9a-f]{6});`, "mi"));
    if (!match?.[1]) throw new Error(`no $${name} in _variables.scss`);
    return match[1];
  };
  type Rgb = [number, number, number];
  const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as Rgb;
  // WCAG's relative luminance, exactly.
  const luminance = ([r, g, b]: Rgb) => {
    const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const WEIGHTS = [0.2126, 0.7152, 0.0722];
  // The shader's own cap, line for line. Its luminance is a 2.2 power, close
  // to but not exactly WCAG's, which is why the result is checked exactly.
  const capped = (c: Rgb): Rgb => {
    const lum = c.reduce((sum, v, i) => sum + v ** 2.2 * WEIGHTS[i]!, 0);
    const scale = Math.min(1, LUMINANCE_CAP / Math.max(lum, 1e-4)) ** (1 / 2.2);
    return c.map((v) => v * scale) as Rgb;
  };
  const text = () => luminance(rgb(token("brown-100")));

  it("is about the token the hero's text is set in: --color-text-inverse, brown-100", () => {
    expect(tokens).toMatch(/--color-text-inverse:\s*#\{\$brown-100\}/);
  });

  it("keeps brown-100 at 4.5:1 or better over the brightest glass the cap allows", () => {
    expect(contrast(text(), LUMINANCE_CAP)).toBeGreaterThanOrEqual(4.5);
  });

  it("would not a step higher, which is why the cap is where it is", () => {
    expect(contrast(text(), LUMINANCE_CAP + 0.01)).toBeLessThan(4.5);
  });

  it.each<[string, Rgb]>([
    ["white", [1, 1, 1]],
    ["the glow at full on bronze", [1, 0.8, 0.58]],
    ["bronze", [0.69, 0.5, 0.31]],
    ["sand", [0.77, 0.64, 0.49]],
    ["a reed's lit edge", [0.9, 0.7, 0.5]],
  ])("holds the text at 4.5:1 over %s, measured exactly once capped", (_name, colour) => {
    expect(contrast(text(), luminance(capped(colour)))).toBeGreaterThanOrEqual(4.5);
  });

  it("leaves a colour already dark enough as it was", () => {
    const dark: Rgb = [0.2, 0.15, 0.1];
    expect(capped(dark)).toEqual(dark);
  });
});
