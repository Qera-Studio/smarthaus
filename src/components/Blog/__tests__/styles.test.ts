import { compile } from "sass";
import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * The blog stylesheet's contract, on the compiled CSS. jsdom applies no CSS
 * Modules, so the component tests cannot see any of this: the column an
 * article is read in, the rules between cards, the one link that covers a
 * card. Plus the project's SCSS rules: blocks layer, logical properties,
 * longhands, no !important, no ID selectors.
 */

const compiled = compile(join(__dirname, "../Blog.module.scss")).css;
const css = compiled.slice(compiled.indexOf("@layer blocks {"));

/** The declarations of the first rule whose selector matches, exactly. */
function rule(selector: string, within = css) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = within.match(new RegExp(`(?:^|[}\\s,])${escaped}\\s*\\{([^}]*)\\}`, "m"));
  if (!match?.[1]) throw new Error(`no rule for ${selector}`);
  return match[1];
}

/** Every @media block's body whose query contains `query`, joined. */
function media(query: string) {
  const out: string[] = [];
  let from = 0;
  for (;;) {
    const start = css.indexOf("@media", from);
    if (start === -1) break;
    const open = css.indexOf("{", start);
    let depth = 0;
    let end = open;
    for (let i = open; i < css.length; i += 1) {
      if (css[i] === "{") depth += 1;
      if (css[i] === "}") depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
    if (css.slice(start, open).includes(query)) out.push(css.slice(open + 1, end));
    from = end + 1;
  }
  if (out.length === 0) throw new Error(`no @media ${query}`);
  return out.join("\n");
}

const LG = "(min-width: 1024px)";
const MD = "(min-width: 768px)";

describe("Blog.module.scss", () => {
  test("everything is in the blocks layer", () => {
    expect(css.trimStart().startsWith("@layer blocks")).toBe(true);
    expect(css.match(/@layer\s+\w+/g)).toEqual(["@layer blocks"]);
  });

  describe("an article", () => {
    test("is read in a column a thousand pixels wide, centred", () => {
      expect(rule(".page,\n  .index")).toMatch(/--blog-column:\s*62\.5rem/);
      const article = rule(".article");
      expect(article).toMatch(/max-inline-size:\s*var\(--blog-column\)/);
      expect(article).toMatch(/margin-inline:\s*auto/);
      expect(article).toMatch(/inline-size:\s*100%/);
    });

    test("sets its title at the design's 36px on a desktop, smaller on a phone", () => {
      expect(rule(".page,\n  .index")).toMatch(
        /--blog-title-size:\s*clamp\(1\.5rem,\s*5vw,\s*2\.25rem\)/,
      );
      expect(rule(".title")).toMatch(/font-size:\s*var\(--blog-title-size\)/);
    });

    test("sets every line on the design's 1.4", () => {
      expect(rule(".page,\n  .index")).toMatch(/--blog-leading:\s*1\.4/);
      for (const selector of [".title", ".body", ".cardTitle"]) {
        expect(rule(selector)).toMatch(/line-height:\s*var\(--blog-leading\)/);
      }
    });

    test("sets the text at 16px, which is also the least a phone will not zoom", () => {
      expect(rule(".body")).toMatch(/font-size:\s*var\(--font-size-base\)/);
    });

    test("leaves a blank line between paragraphs and pulls a heading to its own", () => {
      expect(rule(".body > * + *")).toMatch(/margin-block-start:\s*1\.4em/);
      expect(rule(".body h2 + *,\n  .body h3 + *")).toMatch(/margin-block-start:\s*8px/);
    });

    test("keeps the main picture 16:9 and covers it, whatever the file is", () => {
      expect(rule(".hero")).toMatch(/aspect-ratio:\s*16\s*\/\s*9/);
      expect(rule(".hero img")).toMatch(/object-fit:\s*cover/);
    });

    test("lets a picture in the text keep its own shape", () => {
      const img = rule(".body figure img");
      expect(img).toMatch(/inline-size:\s*100%/);
      expect(img).toMatch(/block-size:\s*auto/);
    });

    test("stacks who, what and when on a phone and sets them in a row from md", () => {
      expect(rule(".meta")).toMatch(/flex-direction:\s*column/);
      expect(rule(".meta", media(MD))).toMatch(/flex-direction:\s*row/);
    });

    test("gives the way back a full-size touch target", () => {
      expect(rule(".back")).toMatch(/min-block-size:\s*var\(--size-touch-target\)/);
    });

    test("draws the back arrow as a mask in the text's colour, turned to point back", () => {
      const icon = rule(".backIcon");
      expect(icon).toMatch(/mask-image:\s*url\("\/blog\/arrow-back\.svg"\)/);
      expect(icon).toMatch(/background-color:\s*currentcolor/);
      expect(icon).toMatch(/rotate:\s*90deg/);
      expect(existsSync(join(process.cwd(), "public/blog/arrow-back.svg"))).toBe(true);
    });

    test("keeps the arrow visible under forced colours", () => {
      const forced = media("(forced-colors: active)");
      expect(rule(".backIcon", forced)).toMatch(/background-color:\s*CanvasText/);
    });
  });

  describe("a card", () => {
    test("is one target: the title's link covers the whole card", () => {
      expect(rule(".card")).toMatch(/position:\s*relative/);
      const cover = rule(".cardLink::after");
      expect(cover).toMatch(/position:\s*absolute/);
      expect(cover).toMatch(/inset:\s*0/);
    });

    test("rings the whole card on keyboard focus, not the title's text", () => {
      expect(rule(".cardLink:focus-visible")).toMatch(/outline-style:\s*none/);
      expect(rule(".cardLink:focus-visible::after")).toMatch(
        /outline:\s*2px solid var\(--color-border-focus\)/,
      );
    });

    test("keeps its picture 16:9", () => {
      expect(rule(".cardMedia")).toMatch(/aspect-ratio:\s*16\s*\/\s*9/);
      expect(rule(".cardMedia img")).toMatch(/object-fit:\s*cover/);
    });

    test("pins the tag and date to its foot, however long the title", () => {
      expect(rule(".cardText")).toMatch(/flex:\s*1/);
      expect(rule(".cardMeta")).toMatch(/margin-block-start:\s*auto/);
    });

    test("draws the arrow from the design's file, turned to point up and right", () => {
      const open = rule(".open");
      expect(open).toMatch(/background-image:\s*url\("\/blog\/arrow-open\.svg"\)/);
      expect(open).toMatch(/rotate:\s*90deg/);
      expect(existsSync(join(process.cwd(), "public/blog/arrow-open.svg"))).toBe(true);
    });

    test("moves on hover by transform only, never by layout", () => {
      expect(rule(".card:hover .cardMedia img")).toMatch(/scale:/);
      expect(rule(".card:hover .open")).toMatch(/translate:/);
      expect(rule(".cardMedia img")).toMatch(/transition-property:\s*scale/);
    });

    test("is wide, picture beside words, only from lg and only when featured", () => {
      const lg = media(LG);
      expect(rule(".card[data-featured]", lg)).toMatch(/flex-direction:\s*row/);
      expect(rule(".card[data-featured] .cardMedia", lg)).toMatch(/aspect-ratio:\s*876\s*\/\s*319/);
      expect(rule(".card")).toMatch(/flex-direction:\s*column/);
    });
  });

  describe("the rows of cards", () => {
    test("are one column on a phone, two from md, three from lg", () => {
      expect(rule(".grid")).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/);
      expect(rule(".grid", media(MD))).toMatch(/repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
      expect(rule(".grid", media(LG))).toMatch(/repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
    });

    test("have no gap: each cell is padded and the list pulled out by the same", () => {
      const grid = rule(".grid");
      expect(grid).not.toMatch(/\bgap:/);
      expect(grid).toMatch(/margin-inline:\s*calc\(-1 \* var\(--blog-cell\)\)/);
      expect(rule(".grid > li")).toMatch(/padding-inline:\s*var\(--blog-cell\)/);
    });

    test("clip what the pull puts outside the page's edges", () => {
      expect(rule(".grid")).toMatch(/clip-path:\s*inset\(0 var\(--blog-cell\)\)/);
    });

    test("stand a rule at each cell's side, midway between two cards", () => {
      const side = rule(".grid > li::before");
      expect(side).toMatch(/inset-inline-start:\s*0/);
      expect(side).toMatch(/inline-size:\s*1px/);
      expect(side).toMatch(/background-color:\s*var\(--blog-rule\)/);
    });

    test("rule the head of every row on the articles page only", () => {
      const ruled = rule(".grid[data-ruled] > li");
      expect(ruled).toMatch(/border-block-start-width:\s*1px/);
      expect(ruled).toMatch(/border-block-start-color:\s*var\(--blog-rule\)/);
      expect(rule(".grid > li")).not.toMatch(/border-block-start/);
    });

    test("set the cards 96px apart on a desktop, 48 below it", () => {
      expect(rule(".page,\n  .index")).toMatch(/--blog-cell:\s*24px/);
      // Nested one level deeper inside the media block, so indented further.
      expect(rule(".page,\n    .index", media(LG))).toMatch(/--blog-cell:\s*48px/);
    });
  });

  describe("the search and the filter", () => {
    test("are full-size touch targets at 16px, so a phone does not zoom in", () => {
      const field = rule(".search,\n  .select");
      expect(field).toMatch(/block-size:\s*var\(--size-touch-target\)/);
      expect(field).toMatch(/font-size:\s*var\(--font-size-base\)/);
    });

    test("have a border a reader can find: the input border, not the hairline", () => {
      expect(rule(".search,\n  .select")).toMatch(/border-color:\s*var\(--color-border-input\)/);
    });

    test("sit under the heading on a phone and beside it from md", () => {
      expect(rule(".indexHead")).toMatch(/flex-direction:\s*column/);
      const md = rule(".indexHead", media(MD));
      expect(md).toMatch(/flex-direction:\s*row/);
      expect(md).toMatch(/justify-content:\s*space-between/);
    });
  });

  describe("the project's SCSS rules", () => {
    test("uses logical properties only", () => {
      const physical = css.match(
        /(?:^|[\s;{])(?:width|height|min-width|max-width|min-height|max-height|margin-(?:left|right|top|bottom)|padding-(?:left|right|top|bottom)|left|right|top|bottom|border-(?:left|right|top|bottom)[a-z-]*)\s*:/gm,
      );
      expect(physical).toBeNull();
    });

    test("uses no var() inside a shorthand", () => {
      for (const shorthand of ["font", "background", "border", "transition", "grid-area"]) {
        const found = css.match(new RegExp(`(?:^|[\\s;{])${shorthand}\\s*:[^;]*var\\(`, "gm"));
        expect({ shorthand, found }).toEqual({ shorthand, found: null });
      }
    });

    test("uses no !important and no ID selector", () => {
      expect(css).not.toMatch(/!important/);
      expect(css).not.toMatch(/(?:^|[\s,}])#[a-zA-Z][\w-]*\s*[{,]/m);
    });

    test("animates nothing: every movement here is a transition on hover", () => {
      expect(css).not.toMatch(/@keyframes|animation-name/);
    });
  });
});
