import { compile } from "sass";
import { join } from "node:path";

/**
 * The hero stylesheet's contract, on the compiled CSS. jsdom applies no CSS
 * Modules, so the component tests cannot see any of this, and the strip's
 * behaviour is all CSS. Three of these rules were bugs before they were
 * tests (2026-10-28):
 *
 * - focus pausing the strip sat on .strip, so the pause button's own focus
 *   held it still after "play";
 * - the reduced-motion block came before .pause, which then won and showed
 *   the button with nothing to pause;
 * - the blur inside the fading overlay would only appear once the fade
 *   ended, because an ancestor below opacity 1 cuts backdrop-filter off.
 *
 * Plus the project's SCSS rules: blocks layer, logical properties, longhands,
 * no !important, no ID selectors.
 */

const compiled = compile(join(__dirname, "../HomeHero.module.scss")).css;
const css = compiled.slice(compiled.indexOf("@layer blocks {"));

/** The declarations of the first rule whose selector matches, exactly. */
function rule(selector: string, within = css) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = within.match(new RegExp(`(?:^|[}\\s])${escaped}\\s*\\{([^}]*)\\}`, "m"));
  if (!match?.[1]) throw new Error(`no rule for ${selector}`);
  return match[1];
}

/** The body of the first @media block whose query contains `query`. */
function media(query: string) {
  const start = css.indexOf(`@media ${query}`);
  if (start === -1) throw new Error(`no @media ${query}`);
  let depth = 0;
  for (let i = css.indexOf("{", start); i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") depth -= 1;
    if (depth === 0) return css.slice(start, i + 1);
  }
  throw new Error(`unclosed @media ${query}`);
}

describe("HomeHero.module.scss", () => {
  test("everything is in the blocks layer", () => {
    expect(css.trimStart().startsWith("@layer blocks")).toBe(true);
    expect(css.match(/@layer\s+\w+/g)).toEqual(["@layer blocks"]);
  });

  describe("the strip's motion", () => {
    test("runs only for a visitor who has not asked for less motion", () => {
      const motion = media("(prefers-reduced-motion: no-preference)");
      expect(motion).toMatch(/animation-name:\s*hero-strip/);
      // Nowhere else: the reset's 0.01ms trick would run it once and stop it
      // a frame later at a random offset.
      expect(css.match(/animation-name:\s*hero-strip/g)).toHaveLength(1);
    });

    test("loops forever at a steady, slow pace, as longhands", () => {
      const motion = media("(prefers-reduced-motion: no-preference)");
      const track = rule(".track", motion);
      expect(track).toMatch(/animation-duration:\s*var\(--hero-strip-duration\)/);
      expect(track).toMatch(/animation-timing-function:\s*linear/);
      expect(track).toMatch(/animation-iteration-count:\s*infinite/);
      expect(track).not.toMatch(/\banimation:/);
      expect(rule(".hero")).toMatch(/--hero-strip-duration:\s*80s/);
    });

    test("moves exactly half the track, the width of one copy, right to left", () => {
      expect(css).toMatch(/@keyframes hero-strip\s*\{\s*to\s*\{\s*translate:\s*-50% 0;?\s*\}/);
    });

    test("ends each copy in the gap, so the half is exact and the loop has no seam", () => {
      const list = rule(".list");
      const gap = list.match(/(?:^|;)\s*gap:\s*([^;]+);/)?.[1];
      const end = list.match(/padding-inline-end:\s*([^;]+);/)?.[1];
      expect(gap).toBeDefined();
      expect(end).toBe(gap);
    });

    test("stops on hover, on focus inside the track, and on the pause button", () => {
      const motion = media("(prefers-reduced-motion: no-preference)");
      const paused = motion.match(/([^{}]+)\{\s*animation-play-state:\s*paused;?\s*\}/)?.[1];
      const selectors = paused?.split(",").map((s) => s.trim());
      expect(selectors).toEqual([
        ".track:hover",
        ".track:focus-within",
        ".strip[data-paused] .track",
      ]);
    });

    test("does not stop on focus anywhere in the strip, or the pause button would hold it", () => {
      expect(css).not.toMatch(/\.strip:focus-within/);
      expect(css).not.toMatch(/\.strip:hover/);
    });
  });

  describe("under reduced motion", () => {
    const reduce = () => media("(prefers-reduced-motion: reduce)");

    test("the strip scrolls sideways by hand, snapping to cards", () => {
      expect(rule(".strip", reduce())).toMatch(/overflow-x:\s*auto/);
      expect(rule(".strip", reduce())).toMatch(/scroll-snap-type:\s*x proximity/);
      expect(rule(".card", reduce())).toMatch(/scroll-snap-align:\s*start/);
    });

    test("drops the loop's second copy and the pause button", () => {
      expect(reduce()).toMatch(/\.list\[data-copy\],\s*\.pause\s*\{\s*display:\s*none/);
    });

    test("comes after .card and .pause, so it wins at equal specificity", () => {
      const at = css.indexOf("@media (prefers-reduced-motion: reduce)");
      const after = at + reduce().length;
      expect(css.lastIndexOf(".pause {", at)).toBeGreaterThan(-1);
      expect(css.lastIndexOf(".card {", at)).toBeGreaterThan(-1);
      expect(css.indexOf(".pause {", after)).toBe(-1);
      expect(css.indexOf(".card {", after)).toBe(-1);
    });
  });

  describe("the card overlay", () => {
    test("is hidden until hover or focus", () => {
      expect(rule(".overlay")).toMatch(/opacity:\s*0/);
      expect(css).toMatch(
        /\.card:hover \.overlay,\s*\.card:focus-within \.overlay\s*\{\s*opacity:\s*1/,
      );
    });

    test("always shows where there is no hover to reveal it", () => {
      const touch = media("(hover: none)");
      expect(rule(".overlay", touch)).toMatch(/opacity:\s*1/);
      expect(rule(".card::before", touch)).toMatch(
        /backdrop-filter:\s*blur\(var\(--hero-card-blur\)\)/,
      );
    });

    test("shades pure black from nothing at the top to 30% at the foot", () => {
      expect(rule(".hero")).toMatch(/--hero-card-shade:\s*rgb\(0 0 0 \/ 30%\)/);
      expect(rule(".overlay")).toMatch(
        /background-image:\s*linear-gradient\(to bottom, transparent, var\(--hero-card-shade\)\)/,
      );
    });

    test("fades on the duration and easing tokens, as longhands", () => {
      const overlay = rule(".overlay");
      expect(overlay).toMatch(/transition-property:\s*opacity/);
      expect(overlay).toMatch(/transition-duration:\s*var\(--duration-normal\)/);
      expect(overlay).toMatch(/transition-timing-function:\s*var\(--ease-out\)/);
      expect(overlay).not.toMatch(/\btransition:/);
    });

    test("sits above the blur, so the text is never blurred", () => {
      expect(rule(".overlay")).toMatch(/z-index:\s*2/);
      expect(rule(".card::before")).toMatch(/z-index:\s*1/);
      expect(rule(".card")).toMatch(/isolation:\s*isolate/);
    });
  });

  describe("the progressive blur", () => {
    test("is on the card, not inside the fading overlay", () => {
      expect(css).not.toMatch(/\.overlay::before/);
      expect(rule(".card::before")).toMatch(/backdrop-filter:\s*blur\(0\)/);
    });

    test("rises linearly from none at the top to 12px at the foot", () => {
      expect(rule(".hero")).toMatch(/--hero-card-blur:\s*12px/);
      expect(rule(".card::before")).toMatch(
        /mask-image:\s*linear-gradient\(to bottom, transparent, black\)/,
      );
    });

    test("blurs fully on hover and on focus, animating its own radius", () => {
      expect(css).toMatch(
        /\.card:hover::before,\s*\.card:focus-within::before\s*\{\s*backdrop-filter:\s*blur\(var\(--hero-card-blur\)\)/,
      );
      expect(rule(".card::before")).toMatch(/transition-property:\s*backdrop-filter/);
    });
  });

  describe("layout", () => {
    test("the strip leaves body's guttered column and runs edge to edge", () => {
      const strip = rule(".strip");
      expect(strip).toMatch(/inline-size:\s*100vw/);
      expect(strip).toMatch(/margin-inline:\s*calc\(50% - 50vw\)/);
      expect(strip).toMatch(/overflow:\s*hidden/);
    });

    test("cards are 400 by 300 from lg, smaller on a phone", () => {
      expect(rule(".hero")).toMatch(/--hero-card-inline:\s*18rem/);
      expect(css).toMatch(/--hero-card-inline:\s*25rem/);
      expect(css).toMatch(/--hero-card-block:\s*18\.75rem/);
    });

    test("images fill their card without distortion", () => {
      expect(rule(".image")).toMatch(/object-fit:\s*cover/);
    });

    test("the pause button is a full touch target, in the corner away from the CTAs", () => {
      const pause = rule(".pause");
      expect(pause).toMatch(/inline-size:\s*var\(--size-touch-target\)/);
      expect(pause).toMatch(/block-size:\s*var\(--size-touch-target\)/);
      expect(pause).toMatch(/inset-block-start:/);
      expect(pause).not.toMatch(/inset-block-end:/);
    });

    test("the faces overlap and carry the brown-600 ring", () => {
      expect(rule(".face")).toMatch(/border-color:\s*var\(--brown-600\)/);
      expect(rule(".face")).toMatch(/border-radius:\s*var\(--radius-full\)/);
      expect(rule(".face + .face")).toMatch(/margin-inline-start:\s*var\(--hero-face-overlap\)/);
    });

    test("the pill is an outlined capsule", () => {
      const pill = rule(".pill");
      expect(pill).toMatch(/border-radius:\s*var\(--radius-full\)/);
      expect(pill).toMatch(/border-style:\s*solid/);
    });

    test("lists draw no bullets", () => {
      expect(rule(".list")).toMatch(/list-style:\s*none/);
    });
  });

  describe("project rules", () => {
    test("logical properties only", () => {
      expect(css).not.toMatch(
        /(?:^|[\s;{])(?:padding|margin|border)-(?:left|right|top|bottom)\s*:/m,
      );
      expect(css).not.toMatch(/(?:^|[\s;{])(?:width|height|left|right|top|bottom)\s*:/m);
    });

    test("no var() inside a shorthand", () => {
      for (const prop of ["font", "background", "border", "transition", "animation"]) {
        expect(css).not.toMatch(new RegExp(`(?:^|[\\s;{])${prop}:[^;]*var\\(`, "m"));
      }
    });

    test("no !important and no ID selectors", () => {
      expect(css).not.toMatch(/!important/);
      expect(css).not.toMatch(/(?:^|[\s,}])#[a-z]/im);
    });
  });
});
