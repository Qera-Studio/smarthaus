import { test, expect, type Page } from "./fixtures";
import { expectHydrated } from "./checks";

/**
 * Focus is never hidden behind a fixed bar (WCAG 2.4.11 Focus Not Obscured,
 * Accessibility System §5). Tab through a page and, at every stop, hit-test
 * the focused element: at its centre and four inset points, is it the thing on
 * top? 2.4.11 (AA) fails only when none of them is: the element is entirely
 * hidden. Partly hidden is 2.4.12 (AAA), not adopted, and not asserted.
 */

async function focusReport(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return null;
    const inset = 2;
    const points = [
      [(r.left + r.right) / 2, (r.top + r.bottom) / 2],
      [r.left + inset, r.top + inset],
      [r.right - inset, r.top + inset],
      [r.left + inset, r.bottom - inset],
      [r.right - inset, r.bottom - inset],
    ].filter(([x, y]) => x! >= 0 && y! >= 0 && x! < innerWidth && y! < innerHeight);
    const visible = points.filter(([x, y]) => {
      const top = document.elementFromPoint(x!, y!);
      return top !== null && (top === el || el.contains(top) || top.contains(el));
    }).length;
    return {
      label: `${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 40)}"`,
      onScreen: points.length > 0,
      visible,
    };
  });
}

/**
 * Chromium only. Playwright's WebKit, in phone emulation, does not reliably
 * scroll a Tab-focused element into view at all (measured 2026-09-27: the
 * message field left at y=700 in a 681px viewport, with no banner and no bar
 * in the way), so a failure there cannot be told apart from the emulator.
 * Whether real Safari with a keyboard behaves is a manual check, recorded in
 * docs/launch-gate/blocked-on-input.md.
 */
test.skip(
  ({ browserName }) => browserName === "webkit",
  "WebKit emulation does not scroll Tab focus into view; checked by hand on a real iPhone",
);

for (const route of ["/privacy", "/contact", "/faq", "/"]) {
  test(`no Tab stop on ${route} is entirely hidden`, async ({ page }) => {
    await page.goto(route);
    await expectHydrated(page);
    const problems: string[] = [];
    let checked = 0;
    for (let stop = 0; stop < 45; stop += 1) {
      await page.keyboard.press("Tab");
      const report = await focusReport(page);
      if (!report) continue;
      checked += 1;
      if (!report.onScreen) problems.push(`${report.label} is off screen`);
      else if (report.visible === 0) problems.push(`${report.label} is entirely hidden`);
    }
    expect(checked, "tab stops checked").toBeGreaterThan(5);
    expect(problems).toEqual([]);
  });
}
