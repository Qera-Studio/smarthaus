import { compile } from "sass";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { SOLUTION_IDS } from "../../../sanity/schema/solution";

/**
 * The diagram's stylesheet, on the compiled CSS (Shivanshu, 2026-11-16). The
 * geometry lives here, not in script: every wire is placed from four sizes,
 * so what is held is those sizes, where each wire starts, turns and ends,
 * what moves and how long, the colours a reader must be able to see, and the
 * project's own rules. e2e/works-with.spec.ts measures it drawn.
 */

const SOURCE = join(__dirname, "../WorksWith.module.scss");
const compiled = compile(SOURCE).css;
const flat = compiled.slice(compiled.indexOf("@layer components {")).replace(/\s+/g, " ");

/** The declarations of every rule whose selector is exactly this, joined. */
function rule(selector: string, within = flat) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const found = [...within.matchAll(new RegExp(`(?:^|[{}\\s])${escaped}\\s*\\{([^{}]*)\\}`, "g"))];
  if (!found.length) throw new Error(`no rule for ${selector}`);
  return found.map((match) => match[1]).join(" ");
}

/** Every @media block with this query, joined. */
function media(query: string) {
  const blocks: string[] = [];
  for (let start = flat.indexOf(`@media ${query}`); start !== -1;) {
    let depth = 0;
    let end = flat.indexOf("{", start);
    for (; end < flat.length; end += 1) {
      if (flat[end] === "{") depth += 1;
      if (flat[end] === "}") depth -= 1;
      if (depth === 0) break;
    }
    blocks.push(flat.slice(start, end + 1));
    start = flat.indexOf(`@media ${query}`, end);
  }
  if (!blocks.length) throw new Error(`no @media ${query}`);
  return blocks.join(" ");
}

/** A @keyframes block's body. */
function keyframes(name: string) {
  const start = flat.indexOf(`@keyframes ${name} {`);
  if (start === -1) throw new Error(`no @keyframes ${name}`);
  let depth = 0;
  let end = flat.indexOf("{", start);
  for (; end < flat.length; end += 1) {
    if (flat[end] === "{") depth += 1;
    if (flat[end] === "}") depth -= 1;
    if (depth === 0) break;
  }
  return flat.slice(start, end + 1);
}

const MD = "(min-width: 768px)";
const LG = "(min-width: 1024px)";
const FORCED = "(forced-colors: active)";

describe("WorksWith.module.scss", () => {
  it("sits in the components layer, and nowhere else", () => {
    expect(compiled.match(/@layer [a-z]+ \{/g)).toEqual(["@layer components {"]);
  });

  // Shivanshu, 2026-11-16: the middle at the left, the pairs in a column, the
  // wires square with one turn at most, all of it symmetrical.
  describe("the diagram's geometry", () => {
    it("sizes the middle 96px, a tab 56px tall and the gap 24px on a phone; 128, 64 and 48 from md", () => {
      const phone = rule(".diagram");
      expect(phone).toContain("--works-centre: 96px");
      expect(phone).toContain("--works-tab: 56px");
      expect(phone).toContain("--works-gap: 24px");
      const wide = rule(".diagram", media(MD));
      expect(wide).toContain("--works-centre: 128px");
      expect(wide).toContain("--works-tab: 64px");
      expect(wide).toContain("--works-gap: 48px");
    });

    it("gives the tabs 18rem, or what the middle and a 32px wire leave", () => {
      const diagram = rule(".diagram");
      expect(diagram).toContain("--works-reach: 32px");
      expect(diagram).toContain(
        "--works-tabs: min(18rem, 100% - var(--works-centre) - var(--works-reach))",
      );
      expect(rule(".tabs")).toContain("inline-size: var(--works-tabs)");
    });

    it("puts the middle at the left edge and the column at the right, centred on each other", () => {
      const diagram = rule(".diagram");
      expect(diagram).toContain("display: flex");
      expect(diagram).toContain("align-items: center");
      expect(diagram).toContain("justify-content: space-between");
      expect(diagram).toContain("max-inline-size: 36rem");
    });

    it("runs left to right whatever the page's direction: it is a figure", () => {
      expect(rule(".diagram")).toContain("direction: ltr");
    });

    it("gives the column three rows whatever the count, so the middle always faces its middle", () => {
      const tabs = rule(".tabs");
      expect(tabs).toContain("grid-template-rows: repeat(3, var(--works-tab))");
      expect(tabs).toContain("row-gap: var(--works-gap)");
      expect(rule(".place[data-slot=top]")).toContain("grid-row: 1");
      expect(rule(".place[data-slot=middle]")).toContain("grid-row: 2");
      expect(rule(".place[data-slot=bottom]")).toContain("grid-row: 3");
    });

    it("ends every wire at the column's edge", () => {
      expect(rule(".wire")).toContain("inset-inline-end: var(--works-tabs)");
    });

    it("runs an outer wire up out of the middle's centre, then turns once into its tab's middle", () => {
      const outer = rule(".wire[data-slot=top], .wire[data-slot=bottom]");
      // 2px, centred on both lines it follows.
      expect(outer).toContain("inset-inline-start: calc(var(--works-centre) / 2 - 1px)");
      expect(outer).toContain("inset-block-start: calc(var(--works-tab) / 2 - 1px)");
      // Down to the middle's top edge: half the column less half the middle.
      expect(outer).toContain(
        "block-size: calc(var(--works-tab) + var(--works-gap) - var(--works-centre) / 2 + 1px)",
      );
      expect(outer).toContain("border-block-start-width: 2px");
      expect(outer).toContain("border-inline-start-width: 2px");
    });

    it("makes the bottom wire the top one, set from the foot and turned over", () => {
      const bottom = rule(".wire[data-slot=bottom]");
      expect(bottom).toContain("inset-block-start: auto");
      expect(bottom).toContain("inset-block-end: calc(var(--works-tab) / 2 - 1px)");
      expect(bottom).toContain("scale: 1 -1");
    });

    it("runs the middle wire straight across, with no turn", () => {
      const middle = rule(".wire[data-slot=middle]");
      expect(middle).toContain("inset-block-start: calc(50% - 1px)");
      expect(middle).toContain("inset-inline-start: var(--works-centre)");
      expect(middle).toContain("border-block-start-width: 2px");
      expect(middle).not.toContain("border-inline-start-width");
    });

    it("draws no side of a wire but its run and its upright: one turn at most", () => {
      const sides = [...flat.matchAll(/border-(block|inline)-(start|end)-width: 2px/g)].map(
        (m) => `${m[1]}-${m[2]}`,
      );
      expect(new Set(sides)).toEqual(new Set(["block-start", "inline-start"]));
    });

    it("sets the diagram beside the panel from lg, half and half", () => {
      expect(rule(".stage", media(LG))).toContain(
        "grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)",
      );
    });

    it("needs no z-index: the wires are drawn first and end at the edges", () => {
      expect(rule(".wires")).toContain("pointer-events: none");
      expect(flat).not.toMatch(/z-index/);
    });
  });

  // Shivanshu, 2026-11-16: dark, and to the screen's edges.
  describe("the section", () => {
    it("runs to the screen's edges and gives the distance back, so its content stays in the column", () => {
      const section = rule(".section");
      expect(section).toContain("margin-inline: calc(50% - 50vw)");
      expect(section).toContain("padding-inline: calc(50vw - 50%)");
    });

    it("is dark: brown-950 under light ink", () => {
      const section = rule(".section");
      expect(section).toContain("--works-ground: var(--brown-950)");
      expect(section).toContain("background-color: var(--works-ground)");
      expect(section).toContain("color: var(--color-text-inverse)");
    });

    it("sets the line under the heading in the soft ink, legible on the dark", () => {
      expect(rule(".section")).toContain("--works-soft: var(--brown-200)");
      expect(rule(".subtext")).toContain("color: var(--works-soft)");
    });

    it("has no label above the heading any more", () => {
      expect(flat).not.toContain(".eyebrow");
    });

    it("stands clear of the hero, and pads its own ground", () => {
      expect(rule(".section")).toContain("margin-block-start: 64px");
      expect(rule(".section")).toContain("padding-block: 64px");
      expect(rule(".section", media(MD))).toContain("padding-block: 96px");
    });
  });

  describe("the wires and the progress bar", () => {
    it("draws a wire as a quiet track, and the picked one lit in bronze when it is still", () => {
      expect(rule(".wire")).toContain("border-color: var(--works-track)");
      expect(rule(".wire[data-lit]")).toContain("border-color: var(--works-glow)");
      expect(rule(".section")).toContain("--works-track: var(--brown-700)");
    });

    it("has no dot and no halo any more", () => {
      expect(flat).not.toMatch(/\.pulse\b|\.halo\b|works-pulse|works-arrive/);
    });

    it("raises the bar up the wire's upright first, from the middle, in the first fifth", () => {
      const rise = rule(".rise");
      expect(rise).toContain("transform: scaleY(0)");
      expect(rise).toContain("transform-origin: 50% 100%");
      expect(rise).toContain("animation-name: works-rise");
      expect(keyframes("works-rise")).toContain("20%, to { transform: scaleY(1); }");
    });

    it("then runs it across to the tab, brightest at its head", () => {
      const run = rule(".run");
      expect(run).toContain("transform: scaleX(0)");
      expect(run).toContain("transform-origin: 0 50%");
      expect(run).toContain("animation-name: works-run");
      expect(run).toContain(
        "linear-gradient(to right, var(--works-glow) 60%, var(--works-glow-hot))",
      );
      expect(keyframes("works-run")).toContain("from, 20% { transform: scaleX(0); }");
    });

    it("runs the middle wire's bar across from the first moment", () => {
      expect(rule(".wire[data-slot=middle] .run")).toContain("animation-name: works-fill");
      expect(keyframes("works-fill")).toMatch(
        /from \{ transform: scaleX\(0\); \} to \{ transform: scaleX\(1\); \}/,
      );
    });

    it("takes the timer's 4.5s, linearly, and holds full until the panel moves on", () => {
      const bar = rule(".rise, .run");
      expect(bar).toContain("animation-duration: 4.5s");
      expect(bar).toContain("animation-timing-function: linear");
      expect(bar).toContain("animation-fill-mode: both");
      expect(rule(".timer")).toContain("animation-duration: 4.5s");
    });

    it("raises its glow all the way to the tab", () => {
      const glow = rule(".run::after");
      expect(glow).toContain("filter: blur(4px)");
      expect(glow).toContain("animation-name: works-glow");
      expect(glow).toContain("animation-duration: 4.5s");
      expect(glow).toContain("animation-timing-function: ease-in");
      expect(keyframes("works-glow")).toMatch(/from \{ opacity: 0; \} to \{ opacity: 1; \}/);
    });

    it("moves only by transform and opacity", () => {
      for (const name of ["works-rise", "works-run", "works-fill", "works-glow"]) {
        const properties = [...keyframes(name).matchAll(/([a-z-]+):/g)].map((m) => m[1]);
        expect(new Set(properties).size).toBeGreaterThan(0);
        for (const property of properties) expect(["opacity", "transform"]).toContain(property);
      }
    });

    it("holds the bar and its glow while paused or off screen", () => {
      expect(rule(".stage[data-paused]")).toContain("--works-play: paused");
      for (const target of [".rise, .run", ".run::after"]) {
        expect(rule(target)).toContain("animation-play-state: var(--works-play, running)");
      }
    });
  });

  describe("the middle and the tabs", () => {
    it("lights them all the same: linen, with dark icons", () => {
      const lit = rule(".centre, .tab");
      expect(lit).toContain("background-color: var(--works-lit)");
      expect(lit).toContain("color: var(--works-lit-ink)");
      expect(rule(".section")).toContain("--works-lit: var(--brown-100)");
      expect(rule(".section")).toContain("--works-lit-ink: var(--brown-900)");
    });

    it("makes them square and sharp: the middle as wide as it is tall, no rounding", () => {
      expect(rule(".centre, .tab")).toContain("border-radius: 0");
      const centre = rule(".centre");
      expect(centre).toContain("inline-size: var(--works-centre)");
      expect(centre).toContain("block-size: var(--works-centre)");
    });

    // Shivanshu, 2026-11-16: "it looks very AI".
    it("puts no ring, glow or shadow on any of them, picked or not", () => {
      expect(flat).not.toMatch(/box-shadow/);
      expect(flat).not.toMatch(/\.(centre|tab|node|disc)::(before|after)/);
      // Their pressed state is drawn only where the system draws the colours.
      const pressed = (css: string) => css.match(/\.(centre|tab)\[aria-pressed=true\]/g)?.length;
      expect(pressed(flat)).toBe(pressed(media(FORCED)));
    });

    it("fills a tab's row: its icon, then its name, from the left", () => {
      const tab = rule(".tab");
      expect(tab).toContain("display: flex");
      expect(tab).toContain("align-items: center");
      expect(tab).toContain("inline-size: 100%");
      expect(tab).toContain("block-size: 100%");
      expect(tab).toContain("padding-inline: 16px");
    });

    it("rings one only on keyboard focus, 4px clear of it", () => {
      expect(rule(".centre:focus-visible, .tab:focus-visible")).toContain("outline-offset: 4px");
    });

    it("brightens one under a mouse, and only where there is one", () => {
      expect(rule(".centre:hover, .tab:hover", media("(hover: hover)"))).toContain(
        "background-color: var(--works-lit-hover)",
      );
      expect(rule(".section")).toContain("--works-lit-hover: var(--brown-50)");
    });

    it("keeps every state visible under forced colours", () => {
      const forced = media(FORCED);
      expect(forced).toMatch(/background-color: CanvasText/);
      expect(rule(".centre[aria-pressed=true], .tab[aria-pressed=true]", forced)).toContain(
        "border-color: Highlight",
      );
      expect(rule(".wire[data-lit]", forced)).toContain("border-color: Highlight");
      expect(rule(".rise, .run", forced)).toContain("display: none");
    });
  });

  describe("the icons", () => {
    it.each(SOLUTION_IDS)("draws %s from a hardware icon that exists", (id) => {
      const declaration = rule(`.icon[data-icon=${id}]`);
      const file = declaration.match(/url\("([^"]+)"\)/)![1]!;
      expect(file).toMatch(/^\/hero\/hardware\/icons\/[a-zA-Z]+\.svg$/);
      expect(existsSync(join(process.cwd(), "public", file))).toBe(true);
    });

    it("cuts each icon from the text colour, so it takes the tab's", () => {
      const icon = rule(".icon");
      expect(icon).toContain("background-color: currentColor");
      expect(icon).toContain("mask-image: var(--works-glyph)");
      expect(icon).toContain("mask-size: contain");
    });
  });

  describe("the pause button and the timer", () => {
    it("shows the glyph for the state it is in", () => {
      expect(rule(".glyphPlay, .pause[aria-pressed=true] .glyphPause")).toContain("display: none");
      expect(rule(".pause[aria-pressed=true] .glyphPlay")).toContain("display: block");
    });

    it("sits in the card's foot, opposite its link, inside its padding", () => {
      expect(rule(".panel")).toContain("position: relative");
      const pause = rule(".pause");
      expect(pause).toContain("position: absolute");
      expect(pause).toContain("inset-block-end: 24px");
      expect(pause).toContain("inset-inline-end: 24px");
      expect(pause).toContain("inline-size: 40px");
      const wide = rule(".pause", media(MD));
      expect(wide).toContain("inset-block-end: 32px");
      expect(rule(".panel")).toContain("padding: 24px");
      expect(rule(".panel", media(MD))).toContain("padding: 32px");
    });

    it("moves the panel on every 4.5s, held until it is told to run", () => {
      const timer = rule(".timer");
      expect(timer).toContain("animation-name: works-timer");
      expect(timer).toContain("animation-play-state: paused");
      expect(rule(".timer[data-running]")).toContain("animation-play-state: running");
    });
  });

  describe("the entrance", () => {
    const motion = () => media("(prefers-reduced-motion: no-preference)");

    it("hides only what waits, and only where motion is welcome", () => {
      expect(
        rule(
          ".stage[data-entrance=waiting] .centre, .stage[data-entrance=waiting] .wires, .stage[data-entrance=waiting] .place",
          motion(),
        ),
      ).toContain("opacity: 0");
    });

    it("draws the middle, then the wires, then the tabs top to bottom", () => {
      expect(rule(".stage[data-entrance=in] .centre", motion())).toContain(
        "animation-name: works-enter",
      );
      expect(rule(".stage[data-entrance=in] .wires", motion())).toContain("animation-delay: 300ms");
      expect(rule(".stage[data-entrance=in] .place", motion())).toContain(
        "animation-delay: calc(600ms + var(--works-i) * 80ms)",
      );
      for (let k = 1; k <= 3; k += 1) {
        expect(rule(`.place:nth-child(${k})`)).toBe(` --works-i: ${k - 1}; `);
      }
    });

    it("lets go of every property once played", () => {
      for (const target of [".centre", ".wires", ".place"]) {
        expect(rule(`.stage[data-entrance=in] ${target}`, motion())).toContain(
          "animation-fill-mode: backwards",
        );
      }
    });
  });

  describe("the panel", () => {
    it("stacks every card in one cell, so it is as tall as the longest", () => {
      expect(rule(".panel")).toContain("display: grid");
      expect(rule(".variant")).toContain("grid-area: 1/1");
    });

    // Shivanshu, 2026-11-16: the link at the card's bottom left, whatever the content.
    it("pins each card's link to its foot, on the left", () => {
      const variant = rule(".variant");
      expect(variant).toContain("display: flex");
      expect(variant).toContain("flex-direction: column");
      expect(variant).toContain("align-items: flex-start");
      expect(variant).not.toMatch(/align-self|block-size/);
      expect(rule(".cta")).toContain("margin-block-start: auto");
    });

    it("fades the one picked in over 200ms, the others hidden from everyone", () => {
      expect(rule(".variant")).toContain("transition-property: opacity, visibility");
      expect(rule(".variant")).toContain("transition-duration: 200ms");
      expect(rule(".variant:not([data-shown])")).toContain("visibility: hidden");
    });

    it("sets When over Then, the arrow pointing down between them", () => {
      expect(rule(".chips")).toContain("flex-direction: column");
      expect(rule(".arrow")).toContain("rotate: 90deg");
    });

    it("is square and flat, as the site is: a hairline, no shadow, no rounding", () => {
      const panel = rule(".panel");
      expect(panel).toContain("border-color: var(--works-edge)");
      expect(panel).not.toMatch(/box-shadow|border-radius/);
    });

    it("is one step lighter than the section, its label bronze and its line soft", () => {
      expect(rule(".panel")).toContain("background-color: var(--color-bg-inverse)");
      expect(rule(".panelLabel")).toContain("color: var(--works-glow)");
      expect(rule(".body")).toContain("color: var(--works-soft)");
    });
  });

  describe("the project's SCSS rules", () => {
    const source = readFileSync(SOURCE, "utf8").replace(/\/\/.*$/gm, "");

    it("uses logical properties only", () => {
      expect(source).not.toMatch(
        /(?<![-\w])(width|height|left|right|top|bottom|margin-(left|right|top|bottom)|padding-(left|right|top|bottom)):/,
      );
    });

    it("has no !important, no ID selector and no var() in a shorthand", () => {
      expect(source).not.toMatch(/!important/);
      expect(source).not.toMatch(/#[a-z][\w-]*\s*[{,]/i);
      expect(source).not.toMatch(
        /(?<![-\w])(font|background|border|transition|grid-area|animation|outline|inset|inset-block|inset-inline|padding|margin):[^;]*var\(/,
      );
    });
  });
});
