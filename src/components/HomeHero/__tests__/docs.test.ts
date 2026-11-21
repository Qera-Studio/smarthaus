import { readFileSync } from "node:fs";
import { join } from "node:path";

import { LUMINANCE_CAP } from "../glass-shader";
import { GLOW_FADE_MS } from "../GlassCanvas";

/**
 * The hero's glass is the third canvas exception, and CLAUDE.md is where its
 * conditions live. This pins the record to the code: the entry exists, names
 * the files, lists every gate the island keeps and the cap the shader sets,
 * and the door on a fourth stays shut.
 */

const root = process.cwd();
const claude = readFileSync(join(root, "CLAUDE.md"), "utf8");
const canvas = readFileSync(join(root, "src/components/HomeHero/GlassCanvas.tsx"), "utf8");
const start = claude.indexOf("### The third exception: the hero's glass");
const section = claude.slice(start, claude.indexOf("#### Before it: the fluid hero", start));

describe("CLAUDE.md records the glass as the third exception", () => {
  test("the section exists, follows the second, and keeps the fluid hero's record under it", () => {
    expect(start).toBeGreaterThan(claude.indexOf("### The second exception"));
    expect(section.length).toBeGreaterThan(1000);
  });

  test("names the files that make up the exception, and their tests", () => {
    for (const file of [
      "GlassCanvas.tsx",
      "glass.ts",
      "glass-shader.ts",
      "ground.webp",
      "bake-glass-ground.mjs",
    ]) {
      expect(section).toContain(file);
    }
    for (const test of ["GlassCanvas.test.tsx", "glass-shader.test.ts", "glass.test.ts"]) {
      expect(section).toContain(test);
    }
  });

  test("says there is no loop, and when frames are drawn", () => {
    expect(section).toMatch(/\*\*No loop\.\*\*/);
    expect(section).toMatch(new RegExp(`${GLOW_FADE_MS}ms`));
  });

  test("lists every gate the island keeps", () => {
    expect(section).toMatch(/prefers-reduced-motion/);
    expect(section).toMatch(/\(hover: hover\) and \(pointer: fine\)/);
    expect(section).toMatch(/Save-Data/);
    expect(section).toMatch(/lost context/);
    expect(section).toMatch(/`data-ready`/);
  });

  test("records the cap, the token it protects and the floor", () => {
    expect(section).toContain(`(${LUMINANCE_CAP})`);
    expect(section).toMatch(/--color-text-inverse/);
    expect(section).toMatch(/4\.5:1/);
  });

  test("keeps three.js out of it and the one-consumer rule intact", () => {
    expect(section).toMatch(/Raw WebGL2|raw WebGL2/);
    expect(section).toMatch(/three\.js was not used/);
    expect(section).toMatch(/\*\*One consumer\.\*\*/);
  });

  test("is the last: the number is not reused and a fourth is not licensed", () => {
    expect(section).toMatch(/third and last place/);
    expect(claude).toContain("**This still does not license a fourth.**");
  });

  test("the client-component list names the glass, the email field and the snap", () => {
    expect(claude).toMatch(/- Hero glass \(`HomeHero\/GlassCanvas\.tsx`/);
    expect(claude).toMatch(/- Hero email field \(`HomeHero\/HeroLead\.tsx`/);
    expect(claude).toMatch(/- The Process stack's snap \(`Process\/SheetSnap\.tsx`/);
  });

  test("records the email field's one exception to the visible-label rule", () => {
    expect(claude).toMatch(/the hero's email field shows the design's placeholder/);
  });

  test("the island's own header points back at the record", () => {
    expect(canvas).toMatch(/THIS IS THE THIRD CANVAS EXCEPTION/);
    expect(canvas).toMatch(/CLAUDE\.md/);
  });
});
