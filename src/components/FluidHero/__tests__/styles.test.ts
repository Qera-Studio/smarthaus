import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compile } from "sass";

/**
 * The stylesheet's contract, checked on the compiled CSS. jsdom applies no
 * CSS Modules, so the unit tests for the components cannot see any of this,
 * and each rule here is one the effect or the site depends on:
 *
 * - the canvas is transparent until data-ready, so the CSS ground is the
 *   first paint and there is never a black flash;
 * - touch-action keeps vertical scroll and pinch zoom (WCAG 1.4.4) while
 *   the sideways drag feeds the field;
 * - the ground carries a hint of brown-800 from CSS, so every gated state
 *   still reads as the design;
 * - the project's SCSS rules: blocks layer, logical properties, tokens, no
 *   !important, no ID selectors.
 */

// The @use of _variables.scss emits the :root tokens and the layer order
// first; this file's own rules start at its @layer block.
const compiled = compile(join(__dirname, "../FluidHero.module.scss")).css;
const css = compiled.slice(compiled.indexOf("@layer blocks {"));

/** The declarations of the first rule whose selector matches. */
function rule(selector: RegExp) {
  const match = css.match(new RegExp(`${selector.source}\\s*\\{([^}]*)\\}`));
  if (!match?.[1]) throw new Error(`no rule for ${selector}`);
  return match[1];
}

describe("FluidHero.module.scss", () => {
  test("everything is in the blocks layer", () => {
    expect(css.trimStart().startsWith("@layer blocks")).toBe(true);
    expect(css.match(/@layer\s+\w+/g)).toEqual(["@layer blocks"]);
  });

  test("the canvas is hidden until the section is ready", () => {
    const canvas = rule(/\.canvas/);
    expect(canvas).toMatch(/opacity:\s*0\b/);
    expect(canvas).toMatch(/pointer-events:\s*none/);
    expect(canvas).toMatch(/position:\s*absolute/);
    expect(canvas).toMatch(/inset:\s*0/);
    const ready = rule(/\.hero\[data-ready\]\s+\.canvas/);
    expect(ready).toMatch(/opacity:\s*1\b/);
  });

  test("the canvas fades in on the duration and easing tokens, as longhands", () => {
    const canvas = rule(/\.canvas/);
    expect(canvas).toMatch(/transition-property:\s*opacity/);
    expect(canvas).toMatch(/transition-duration:\s*var\(--duration-slow\)/);
    expect(canvas).toMatch(/transition-timing-function:\s*var\(--ease-out\)/);
    expect(canvas).not.toMatch(/\btransition:/);
  });

  test("the section keeps vertical scroll and pinch zoom under a finger", () => {
    expect(rule(/\.hero/)).toMatch(/touch-action:\s*pan-y pinch-zoom/);
  });

  test("the section paints its own ground from the two tokens", () => {
    const hero = rule(/\.hero/);
    expect(hero).toMatch(/background-color:\s*var\(--color-bg-canvas\)/);
    expect(hero).toMatch(/background-image:\s*radial-gradient\(/);
    expect(hero).toMatch(
      /color-mix\(in srgb, var\(--brown-800\) var\(--hero-ground-ink\), transparent\)/,
    );
    expect(hero).toMatch(/isolation:\s*isolate/);
    expect(hero).toMatch(/position:\s*relative/);
  });

  test("the copy sits above the canvas", () => {
    expect(rule(/\.inner/)).toMatch(/position:\s*relative/);
    expect(rule(/\.canvas/)).toMatch(/z-index:\s*var\(--z-base\)/);
  });

  test("fills the viewport under the nav on both layouts", () => {
    const hero = rule(/\.hero/);
    expect(hero).toMatch(/min-block-size:\s*calc\(\s*100svh - var\(--nav-bar-block-size\)/);
    expect(hero).toMatch(/env\(safe-area-inset-bottom\)/);
    expect(css).toMatch(
      /@media \(min-width: 1024px\)[^}]*\{[^}]*min-block-size:\s*calc\(100svh - var\(--hero-nav-block\)\)/,
    );
    expect(css).not.toMatch(/100vh|100dvh/);
  });

  test("uses logical properties only", () => {
    // Declarations only: a media query's (min-width: ...) is not a property.
    // (?<![-\w]) so line-height and border-top-width do not count as
    // physical `height` or `top`.
    const declarations = css.replace(/@media[^{]*/g, "");
    expect(declarations).not.toMatch(/(?<![-\w])(padding|margin)-(left|right|top|bottom)\s*:/);
    expect(declarations).not.toMatch(/(?<![-\w])(min-|max-)?(width|height)\s*:/);
    expect(declarations).not.toMatch(/(?<![-\w])(left|right|top|bottom)\s*:/);
  });

  test("has no !important and no ID selectors", () => {
    expect(css).not.toContain("!important");
    expect(css).not.toMatch(/#[a-z][\w-]*\s*[{,]/i);
  });

  test("puts no var() inside a shorthand", () => {
    for (const shorthand of ["font", "background", "border", "transition", "grid-area"]) {
      const uses = css.match(new RegExp(`(^|[;{\\s])${shorthand}\\s*:[^;]*var\\(`, "gm")) ?? [];
      expect(uses).toEqual([]);
    }
  });

  test("keeps the CTA styles the villa hero had, so the buttons do not change", () => {
    const primary = rule(/\.primary/);
    expect(primary).toMatch(/background-color:\s*var\(--color-bg-inverse-strong\)/);
    expect(primary).toMatch(/color:\s*var\(--color-text-inverse\)/);
    // The standalone rule, not the ".primary,\n.secondary" one it shares.
    const secondary = rule(/(?<=\}\s*)\.secondary/);
    expect(secondary).toMatch(/background-color:\s*transparent/);
    expect(secondary).toMatch(/border-color:\s*var\(--color-text-primary\)/);
    expect(css).toMatch(/\.primary:hover/);
    expect(css).toMatch(/\.secondary:hover/);
    expect(css).toMatch(/\.primary:focus-visible/);
  });

  test("keeps the copy's type on the display and body tokens", () => {
    expect(rule(/\.title/)).toMatch(/font-size:\s*var\(--type-display\)/);
    expect(rule(/\.lede/)).toMatch(/font-size:\s*var\(--type-body-lg\)/);
    expect(rule(/\.title/)).toMatch(/text-wrap:\s*balance/);
  });
});

describe("the class registry", () => {
  // Every `styles.x` the components read exists in the stylesheet, and every
  // class the stylesheet defines is read by a component. The strict proxy in
  // __mocks__ only rejects impossible keys; this is the registry check it
  // leaves room for.
  const used = new Set<string>();
  for (const file of ["FluidHero.tsx", "FluidCanvas.tsx"]) {
    const source = readFileSync(join(__dirname, "..", file), "utf8");
    for (const match of source.matchAll(/styles\.(\w+)/g)) used.add(match[1] ?? "");
  }
  const defined = new Set([...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1] ?? ""));

  test("every class a component reads is defined", () => {
    for (const name of used) expect(defined).toContain(name);
  });

  test("every class the stylesheet defines is read by a component", () => {
    for (const name of defined) expect(used).toContain(name);
  });

  test("the components read the eight classes the section is built from", () => {
    expect([...used].sort()).toEqual(
      [
        "byline",
        "canvas",
        "copy",
        "ctas",
        "hero",
        "inner",
        "lede",
        "primary",
        "secondary",
        "title",
      ].sort(),
    );
  });
});

describe("motion", () => {
  test("declares no animation: the only motion is the canvas fade, a transition", () => {
    expect(css).not.toMatch(/animation/);
    expect(css).not.toMatch(/@keyframes/);
    expect(css.match(/transition-property/g)).toHaveLength(2);
  });

  test("the fade is short enough that the reduced-motion reset is the only opt-out needed", () => {
    // _reset.scss zeroes every transition duration under reduced motion; the
    // canvas never mounts there anyway. Nothing here overrides that.
    expect(css).not.toMatch(/prefers-reduced-motion/);
  });
});

describe("tokens", () => {
  // A var() whose token does not exist is not an error anywhere: the
  // declaration is dropped at computed-value time, silently. So every token
  // the stylesheet reads is checked against where tokens are defined.
  const variables = readFileSync(join(__dirname, "../../../styles/_variables.scss"), "utf8");
  const local = new Set([...css.matchAll(/^\s*(--hero-[\w-]+):/gm)].map((m) => m[1]));
  const read = [...new Set([...css.matchAll(/var\((--[\w-]+)\)/g)].map((m) => m[1] ?? ""))];

  test("reads at least the tokens the design depends on", () => {
    for (const token of [
      "--color-bg-canvas",
      "--brown-800",
      "--duration-slow",
      "--ease-out",
      "--z-base",
      "--type-display",
      "--type-body-lg",
      "--color-text-primary",
      "--nav-bar-block-size",
    ]) {
      expect(read).toContain(token);
    }
  });

  test("every token it reads is defined by the system or by the section itself", () => {
    for (const token of read) {
      const defined = local.has(token) || variables.includes(`${token}:`);
      expect(defined ? token : `undefined token ${token}`).toBe(token);
    }
  });

  test("defines its local tokens on the section, where the canvas can inherit them", () => {
    expect([...local].sort()).toEqual(["--hero-ground-ink", "--hero-nav-block"]);
    expect(rule(/\.hero/)).toMatch(/--hero-ground-ink:\s*14%/);
  });
});
