import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { PROTOCOLS, PROTOCOLS_LABEL } from "../protocols";

/**
 * The six standards under the section (Figma 4914:856). Each is a claim that
 * Smarthaus installs on it, confirmed 2026-11-16, so the list is pinned: a
 * new one is asked first (AGENTS.md, claims audit).
 */

const DIR = join(__dirname, "../../../../public/landing/connectivity");
const root = (file: string) => readFileSync(join(DIR, file), "utf8").match(/<svg[^>]*>/)![0];
const attr = (tag: string, name: string) =>
  Number(tag.match(new RegExp(`\\b${name}="([\\d.]+)"`))![1]);

describe("PROTOCOLS", () => {
  it("are the six confirmed, in the drawn order", () => {
    expect(PROTOCOLS.map((p) => p.name)).toEqual([
      "CoSS",
      "Matter",
      "Zigbee",
      "Wi-Fi",
      "Z-Wave",
      "Bluetooth",
    ]);
  });

  it("each have a file", () => {
    for (const { logo } of PROTOCOLS) expect(existsSync(join(DIR, logo))).toBe(true);
  });

  it("are drawn at each file's own size, 32px tall as designed", () => {
    for (const { logo, width, height } of PROTOCOLS) {
      expect(height).toBe(32);
      expect(attr(root(logo), "height")).toBe(height);
      expect(attr(root(logo), "width")).toBe(width);
    }
  });

  it("are all in the light ink, brown-50, the marks' one tone", () => {
    for (const { logo } of PROTOCOLS) {
      const fills = new Set(readFileSync(join(DIR, logo), "utf8").match(/fill="#[0-9A-Fa-f]{6}"/g));
      expect(fills).toEqual(new Set(['fill="#F8F5F0"']));
    }
  });

  it("leave no mark in the folder unlisted", () => {
    const listed = new Set(PROTOCOLS.map((p) => p.logo));
    const marks = readdirSync(DIR).filter((f) => f.endsWith(".svg") && f !== "bg.svg");
    expect(marks.sort()).toEqual([...listed].sort());
  });

  it("name the list for a screen reader", () => {
    expect(PROTOCOLS_LABEL).toBe("Standards we install");
  });
});
