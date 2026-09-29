/**
 * @jest-environment node
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The current page's nav link carries aria-current="page" and no visual mark:
 * the 1px rule under it was removed at Shivanshu's request (2026-09-28).
 * NavLink.test.tsx pins the attribute; this pins that the stylesheet adds
 * nothing for it, so the rule cannot come back unnoticed. CLAUDE.md's 2.4.8
 * row records the cue as programmatic only.
 */
const scss = readFileSync(join(__dirname, "../Nav.module.scss"), "utf8");
const code = scss.replace(/\/\/[^\n]*/g, "");

describe("the current page in the nav", () => {
  it("has no rule of its own in the stylesheet", () => {
    expect(code).not.toMatch(/aria-current/);
  });

  it("draws no pseudo-element under a link", () => {
    expect(code).not.toMatch(/\.link[^{]*::after/);
  });

  it("says in the stylesheet why the mark is gone, where the next person looks", () => {
    expect(scss).toMatch(/aria-current="page" and nothing visual/);
  });
});
