/**
 * @jest-environment node
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * The native cursor is one brown dot, everywhere: never the hand or arrow a
 * component stylesheet would otherwise set. globals.scss is the only place a
 * cursor is declared: html carries the dot, dark grounds carry the light dot,
 * and every control inherits. Since 2026-10-03 Cursor.tsx draws an inverting
 * dot and square over it for a mouse, and hides the native one with a single
 * `cursor: none` keyed on <html data-cursor>. That replaces the cursor rather
 * than hiding it over controls, which is what the client ruled out before.
 *
 * A component stylesheet setting its own cursor would silently win over that,
 * because components sit in a later cascade layer than the base rule. So the
 * check is on source: any cursor declaration outside globals.scss fails.
 */

const SRC = join(process.cwd(), "src");
const GLOBALS = join(SRC, "styles", "globals.scss");

function walk(dir: string, match: RegExp): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "__tests__" ? [] : walk(path, match);
    return match.test(name) ? [path] : [];
  });
}

// A declaration, not a comment: the property at the start of a line.
const DECLARATION = /^\s*cursor\s*:/m;

describe("the cursor is the dot everywhere", () => {
  it("no stylesheet but globals.scss declares a cursor", () => {
    const offenders = walk(SRC, /\.s?css$/)
      .filter((file) => file !== GLOBALS && DECLARATION.test(readFileSync(file, "utf8")))
      .map((file) => relative(process.cwd(), file));
    expect(offenders).toEqual([]);
  });

  it("globals.scss declares only the two dots, inherit, and the takeover", () => {
    const globals = readFileSync(GLOBALS, "utf8");
    const values = [...globals.matchAll(/^\s*cursor\s*:\s*([^;]+);/gm)].map((m) =>
      m[1]!.replace(/\s+/g, " ").trim(),
    );
    // html's dark dot, the dark grounds' light dot, the controls' inherit, and
    // the one `none` for when Cursor.tsx has taken over.
    expect(values).toHaveLength(4);
    expect(values.filter((v) => v.includes("%2314110E"))).toHaveLength(1);
    expect(values.filter((v) => v.includes("%23F8F5F0"))).toHaveLength(1);
    expect(values).toContain("inherit");
    expect(values.filter((v) => v === "none")).toHaveLength(1);
    expect(globals).not.toMatch(/cursor\s*:\s*(pointer|default)\b/);
  });

  it("hides the native cursor only once Cursor.tsx has taken over", () => {
    // Anywhere else, a `none` would leave a visitor with no cursor at all
    // before the script runs, on touch, or in forced colours.
    const globals = readFileSync(GLOBALS, "utf8");
    const at = globals.indexOf("cursor: none;");
    const selectors = globals.slice(globals.lastIndexOf("}", at) + 1, globals.lastIndexOf("{", at));
    const list = selectors
      .replace(/^\s*\/\/.*$/gm, "")
      .split(",")
      .map((sel) => sel.trim());
    expect(list).toEqual([
      'html[data-cursor="custom"]',
      'html[data-cursor="custom"] [data-ground="dark"]',
    ]);
  });

  it("every kind of control inherits the dot", () => {
    const globals = readFileSync(GLOBALS, "utf8");
    // The selector list is everything between the rule before it and its own
    // opening brace, with comment lines dropped.
    const open = globals.lastIndexOf("{", globals.indexOf("cursor: inherit;"));
    const selectors = globals
      .slice(globals.lastIndexOf("}", open) + 1, open)
      .replace(/^\s*\/\/.*$/gm, "")
      .split(",")
      .map((s) => s.trim());
    for (const control of [
      "a",
      "button",
      '[role="button"]',
      "summary",
      "label",
      "select",
      "input",
      "textarea",
    ]) {
      expect(selectors).toContain(control);
    }
  });

  it("no component but Cursor.tsx touches the cursor attribute", () => {
    // Per-component opt-ins or opt-outs are how the dot used to drift.
    const OWNER = join(SRC, "components", "Cursor", "Cursor.tsx");
    const offenders = walk(SRC, /\.tsx?$/)
      .filter((file) => file !== OWNER)
      .filter((file) => /data-cursor|dataset\.cursor/.test(readFileSync(file, "utf8")))
      .map((file) => relative(process.cwd(), file));
    expect(offenders).toEqual([]);
  });

  it("scans real files, so an empty result means something", () => {
    // A walk that found nothing would pass the checks above vacuously.
    expect(walk(SRC, /\.s?css$/).length).toBeGreaterThan(10);
    expect(walk(SRC, /\.tsx?$/).length).toBeGreaterThan(10);
  });
});
