import { compile } from "sass";
import { join } from "node:path";

/**
 * The hardware stylesheet's pace and the slide CTA's place, on the compiled
 * CSS: jsdom applies none of it.
 */

const css = compile(join(__dirname, "../Hardware.module.scss")).css;

function rule(selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`(?:^|[}\\s])${escaped}\\s*\\{([^}]*)\\}`, "m"));
  if (!match?.[1]) throw new Error(`no rule for ${selector}`);
  return match[1];
}

describe("Hardware.module.scss", () => {
  test("each slide shows for 3s, 2s faster than the 5s it was", () => {
    expect(rule(".hardware")).toMatch(/--hardware-interval:\s*3s/);
  });

  test("the timer line runs over that interval", () => {
    expect(rule(".progress")).toMatch(/animation-duration:\s*var\(--hardware-interval\)/);
  });

  test("the CTA sits 32px under the description", () => {
    expect(rule(".cta")).toMatch(/margin-block-start:\s*32px/);
  });

  test("the title's auto margin carries title, body and CTA to the column's foot", () => {
    expect(rule(".title")).toMatch(/margin-block-start:\s*auto/);
    expect(rule(".copy")).toMatch(/flex-direction:\s*column/);
  });

  test("keyboard focus on a slide's CTA holds the timer, as focus on a tab does", () => {
    // Found 2026-10-28: the slide moved on under a focused CTA.
    expect(css).toMatch(
      /\.stageRoot:has\(\.tabs :focus-visible, \.stage :focus-visible\) \.progress\s*\{\s*animation-play-state:\s*paused/,
    );
    expect(css).not.toMatch(/:has\(\.tabs :focus-visible\) /);
  });

  test("the pause glyph reads play while that focus holds it", () => {
    expect(css).toMatch(
      /\.stageRoot:has\(\.tabs :focus-visible, \.stage :focus-visible\) \.glyphPause/,
    );
    expect(css).toMatch(
      /\.stageRoot:has\(\.tabs :focus-visible, \.stage :focus-visible\) \.glyphPlay/,
    );
  });
});
