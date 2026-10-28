import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { HERO_CAROUSEL_HREF, HERO_CAROUSEL_ITEMS } from "../hero-carousel";

/**
 * The hero strip's content. What fails quietly: an image path that does not
 * resolve (next/image draws a broken box, not a build error), a width and
 * height that disagree with the file (the box reserves the wrong shape and
 * object-fit crops it), and copy that slips a claim or an em dash in.
 */

const DIR = join(process.cwd(), "public/hero/hero_carousel");

/** Pixel size from the file header: PNG's IHDR, or a JPEG's first SOF marker. */
function pixelSize(path: string): { width: number; height: number } {
  const bytes = readFileSync(path);
  if (bytes.readUInt32BE(0) === 0x89504e47) {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  let at = 2;
  while (at < bytes.length) {
    const marker = bytes.readUInt16BE(at);
    const length = bytes.readUInt16BE(at + 2);
    // SOF0 to SOF15, less DHT (C4), JPG (C8) and DAC (CC), which share the range.
    if (marker >= 0xffc0 && marker <= 0xffcf && ![0xffc4, 0xffc8, 0xffcc].includes(marker)) {
      return { height: bytes.readUInt16BE(at + 5), width: bytes.readUInt16BE(at + 7) };
    }
    at += 2 + length;
  }
  throw new Error(`no size found in ${path}`);
}

describe("hero carousel content", () => {
  it("has the eight parts, each once", () => {
    expect(HERO_CAROUSEL_ITEMS).toHaveLength(8);
    const ids = HERO_CAROUSEL_ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
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
      expect(existsSync(join(DIR, image.src))).toBe(true);
    }
  });

  it("declares each image at the size the file actually is", () => {
    for (const { image } of HERO_CAROUSEL_ITEMS) {
      expect(pixelSize(join(DIR, image.src))).toEqual({
        width: image.width,
        height: image.height,
      });
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
    const pending = HERO_CAROUSEL_ITEMS.filter((item) => item.pendingImage);
    expect(pending).toHaveLength(HERO_CAROUSEL_ITEMS.length);
  });
});
