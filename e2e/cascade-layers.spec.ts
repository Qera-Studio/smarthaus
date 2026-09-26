import { test, expect } from "./fixtures";

/**
 * The cascade layer order must hold whichever stylesheet the browser sees first.
 *
 * A layer's precedence is fixed by where its name FIRST appears across all
 * stylesheets, and Next does not always deliver the globals chunk first: a
 * route that calls notFound() (/loader-preview in production) ships an HTML
 * document with no stylesheet links, and React then inserts the page's own
 * chunk before the layout's. With the order statement only in globals.scss,
 * that page registered `components` before `reset` and the reset won every
 * cascade — ink-on-ink CTAs, a 1123px footer mark, the capsule pinned to the
 * left gutter. It looked like a device bug and was a URL bug.
 *
 * Every module now emits the statement itself (see _variables.scss). This
 * asserts the invariant directly on the three delivery paths: a normal page,
 * an unrouted 404, and the notFound() route.
 */

const ORDER = ["reset", "base", "components", "blocks", "utilities"];

// Engine-independent; one project is enough.
test.skip(({ isMobile }) => Boolean(isMobile), "layer order is not device-specific");

for (const path of ["/", "/this-page-does-not-exist", "/loader-preview"]) {
  test(`layers are ordered reset < base < components < blocks < utilities on ${path}`, async ({
    page,
  }) => {
    await page.goto(path);

    // Layer names in order of FIRST appearance across every stylesheet, which
    // is exactly how the browser fixes their precedence.
    //
    // Polled, not read once: on the notFound() route the stylesheets are not
    // in the server HTML at all — React inserts them after hydration — so
    // `load` can resolve before they exist and a single read sees a partial
    // list. The order is fixed the moment the sheets are in, and the poll
    // waits for that.
    const layerOrder = () =>
      page.evaluate(() => {
        const names: string[] = [];
        const add = (name: string) => {
          if (!names.includes(name)) names.push(name);
        };
        for (const sheet of Array.from(document.styleSheets)) {
          for (const rule of Array.from(sheet.cssRules)) {
            if (rule instanceof CSSLayerStatementRule) rule.nameList.forEach(add);
            else if (rule instanceof CSSLayerBlockRule) add(rule.name);
          }
        }
        return names;
      });
    await expect.poll(layerOrder).toEqual(ORDER);

    // The user-visible symptom of an inverted order: the reset's
    // `a { color: inherit }` beating the CTA's own brown-100 ink.
    await expect(page.locator('header a[href="/contact"]')).toHaveCSS(
      "color",
      "rgb(240, 233, 221)",
    );
  });
}
