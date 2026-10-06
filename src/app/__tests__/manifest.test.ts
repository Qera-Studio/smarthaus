/**
 * @jest-environment node
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import manifest from "../manifest";
import { metadata, viewport } from "../layout";

/**
 * The web app manifest: what a phone shows when the site is added to the home
 * screen, and the colours of its launch screen. Nothing renders it in a test
 * or in e2e, so it drifted: until 2026-10-02 it carried an em dash and a
 * "premium... seamless" pitch the rest of the site had dropped.
 */

const m = manifest();

/** Width and height from a PNG's IHDR chunk. */
function pngSize(file: string) {
  const buf = readFileSync(join(process.cwd(), "public", file));
  expect(buf.subarray(1, 4).toString("ascii")).toBe("PNG");
  return `${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`;
}

describe("web app manifest", () => {
  it("names the app as the site titles itself", () => {
    expect(m.name).toBe((metadata.title as { default: string }).default);
    expect(m.short_name).toBe("Smarthaus");
  });

  it("describes it with the site's own description", () => {
    expect(m.description).toBe(metadata.description);
  });

  it("uses no em dash and none of the dropped sales language", () => {
    const text = `${m.name} ${m.short_name} ${m.description}`;
    expect(text).not.toContain("—");
    expect(text).not.toMatch(/premium|seamless|solutions/i);
  });

  it("launches on the canvas colour, matching the browser chrome", () => {
    // A different launch ground flashes before the first paint.
    expect(m.background_color).toBe(viewport.themeColor);
    expect(m.theme_color).toBe(viewport.themeColor);
  });

  it("opens the homepage as a standalone app", () => {
    expect(m.start_url).toBe("/");
    expect(m.display).toBe("standalone");
  });

  it("points every icon at a PNG that exists at the size it declares", () => {
    expect(m.icons).toHaveLength(3);
    for (const icon of m.icons ?? []) {
      expect(icon.type).toBe("image/png");
      expect(pngSize(icon.src)).toBe(icon.sizes);
    }
  });

  it("offers one maskable icon for Android's adaptive shapes", () => {
    const maskable = (m.icons ?? []).filter((i) => i.purpose === "maskable");
    expect(maskable).toHaveLength(1);
    expect(maskable[0]!.sizes).toBe("512x512");
  });
});
