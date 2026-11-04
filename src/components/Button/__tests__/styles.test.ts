import { compile } from "sass";
import { join } from "node:path";

/** The solid band's hover, on the compiled CSS: jsdom applies no CSS Modules. */

const css = compile(join(__dirname, "../Button.module.scss")).css;

const block = (selector: string) => {
  const at = css.indexOf(`${selector} {`);
  if (at === -1) throw new Error(`no rule for ${selector}`);
  return css.slice(at, css.indexOf("}", at));
};

describe("the solid band's hover", () => {
  const hover = () => block(".button[data-variant=solid]:hover:not(:disabled)");

  test("runs 300ms, on longhands and a token's curve", () => {
    expect(hover()).toMatch(/animation-name:\s*button-swipe/);
    expect(hover()).toMatch(/animation-duration:\s*300ms/);
    expect(hover()).toMatch(/animation-timing-function:\s*var\(--ease-in-out\)/);
    expect(hover()).not.toMatch(/\banimation:/);
  });

  test("swipes the ground in from the start edge, from nothing to all of it", () => {
    expect(css).toMatch(
      /@keyframes button-swipe\s*\{\s*from\s*\{\s*background-size:\s*0% 100%;\s*color:\s*var\(--color-bg-inverse-strong\);\s*\}\s*to\s*\{\s*background-size:\s*100% 100%;\s*color:\s*var\(--color-text-inverse\)/,
    );
    expect(hover()).toMatch(/background-repeat:\s*no-repeat/);
    expect(hover()).not.toMatch(/background-position/);
  });

  test("ends as it began: the same ground under the same ink", () => {
    expect(hover()).toMatch(
      /background-image:\s*linear-gradient\(\s*var\(--color-bg-inverse-strong\)/,
    );
    expect(hover()).not.toMatch(/(^|[;\s])color:/);
    expect(hover()).not.toMatch(/animation-fill-mode/);
  });

  test("has nothing to fade through on the way in or out", () => {
    expect(block(".button[data-variant=solid]")).toMatch(/transition-property:\s*opacity/);
  });

  test("the nav's CTA, the same band by hand, swipes alike", () => {
    const nav = compile(join(__dirname, "../../Nav/Nav.module.scss")).css;
    const at = nav.indexOf(".cta:hover {");
    const rule = nav.slice(at, nav.indexOf("}", at));
    expect(rule).toMatch(/animation-name:\s*nav-cta-swipe/);
    expect(rule).toMatch(/animation-duration:\s*300ms/);
    expect(rule).not.toMatch(/opacity/);
  });

  test("no other variant swipes", () => {
    expect(css.match(/animation-name:/g)).toHaveLength(1);
  });
});
