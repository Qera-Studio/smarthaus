import { compile } from "sass";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The solution page's stylesheet contract, on the compiled CSS (Figma
 * 4903:4464). jsdom applies no CSS Modules, so this is where the layout is
 * held: the picture on the screen's left half at full height, the five by
 * three grid with the picture two by two at its foot and the dark box beside
 * it, and the project's SCSS rules. e2e/solutions.spec.ts measures it drawn.
 */

const SOURCE = join(__dirname, "../Solution.module.scss");
const compiled = compile(SOURCE).css;
const css = compiled.slice(compiled.indexOf("@layer blocks {"));
// One line, single spaces: Sass breaks long values across lines.
const flat = css.replace(/\s+/g, " ");

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

/** The stylesheet with its @media blocks taken out: what a phone gets. */
function outsideMedia() {
  let out = flat;
  for (let start = out.indexOf("@media"); start !== -1; start = out.indexOf("@media")) {
    let depth = 0;
    let end = out.indexOf("{", start);
    for (; end < out.length; end += 1) {
      if (out[end] === "{") depth += 1;
      if (out[end] === "}") depth -= 1;
      if (depth === 0) break;
    }
    out = out.slice(0, start) + out.slice(end + 1);
  }
  return out;
}

const LG = "(min-width: 1024px)";
const MD = "(min-width: 768px)";
const lg = () => media(LG);
const xl = () => media("(min-width: 1280px)");
const md = () => media(MD);

describe("Solution.module.scss", () => {
  describe("the project's rules", () => {
    test("everything is in the blocks layer", () => {
      expect(css.trimStart().startsWith("@layer blocks")).toBe(true);
      expect(css.match(/@layer\s+\w+/g)).toEqual(["@layer blocks"]);
    });

    test("logical properties only: no left, right, top, bottom, width or height", () => {
      const declarations = flat.match(/[{;]\s*[a-z-]+\s*:/g) ?? [];
      const props = declarations.map((d) => d.replace(/[{;:\s]/g, ""));
      for (const banned of ["left", "right", "top", "bottom", "width", "height"]) {
        expect(props).not.toContain(banned);
      }
      expect(props.some((p) => /^(margin|padding)-(left|right|top|bottom)$/.test(p))).toBe(false);
    });

    test("no !important, and no ID selector", () => {
      expect(flat).not.toContain("!important");
      expect(flat).not.toMatch(/#[a-z][\w-]*\s*[{,]/i);
    });

    test("no var() inside a shorthand", () => {
      expect(flat).not.toMatch(
        /(?:^|[;{\s])(?:font|background|border|transition|grid-area):[^;}]*var\(/,
      );
    });

    test("colours come from tokens", () => {
      expect(readFileSync(SOURCE, "utf8")).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    });
  });

  describe("the hero", () => {
    test("stacks the picture over the copy on a phone", () => {
      expect(rule(".hero")).toMatch(/display:\s*grid/);
      expect(rule(".hero", outsideMedia())).not.toMatch(/grid-template-columns/);
    });

    test("puts the picture on the screen's left half from lg, the copy 64px beside it", () => {
      const hero = rule(".hero", lg());
      expect(hero).toMatch(/grid-template-columns:\s*50vw minmax\(0, 1fr\)/);
      expect(hero).toMatch(/column-gap:\s*64px/);
      expect(hero).toMatch(/align-items:\s*center/);
    });

    test("runs from the screen's own left edge, past the page's gutter", () => {
      expect(rule(".hero", lg())).toMatch(/margin-inline-start:\s*calc\(50% - 50vw\)/);
    });

    test("fills the screen under the contact bar, in small-viewport units", () => {
      expect(rule(".hero", lg())).toMatch(
        /min-block-size:\s*calc\(100svh - var\(--announce-block-size\)\)/,
      );
    });

    test("runs up under the nav at rest, as the design's picture does", () => {
      expect(rule(".page")).toMatch(
        /--solution-nav-over:\s*calc\(var\(--nav-rest-inset\) \+ var\(--nav-top-block-size\)\)/,
      );
      expect(rule(".hero", lg())).toMatch(
        /margin-block-start:\s*calc\(-1 \* var\(--solution-nav-over\)\)/,
      );
    });

    test("centres the copy on the screen, not on the box under the nav", () => {
      expect(rule(".copy", lg())).toMatch(/padding-block-start:\s*var\(--solution-nav-over\)/);
    });

    test("bleeds the picture to both edges on a phone, a 4:5 frame no taller than most of the screen", () => {
      const picture = rule(".picture");
      expect(picture).toMatch(/margin-inline:\s*calc\(50% - 50vw\)/);
      expect(picture).toMatch(/block-size:\s*min\(125vw, 75svh\)/);
    });

    test("stretches the picture to the hero's height from lg", () => {
      const picture = rule(".picture", lg());
      expect(picture).toMatch(/align-self:\s*stretch/);
      expect(picture).toMatch(/margin-inline:\s*0/);
    });

    test("clips the picture to its frame, cropped rather than stretched", () => {
      expect(rule(".picture")).toMatch(/overflow:\s*clip/);
      const image = rule(".pictureImage");
      expect(image).toMatch(/object-fit:\s*cover/);
      expect(image).toMatch(/inset:\s*0/);
      expect(image).toMatch(/inline-size:\s*100%/);
      expect(image).toMatch(/block-size:\s*100%/);
    });

    test("paints a ground while the picture arrives", () => {
      expect(rule(".picture")).toMatch(/background-color:\s*var\(--color-bg-muted\)/);
    });

    test("sets the title 48px semibold and its line 24px, on the design's 1.4", () => {
      const title = rule(".title");
      expect(title).toMatch(/font-size:\s*var\(--type-h1\)/);
      expect(title).toMatch(/font-weight:\s*600/);
      expect(title).toMatch(/line-height:\s*1\.4/);
      expect(title).toMatch(/letter-spacing:\s*-0\.02em/);
      expect(rule(".lede", outsideMedia())).toMatch(/font-size:\s*var\(--font-size-lg\)/);
      expect(rule(".lede", xl())).toMatch(/font-size:\s*var\(--font-size-xl\)/);
      expect(rule(".lede")).toMatch(/line-height:\s*1\.4/);
    });

    test("keeps the title and its line 8px apart", () => {
      expect(rule(".copy")).toMatch(/gap:\s*8px/);
    });
  });

  describe("the feature grid", () => {
    test("is one column on a phone", () => {
      expect(rule(".grid")).toMatch(/grid-template-columns:\s*minmax\(0, 1fr\)/);
    });

    test("is two from md, the box filling the gap beside the ninth feature", () => {
      const grid = rule(".grid", md());
      expect(grid).toMatch(/grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
      expect(grid).toMatch(/grid-auto-flow:\s*row dense/);
    });

    test("is five from lg, each row at least the design's 260px", () => {
      const grid = rule(".grid", lg());
      expect(grid).toMatch(/grid-template-columns:\s*repeat\(5, minmax\(0, 1fr\)\)/);
      expect(grid).toMatch(/grid-auto-rows:\s*minmax\(16\.25rem, auto\)/);
    });

    test("draws its hairlines as its own gaps over its ground, ink at half strength", () => {
      const grid = rule(".grid");
      expect(grid).toMatch(/gap:\s*1px/);
      expect(grid).toMatch(/background-color:\s*var\(--solution-rule\)/);
      expect(grid).toMatch(/border-color:\s*var\(--solution-rule\)/);
      expect(grid).toMatch(/border-width:\s*1px/);
      expect(rule(".page")).toMatch(
        /--solution-rule:\s*color-mix\(in srgb, var\(--brown-950\) 50%, transparent\)/,
      );
    });

    test("puts the picture two by two at the bottom left from lg", () => {
      const image = rule(".featureImage", lg());
      expect(image).toMatch(/grid-column:\s*1\s*\/\s*span 2/);
      expect(image).toMatch(/grid-row:\s*2\s*\/\s*span 2/);
    });

    test("puts the dark box across the bottom row's last two from lg", () => {
      const slab = rule(".slab", lg());
      expect(slab).toMatch(/grid-column:\s*4\s*\/\s*span 2/);
      expect(slab).toMatch(/grid-row:\s*3/);
    });

    test("puts the picture across the grid's foot from md, square on a phone", () => {
      expect(rule(".featureImage", md())).toMatch(/grid-column:\s*1\s*\/\s*-1/);
      expect(rule(".featureImage")).toMatch(/aspect-ratio:\s*1/);
    });

    test("crops the features' picture to its box", () => {
      expect(rule(".featureImage")).toMatch(/overflow:\s*clip/);
      expect(rule(".featureImage img")).toMatch(/object-fit:\s*cover/);
    });

    test("pins each feature's words to its foot, the icon at its head", () => {
      const feature = rule(".feature");
      expect(feature).toMatch(/flex-direction:\s*column/);
      expect(feature).toMatch(/justify-content:\s*space-between/);
      expect(feature).toMatch(/padding:\s*16px/);
    });

    test("gives each feature the page's ground over the grid's lines", () => {
      expect(rule(".feature")).toMatch(/background-color:\s*var\(--color-bg-canvas\)/);
    });

    // 4px under the design's 24 over 20 (Shivanshu, 2026-11-15).
    test("sets a feature's title 20px medium over a 16px line", () => {
      expect(rule(".featureTitle")).toMatch(/font-size:\s*var\(--font-size-lg\)/);
      expect(rule(".featureText")).toMatch(/font-size:\s*var\(--font-size-base\)/);
      expect(rule(".featureTitle")).toMatch(/font-weight:\s*500/);
    });

    test("keeps those sizes at every width, with no step up on a wide screen", () => {
      for (const block of [xl(), lg(), md()]) {
        for (const selector of [".featureTitle", ".featureText", ".slabText"]) {
          expect(() => rule(selector, block)).toThrow(/no rule/);
        }
      }
    });

    test("sets the dark box's line 20px, as a feature's title", () => {
      expect(rule(".slabText")).toMatch(/font-size:\s*var\(--font-size-lg\)/);
    });

    test("sets the section's heading 4px under the page's h2, never under 24px", () => {
      expect(rule(".heading")).toMatch(
        // Sass drops the calc() inside max(), where CSS needs none.
        /font-size:\s*max\(var\(--font-size-xl\), (?:calc\()?var\(--type-h2\) - 0\.25rem\)?\)/,
      );
    });

    test("sets the standfirst 16px, so it never sits under the features' lines", () => {
      expect(rule(".standfirst")).toMatch(/font-size:\s*var\(--font-size-base\)/);
    });

    test("never lets the icon shrink", () => {
      expect(rule(".icon")).toMatch(/flex:\s*none/);
    });

    test("paints the dark box brown-950 and its words brown-100", () => {
      const slab = rule(".slab");
      expect(slab).toMatch(/background-color:\s*var\(--brown-950\)/);
      expect(slab).toMatch(/color:\s*var\(--brown-100\)/);
    });

    // Shivanshu, 2026-11-15 (second pass): the line top left, left aligned,
    // and the button bottom right.
    test("puts the dark box's line at its top and the button at its foot", () => {
      const slab = rule(".slab");
      expect(slab).toMatch(/flex-direction:\s*column/);
      expect(slab).toMatch(/justify-content:\s*space-between/);
    });

    test("sends the button to the box's end, and the line back to its start", () => {
      expect(rule(".slab")).toMatch(/align-items:\s*flex-end/);
      expect(rule(".slabText")).toMatch(/align-self:\s*flex-start/);
    });

    test("leaves the line's text at the start, never aligned to the end", () => {
      expect(rule(".slab")).not.toMatch(/text-align/);
      expect(rule(".slabText")).not.toMatch(/text-align/);
    });

    test("aligns by start and end, not left and right, so it follows the page's direction", () => {
      expect(rule(".slab")).not.toMatch(/:\s*(?:left|right)\b/);
      expect(rule(".slabText")).not.toMatch(/:\s*(?:left|right)\b/);
    });
  });

  describe("under the hero", () => {
    test("sits 48px in on a desktop, as the design's grid does", () => {
      expect(rule(".body", lg())).toMatch(/padding-inline:\s*24px/);
    });

    test("opens the features 96px under the hero", () => {
      expect(rule(".features")).toMatch(/padding-block-start:\s*96px/);
    });

    test("rules the questions off as the About page does, 96px above", () => {
      const ruled = rule(".ruled");
      expect(ruled).toMatch(/margin-block-start:\s*96px/);
      expect(ruled).toMatch(/border-block-start-style:\s*solid/);
      expect(ruled).toMatch(/border-block-start-color:\s*var\(--color-border\)/);
    });

    test("sets the questions' title on the left half from lg, the answers on the right", () => {
      expect(rule(".pattern", lg())).toMatch(
        /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/,
      );
    });

    test("drops the first answer's own rule under the section's", () => {
      expect(rule(".rows > :first-child")).toMatch(/border-block-start-width:\s*0/);
    });
  });
});
