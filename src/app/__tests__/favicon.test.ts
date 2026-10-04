import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * /favicon.ico is what a browser shows for any page with no <link rel="icon">
 * of its own: sitemap.xml, robots.txt, llms.txt, a raw image. The HTML pages
 * use icon.svg, so for months nobody saw that this file was still the
 * create-next-app default, the Vercel triangle, until /sitemap.xml showed it
 * in the tab (2026-10-02). It is now the dome mark, rendered from icon.svg.
 */

const ico = readFileSync(join(__dirname, "..", "favicon.ico"));

/** MD5 of the favicon.ico create-next-app ships (25,931 bytes). */
const NEXT_DEFAULT_MD5 = "c30c7d42707a47a3f4591831641e50dc";

/** The ICONDIR entries: each image's width and the bytes it starts with. */
function entries(buf: Buffer) {
  const count = buf.readUInt16LE(4);
  return Array.from({ length: count }, (_, i) => {
    const at = 6 + 16 * i;
    const size = buf.readUInt32LE(at + 8);
    const offset = buf.readUInt32LE(at + 12);
    return { width: buf.readUInt8(at), data: buf.subarray(offset, offset + size) };
  });
}

describe("favicon.ico", () => {
  it("is not the create-next-app default", () => {
    expect(ico.length).not.toBe(25931);
    expect(createHash("md5").update(ico).digest("hex")).not.toBe(NEXT_DEFAULT_MD5);
  });

  it("is an icon file", () => {
    // Reserved 0, type 1 (icon).
    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);
  });

  it("carries the 16, 32 and 48 pixel sizes a browser and Windows ask for", () => {
    expect(entries(ico).map((e) => e.width)).toEqual([16, 32, 48]);
  });

  it("stores each size as a whole PNG inside the file", () => {
    const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    for (const { data } of entries(ico)) {
      expect(data.length).toBeGreaterThan(PNG.length);
      expect(data.subarray(0, 4).equals(PNG)).toBe(true);
    }
  });
});
