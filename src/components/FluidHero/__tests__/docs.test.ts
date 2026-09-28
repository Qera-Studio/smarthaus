import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The fluid hero is the third rAF exception, and CLAUDE.md is where the
 * conditions live. This pins the record to the code: the entry exists, it
 * names the files, it lists every gate the island enforces, and it still
 * closes the door on a fourth. Same idea as src/__tests__/docs-consistency.
 */

const root = process.cwd();
const claude = readFileSync(join(root, "CLAUDE.md"), "utf8");
const canvas = readFileSync(join(root, "src/components/FluidHero/FluidCanvas.tsx"), "utf8");
const section = claude.slice(claude.indexOf("### The third exception: the fluid hero"));

describe("CLAUDE.md records the third exception", () => {
  test("the section exists and follows the second", () => {
    expect(claude.indexOf("### The second exception")).toBeLessThan(
      claude.indexOf("### The third exception: the fluid hero"),
    );
    expect(section.length).toBeGreaterThan(500);
  });

  test("names the files that make up the exception", () => {
    for (const file of ["FluidCanvas.tsx", "fluid.ts", "shaders.ts"]) {
      expect(section).toContain(file);
    }
    expect(section).toContain("src/components/FluidHero/__tests__/FluidCanvas.test.tsx");
    expect(section).toContain("shaders.test.ts");
  });

  test("lists every gate the island enforces", () => {
    expect(section).toMatch(/prefers-reduced-motion/);
    expect(section).toMatch(/Save-Data/);
    expect(section).toMatch(/2g\/3g/);
    expect(section).toMatch(/IntersectionObserver/);
    expect(section).toMatch(/visibilitychange/);
    expect(section).toMatch(/`active` flag/);
  });

  test("records the contrast cap and its reason", () => {
    expect(section).toMatch(/60% mix/);
    expect(section).toMatch(/--color-text-primary/);
    expect(section).toMatch(/4\.2:1/);
  });

  test("keeps three.js out of it and the one-consumer rule intact", () => {
    expect(section).toMatch(/Raw WebGL2/);
    expect(section).toMatch(/three\.js was not used/);
    expect(section).toMatch(/One consumer/);
  });

  test("closes the door on a fourth, and the old line no longer says third", () => {
    expect(claude).toContain("**This still does not license a fourth.**");
    expect(claude).not.toContain("**This still does not license a third.**");
    expect(claude).not.toMatch(/second and last place/);
  });

  test("the client-component list names the island and the villa's status", () => {
    expect(claude).toMatch(/- Fluid hero canvas \(`FluidHero\/FluidCanvas\.tsx`/);
    expect(claude).toMatch(/\*\*Unmounted, not deleted:\*\*/);
  });

  test("the island's own header points back at the record", () => {
    expect(canvas).toMatch(/THIS IS THE THIRD rAF EXCEPTION/);
    expect(canvas).toMatch(/AGENTS\.md|CLAUDE\.md/);
  });
});

describe("CLAUDE.md records the glyph layer inside the same exception", () => {
  test("names the file, the quiet marker and the fallback", () => {
    expect(section).toMatch(/\*\*The glyph layer is part of this exception, not a fourth\.\*\*/);
    expect(section).toContain("glyphs.ts");
    expect(section).toContain("data-hero-quiet");
    expect(section).toMatch(/If the icons never load, the liquid runs without it\./);
  });

  test("the marker in the doc is the marker in the markup", () => {
    const hero = readFileSync(join(root, "src/components/FluidHero/FluidHero.tsx"), "utf8");
    expect(hero.match(/data-hero-quiet/g)).toHaveLength(3);
    expect(canvas).toContain('querySelectorAll("[data-hero-quiet]")');
  });
});

describe("CLAUDE.md describes the layer as it is", () => {
  test("a scrambled, reshuffled grid of the icons, not characters", () => {
    expect(section).toMatch(/scrambled grid/);
    expect(section).toMatch(/reshuffles a few cells/);
    expect(section).toMatch(/each icon turning at its own speed/);
    expect(section).not.toMatch(/ASCII/);
  });
});
