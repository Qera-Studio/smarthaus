import { existsSync } from "node:fs";
import { join } from "node:path";

import { HOME_PAGE } from "../../../../sanity/seed/home-page";
import { pixelSize } from "../../../__tests__/helpers/pixel-size";

const HARDWARE_ITEMS = HOME_PAGE.hardware.items;
const HERO_CAROUSEL_ITEMS = HOME_PAGE.hero.cards;
const HERO_CAROUSEL_HREF = HOME_PAGE.hero.cardsHref;

/**
 * The hero strip's content. What fails quietly: an image path that does not
 * resolve (next/image draws a broken box, not a build error), a width and
 * height that disagree with the file (the box reserves the wrong shape and
 * object-fit crops it), and copy that slips a claim or an em dash in.
 */

const PUBLIC = join(process.cwd(), "public");

describe("hero carousel content", () => {
  it("has the eight parts, each once", () => {
    expect(HERO_CAROUSEL_ITEMS).toHaveLength(8);
    const ids = HERO_CAROUSEL_ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("shows the same eight parts the hardware carousel describes, by the same names", () => {
    // The strip's lines summarise hardware.ts; a part added to one and not
    // the other would leave a card with nothing published behind it.
    const strip = HERO_CAROUSEL_ITEMS.map((item) => item.title).sort();
    const hardware = HARDWARE_ITEMS.map((item) => item.title).sort();
    expect(strip).toEqual(hardware);
  });

  it("sends every card to the solutions page", () => {
    // Shivanshu, 2026-10-28: no product pages yet, so every CTA goes here.
    expect(HERO_CAROUSEL_HREF).toBe("/solutions");
  });

  it("gives every card a title, a line, a CTA and alt text", () => {
    for (const item of HERO_CAROUSEL_ITEMS) {
      expect(item.title.trim()).not.toBe("");
      expect(item.line.trim()).not.toBe("");
      expect(item.cta).toMatch(/^View /);
      expect(item.image.alt.trim()).not.toBe("");
    }
  });

  it("gives every CTA its own text, so each link names where it leads", () => {
    const ctas = HERO_CAROUSEL_ITEMS.map((item) => item.cta);
    expect(new Set(ctas).size).toBe(ctas.length);
  });

  it("keeps each line to one line's worth on a card", () => {
    for (const item of HERO_CAROUSEL_ITEMS) {
      expect(item.line.length).toBeLessThanOrEqual(80);
    }
  });

  it("states no figure, superlative, maker or em dash", () => {
    for (const item of HERO_CAROUSEL_ITEMS) {
      const copy = `${item.title} ${item.line} ${item.cta}`;
      expect(copy).not.toMatch(/\d/);
      expect(copy).not.toMatch(/—/);
      expect(copy).not.toMatch(/!/);
      expect(copy).not.toMatch(/\b(best|leading|revolutionary|cutting-edge|TIS|Fibaro)\b/i);
    }
  });

  it("points at files that exist", () => {
    for (const { image } of HERO_CAROUSEL_ITEMS) {
      expect(existsSync(join(PUBLIC, image.src))).toBe(true);
    }
  });

  it("declares each image at the size the file actually is", () => {
    for (const { image } of HERO_CAROUSEL_ITEMS) {
      expect(pixelSize(join(PUBLIC, image.src))).toEqual({
        width: image.width,
        height: image.height,
      });
    }
  });

  it("describes each image in its own words, without announcing it as an image", () => {
    const alts = HERO_CAROUSEL_ITEMS.map((item) => item.image.alt);
    expect(new Set(alts).size).toBe(alts.length);
    for (const alt of alts) {
      // A screen reader already says "image"; saying it again is noise.
      expect(alt).not.toMatch(/^(image|picture|photo) of/i);
      expect(alt).not.toMatch(/\.$/);
    }
  });

  it("starts each line with a capital and ends it with a full stop, no question", () => {
    for (const { line } of HERO_CAROUSEL_ITEMS) {
      expect(line).toMatch(/^[A-Z].*\.$/);
      expect(line).not.toContain("?");
    }
  });

  it("names each CTA after its card, in lower case after View", () => {
    for (const { cta } of HERO_CAROUSEL_ITEMS) {
      expect(cta).toMatch(/^View [a-z]/);
    }
  });

  it("uses each image once", () => {
    const files = HERO_CAROUSEL_ITEMS.map((item) => item.image.src);
    expect(new Set(files).size).toBe(files.length);
  });

  /**
   * The images are licensed stock standing in until they are replaced
   * (AGENTS.md, photography constraint). This fails once the last marker is
   * cleared, so replacing them is a deliberate act.
   */
  it("still marks every image as pending replacement", () => {
    const pending = HERO_CAROUSEL_ITEMS.filter((item) => item.image.stock);
    expect(pending).toHaveLength(HERO_CAROUSEL_ITEMS.length);
  });
});
