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

// The light button is brown-100, the surface, not the page's ground: the
// ground went to brown-50 on 2026-11-14 and the button went back to brown-100
// the same day (Shivanshu). Both are light buttons over the dark hero.
describe("the light button", () => {
  const nav = compile(join(__dirname, "../../Nav/Nav.module.scss")).css;

  test("fills with the surface, brown-100", () => {
    expect(block(".button[data-variant=inverse]")).toMatch(
      /background-color:\s*var\(--color-bg-surface\)/,
    );
  });

  test("keeps the dark ink on it", () => {
    expect(block(".button[data-variant=inverse]")).toMatch(/color:\s*var\(--color-text-primary\)/);
  });

  test("goes down to brown-200 on hover, keeping the light face", () => {
    expect(block(".button[data-variant=inverse]:hover:not(:disabled)")).toMatch(
      /background-color:\s*var\(--color-bg-muted\)/,
    );
  });

  test("the nav's button over the dark hero is the same brown-100", () => {
    const at = nav.indexOf(":where(:root:has([data-hero])) .nav:not([data-stuck]) {");
    expect(at).toBeGreaterThan(-1);
    const rule = nav.slice(at, nav.indexOf("}", at));
    expect(rule).toMatch(/--nav-cta-bg:\s*var\(--color-bg-surface\)/);
    expect(rule).toMatch(/--nav-cta-ink:\s*var\(--color-text-primary\)/);
  });

  test("neither fills with the page's ground any more", () => {
    expect(block(".button[data-variant=inverse]")).not.toMatch(/--color-bg-canvas/);
    expect(nav).not.toMatch(/--nav-cta-bg:\s*var\(--color-bg-canvas\)/);
  });
});
