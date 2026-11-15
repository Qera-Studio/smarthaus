import { compile } from "sass";
import { join } from "node:path";

import { SOLUTION_COPY_NAME, SOLUTION_PICTURE_NAME } from "../../lib/solution-picture";
import { OPENING } from "../../components/Nav/SolutionsMenu";

/**
 * The solution opening's CSS (2026-11-15): the view transition SolutionsMenu
 * starts, animated here, and the nav's part in it. jsdom runs no view
 * transitions; this holds the rules, e2e/solutions.spec.ts the running thing.
 */

// One line, single spaces: Sass breaks long values across lines.
const globals = compile(join(__dirname, "../globals.scss")).css.replace(/\s+/g, " ");
const nav = compile(join(__dirname, "../../components/Nav/Nav.module.scss")).css.replace(
  /\s+/g,
  " ",
);

/** The declarations of every rule whose selector list is exactly this, joined. */
function rule(css: string, selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/,\s*/g, ",\\s*");
  const found = [...css.matchAll(new RegExp(`(?:^|[{}\\s])${escaped}\\s*\\{([^{}]*)\\}`, "g"))];
  if (!found.length) throw new Error(`no rule for ${selector}`);
  return found.map((match) => match[1]).join(" ");
}

/** Every @media block with this query, joined. */
function media(css: string, query: string) {
  const blocks: string[] = [];
  for (let start = css.indexOf(`@media ${query}`); start !== -1;) {
    let depth = 0;
    let end = css.indexOf("{", start);
    for (; end < css.length; end += 1) {
      if (css[end] === "{") depth += 1;
      if (css[end] === "}") depth -= 1;
      if (depth === 0) break;
    }
    blocks.push(css.slice(start, end + 1));
    start = css.indexOf(`@media ${query}`, end);
  }
  if (!blocks.length) throw new Error(`no @media ${query}`);
  return blocks.join(" ");
}

const group = (name: string) => `::view-transition-group(${name})`;
const pair = `::view-transition-old(${SOLUTION_PICTURE_NAME}), ::view-transition-new(${SOLUTION_PICTURE_NAME})`;

describe("the solution opening, in globals.scss", () => {
  test("animates the names the menu gives", () => {
    expect(globals).toContain(group(SOLUTION_PICTURE_NAME));
    expect(globals).toContain(`::view-transition-new(${SOLUTION_COPY_NAME})`);
  });

  test("grows the picture over 900ms, half again the slowest step", () => {
    expect(rule(globals, ":root")).toMatch(
      /--solution-open:\s*calc\(var\(--duration-slower\) \* 1\.5\)/,
    );
    expect(rule(globals, group(SOLUTION_PICTURE_NAME))).toMatch(
      /animation-duration:\s*var\(--solution-open\)/,
    );
  });

  test("slow away and long into place, on one curve for the box and both pictures", () => {
    const curve = /animation-timing-function:\s*cubic-bezier\(0\.7, 0, 0\.2, 1\)/;
    expect(rule(globals, group(SOLUTION_PICTURE_NAME))).toMatch(curve);
    expect(rule(globals, pair)).toMatch(curve);
  });

  test("crops both pictures to the moving box, rather than stretching them", () => {
    const both = rule(globals, pair);
    expect(both).toMatch(/block-size:\s*100%/);
    expect(both).toMatch(/object-fit:\s*cover/);
  });

  test("clips what overflows: without it both crops showed at once", () => {
    expect(rule(globals, pair)).toMatch(/overflow:\s*clip/);
  });

  test("brings the title in once the picture has nearly landed", () => {
    const copy = rule(globals, `::view-transition-new(${SOLUTION_COPY_NAME})`);
    expect(copy).toMatch(/animation-name:\s*solution-copy-in/);
    expect(copy).toMatch(/animation-delay:\s*calc\(var\(--solution-open\) \* 0\.6\)/);
    expect(copy).toMatch(/animation-duration:\s*var\(--duration-slower\)/);
    expect(copy).toMatch(/animation-fill-mode:\s*both/);
  });

  test("raises the title 16px as it fades in, and does not move it after", () => {
    expect(globals).toMatch(
      /@keyframes solution-copy-in\s*\{\s*(?:from|0%)\s*\{\s*opacity:\s*0;\s*translate:\s*0 var\(--space-4\)/,
    );
  });

  test("holds the copy's and the nav's boxes still, and the nav at full strength", () => {
    expect(
      rule(
        globals,
        `${group(SOLUTION_COPY_NAME)}, ${group("solution-nav")}, ::view-transition-new(solution-nav)`,
      ),
    ).toMatch(/animation-name:\s*none/);
  });

  test("uses longhands, so a missing token cannot void the animation", () => {
    const opening = globals.slice(globals.indexOf(group(SOLUTION_PICTURE_NAME)));
    expect(opening.slice(0, opening.indexOf("@keyframes"))).not.toMatch(/[\s;{]animation:\s/);
  });

  test("sits in the base layer", () => {
    const at = globals.indexOf(group(SOLUTION_PICTURE_NAME));
    const before = globals.slice(0, at);
    expect(before.lastIndexOf("@layer base")).toBeGreaterThan(
      before.lastIndexOf("@layer utilities"),
    );
  });
});

describe("the solution opening, in Nav.module.scss", () => {
  const desktop = () => media(nav, "(min-width: 1024px)");

  test("keys on the attribute the menu sets", () => {
    expect(OPENING).toBe("data-solution-opening");
    expect(nav).toContain(`html[${OPENING}]`);
  });

  test("hides the desktop panel at once on the page it opens", () => {
    const panel = rule(desktop(), `:global(html[${OPENING}]) .menu`);
    expect(panel).toMatch(/visibility:\s*hidden/);
    expect(panel).toMatch(/transition:\s*none/);
  });

  test("lifts the desktop bar into its own layer, over the growing picture", () => {
    expect(rule(desktop(), `:global(html[${OPENING}]) .nav`)).toMatch(
      /view-transition-name:\s*solution-nav/,
    );
  });

  test("leaves the phone's bar alone: its sheet would cover the picture's start", () => {
    const outside = nav.replace(desktop(), "");
    expect(outside).not.toContain(`html[${OPENING}] .nav`);
  });

  test("stays within the house's specificity: an attribute on html, then one class", () => {
    // 0,2,1 at most: html, [data-solution-opening], one class. The limit is 0,3,0.
    // Three: the panel, the bar and the logo.
    const uses = [...nav.matchAll(new RegExp(`:global\\(html\\[${OPENING}\\]\\)([^{]*)\\{`, "g"))];
    expect(uses.length).toBe(3);
    for (const [, rest] of uses) expect(rest!.trim()).toMatch(/^\.[a-zA-Z]+$/);
  });
});

describe("the logo over a solution's picture, in Nav.module.scss", () => {
  const desktop = () => media(nav, "(min-width: 1024px)");
  const atRest = ":where(:root:has([data-solution-picture])) .nav:not([data-stuck]) .logo";

  test("keys on the attribute the solution page's picture carries", () => {
    expect(nav).toContain("[data-solution-picture]");
  });

  test("takes the light ink, brown-100, on the bar at rest from lg", () => {
    expect(rule(desktop(), atRest)).toMatch(/--nav-ink:\s*var\(--color-text-inverse\)/);
  });

  test("turns the logo alone: the links and the button reach past the picture", () => {
    expect(rule(desktop(), atRest)).not.toMatch(/--nav-link-ink|--nav-cta/);
  });

  test("never on the glass, where light ink is not legible", () => {
    expect(atRest).toContain(":not([data-stuck])");
  });

  test("never below lg, where the bar floats on its glass at the foot", () => {
    const count = (css: string) => css.split("[data-solution-picture]").length - 1;
    expect(count(nav)).toBeGreaterThan(0);
    expect(count(desktop())).toBe(count(nav));
  });

  test("adds no specificity for the page it is on: 0,3,0 at most", () => {
    expect(atRest.startsWith(":where(")).toBe(true);
  });

  // Measured at a tenth speed: at 0.3 the logo was light on the page's light
  // ground, with the picture still short of its corner.
  test("turns over the opening's last 40%, as the picture reaches it", () => {
    const turning = rule(desktop(), `:global(html[${OPENING}]) .logo`);
    expect(turning).toMatch(/transition-property:\s*color/);
    expect(turning).toMatch(/transition-delay:\s*calc\(var\(--solution-open\) \* 0\.6\)/);
    expect(turning).toMatch(/transition-duration:\s*calc\(var\(--solution-open\) \* 0\.4\)/);
    expect(turning).toMatch(/transition-timing-function:\s*var\(--ease-in-out\)/);
  });

  test("starts turning with the title, which rises from the same moment", () => {
    const copy = rule(globals, `::view-transition-new(${SOLUTION_COPY_NAME})`);
    const turning = rule(desktop(), `:global(html[${OPENING}]) .logo`);
    const at = /calc\(var\(--solution-open\) \* ([\d.]+)\)/;
    expect(turning.split("transition-delay:")[1]!.match(at)![1]).toBe(
      copy.split("animation-delay:")[1]!.match(at)![1],
    );
  });

  test("has finished turning by the time the picture lands", () => {
    const turning = rule(desktop(), `:global(html[${OPENING}]) .logo`);
    const share = (property: string) =>
      Number(
        turning.match(
          new RegExp(`${property}:\\s*calc\\(var\\(--solution-open\\) \\* ([\\d.]+)\\)`),
        )![1],
      );
    expect(share("transition-delay") + share("transition-duration")).toBeLessThanOrEqual(1);
  });

  test("animates only colour, so the lockups' own cross-fade is untouched", () => {
    const turning = rule(desktop(), `:global(html[${OPENING}]) .logo`);
    expect(turning).not.toMatch(/opacity|visibility/);
  });
});
