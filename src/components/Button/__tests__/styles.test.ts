import { compile } from "sass";
import { join } from "node:path";

/** The bands' hover, on the compiled CSS: jsdom applies no CSS Modules. */

const css = compile(join(__dirname, "../Button.module.scss")).css;

/** Every rule as its selector list and its declarations, keyframes' steps included. */
const RULES = Array.from(css.matchAll(/([^{}]+)\{([^{}]*)\}/g), (m) => ({
  selectors: m[1]!.split(",").map((s) => s.trim()),
  body: m[2]!,
}));

/** The declarations of every rule that names `selector`, grouped or alone. */
const rules = (selector: string) => {
  const found = RULES.filter((r) => r.selectors.includes(selector));
  if (found.length === 0) throw new Error(`no rule for ${selector}`);
  return found.map((r) => r.body).join("\n");
};

const SWIPING = ["solid", "inverse"] as const;

describe.each(SWIPING)("the %s band's hover", (variant) => {
  const hover = () => rules(`.button[data-variant=${variant}]:hover:not(:disabled)`);

  test("runs 300ms, on longhands and a token's curve", () => {
    expect(hover()).toMatch(/animation-name:\s*button-swipe/);
    expect(hover()).toMatch(/animation-duration:\s*300ms/);
    expect(hover()).toMatch(/animation-timing-function:\s*var\(--ease-in-out\)/);
    expect(hover()).not.toMatch(/\banimation:/);
  });

  test("empties to an outline of its own ground", () => {
    expect(hover()).toMatch(/background-color:\s*transparent/);
    expect(hover()).toMatch(/border-color:\s*var\(--button-ground\)/);
  });

  test("swipes in from the start edge: no position, no repeat", () => {
    expect(hover()).toMatch(/background-repeat:\s*no-repeat/);
    expect(hover()).not.toMatch(/background-position/);
  });

  test("ends as it began: the same ground under the same ink", () => {
    expect(hover()).toMatch(
      /background-image:\s*linear-gradient\(var\(--button-ground\),\s*var\(--button-ground\)\)/,
    );
    expect(hover()).not.toMatch(/(^|[;\s])color:/);
    expect(hover()).not.toMatch(/animation-fill-mode/);
  });

  test("has nothing to fade through on the way in or out", () => {
    expect(rules(`.button[data-variant=${variant}]`)).toMatch(/transition-property:\s*opacity/);
  });

  test("is drawn at rest from the same two properties the swipe reads", () => {
    const rest = rules(`.button[data-variant=${variant}]`);
    expect(rest).toMatch(/background-color:\s*var\(--button-ground\)/);
    expect(rest).toMatch(/(^|[;\s])color:\s*var\(--button-ink\)/);
  });
});

describe("the swipe", () => {
  test("runs the band's own ground in from nothing to all of it, its ink turning with it", () => {
    expect(css).toMatch(
      /@keyframes button-swipe\s*\{\s*from\s*\{\s*background-size:\s*0% 100%;\s*color:\s*var\(--button-ground\);\s*\}\s*to\s*\{\s*background-size:\s*100% 100%;\s*color:\s*var\(--button-ink\)/,
    );
  });

  test("solid is brown-950 under brown-100 ink", () => {
    const solid = rules(".button[data-variant=solid]");
    expect(solid).toMatch(/--button-ground:\s*var\(--color-bg-inverse-strong\)/);
    expect(solid).toMatch(/--button-ink:\s*var\(--color-text-inverse\)/);
  });

  test("one rule, and only the two bands in it", () => {
    expect(css.match(/animation-name:/g)).toHaveLength(1);
    const swiping = RULES.find((r) => /animation-name:/.test(r.body))!;
    expect(swiping.selectors).toEqual(
      SWIPING.map((v) => `.button[data-variant=${v}]:hover:not(:disabled)`),
    );
  });

  test("soft and outline keep a plain fill on hover", () => {
    for (const variant of ["soft", "outline"]) {
      const hover = rules(`.button[data-variant=${variant}]:hover:not(:disabled)`);
      expect(hover).not.toMatch(/animation|--button-/);
      expect(hover).toMatch(/background-color:/);
    }
  });

  test("the nav's CTA, the same band by hand, swipes alike", () => {
    const nav = compile(join(__dirname, "../../Nav/Nav.module.scss")).css;
    const at = nav.indexOf(".cta:hover {");
    const rule = nav.slice(at, nav.indexOf("}", at));
    expect(rule).toMatch(/animation-name:\s*nav-cta-swipe/);
    expect(rule).toMatch(/animation-duration:\s*300ms/);
    expect(rule).not.toMatch(/opacity/);
  });
});

// The light button is brown-100, the surface, not the page's ground: the
// ground went to brown-50 on 2026-11-14 and the button went back to brown-100
// the same day (Shivanshu). Both are light buttons over the dark hero, and
// both swipe (2026-11-15).
describe("the light button", () => {
  const nav = compile(join(__dirname, "../../Nav/Nav.module.scss")).css;

  test("fills with the surface, brown-100", () => {
    expect(rules(".button[data-variant=inverse]")).toMatch(
      /--button-ground:\s*var\(--color-bg-surface\)/,
    );
  });

  test("keeps the dark ink on it", () => {
    expect(rules(".button[data-variant=inverse]")).toMatch(
      /--button-ink:\s*var\(--color-text-primary\)/,
    );
  });

  test("no longer steps down to brown-200 on hover: it swipes instead", () => {
    expect(rules(".button[data-variant=inverse]:hover:not(:disabled)")).not.toMatch(
      /--color-bg-muted/,
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
    expect(rules(".button[data-variant=inverse]")).not.toMatch(/--color-bg-canvas/);
    expect(nav).not.toMatch(/--nav-cta-bg:\s*var\(--color-bg-canvas\)/);
  });
});
