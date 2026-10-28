import { compile } from "sass";
import { join } from "node:path";

/**
 * The Solutions menu's stylesheet contract, on the compiled CSS. jsdom
 * applies no CSS Modules, and the menu's whole choreography is CSS: the
 * panel keeping the capsule's width in both states of the bar, joining it
 * once the bar has shrunk, opening and closing as the phone menu does, and
 * on a phone the links and the solutions trading places.
 */

// One line, single spaces: Sass breaks long values across lines.
const css = compile(join(__dirname, "../Nav.module.scss")).css.replace(/\s+/g, " ");

/** Every @media block with this query, joined: the bands open several. */
function media(query: string) {
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

/** The declarations of every rule whose selector list matches, exactly. */
function rule(selector: string, within = css) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/,\s*/g, ",\\s*");
  const found = [...within.matchAll(new RegExp(`(?:^|[{}\\s])${escaped}\\s*\\{([^{}]*)\\}`, "g"))];
  if (!found.length) throw new Error(`no rule for ${selector}`);
  return found.map((match) => match[1]).join(" ");
}

const desktop = () => media("(min-width: 1024px)");
const phone = () => media("(max-width: 1023px)");
const reduce = () => media("(prefers-reduced-motion: reduce)");

describe("Nav.module.scss: the Solutions menu", () => {
  describe("tokens", () => {
    test("the panel floats 8px under the tall bar", () => {
      expect(rule(".nav")).toMatch(/--nav-menu-gap:\s*8px/);
    });

    test("its stagger spreads eight items over the phone menu's three-link window", () => {
      expect(rule(".nav")).toMatch(
        /--nav-menu-step:\s*calc\(var\(--nav-stagger-step\) \* 3 \/ 8\)/,
      );
      expect(rule(".nav")).toMatch(
        /--nav-menu-step-out:\s*calc\(var\(--nav-stagger-step-out\) \* 3 \/ 8\)/,
      );
    });

    test("the phone's swap slides, then resizes, on the duration scale", () => {
      expect(rule(".nav")).toMatch(/--nav-sub-slide:\s*240ms/);
      expect(rule(".nav")).toMatch(/--nav-sub-resize:\s*400ms/);
    });
  });

  test("the panel is not drawn below lg", () => {
    expect(rule(".menu")).toMatch(/display:\s*none/);
  });

  describe("from lg", () => {
    test("it is exactly the capsule's width, on the page's centre, in both states", () => {
      const menu = rule(".menu", desktop());
      expect(menu).toMatch(/position:\s*absolute/);
      expect(menu).toMatch(/inline-size:\s*var\(--nav-stuck-size\)/);
      expect(menu).toMatch(/inset-inline-start:\s*50%/);
      expect(menu).toMatch(/translate:\s*-50% var\(--nav-menu-gap\)/);
      // The capsule's own width is the same token.
      expect(rule(".nav[data-stuck]", desktop())).toMatch(
        /max-inline-size:\s*var\(--nav-stuck-size\)/,
      );
    });

    test("hangs just below the bar's 1px frame", () => {
      expect(rule(".menu", desktop())).toMatch(/inset-block-start:\s*calc\(100% \+ 1px\)/);
    });

    test("is frosted glass, square, as the capsule is", () => {
      const menu = rule(".menu", desktop());
      expect(menu).toMatch(/background-color:\s*var\(--glass-bg/);
      expect(menu).toMatch(/border-radius:\s*0/);
    });

    test("opens by its height, as the phone menu does, and is hidden while shut", () => {
      const menu = rule(".menu", desktop());
      expect(menu).toMatch(/display:\s*grid/);
      expect(menu).toMatch(/grid-template-rows:\s*0fr/);
      expect(menu).toMatch(/visibility:\s*hidden/);
      const open = rule(".nav[data-menu] .menu", desktop());
      expect(open).toMatch(/grid-template-rows:\s*1fr/);
      expect(open).toMatch(/visibility:\s*visible/);
    });

    test("opens on the phone menu's duration and curve, and at once", () => {
      const open = rule(".nav[data-menu] .menu", desktop());
      expect(open).toMatch(/transition-duration:\s*var\(--nav-expand-duration\)/);
      expect(open).toMatch(/transition-delay:\s*0s/);
      expect(rule(".menu", desktop())).toMatch(
        /transition-timing-function:\s*var\(--nav-expand-ease\)/,
      );
    });

    test("opened by the keyboard, it shows at once, while the gap still rides the shrink", () => {
      expect(rule(".nav[data-menu=focus] .menu", desktop())).toMatch(
        /transition-duration:\s*0s, var\(--nav-stuck-duration\), var\(--nav-stuck-duration\), 0s/,
      );
      const items = rule(
        ".nav[data-menu=focus] .menuItem, .nav[data-menu=focus] .menuMedia",
        desktop(),
      );
      expect(items).toMatch(/transition-delay:\s*0s/);
      expect(items).toMatch(/transition-duration:\s*0s/);
    });

    test("closes after its items have left, then hides once folded", () => {
      const menu = rule(".menu", desktop());
      expect(menu).toMatch(
        /transition-property:\s*grid-template-rows, translate, border-color, visibility/,
      );
      expect(menu).toMatch(
        /transition-delay:\s*var\(--nav-collapse-hold\), 0s, 0s, calc\(var\(--nav-collapse-hold\) \+ var\(--nav-collapse-duration\)\)/,
      );
    });

    test("closes its gap and drops the frame between it and the shrunk bar", () => {
      const stuck = rule(".nav[data-stuck] .menu", desktop());
      expect(stuck).toMatch(/translate:\s*-50% 0/);
      expect(stuck).toMatch(/border-block-start-color:\s*transparent/);
      expect(rule(".nav[data-stuck][data-menu]", desktop())).toMatch(
        /border-block-end-color:\s*transparent/,
      );
    });

    test("the capsule blurs on a layer behind it, so the panel inside can blur the page too", () => {
      // An element with backdrop-filter is a backdrop root: the panel inside
      // the header showed the page sharp through its tint (2026-10-28).
      expect(rule(".nav[data-stuck]", desktop())).toMatch(/(^|;)\s*backdrop-filter:\s*none/);
      const layer = rule(".nav[data-stuck]::after", desktop());
      expect(layer).toMatch(
        /backdrop-filter:\s*blur\(var\(--glass-blur\)\) saturate\(var\(--glass-saturate\)\)/,
      );
      expect(layer).toMatch(/inset:\s*-1px/);
      expect(layer).toMatch(/z-index:\s*-2/);
      expect(layer).toMatch(/pointer-events:\s*none/);
    });

    test("joined, no shadow crosses the seam", () => {
      expect(rule(".nav[data-stuck][data-menu]", desktop())).toMatch(/box-shadow:\s*none/);
      expect(rule(".nav[data-stuck] .menu", desktop())).toMatch(
        /clip-path:\s*inset\(0 -48px -48px\)/,
      );
    });

    test("and the grain reaches over both clear frame rows at the seam", () => {
      expect(rule(".nav[data-menu]::before", desktop())).toMatch(/inset-block-end:\s*-1px/);
      expect(rule(".nav[data-stuck] .menu::before", desktop())).toMatch(
        /inset-block-start:\s*-1px/,
      );
    });

    test("the gap and frame move on the bar's own shrink clock", () => {
      expect(rule(".menu", desktop())).toMatch(
        /transition-duration:\s*var\(--nav-collapse-duration\), var\(--nav-stuck-duration\), var\(--nav-stuck-duration\), 0s/,
      );
    });

    test("bridges the gap to the bar, so the pointer crossing it stays in the item", () => {
      const bridge = rule(".menu::after", desktop());
      expect(bridge).toMatch(/inset-block-end:\s*100%/);
      expect(bridge).toMatch(
        /block-size:\s*calc\(var\(--nav-menu-gap\) \+ 1px \+ var\(--nav-padding-stuck\)\)/,
      );
    });

    test("the row the 0fr sizes carries no padding, which would survive it", () => {
      const inner = rule(".menuInner", desktop());
      expect(inner).toMatch(/min-block-size:\s*0/);
      expect(inner).toMatch(/overflow:\s*clip/);
      expect(inner).not.toMatch(/padding/);
    });

    test("lays the list and the picture out as the Figma does", () => {
      const body = rule(".menuBody", desktop());
      expect(body).toMatch(/display:\s*flex/);
      expect(body).toMatch(/gap:\s*48px/);
      expect(body).toMatch(/padding-block:\s*32px 12px/);
      expect(body).toMatch(/padding-inline:\s*12px/);
      expect(rule(".menuList", desktop())).toMatch(/gap:\s*12px/);
      expect(rule(".menuMedia", desktop())).toMatch(/flex:\s*1/);
    });

    test("marks the solution in hand with brown-200", () => {
      expect(rule(".menuLink[data-shown]", desktop())).toMatch(
        /background-color:\s*var\(--brown-200\)/,
      );
    });

    test("fades the pictures over one another", () => {
      expect(rule(".menuImage", desktop())).toMatch(/opacity:\s*0/);
      expect(rule(".menuImage", desktop())).toMatch(/object-fit:\s*cover/);
      expect(rule(".menuImage[data-shown]", desktop())).toMatch(/opacity:\s*1/);
    });

    test("items arrive once the panel is 90% open, one step apart", () => {
      const open = rule(".nav[data-menu] .menuItem, .nav[data-menu] .menuMedia", desktop());
      expect(open).toMatch(/opacity:\s*1/);
      expect(open).toMatch(
        /transition-delay:\s*calc\(var\(--nav-expand-duration\) \* 0\.9 \+ var\(--link-index, 0\) \* var\(--nav-menu-step\)\)/,
      );
    });

    test("and leave in reverse, last first", () => {
      const closed = rule(".menuItem, .menuMedia", desktop());
      expect(closed).toMatch(/opacity:\s*0/);
      expect(closed).toMatch(/transform:\s*translateY\(var\(--nav-link-rise\)\)/);
      expect(closed).toMatch(
        /transition-delay:\s*calc\(\(7 - var\(--link-index, 7\)\) \* var\(--nav-menu-step-out\)\)/,
      );
    });

    test("keeps the phone's solutions out and its wrapper invisible to layout", () => {
      expect(rule(".sub", desktop())).toMatch(/display:\s*none/);
      expect(rule(".main", desktop())).toMatch(/display:\s*contents/);
    });
  });

  describe("below lg", () => {
    test("the solutions and the links each have their own 0fr/1fr row", () => {
      expect(rule(".sub, .main", phone())).toMatch(/display:\s*grid/);
      expect(rule(".sub", phone())).toMatch(/grid-template-rows:\s*0fr/);
      expect(rule(".main", phone())).toMatch(/grid-template-rows:\s*1fr/);
      expect(rule(".nav[data-sub] .sub", phone())).toMatch(/grid-template-rows:\s*1fr/);
      expect(rule(".nav[data-sub] .main", phone())).toMatch(/grid-template-rows:\s*0fr/);
    });

    test("the height changes only once the leaving side has slid away", () => {
      const rows = rule(".sub, .main", phone());
      expect(rows).toMatch(/transition-property:\s*grid-template-rows/);
      expect(rows).toMatch(/transition-duration:\s*var\(--nav-sub-resize\)/);
      expect(rows).toMatch(/transition-delay:\s*var\(--nav-sub-slide\)/);
    });

    test("the links leave to the left at once", () => {
      const away = rule(".nav[data-sub] .panelLinks", phone());
      expect(away).toMatch(/translate:\s*-100% 0/);
      expect(away).toMatch(/opacity:\s*0/);
      expect(away).toMatch(/transition-delay:\s*0s/);
    });

    test("the solutions arrive from the right once the height has nearly settled", () => {
      expect(rule(".subInner", phone())).toMatch(/translate:\s*100% 0/);
      const arrive = rule(".nav[data-sub] .subInner", phone());
      expect(arrive).toMatch(/translate:\s*0 0/);
      expect(arrive).toMatch(/opacity:\s*1/);
      expect(arrive).toMatch(
        /transition-delay:\s*calc\(var\(--nav-sub-slide\) \+ var\(--nav-sub-resize\) \* 0\.9\)/,
      );
    });

    test("Back runs it in reverse: the links return after the height", () => {
      expect(rule(".panelLinks", phone())).toMatch(
        /transition-delay:\s*calc\(var\(--nav-sub-slide\) \+ var\(--nav-sub-resize\) \* 0\.9\)/,
      );
    });

    test("the solutions run the panel's full width and scroll on a short screen", () => {
      expect(rule(".sub", phone())).toMatch(/align-self:\s*stretch/);
      const inner = rule(".subInner", phone());
      expect(inner).toMatch(/max-block-size:\s*var\(--nav-sub-max\)/);
      expect(inner).toMatch(/overflow-y:\s*auto/);
    });

    test("the picture sits on top and the eight are centred below it", () => {
      expect(rule(".subMedia", phone())).toMatch(/order:\s*-1/);
      expect(rule(".subList", phone())).toMatch(/align-items:\s*center/);
    });

    test("Back sits on the start edge, with no side padding", () => {
      const back = rule(".back", phone());
      expect(back).toMatch(/align-self:\s*flex-start/);
      expect(back).toMatch(/padding-inline:\s*0/);
    });

    test("a sideways finger on the picture is the swipe, up and down the page's", () => {
      expect(rule(".subMedia", phone())).toMatch(/touch-action:\s*pan-y/);
    });

    test("marks the solution in hand, as the desktop panel does", () => {
      expect(rule(".subLink[data-shown]", phone())).toMatch(
        /background-color:\s*var\(--brown-200\)/,
      );
    });
  });

  describe("under reduced motion", () => {
    test("no delay survives in either direction, on either side", () => {
      for (const selector of [
        ".menu",
        ".menuItem",
        ".nav[data-menu] .menu",
        ".nav[data-menu] .menuItem",
        ".sub",
        ".main",
        ".panelLinks",
        ".subInner",
        ".nav[data-sub] .subInner",
        ".nav[data-sub] .panelLinks",
      ]) {
        expect(reduce()).toMatch(
          new RegExp(
            `${selector.replace(/[.[\]]/g, "\\$&")},[^{]*\\{\\s*transition-delay:\\s*0s|${selector.replace(/[.[\]]/g, "\\$&")}\\s*\\{\\s*transition-delay:\\s*0s`,
          ),
        );
      }
    });

    test("the items do not rise", () => {
      expect(reduce()).toMatch(/\.menuItem,\s*\.menuMedia\s*\{\s*transform:\s*none/);
    });
  });

  test("stays within the project's selector limits", () => {
    const selectors = css.match(/[^{};]+(?=\{)/g) ?? [];
    for (const selector of selectors.filter((s) => /menu|sub|main|back/.test(s))) {
      expect(selector).not.toMatch(/#/);
      for (const part of selector.split(",")) {
        // Classes, attributes and pseudo-classes; a ::pseudo-element counts as
        // a type, not toward the 0,3,0 limit.
        const classes = (part.match(/\.[\w-]+|\[[^\]]+\]|(?<!:):(?!:)[\w-]+/g) ?? []).length;
        expect(classes).toBeLessThanOrEqual(3);
      }
    }
  });
});
