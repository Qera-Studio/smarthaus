import { compile } from "sass";
import { join } from "node:path";

/**
 * The nav's part in the homepage opening (HomeHero.module.scss, "The
 * opening"): it arrives with the hero's CTAs and strip, only on the homepage,
 * only while <html> carries data-intro, and never under reduced motion.
 */

// One line, single spaces: Sass breaks long values across lines.
const css = compile(join(__dirname, "../Nav.module.scss")).css.replace(/\s+/g, " ");

const gate = ":where(:root[data-intro]:has([data-hero])) .nav";
const held = ":where(:root[data-intro][data-splash=show]) .nav";

/** Every rule for exactly this selector, inside blocks whose query has `query`. */
function rules(selector: string, query: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const found: string[] = [];
  for (let start = css.indexOf(`@media ${query}`); start !== -1;) {
    let depth = 0;
    let end = css.indexOf("{", start);
    for (; end < css.length; end += 1) {
      if (css[end] === "{") depth += 1;
      if (css[end] === "}") depth -= 1;
      if (depth === 0) break;
    }
    const block = css.slice(start, end + 1);
    for (const match of block.matchAll(new RegExp(`(?:[{}] )${escaped} \\{([^{}]*)\\}`, "g")))
      found.push(match[1]!);
    start = css.indexOf(`@media ${query}`, end);
  }
  return found;
}

describe("Nav.module.scss: the homepage opening", () => {
  test("arrives only on the homepage, while data-intro is set, with motion allowed", () => {
    const [arrive] = rules(gate, "(prefers-reduced-motion: no-preference)");
    expect(arrive).toMatch(/animation-name: nav-in/);
    expect(css.match(/animation-name: nav-in/g)).toHaveLength(1);
  });

  test("with the CTAs and the strip, on the opening's shared timings, filling backwards only", () => {
    const [arrive] = rules(gate, "(prefers-reduced-motion: no-preference)");
    expect(arrive).toMatch(/animation-delay: var\(--intro-together\)/);
    expect(arrive).toMatch(/animation-duration: var\(--intro-duration\)/);
    expect(arrive).toMatch(/animation-fill-mode: backwards/);
    expect(css).not.toMatch(/animation-fill-mode: (both|forwards)/);
  });

  test("rises from below where it floats at the bottom, drops from above from lg", () => {
    const [phone] = rules(gate, "(prefers-reduced-motion: no-preference)");
    expect(phone).toMatch(/--nav-intro-shift: 24px/);
    const [desktop] = rules(
      gate,
      "(prefers-reduced-motion: no-preference) and (min-width: 1024px)",
    );
    expect(desktop).toMatch(/--nav-intro-shift: -24px/);
    expect(css).toMatch(
      /@keyframes nav-in \{ from \{ opacity: 0; translate: 0 var\(--nav-intro-shift\); \} \}/,
    );
  });

  test("waits while the splash covers the page", () => {
    const waiting = rules(held, "(prefers-reduced-motion: no-preference)");
    expect(waiting.join(" ")).toMatch(/animation-play-state: paused/);
  });
});
