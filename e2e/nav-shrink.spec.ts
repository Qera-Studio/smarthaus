import { test, expect, type Page } from "@playwright/test";

/**
 * The desktop nav shrinks into its capsule around a fixed content row.
 *
 * The contract, measured per frame on a scroll that outruns the observer:
 *
 *   - the bar's box holds its top edge (the sticky inset is the same in both
 *     states, so the observer landing a frame late cannot drop it);
 *   - the links do not move on either axis (symmetric fr edge tracks keep
 *     them on the bar's centre, and the content row is at the same y in both
 *     states because the box top and the top padding are both shared);
 *   - the CTA and the logo keep their vertical position and only slide
 *     inward with the edges;
 *   - the two brand lockups cross-fade on one centre line (both in flow).
 *
 * Each of these was a measured hop before it was fixed: a 24px drop of the
 * whole bar, a 55px sideways drift of the links, an 8px drop of every item,
 * and an 11px offset between the fading lockups. Desktop only: below lg the
 * nav is a fixed bottom bar and none of this applies.
 */

test.skip(({ isMobile }) => Boolean(isMobile), "the capsule is a desktop-only behaviour");
test.use({ viewport: { width: 1512, height: 900 } });

type Frame = {
  top: number;
  linksX: number;
  linksY: number;
  ctaTop: number;
  markMid: number;
  fullMid: number;
};

/** Scroll, then read the bar and its contents on every frame for 600ms. */
function sample(page: Page, scrollTo: number): Promise<Frame[]> {
  return page.evaluate(
    (y) =>
      new Promise<Frame[]>((resolve) => {
        const header = document.querySelector("header")!;
        const [mark, full] = Array.from(
          header.querySelectorAll<HTMLElement>('span > a[aria-label="Smarthaus — home"]'),
        );
        const links = header.querySelector<HTMLElement>("nav ul")!;
        const cta = header.querySelector<HTMLElement>('a[href="/contact"]')!;
        const mid = (el: HTMLElement) => {
          const r = el.getBoundingClientRect();
          return r.top + r.height / 2;
        };
        const frames: Frame[] = [];
        const snap = () => {
          const l = links.getBoundingClientRect();
          frames.push({
            top: header.getBoundingClientRect().top,
            linksX: l.left + l.width / 2,
            linksY: l.top + l.height / 2,
            ctaTop: cta.getBoundingClientRect().top,
            markMid: mid(mark!),
            fullMid: mid(full!),
          });
        };
        const t0 = performance.now();
        window.scrollTo(0, y);
        const loop = () => {
          snap();
          if (performance.now() - t0 < 600) requestAnimationFrame(loop);
          else resolve(frames);
        };
        requestAnimationFrame(loop);
      }),
    scrollTo,
  );
}

test("the links hold still and nothing hops, shrinking or growing back", async ({ page }) => {
  // /about rather than the homepage: it has content to scroll.
  await page.goto("/about");

  for (const [label, frames] of [
    ["shrink", await sample(page, 80)],
    ["expand back", await sample(page, 0)],
  ] as const) {
    expect(frames.length, `${label}: sampled frames`).toBeGreaterThan(10);
    const first = frames[0]!;
    for (const f of frames) {
      // The box top is the shared inset on every frame — never 0.
      expect(Math.round(f.top), `${label}: bar top`).toBe(16);
      // Links: on the viewport's centre line, and on the same row, throughout.
      expect(Math.abs(f.linksX - 756), `${label}: links off centre`).toBeLessThan(1);
      expect(Math.abs(f.linksY - first.linksY), `${label}: links moved on y`).toBeLessThan(1);
      // The CTA slides inward only; its row does not move.
      expect(Math.abs(f.ctaTop - first.ctaTop), `${label}: CTA moved on y`).toBeLessThan(1);
      // The two lockups cross-fade on one centre line. Their heights differ by
      // ~5px so the tops never match; the centres must.
      expect(Math.abs(f.markMid - f.fullMid), `${label}: lockup centres`).toBeLessThan(3);
    }
  }
});
