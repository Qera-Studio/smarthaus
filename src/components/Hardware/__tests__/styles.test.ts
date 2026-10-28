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
});
