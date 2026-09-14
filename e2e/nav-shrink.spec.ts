import { test, expect, type Page } from "@playwright/test";

/**
 * The desktop nav shrinks into its capsule around a fixed content row.
 *
 * The contract, measured per frame on a scroll that outruns the observer:
 *
 *   - the bar's box holds its top edge (the sticky inset is the same in both
 *     states, so the observer landing a frame late cannot drop it);
 *   - the links do not move on either axis. On x because the edge tracks are
 *     `50% minus a length` in both states, so the box's start edge plus the
 *     first track is constant while the box itself shrinks and shifts to hug
 *     a 23px mark on one side and a 129px CTA on the other; on y because the
 *     box top and the top padding are the same in both states;
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

  const shrink = await sample(page, 80);

  // Settled capsule: it hugs its content. The edge tracks are built from
  // measured widths (--nav-mark-track, --nav-cta-track, --nav-links-track in
  // Nav.module.scss), so this is what catches those numbers drifting from the
  // real artwork or copy — as a gap beside the mark, or the CTA poking out.
  const fit = await page.evaluate(() => {
    const header = document.querySelector("header")!;
    const box = header.getBoundingClientRect();
    const [mark] = Array.from(header.querySelectorAll('span > a[aria-label="Smarthaus — home"]'));
    const links = header.querySelector("nav ul")!.getBoundingClientRect();
    const cta = header.querySelector('a[href="/contact"]')!.getBoundingClientRect();
    const m = mark!.getBoundingClientRect();
    return {
      width: box.width,
      markInset: m.left - box.left,
      markToLinks: links.left - m.right,
      linksToCta: cta.left - links.right,
      ctaInset: box.right - cta.right,
    };
  });
  // 1px border + 8px padding on each side; 24px gaps; 23 + 315 + 129 inside.
  expect(Math.round(fit.width)).toBe(533);
  expect(Math.round(fit.markInset)).toBe(9);
  expect(Math.round(fit.markToLinks)).toBe(24);
  expect(Math.round(fit.linksToCta)).toBe(24);
  expect(Math.round(fit.ctaInset)).toBe(9);

  for (const [label, frames] of [
    ["shrink", shrink],
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
