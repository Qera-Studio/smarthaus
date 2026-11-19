import { compile } from "sass";
import { join } from "node:path";

import { SOLUTION_COPY_NAME, SOLUTION_PICTURE_NAME } from "../../lib/solution-picture";
import { LEAVING, OPENING } from "../../components/Nav/SolutionsMenu";

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

  // Shivanshu, 2026-11-15: it rose at 60% of the opening until the page
  // opened from was kept under the picture; now it waits for the landing.
  test("brings the title in once the picture has landed", () => {
    const copy = rule(globals, `::view-transition-new(${SOLUTION_COPY_NAME})`);
    expect(copy).toMatch(/animation-name:\s*solution-copy-in/);
    expect(copy).toMatch(/animation-delay:\s*var\(--solution-open\)/);
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

  test("drops the bar as it was from the first frame, open panel and all", () => {
    const old = rule(globals, "::view-transition-old(solution-nav)");
    expect(old).toMatch(/animation-name:\s*none/);
    expect(old).toMatch(/opacity:\s*0/);
  });

  test("keeps the bar's layer above the picture's, which the old screen paints inside it", () => {
    expect(rule(globals, group("solution-nav"))).toMatch(/z-index:\s*var\(--z-sticky\)/);
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

/** The opacity a keyframes block sets at each of its offsets. */
function opacities(name: string) {
  const at = globals.indexOf(`@keyframes ${name}`);
  if (at === -1) throw new Error(`no @keyframes ${name}`);
  const body = globals.slice(at, globals.indexOf("} }", at) + 3);
  const steps = new Map<number, number>();
  for (const [, offsets, value] of body.matchAll(/([\d%,\s]+)\{\s*opacity:\s*([\d.]+);?\s*\}/g)) {
    for (const offset of offsets!.split(",")) steps.set(Number.parseFloat(offset), Number(value));
  }
  return steps;
}

/** How far along cubic-bezier(0.7, 0, 0.2, 1) the picture is at this share of the time. */
function progressAt(time: number) {
  const point = (t: number, a: number, b: number) =>
    3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3;
  let low = 0;
  let high = 1;
  for (let step = 0; step < 60; step += 1) {
    const middle = (low + high) / 2;
    if (point(middle, 0.7, 0.2) < time) low = middle;
    else high = middle;
  }
  return point(low, 0, 1);
}

describe("the page under the picture, in globals.scss", () => {
  const old = `:root[${OPENING}]::view-transition-old(root)`;
  const fresh = `:root[${OPENING}]::view-transition-new(root)`;

  test("only in the opening: no other change of the root is touched", () => {
    expect(globals).not.toMatch(/(?:^|[}\s])::view-transition-(?:old|new)\(root\)/);
    expect(rule(globals, `${old}, ${fresh}`)).toMatch(
      /animation-duration:\s*var\(--solution-open\)/,
    );
  });

  test("holds the page opened from, then gives way to the page it opens", () => {
    expect(rule(globals, old)).toMatch(/animation-name:\s*solution-page-out/);
    expect(rule(globals, fresh)).toMatch(/animation-name:\s*solution-page-in/);
    const out = opacities("solution-page-out");
    expect(out.get(0)).toBe(1);
    expect(out.get(100)).toBe(0);
  });

  // Shivanshu, 2026-11-15: the page goes once the picture is 90% of the way.
  test("gives way once the picture has come nine tenths of its way", () => {
    const out = [...opacities("solution-page-out")];
    const held = Math.max(...out.filter(([, value]) => value === 1).map(([offset]) => offset));
    expect(progressAt(held / 100)).toBeCloseTo(0.9, 2);
  });

  test("goes in a tenth of the time, not as a cut", () => {
    const out = [...opacities("solution-page-out")];
    const held = Math.max(...out.filter(([, value]) => value === 1).map(([offset]) => offset));
    const gone = Math.min(...out.filter(([, value]) => value === 0).map(([offset]) => offset));
    expect(gone - held).toBe(10);
  });

  test("is gone before the title rises, so the two titles never meet", () => {
    const out = [...opacities("solution-page-out")];
    const gone = Math.min(...out.filter(([, value]) => value === 0).map(([offset]) => offset));
    expect(gone).toBeLessThan(100);
  });

  test("sums to one at every step, since the browser adds the pair's light", () => {
    const out = opacities("solution-page-out");
    const into = opacities("solution-page-in");
    expect([...into.keys()]).toEqual([...out.keys()]);
    for (const [offset, value] of out) expect(value + into.get(offset)!).toBe(1);
    expect(rule(globals, `${old}, ${fresh}`)).toMatch(/animation-timing-function:\s*linear/);
  });
});

describe("the bar's layer, in globals.scss", () => {
  const desktop = () => media(globals, "(min-width: 1024px)");
  const naming = `:root[${LEAVING}] [data-site-nav], :root[${OPENING}] [data-site-nav]`;

  test("names the bar on the old screen and the new, from lg", () => {
    expect(rule(desktop(), naming)).toMatch(/view-transition-name:\s*solution-nav/);
  });

  test("leaves the phone's bar alone: its sheet would cover the picture's start", () => {
    const count = (css: string) => css.split("view-transition-name: solution-nav").length - 1;
    expect(count(globals)).toBe(1);
    expect(count(desktop())).toBe(1);
  });

  // Found 2026-11-15: a module renamed it as it does a class, so the rules
  // for solution-nav above never reached the bar.
  test("is never named in a CSS Module, which would rename it", () => {
    expect(nav).not.toMatch(/view-transition-name/);
  });

  test("keys on the header's own hook, within the house's specificity", () => {
    // 0,3,0 each: :root, the mark, [data-site-nav].
    for (const selector of naming.split(", ")) {
      expect(selector.match(/\[|:root/g)).toHaveLength(3);
    }
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

  test("stays within the house's specificity: an attribute on html, then one class", () => {
    // 0,2,1 at most: html, [data-solution-opening], one class. The limit is 0,3,0.
    // Two: the panel and the logo.
    const uses = [...nav.matchAll(new RegExp(`:global\\(html\\[${OPENING}\\]\\)([^{]*)\\{`, "g"))];
    expect(uses.length).toBe(2);
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

  // It started with the title until 2026-11-15, when the title moved to the
  // landing; the logo stays on the picture's own clock.
  test("has turned before the title rises", () => {
    const copy = rule(globals, `::view-transition-new(${SOLUTION_COPY_NAME})`);
    expect(copy).toMatch(/animation-delay:\s*var\(--solution-open\)/);
    const turning = rule(desktop(), `:global(html[${OPENING}]) .logo`);
    expect(turning).toMatch(/transition-delay:\s*calc\(var\(--solution-open\) \* 0\.6\)/);
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
