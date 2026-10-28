import { compile } from "sass";
import { join } from "node:path";

/**
 * The contact bar's stylesheet, compiled. The one-row and one-at-a-time
 * layouts are pure CSS, so this is where they are pinned: the colours, the
 * full bleed, native swipe below md, and the rule between items from md.
 */

const compiled = compile(join(__dirname, "../AnnouncementBar.module.scss")).css;
const css = compiled.slice(compiled.indexOf("@layer components {"));

function rule(selector: string, within = css) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = within.match(new RegExp(`(?:^|[}\\s])${escaped}\\s*\\{([^}]*)\\}`, "m"));
  if (!match?.[1]) throw new Error(`no rule for ${selector}`);
  return match[1];
}

const wide = () => {
  const start = css.indexOf("@media (min-width: 768px)");
  if (start === -1) throw new Error("no md block");
  return css.slice(start);
};

describe("AnnouncementBar.module.scss", () => {
  test("everything is in the components layer", () => {
    expect(css.trimStart().startsWith("@layer components")).toBe(true);
    expect(css.match(/@layer\s+\w+/g)).toEqual(["@layer components"]);
  });

  test("brown-100 text at 70% on a brown-900 ground", () => {
    const bar = rule(".bar");
    expect(bar).toMatch(/background-color:\s*var\(--brown-900\)/);
    expect(bar).toMatch(
      /(?:^|;)\s*color:\s*color-mix\(in srgb, var\(--brown-100\) 70%, transparent\)/,
    );
  });

  test("is exactly the height the homepage hero subtracts", () => {
    expect(rule(".bar")).toMatch(/min-block-size:\s*var\(--announce-block-size\)/);
  });

  test("runs edge to edge, out of body's guttered column", () => {
    expect(rule(".bar")).toMatch(/margin-inline:\s*calc\(50% - 50vw\)/);
  });

  describe("below md", () => {
    test("is arrow, one item, arrow", () => {
      const scroller = rule(".scroller");
      expect(scroller).toMatch(/display:\s*grid/);
      expect(scroller).toMatch(/grid-template-columns:\s*auto 1fr auto/);
    });

    test("swipes natively, one whole item at a time", () => {
      const viewport = rule(".viewport");
      expect(viewport).toMatch(/overflow-x:\s*auto/);
      expect(viewport).toMatch(/scroll-snap-type:\s*x mandatory/);
      expect(viewport).toMatch(/scrollbar-width:\s*none/);
      const item = rule(".item");
      expect(item).toMatch(/flex:\s*0 0 100%/);
      expect(item).toMatch(/scroll-snap-align:\s*center/);
    });

    test("the arrows are full touch targets", () => {
      const arrow = rule(".arrow");
      expect(arrow).toMatch(/inline-size:\s*var\(--size-touch-target\)/);
      expect(arrow).toMatch(/block-size:\s*var\(--size-touch-target\)/);
    });
  });

  describe("from md", () => {
    test("hides the arrows and lets every item show", () => {
      expect(rule(".arrow", wide())).toMatch(/display:\s*none/);
      expect(rule(".viewport", wide())).toMatch(/overflow:\s*visible/);
      expect(rule(".item", wide())).toMatch(/flex:\s*none/);
    });

    test("centres the row", () => {
      expect(rule(".items", wide())).toMatch(/justify-content:\s*center/);
    });

    test("splits the items by a rule that AT does not read", () => {
      expect(rule(".item + .item::before", wide())).toMatch(/content:\s*"\|"\s*\/\s*""/);
    });
  });

  test("links and arrows lighten on hover and draw a focus ring", () => {
    expect(css).toMatch(/\.link:hover\s*\{\s*color:\s*var\(--brown-100\)/);
    expect(css).toMatch(/\.arrow:hover\s*\{\s*color:\s*var\(--brown-100\)/);
    expect(css).toMatch(/\.link:focus-visible/);
    expect(css).toMatch(/\.arrow:focus-visible/);
  });

  test("draws no bullets", () => {
    expect(rule(".items")).toMatch(/list-style:\s*none/);
  });

  test("logical properties only, no !important", () => {
    expect(css).not.toMatch(/(?:^|[\s;{])(?:padding|margin)-(?:left|right|top|bottom)\s*:/m);
    expect(css).not.toMatch(/!important/);
  });
});
