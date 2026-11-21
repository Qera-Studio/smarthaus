import { compile } from "sass";
import { join } from "node:path";

/** The stat cards' spacing, on the compiled CSS: jsdom applies none of it. */

const css = compile(join(__dirname, "../Stats.module.scss")).css;

describe("Stats.module.scss", () => {
  test("the cards are 16px apart at every width (2026-10-28; it was 32 from lg)", () => {
    const grid = css.match(/\.grid\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(grid).toMatch(/(?:^|;)\s*gap:\s*16px/);
    // No wider gap anywhere else, at any breakpoint.
    expect(css.match(/\.grid\s*\{[^}]*\}/g)).toHaveLength(1);
  });
});
