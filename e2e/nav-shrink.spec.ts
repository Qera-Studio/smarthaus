import { test, expect, type Page } from "./fixtures";

/**
 * The desktop nav shrinks into its capsule without moving its contents.
 *
 * The contract, measured per frame on a scroll that outruns the observer:
 *
 *   - the box holds its top edge (the sticky inset is the same in both
 *     states, so the observer landing a frame late cannot drop it);
 *   - the links do not move on either axis. Their offset from the box's
 *     centre is a constant, because the edge tracks are half the leftover
 *     space shifted by half the difference between the two end pieces, which
 *     is the same shift at any width;
 *   - the two gaps around the link row stay equal on every frame of the
 *     shrink. That is what the shifted tracks buy: with symmetric edges, all
 *     106px of the capsule's slack pooled beside the 23px mark while the
 *     129px CTA had none;
 *   - the mark and the CTA keep a constant inset from the frame and only
 *     slide inward with it;
 *   - the two brand lockups cross-fade on one centre line (both in flow).
 *
 * Each was a measured defect before it was fixed: a 24px drop of the whole
 * bar, a 55px sideways drift of the links, an 8px drop of every item, an 11px
 * offset between the fading lockups, and a 106px imbalance between the gaps.
 * Desktop only: below lg the nav is a fixed bottom bar and none of this holds.
 */

test.skip(({ isMobile }) => Boolean(isMobile), "the capsule is a desktop-only behaviour");
test.use({ viewport: { width: 1512, height: 900 } });

type Frame = {
  top: number;
  stuck: boolean;
  leftGap: number;
  rightGap: number;
  linksX: number;
  linksY: number;
  ctaTop: number;
  leftInset: number;
  rightInset: number;
  markMid: number;
  fullMid: number;
};

/**
 * Scroll, then read the bar and its contents on every frame until it settles.
 *
 * Settled means the header has flipped to the state the scroll implies and no
 * animation or transition inside it is still running. A fixed 600ms window
 * passed locally and failed in CI, where the slower runner was still mid-shrink
 * at 600ms (measured 766, 858 and 969px on three attempts): the "settled" frame
 * was a moving one. Sampling to the real end also means the per-frame checks
 * cover the whole motion on any machine, not its first 600ms.
 */
function sample(
  page: Page,
  scrollTo: number,
): Promise<{ frames: Frame[]; settled: boolean; why: string }> {
  return page.evaluate(
    (y) =>
      new Promise<{ frames: Frame[]; settled: boolean; why: string }>((resolve) => {
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
          const stuck = header.hasAttribute("data-stuck");
          const box = header.getBoundingClientRect();
          const l = links.getBoundingClientRect();
          const c = cta.getBoundingClientRect();
          // Whichever lockup is the visible one in this state.
          const brand = (stuck ? mark! : full!).getBoundingClientRect();
          frames.push({
            top: box.top,
            stuck,
            leftGap: l.left - brand.right,
            rightGap: c.left - l.right,
            linksX: l.left + l.width / 2,
            linksY: l.top + l.height / 2,
            ctaTop: c.top,
            leftInset: brand.left - box.left,
            rightInset: box.right - c.right,
            markMid: mid(mark!),
            fullMid: mid(full!),
          });
        };
        const wantStuck = y > 0;
        const running = () =>
          header.getAnimations({ subtree: true }).some((a) => a.playState === "running");
        // Two quiet frames in a row, so a transition that starts on the frame
        // after the state flip is not mistaken for a finished one.
        let quiet = 0;
        const t0 = performance.now();
        window.scrollTo(0, y);
        const loop = () => {
          snap();
          const elapsed = performance.now() - t0;
          const flipped = header.hasAttribute("data-stuck") === wantStuck;
          quiet = flipped && !running() ? quiet + 1 : 0;
          if (elapsed >= 600 && quiet >= 2) resolve({ frames, settled: true, why: "" });
          else if (elapsed > 5000) {
            // Say what never settled, so a failure explains itself.
            const live = header
              .getAnimations({ subtree: true })
              .filter((a) => a.playState === "running")
              .map((a) => {
                const target = (a.effect as KeyframeEffect | null)?.target as Element | null;
                const name =
                  (a as CSSTransition).transitionProperty ??
                  (a as CSSAnimation).animationName ??
                  "animation";
                return `${name} on <${target?.tagName.toLowerCase()} class="${target?.className}">`;
              });
            resolve({
              frames,
              settled: false,
              // The consent region is client-only: present means React hydrated.
              why: `stuck=${header.hasAttribute("data-stuck")} want=${wantStuck} scrollY=${window.scrollY} hydrated=${Boolean(document.querySelector('[aria-label="Cookie preferences"]'))} sentinelTop=${(header.previousElementSibling as HTMLElement | null)?.getBoundingClientRect().top} running=[${live.join(", ")}]`,
            });
          } else requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      }),
    scrollTo,
  );
}

async function expandBack(page: Page): Promise<Frame[]> {
  const { frames, settled, why } = await sample(page, 0);
  expect(settled, `expand back finished within 5s: ${why}`).toBe(true);
  return frames;
}

test("the capsule closes around a fixed row with the gaps held equal", async ({ page }) => {
  // /about rather than the homepage: it has content to scroll.
  await page.goto("/about");

  const { frames: shrink, settled: shrinkSettled, why } = await sample(page, 80);
  expect(shrinkSettled, `shrink finished within 5s: ${why}`).toBe(true);

  // Settled capsule: it hugs its content, 8px of padding and a 1px border on
  // each side, around mark, gap, links, gap, CTA. The row and the CTA are text,
  // and text width depends on the platform's font rendering (Linux Chrome draws
  // the row about 10px wider than macOS), so the expected geometry is derived
  // from what this browser rendered, measured here independently of how
  // NavShell measures it. On macOS this is 708px wide with 77px gaps.
  //
  // The equations: width = 2 * (cta + 24 + 8 + 1) + row, and each gap is
  // 24 + (cta - 23) / 2, where 23 is the mark the stylesheet assumes. A gap
  // off by more than a pixel means the capsule was built from widths the page
  // did not render: the CTA poking out, or slack beside the mark.
  const settled = shrink.at(-1)!;
  expect(settled.stuck, "settled in the capsule").toBe(true);
  const geometry = await page.evaluate(() => {
    const header = document.querySelector("header")!;
    const items = header.querySelectorAll("nav ul > li");
    return {
      width: header.getBoundingClientRect().width,
      row:
        items[items.length - 1]!.getBoundingClientRect().right -
        items[0]!.getBoundingClientRect().left,
      cta: header.querySelector('a[href="/contact"]')!.getBoundingClientRect().width,
    };
  });
  expect(Math.abs(geometry.width - (2 * (geometry.cta + 33) + geometry.row))).toBeLessThan(1);
  const gap = 24 + (geometry.cta - 23) / 2;
  expect(Math.abs(settled.leftGap - gap), `left gap ${settled.leftGap}, want ${gap}`).toBeLessThan(
    1,
  );
  expect(
    Math.abs(settled.rightGap - gap),
    `right gap ${settled.rightGap}, want ${gap}`,
  ).toBeLessThan(1);

  for (const [label, frames] of [
    ["shrink", shrink],
    ["expand back", await expandBack(page)],
  ] as const) {
    expect(frames.length, `${label}: sampled frames`).toBeGreaterThan(10);
    const first = frames[0]!;
    for (const f of frames) {
      // The box top is the shared inset on every frame — never 0.
      expect(Math.round(f.top), `${label}: bar top`).toBe(16);
      // Nothing in the row moves: the links on either axis, or the CTA's row.
      expect(Math.abs(f.linksX - first.linksX), `${label}: links moved on x`).toBeLessThan(1);
      expect(Math.abs(f.linksY - first.linksY), `${label}: links moved on y`).toBeLessThan(1);
      expect(Math.abs(f.ctaTop - first.ctaTop), `${label}: CTA moved on y`).toBeLessThan(1);
      // Both ends keep their distance from the frame while it travels.
      expect(Math.round(f.leftInset), `${label}: mark inset`).toBe(9);
      expect(Math.round(f.rightInset), `${label}: CTA inset`).toBe(9);
      // The two lockups cross-fade on one centre line. Their heights differ by
      // ~5px so the tops never match; the centres must.
      expect(Math.abs(f.markMid - f.fullMid), `${label}: lockup centres`).toBeLessThan(3);
      // Equal gaps, but only once the capsule owns the row. In the tall bar
      // the visible lockup is the 133px wordmark rather than the 23px mark, so
      // the two gaps around it genuinely differ by the lockup's extra width —
      // the cross-fade is what resolves it, on the first stuck frame.
      if (f.stuck) {
        expect(Math.abs(f.leftGap - f.rightGap), `${label}: gaps unequal`).toBeLessThan(1);
      }
    }
  }
});
