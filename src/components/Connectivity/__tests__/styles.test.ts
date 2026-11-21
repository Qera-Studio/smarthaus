import { compile } from "sass";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The section's stylesheet contract, on the compiled CSS (Figma 4914:839).
 * jsdom applies no CSS Modules, so the layout is held here: a 1200 by 594
 * block centred in the column from md and edge to edge on a phone, 64px from
 * what is above and below it, on Figma's ground, and the marks in two, three,
 * then one spread row. e2e/connectivity.spec.ts measures it drawn.
 */

const SOURCE = join(__dirname, "../Connectivity.module.scss");
const compiled = compile(SOURCE).css;
// The component's own rules: the tokens Sass emits from _variables come first.
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

const MD = "(min-width: 768px)";
const LG = "(min-width: 1024px)";

describe("Connectivity.module.scss", () => {
  it("sits in the components layer, and nowhere else", () => {
    expect(compiled).toContain("@layer components {");
    expect(compiled.match(/@layer [a-z]+ \{/g)).toEqual(["@layer components {"]);
  });

  describe("the block", () => {
    it("is capped at the frame's 1200px", () => {
      expect(rule(".section")).toMatch(/max-inline-size: 75rem/);
    });

    it("runs edge to edge on a phone, out past the column's gutters", () => {
      expect(rule(".section")).toMatch(/margin-inline: calc\(-1 \* var\(--page-gutter\)\)/);
      expect(rule(".section")).toMatch(/padding-inline: var\(--page-gutter\)/);
    });

    it("is centred in the column from md", () => {
      expect(rule(".section", media(MD))).toMatch(/margin-inline: auto/);
    });

    it("is the frame's 594px tall at least, its content 88px in, from lg", () => {
      expect(rule(".section", media(LG))).toMatch(/min-block-size: 37\.125rem/);
      expect(rule(".section", media(LG))).toMatch(/padding: 88px/);
    });

    it("puts the copy at the head and the marks at the foot", () => {
      const block = rule(".section");
      expect(block).toMatch(/flex-direction: column/);
      expect(block).toMatch(/justify-content: space-between/);
    });

    it("stands 64px from what is above and below it (Shivanshu, 2026-11-16)", () => {
      expect(rule(".section")).toMatch(/margin-block: 64px/);
    });

    it("is painted with Figma's ground, baked to a picture that exists", () => {
      // As an SVG, its six 100px blurs cost WebKit whole frames on a phone.
      expect(rule(".section")).toMatch(
        /background-image: url\("\/landing\/connectivity\/ground\.webp"\)/,
      );
      const file = readFileSync(join(process.cwd(), "public/landing/connectivity/ground.webp"));
      expect(file.subarray(8, 12).toString()).toBe("WEBP");
    });

    it("covers the block with the ground's top kept and its middle centred", () => {
      // Kept at the left, a phone's tall box put the bright corner under the
      // line (4.4:1); centred, it reads 8:1 (measured 2026-11-16).
      expect(rule(".section")).toMatch(/background-size: cover/);
      expect(rule(".section")).toMatch(/background-position: center top/);
    });

    it("keeps a dark ground under the picture, and in its place if it never loads", () => {
      expect(rule(".section")).toMatch(/background-color: var\(--brown-900\)/);
    });

    it("keeps its own colours under forced colours, over a picture they cannot change", () => {
      expect(media("(forced-colors: active)")).toMatch(
        /\.section \{ forced-color-adjust: none; \}/,
      );
    });
  });

  describe("the copy", () => {
    it("sets the heading at the solution features' size, the page's h2 less 4px", () => {
      expect(rule(".heading")).toMatch(
        /font-size: max\(var\(--font-size-xl\), var\(--type-h2\) - 0\.25rem\)/,
      );
      expect(rule(".heading")).toMatch(/color: var\(--color-text-inverse\)/);
    });

    it("sets the line at 20px in the light ink, no wider than 900px", () => {
      const lead = rule(".lead");
      expect(lead).toMatch(/font-size: var\(--font-size-lg\)/);
      expect(lead).toMatch(/color: var\(--brown-50\)/);
      expect(lead).toMatch(/max-inline-size: 56\.25rem/);
    });

    it("leaves 36px from the line to the button: a 12px gap and 24px", () => {
      expect(rule(".copy")).toMatch(/gap: 12px/);
      expect(rule(".lead")).toMatch(/margin-block-end: 24px/);
    });
  });

  describe("the marks", () => {
    it("are two to a row on a phone", () => {
      expect(rule(".marks")).toMatch(/grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
    });

    it("are three to a row from md", () => {
      expect(rule(".marks", media(MD))).toMatch(
        /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/,
      );
    });

    it("are one row spread edge to edge from lg", () => {
      const marks = rule(".marks", media(LG));
      expect(marks).toMatch(/display: flex/);
      expect(marks).toMatch(/justify-content: space-between/);
    });

    it("shrink only where a column is narrower than the file", () => {
      expect(rule(".mark")).toMatch(/max-inline-size: 100%/);
      expect(rule(".mark")).toMatch(/block-size: auto/);
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
        /(?<![-\w])(font|background|border|transition|grid-area):[^;]*var\(/,
      );
    });
  });
});
