import { compile } from "sass";
import { existsSync, readFileSync } from "node:fs";
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
      // a frame later at a random offset. Once more for the opening's list.
      expect(css.match(/animation-name:\s*hero-strip/g)).toHaveLength(2);
      expect(motion.match(/animation-name:\s*hero-strip/g)).toHaveLength(2);
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
      // The second value is the opening's: see "holds neither" below.
      const paused = motion.match(
        /([^{}]+)\{\s*animation-play-state:\s*paused, running;?\s*\}/,
      )?.[1];
      const selectors = paused?.split(",").map((s) => s.trim());
      expect(selectors).toEqual([
        ".track:hover",
        ".track:focus-within",
        ".strip[data-paused] .track",
      ]);
    });

    test("no hold on the drift stops the opening's own run, which comes second", () => {
      const motion = media("(prefers-reduced-motion: no-preference)");
      expect(rule(".strip[data-dragging] .track", motion)).toMatch(
        /animation-play-state:\s*paused, running/,
      );
      expect(rule(":where(:root[data-intro]) .track", motion)).toMatch(
        /animation-name:\s*hero-strip, hero-arrive/,
      );
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

    test("everything reads from the start edge: nothing is centred any more", () => {
      expect(rule(".hero")).not.toMatch(/text-align/);
      expect(rule(".hero")).not.toMatch(/align-items/);
      expect(rule(".ctas")).not.toMatch(/justify-content/);
      expect(rule(".copy")).not.toMatch(/padding-inline/);
    });

    test("from lg the message and the proofs share a row, at its two ends", () => {
      // From the source's bp-lg block, compiled after the column rule.
      const copy = css.match(/\.copy\s*\{\s*(flex-direction:\s*row[^}]*)\}/)?.[1] ?? "";
      expect(copy).toMatch(/flex-direction:\s*row/);
      expect(copy).toMatch(/justify-content:\s*space-between/);
      expect(copy).toMatch(/align-items:\s*center/);
      expect(rule(".copy")).toMatch(/flex-direction:\s*column/);
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
      // In the strip's height, not aspect-ratio, which left a gap in WebKit.
      expect(rule(".card")).toMatch(/inline-size:\s*133\.3333333333cqb/);
      expect(rule(".strip")).toMatch(/container-type:\s*size/);
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

    test("the proofs are set as the old lines were: small, 70%, no weight, no outline", () => {
      const proof = rule(".proof");
      expect(proof).toMatch(/font-size:\s*calc\(var\(--font-size-sm\) \* 1\.05\)/);
      expect(proof).toMatch(
        /color:\s*color-mix\(in srgb, var\(--color-text-primary\) 70%, transparent\)/,
      );
      expect(proof).not.toMatch(/opacity|font-weight|border/);
      expect(proof).toMatch(/list-style:\s*none/);
      expect(css).not.toMatch(/\.pair|\.divider/);
    });

    test("every mark is the same box in the text's colour, whatever its file holds", () => {
      const icon = rule(".icon");
      expect(icon).toMatch(/inline-size:\s*1em/);
      expect(icon).toMatch(/block-size:\s*1em/);
      expect(icon).toMatch(/background-color:\s*currentcolor/);
      expect(icon).toMatch(/mask-size:\s*contain/);
      for (const [mark, file] of [
        ["star", "starIcon"],
        ["projects", "projectsLogo"],
        ["sira", "siraLogo"],
        ["maple", "mapletechIconMono"],
      ]) {
        expect(rule(`.${mark}`)).toMatch(
          new RegExp(`mask-image:\\s*url\\("/hero/${file}\\.svg"\\)`),
        );
        expect(existsSync(join(process.cwd(), `public/hero/${file}.svg`))).toBe(true);
      }
    });

    test("the Maple silhouette keeps its bulb: nothing white left to fill it in", () => {
      const svg = readFileSync(join(process.cwd(), "public/hero/mapletechIconMono.svg"), "utf8");
      expect(svg).toMatch(/<g mask="url\(#bulb\)">/);
      expect(svg.replace(/<mask[\s\S]*?<\/mask>/, "")).not.toMatch(/fill="white"/);
    });

    test("a mark survives forced colours, which would paint its ground away", () => {
      expect(media("(forced-colors: active)")).toMatch(/background-color:\s*CanvasText/);
    });

    test("the subtitle stops at 600px, and the CTAs stand a little further off it", () => {
      expect(rule(".lede")).toMatch(/max-inline-size:\s*37\.5rem/);
      expect(rule(".ctas")).toMatch(/margin-block-start:\s*clamp\(40px, 6\.5vh, 64px\)/);
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
      expect(css.match(/animation-name:\s*hero-word/g)).toHaveLength(1);
      expect(motion()).toMatch(/animation-name:\s*hero-in\b/);
      expect(motion()).toMatch(/animation-name:\s*hero-strip, hero-arrive/);
    });

    const fades = `${gate} .ctas, ${gate} .proof, ${gate} .controls`;
    const ms = (name: string) =>
      Number(rule(gate, motion()).match(new RegExp(`--${name}:\\s*(\\d+)ms`))?.[1]);

    test("plays only while <html> carries data-intro", () => {
      expect(rule(fades, motion())).toMatch(/animation-name:\s*hero-in/);
      expect(rule(`${gate} .word`, motion())).toMatch(/animation-name:\s*hero-word/);
      expect(rule(`${gate} .track`, motion())).toMatch(/animation-name:\s*hero-strip, hero-arrive/);
    });

    test("fills backwards only, so nothing is held once it has played", () => {
      // Both only on the scroll-driven parallax, which holds its place at
      // either end of the scroll by design.
      expect(css).not.toMatch(/animation-fill-mode:\s*forwards/);
      expect(css.match(/animation-fill-mode:\s*backwards/g)).toHaveLength(2);
      expect(rule(`${gate} .track`, motion())).toMatch(/animation-fill-mode:\s*none, backwards/);
      expect(css.match(/animation-fill-mode:\s*both/g)).toHaveLength(1);
    });

    test("its timings sit on <html>, so the nav and the bar share them", () => {
      expect(ms("intro-duration")).toBe(2133);
      expect(rule(gate, motion())).toMatch(/--intro-shift:\s*24px/);
      expect(rule(fades, motion())).toMatch(/animation-duration:\s*var\(--intro-duration\)/);
    });

    test("in order: title, subtitle, then the CTAs with the strip, then the two lines", () => {
      expect(rule(`${gate} .ctas`, motion())).toMatch(/animation-delay:\s*var\(--intro-together\)/);
      expect(rule(`${gate} .track`, motion())).toMatch(
        /animation-delay:\s*0s, var\(--intro-together\)/,
      );
      // The list that opens right after a closing brace, not the tail of the
      // longer list that sets the keyframes.
      expect(
        rule(`}\n${gate} .proof, ${gate} .controls`, motion().replace(/\}\s+/g, "}\n")),
      ).toMatch(/animation-delay:\s*var\(--intro-rest\)/);
      expect(ms("intro-lede-start")).toBeLessThan(ms("intro-together"));
      expect(ms("intro-together")).toBeLessThan(ms("intro-rest"));
    });

    test("no part of it runs past five seconds, or it would need a pause (WCAG 2.2.2)", () => {
      const arrive = Number(rule(".hero").match(/--hero-arrive-duration:\s*(\d+)ms/)?.[1]);
      const lastLedeWord = ms("intro-lede-start") + 23 * ms("intro-lede-stagger");
      for (const end of [
        ms("intro-together") + arrive,
        ms("intro-rest") + ms("intro-duration"),
        ms("intro-together") + ms("intro-duration"),
        lastLedeWord + ms("intro-word-duration"),
      ]) {
        expect(end).toBeLessThan(5000);
      }
    });

    test("is 1.5x the speed of the last cut, to the millisecond", () => {
      const last: Record<string, number> = {
        "intro-duration": 3200,
        "intro-word-duration": 1600,
        "intro-title-stagger": 300,
        "intro-lede-start": 800,
        "intro-lede-stagger": 90,
        "intro-together": 1200,
        "intro-rest": 1700,
      };
      for (const [name, was] of Object.entries(last)) {
        expect(ms(name)).toBe(Math.round(was / 1.5));
      }
    });

    test("the opening's last step is the pause row, which StripControls waits for", () => {
      const end = (delay: string, duration: number) => ms(delay) + duration;
      const arrive = Number(rule(".hero").match(/--hero-arrive-duration:\s*(\d+)ms/)?.[1]);
      const row = end("intro-rest", ms("intro-duration"));
      expect(row).toBeGreaterThan(end("intro-together", arrive));
      expect(row).toBeGreaterThan(end("intro-together", ms("intro-duration")));
      expect(row).toBeGreaterThan(
        ms("intro-lede-start") + 17 * ms("intro-lede-stagger") + ms("intro-word-duration"),
      );
    });

    describe("word by word", () => {
      test("each word only fades: nothing that would make it inline-block", () => {
        expect(css).toMatch(/@keyframes hero-word\s*\{\s*from\s*\{\s*opacity:\s*0;?\s*\}\s*\}/);
        expect(css).not.toMatch(/\.word\s*\{[^}]*display/);
      });

      test("the title's words follow one another by the stagger", () => {
        expect(rule(`${gate} .title .word:nth-of-type(1)`, motion())).toMatch(
          /animation-delay:\s*calc\(0 \* var\(--intro-title-stagger\)\)/,
        );
        expect(rule(`${gate} .title .word:nth-of-type(4)`, motion())).toMatch(
          /animation-delay:\s*calc\(3 \* var\(--intro-title-stagger\)\)/,
        );
      });

      test("the lede's follow on from its own start", () => {
        expect(rule(`${gate} .lede .word:nth-of-type(18)`, motion())).toMatch(
          /animation-delay:\s*calc\(var\(--intro-lede-start\) \+ 17 \* var\(--intro-lede-stagger\)\)/,
        );
      });

      test("sets no inline style a strict CSP would report: the delay is in the sheet", () => {
        const source = readFileSync(join(__dirname, "../HomeHero.tsx"), "utf8");
        expect(source).not.toMatch(/style=\{/);
      });
    });

    test("the rail starts very fast past the screen's edge, then brakes hard", () => {
      expect(css).toMatch(
        /@keyframes hero-arrive\s*\{\s*from\s*\{\s*translate:\s*calc\(100vw \+ 12\.5%\) 0;?\s*\}/,
      );
      const [x1, y1, x2, y2] = rule(".hero")
        .match(/--hero-arrive-ease:\s*cubic-bezier\(([^)]*)\)/)![1]!
        .split(",")
        .map(Number);
      // Over five times its mean speed as it sets off, with no overshoot.
      expect(y1! / x1!).toBeGreaterThan(5);
      expect(y2).toBe(1);
      expect(x2).toBeGreaterThan(0);
      expect(rule(`${gate} .track`, motion())).toMatch(
        /animation-timing-function:\s*linear, var\(--hero-arrive-ease\)/,
      );
    });

    test("is added to the drift, so the drift keeps its clock under it", () => {
      expect(rule(`${gate} .track`, motion())).toMatch(/animation-composition:\s*replace, add/);
    });

    test("a scroll runs the strip through hover and the pause button, but not a drag", () => {
      const m = motion();
      expect(rule(".strip[data-gliding] .track", m)).toMatch(/animation-play-state:\s*running/);
      expect(m.indexOf(".strip[data-gliding] .track")).toBeGreaterThan(
        m.indexOf(".strip[data-paused] .track"),
      );
      expect(m.indexOf(".strip[data-dragging] .track")).toBeGreaterThan(
        m.indexOf(".strip[data-gliding] .track"),
      );
    });

    test("the track, not the strip, so the cards run off the strip's own edge", () => {
      expect(() => rule(`${gate} .strip`, motion())).toThrow();
    });

    test("the lead cards hang off the track's start, out of its width", () => {
      const lead = rule(".lead");
      expect(lead).toMatch(/position:\s*absolute/);
      expect(lead).toMatch(/inset-inline-end:\s*100%/);
      expect(rule(".track")).toMatch(/position:\s*relative/);
    });

    test("the copy rises in from below as it fades", () => {
      expect(css).toMatch(
        /@keyframes hero-in\s*\{\s*from\s*\{\s*opacity:\s*0;\s*translate:\s*0 var\(--intro-shift\);?\s*\}/,
      );
    });

    test("waits while the splash covers the page", () => {
      const waiting = rule(
        `${held} .word, ${held} .ctas, ${held} .proof, ${held} .controls, ${held} .track`,
        motion(),
      );
      expect(waiting).toMatch(/animation-play-state:\s*paused/);
    });

    test("its gate adds no specificity, under the 0,3,0 cap", () => {
      expect(css).not.toMatch(/(?<!:where\():root\[/);
    });
  });

  describe("the cards from lg", () => {
    test("the strip's height is a 30vw card at 4:3, 20% under the last size", () => {
      expect(media("(min-width: 1024px)")).toMatch(/--hero-strip-block:\s*min\(22\.5vw, 36svh\)/);
      expect((30 * 3) / 4).toBe(22.5);
      expect(22.5).toBeCloseTo(28.125 * 0.8);
    });

    test("keeps its size below lg", () => {
      expect(rule(".hero")).toMatch(/--hero-strip-block:\s*42svh/);
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
      expect(image).toMatch(/block-size:\s*calc\(100% \+ 25%\)/);
      expect(image).toMatch(/animation-name:\s*hero-parallax/);
      expect(image).toMatch(/animation-timeline:\s*scroll\(root\)/);
      expect(image).toMatch(/animation-range:\s*0 var\(--hero-parallax-range\)/);
      // From the spare showing at the foot to none: 25 of 125.
      const from = css.match(
        /@keyframes hero-parallax\s*\{\s*from\s*\{\s*translate:\s*0 (-[\d.]+)%/,
      )?.[1];
      expect(Number(from)).toBeCloseTo(-20, 2);
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
