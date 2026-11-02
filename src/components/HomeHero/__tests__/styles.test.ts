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
        /:where\(\.strip:not\(\[data-hand\]\)\) \.card:hover \.overlay,\s*\.card\[data-hover\] \.overlay,\s*\.card:focus-within \.overlay\s*\{\s*opacity:\s*1/,
      );
    });

    test("trusts :hover only until StripControls marks the card under the pointer", () => {
      expect(css).not.toMatch(/(^|[,}]\s*)\.card:hover/m);
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
        /:where\(\.strip:not\(\[data-hand\]\)\) \.card:hover::before,\s*\.card\[data-hover\]::before,\s*\.card:focus-within::before\s*\{\s*backdrop-filter:\s*blur\(var\(--hero-card-blur\)\)/,
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

    test("on a short phone the copy sits tighter and the floor gives way", () => {
      // An iPhone 17 in Safari: the strip was about 100px and ran 6px under
      // the nav (2026-11-02). Below lg and under 45rem tall only.
      const short = media("(max-width: 1023px) and (max-height: 45rem)");
      expect(short).toMatch(/--hero-min-block:\s*34rem/);
      expect(short).toMatch(/(^|[;{\s])gap:\s*8px/);
      expect(short).toMatch(/padding-block-start:\s*8px/);
      // The floor still sits under the 570px a short phone leaves, and above
      // what the copy alone needs.
      expect(rule(".hero")).toMatch(/--hero-min-block:\s*36rem/);
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

    test("both lines are the same pair: stacked on a phone, one centred line from sm", () => {
      expect(rule(".pair")).toMatch(/flex-direction:\s*column/);
      expect(rule(".pair")).toMatch(/align-items:\s*center/);
      expect(css).toMatch(/\.pair\s*\{\s*flex-direction:\s*row/);
      expect(css).not.toMatch(/1fr auto 1fr|pairStart|pairEnd/);
      expect(rule(".divider")).toMatch(/display:\s*none/);
      expect(css).toMatch(/\.divider\s*\{\s*display:\s*block;\s*inline-size:\s*1px/);
    });

    test("the pair is set as the SIRA line always was: small, regular, no outline", () => {
      const pair = rule(".pair");
      expect(pair).toMatch(/font-size:\s*var\(--font-size-sm\)/);
      expect(pair).toMatch(
        /color:\s*color-mix\(in srgb, var\(--color-text-primary\) 70%, transparent\)/,
      );
      expect(pair).not.toMatch(/opacity/);
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

  describe("the opening", () => {
    // Selector lists on one line, so a list can be matched whole.
    const motion = () => media("(prefers-reduced-motion: no-preference)").replace(/,\s+/g, ", ");
    const gate = ":where(:root[data-intro])";
    const held = ":where(:root[data-intro][data-splash=show])";

    test("plays only for a visitor who has not asked for less motion", () => {
      expect(css.match(/animation-name:\s*hero-in\b/g)).toHaveLength(1);
      expect(css.match(/animation-name:\s*hero-arrive/g)).toHaveLength(1);
      expect(motion()).toMatch(/animation-name:\s*hero-in\b/);
      expect(motion()).toMatch(/animation-name:\s*hero-arrive/);
    });

    test("plays only while <html> carries data-intro", () => {
      const fades = rule(
        `${gate} .title, ${gate} .lede, ${gate} .ctas, ${gate} .copy > .pair, ${gate} .controls`,
        motion(),
      );
      expect(fades).toMatch(/animation-name:\s*hero-in/);
      expect(rule(`${gate} .strip`, motion())).toMatch(/animation-name:\s*hero-arrive/);
    });

    test("fills backwards only, so nothing is held once it has played", () => {
      // Both only on the scroll-driven parallax, which holds its place
      // at either end of the scroll by design.
      expect(css).not.toMatch(/animation-fill-mode:\s*forwards/);
      expect(css.match(/animation-fill-mode:\s*backwards/g)).toHaveLength(2);
      expect(css.match(/animation-fill-mode:\s*both/g)).toHaveLength(1);
    });

    test("its timings sit on <html>, so the nav and the bar share them", () => {
      const root = rule(gate, motion());
      expect(root).toMatch(/--intro-duration:\s*1600ms/);
      expect(root).toMatch(/--intro-shift:\s*24px/);
      expect(
        rule(
          `${gate} .title, ${gate} .lede, ${gate} .ctas, ${gate} .copy > .pair, ${gate} .controls`,
          motion(),
        ),
      ).toMatch(/animation-duration:\s*var\(--intro-duration\)/);
    });

    test("in order: title, subtitle, then the CTAs with the strip, then the two lines", () => {
      expect(rule(`${gate} .lede`, motion())).toMatch(/animation-delay:\s*var\(--intro-lede\)/);
      expect(rule(`${gate} .ctas`, motion())).toMatch(/animation-delay:\s*var\(--intro-together\)/);
      expect(rule(`${gate} .strip`, motion())).toMatch(
        /animation-delay:\s*var\(--intro-together\)/,
      );
      // The list that opens right after a closing brace, not the tail of the
      // longer list that sets the keyframes.
      expect(
        rule(`}\n${gate} .copy > .pair, ${gate} .controls`, motion().replace(/\}\s+/g, "}\n")),
      ).toMatch(/animation-delay:\s*var\(--intro-rest\)/);
      const root = rule(gate, motion());
      const ms = (name: string) => Number(root.match(new RegExp(`--${name}:\\s*(\\d+)ms`))?.[1]);
      expect(ms("intro-lede")).toBeLessThan(ms("intro-together"));
      expect(ms("intro-together")).toBeLessThan(ms("intro-rest"));
      // Very slow, but all of it in within three seconds.
      const arrive = Number(rule(".hero").match(/--hero-arrive-duration:\s*(\d+)ms/)?.[1]);
      expect(ms("intro-together") + arrive).toBeLessThanOrEqual(3000);
      expect(ms("intro-rest") + ms("intro-duration")).toBeLessThanOrEqual(3000);
    });

    test("the rating line above the copy drops into place; the rest rises", () => {
      expect(rule(`${gate} .copy > .pair:first-child`, motion())).toMatch(/--intro-shift:\s*-24px/);
    });

    test("the strip arrives from the screen's right edge, steady to 70%, then braking", () => {
      expect(css).toMatch(/@keyframes hero-arrive\s*\{\s*from\s*\{\s*translate:\s*100vw 0;?\s*\}/);
      const ease = rule(".hero").match(/--hero-arrive-ease:\s*linear\(([^;]*)\)/)?.[1];
      const stops = ease!.split(",").map((stop) => stop.trim().split(/\s+/).map(parseFloat));
      expect(stops[0]).toEqual([0]);
      expect(stops.at(-1)).toEqual([1]);
      // 70% of the way at the end of the steady part, then each stretch
      // slower than the one before it.
      expect(stops[1]).toEqual([0.7, 53.8]);
      const speeds = stops.slice(1, -1).map(([at, time], i) => {
        const [prevAt, prevTime] = i === 0 ? [0, 0] : stops[i]!;
        return (at! - prevAt!) / (time! - prevTime!);
      });
      for (let i = 1; i < speeds.length; i += 1) expect(speeds[i]).toBeLessThan(speeds[i - 1]!);
      expect(rule(`${gate} .strip`, motion())).toMatch(
        /animation-timing-function:\s*var\(--hero-arrive-ease\)/,
      );
    });

    test("the strip, not the track, so the drift runs on underneath", () => {
      expect(() => rule(`${gate} .track`, motion())).toThrow();
    });

    test("the copy rises in from below as it fades", () => {
      expect(css).toMatch(
        /@keyframes hero-in\s*\{\s*from\s*\{\s*opacity:\s*0;\s*translate:\s*0 var\(--intro-shift\);?\s*\}/,
      );
    });

    test("waits while the splash covers the page", () => {
      const waiting = rule(
        `${held} .title, ${held} .lede, ${held} .ctas, ${held} .copy > .pair, ${held} .controls, ${held} .strip`,
        motion(),
      );
      expect(waiting).toMatch(/animation-play-state:\s*paused/);
    });

    test("its gate adds no specificity, under the 0,3,0 cap", () => {
      expect(css).not.toMatch(/(?<!:where\():root\[/);
    });
  });

  describe("four cards to the screen from lg", () => {
    test("the strip is as tall as a 4:3 card a quarter of the screen wide", () => {
      expect(media("(min-width: 1024px)")).toMatch(
        /--hero-strip-block:\s*calc\(\(100vw - 3 \* 8px\) \* 3 \/ 16\)/,
      );
    });

    test("so four cards and their three gaps are exactly the screen", () => {
      const gap = 8;
      for (const width of [1024, 1440, 1920]) {
        const card = (((width - 3 * gap) * 3) / 16) * (4 / 3);
        expect(4 * card + 3 * gap).toBeCloseTo(width);
      }
    });
  });

  describe("the page's scroll", () => {
    // The @supports block, which sits in a motion block of its own.
    const timeline = () => {
      const start = css.indexOf("@supports (animation-timeline: scroll())");
      if (start === -1) throw new Error("no @supports block");
      const before = css.lastIndexOf("@media", start);
      expect(css.slice(before, start)).toMatch(/^@media \(prefers-reduced-motion: no-preference\)/);
      return css.slice(start);
    };

    test("comes after .image, so the photograph's parallax height wins", () => {
      const base = css.search(/(?:^|[}\s])\.image\s*\{[^}]*object-fit/m);
      expect(base).toBeGreaterThan(-1);
      expect(css.indexOf("@supports (animation-timeline: scroll())")).toBeGreaterThan(base);
    });

    test("the photographs slide through their cards over the hero's height", () => {
      const image = rule(".image", timeline());
      expect(image).toMatch(/block-size:\s*calc\(100% \+ 50%\)/);
      expect(image).toMatch(/animation-name:\s*hero-parallax/);
      expect(image).toMatch(/animation-timeline:\s*scroll\(root\)/);
      expect(image).toMatch(/animation-range:\s*0 var\(--hero-parallax-range\)/);
      // From the spare showing at the foot to none: 50 of 150.
      const from = css.match(
        /@keyframes hero-parallax\s*\{\s*from\s*\{\s*translate:\s*0 (-[\d.]+)%/,
      )?.[1];
      expect(Number(from)).toBeCloseTo(-33.333, 2);
    });

    test("only for a visitor who allows motion, on a browser with scroll timelines", () => {
      expect(css.match(/animation-name:\s*hero-parallax/g)).toHaveLength(1);
      expect(timeline()).toMatch(/animation-name:\s*hero-parallax/);
      // The strip's own run on the scroll is StripControls', with no limit.
      expect(css).not.toMatch(/hero-scroll/);
      // Without them the photograph is its card's own size.
      expect(rule(".image")).toMatch(/block-size:\s*100%/);
    });
  });
});
