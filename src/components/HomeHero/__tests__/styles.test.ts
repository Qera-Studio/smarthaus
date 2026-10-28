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
      // 8s a card, eight cards: 2s a card faster than the 10s it was.
      expect(rule(".hero")).toMatch(/--hero-strip-duration:\s*64s/);
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

    test("holds still under a dragging hand", () => {
      const motion = media("(prefers-reduced-motion: no-preference)");
      expect(rule(".strip[data-dragging] .track", motion)).toMatch(
        /animation-play-state:\s*paused/,
      );
      expect(css).not.toMatch(/data-nudging/);
    });

    test("does not stop on focus anywhere in the strip, or a control would hold it", () => {
      expect(css).not.toMatch(/\.strip:focus-within/);
      expect(css).not.toMatch(/\.strip:hover/);
    });
  });

  describe("under reduced motion", () => {
    const reduce = () => media("(prefers-reduced-motion: reduce)");

    test("does not snap under a dragging hand, or the drag could not move it", () => {
      expect(rule(".strip[data-dragging]", reduce())).toMatch(/scroll-snap-type:\s*none/);
    });

    test("the strip scrolls sideways by hand, snapping to cards", () => {
      expect(rule(".strip", reduce())).toMatch(/overflow-x:\s*auto/);
      expect(rule(".strip", reduce())).toMatch(/scroll-snap-type:\s*x proximity/);
      expect(rule(".card", reduce())).toMatch(/scroll-snap-align:\s*start/);
    });

    test("drops the loop's second copy and the pause button", () => {
      expect(reduce()).toMatch(
        /\.list\[data-copy\],\s*\.control\[data-pause\]\s*\{\s*display:\s*none/,
      );
      expect(reduce()).not.toMatch(/\.control\s*\{/);
    });

    test("comes after .card and .control, so it wins at equal specificity", () => {
      const at = css.indexOf("@media (prefers-reduced-motion: reduce)");
      const after = at + reduce().length;
      expect(css.lastIndexOf(".control {", at)).toBeGreaterThan(-1);
      expect(css.lastIndexOf(".card {", at)).toBeGreaterThan(-1);
      expect(css.indexOf(".control {", after)).toBe(-1);
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

    test("the hero is exactly the screen under what sits above it, with a floor", () => {
      const hero = rule(".hero");
      expect(hero).toMatch(
        // Sass drops the calc() inside max(); the arithmetic is the same.
        /block-size:\s*max\(var\(--hero-min-block\), (?:calc\()?100svh - var\(--hero-above\) - var\(--hero-below\)\)?\)/,
      );
      expect(hero).not.toMatch(/min-block-size/);
      expect(hero).not.toMatch(/padding-block-end/);
    });

    test("below lg it ends above the floating nav; from lg the nav is above", () => {
      expect(rule(".hero")).toMatch(/--hero-above:\s*var\(--announce-block-size\)/);
      expect(rule(".hero")).toMatch(/--hero-below:\s*calc\(\s*var\(--nav-bar-block-size\)/);
      expect(css).toMatch(
        /--hero-above:\s*calc\(\s*var\(--announce-block-size\) \+ var\(--nav-rest-inset\) \+ var\(--nav-top-block-size\)\s*\)/,
      );
      expect(css).toMatch(/--hero-below:\s*0px/);
    });

    test("the strip is a share of the screen, giving way when the copy needs room", () => {
      const strip = rule(".strip");
      expect(rule(".hero")).toMatch(/--hero-strip-block:\s*42svh/);
      expect(strip).toMatch(/flex:\s*0 1 var\(--hero-strip-block\)/);
      expect(strip).toMatch(/min-block-size:\s*0/);
      expect(rule(".controls")).toMatch(/flex:\s*none/);
    });

    test("the copy is centred in what is left, so the strip stays at the bottom", () => {
      const copy = rule(".copy");
      expect(copy).toMatch(/margin-block:\s*auto/);
      expect(copy).toMatch(/flex:\s*none/);
      // The strip is the hero's last box and the hero ends at the screen's foot.
      expect(rule(".hero")).not.toMatch(/padding-block-end/);
    });

    test("the strip leaves vertical scroll to the page and sideways to the drag", () => {
      const strip = rule(".strip");
      expect(strip).toMatch(/touch-action:\s*pan-y pinch-zoom/);
      expect(strip).toMatch(/user-select:\s*none/);
    });

    test("cards are as tall as the strip, at 4:3", () => {
      for (const selector of [".track", ".list", ".card"]) {
        expect(rule(selector)).toMatch(/block-size:\s*100%/);
      }
      expect(rule(".card")).toMatch(/aspect-ratio:\s*4\s*\/\s*3/);
      expect(rule(".card")).not.toMatch(/inline-size:/);
    });

    test("images fill their card without distortion", () => {
      expect(rule(".image")).toMatch(/object-fit:\s*cover/);
    });

    test("the controls sit at the end of the column, above the strip", () => {
      const controls = rule(".controls");
      expect(controls).toMatch(/justify-content:\s*flex-end/);
      expect(controls).toMatch(/align-self:\s*stretch/);
    });

    test("the pause button is the hardware carousel's, at 32px", () => {
      const control = rule(".control");
      expect(control).toMatch(/inline-size:\s*32px/);
      expect(control).toMatch(/block-size:\s*32px/);
      expect(control).toMatch(/background-color:\s*var\(--glass-bg/);
      expect(css).toMatch(/\.control svg\s*\{\s*opacity:\s*0\.45/);
      expect(css).toMatch(
        /\.control:hover svg,\s*\.control\[aria-pressed=true\] svg\s*\{\s*opacity:\s*1/,
      );
    });

    test("its tap area stays 44px around the smaller face", () => {
      expect(rule(".control::after")).toMatch(
        /inset:\s*calc\(\(32px - var\(--size-touch-target\)\) \/ 2\)/,
      );
    });

    test("both lines are the same pair: stacked on a phone, ruled on the centre from sm", () => {
      expect(rule(".pair")).toMatch(/flex-direction:\s*column/);
      expect(css).toMatch(/\.pair\s*\{\s*display:\s*grid;\s*grid-template-columns:\s*1fr auto 1fr/);
      expect(css).toMatch(/\.pairStart\s*\{\s*text-align:\s*end/);
      expect(css).toMatch(/\.pairEnd\s*\{\s*text-align:\s*start/);
      expect(rule(".divider")).toMatch(/display:\s*none/);
      expect(css).toMatch(/\.divider\s*\{\s*display:\s*block;\s*inline-size:\s*1px/);
    });

    test("the pair is set as the SIRA line always was: small, regular, no outline", () => {
      const pair = rule(".pair");
      expect(pair).toMatch(/font-size:\s*var\(--font-size-sm\)/);
      expect(pair).not.toMatch(/font-weight/);
      expect(pair).not.toMatch(/border/);
      expect(css).not.toMatch(/\.proof|\.byline|\.rating/);
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
