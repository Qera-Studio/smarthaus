import { test, expect, type Page } from "@playwright/test";

/**
 * The desktop nav shrinks into its capsule without anything hopping.
 *
 * Two hops were measured and fixed, and both would come back silently:
 *
 *   1. The whole bar. The sticky inset used to be 0 until [data-stuck]
 *      landed, and the observer that sets it fires a frame after the sentinel
 *      leaves — so a flick that scrolls past 24px in that frame pinned the
 *      bar to the viewport top, then dropped it 24px when the stuck inset
 *      arrived. The inset is now the same in both states.
 *   2. The logo. The hidden lockup was absolutely positioned, which aligned
 *      it against a different box than the in-flow one; the fading-out lockup
 *      sat 11px below the fading-in mark for the whole cross-fade. Both are
 *      in flow now and centre on the same line.
 *
 * These are per-frame geometry assertions on a scroll that outruns the
 * observer, which is why they sample requestAnimationFrame rather than
 * asserting a settled state. Desktop only: below lg the nav is a fixed bottom
 * bar and neither behaviour exists.
 */

test.skip(({ isMobile }) => Boolean(isMobile), "the capsule is a desktop-only behaviour");
test.use({ viewport: { width: 1512, height: 900 } });

type Frame = { top: number; markMid: number; fullMid: number };

/** Scroll, then read the bar and both brand links on every frame for 600ms. */
function sample(page: Page, scrollTo: number): Promise<Frame[]> {
  return page.evaluate(
    (y) =>
      new Promise<Frame[]>((resolve) => {
        const header = document.querySelector("header")!;
        const [mark, full] = Array.from(
          header.querySelectorAll<HTMLElement>('span > a[aria-label="Smarthaus — home"]'),
        );
        const mid = (el: HTMLElement) => {
          const r = el.getBoundingClientRect();
          return r.top + r.height / 2;
        };
        const frames: Frame[] = [];
        const snap = () =>
          frames.push({
            top: header.getBoundingClientRect().top,
            markMid: mid(mark!),
            fullMid: mid(full!),
          });
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

test("nothing hops when the bar shrinks, or when it grows back", async ({ page }) => {
  // /about rather than the homepage: it has content to scroll.
  await page.goto("/about");

  for (const [label, frames] of [
    ["shrink", await sample(page, 80)],
    ["expand back", await sample(page, 0)],
  ] as const) {
    expect(frames.length, `${label}: sampled frames`).toBeGreaterThan(10);
    for (const f of frames) {
      // The bar holds 24px from the viewport top on every frame — never 0.
      expect(Math.round(f.top), `${label}: bar top`).toBe(24);
      // The two lockups cross-fade on one centre line. Their heights differ by
      // ~5px so the tops never match; the centres must.
      expect(Math.abs(f.markMid - f.fullMid), `${label}: lockup centres`).toBeLessThan(3);
    }
  }
});
