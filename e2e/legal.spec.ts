import { test, expect, type Page } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";

// Both legal pages share one layout, so they share one suite. The ToC
// assertions run only on desktop — below lg the rail is not rendered at all
// (a fixed rail would eat a phone screen), and the document's own headings are
// the navigation there.

const PAGES = [
  { path: "/privacy", heading: "Privacy Policy", sections: 12 },
  { path: "/terms", heading: "Terms and Conditions", sections: 15 },
] as const;

// Every scroll below is `behavior: "instant"`. These pages set
// `scroll-behavior: smooth` on <html> (globals.scss), which makes a plain
// window.scrollTo asynchronous — an immediate measurement then reads the
// position the page is animating FROM, not the one it is going to, and the
// assertion fails for a timing reason rather than a real one. The smooth
// behaviour itself is covered by the ToC click test, which does not opt out.

/** True when the viewport is at or above the lg breakpoint, where the rail shows. */
async function isDesktop(page: Page) {
  return page.evaluate(() => window.matchMedia("(min-width: 1024px)").matches);
}

for (const { path, heading, sections } of PAGES) {
  test.describe(path, () => {
    test("loads with a single h1", async ({ page }) => {
      await page.goto(path);
      const h1 = page.locator("h1");
      await expect(h1).toHaveCount(1);
      await expect(h1).toHaveText(heading);
    });

    test("passes axe accessibility checks", async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });

    test("every ToC entry resolves to a real heading", async ({ page }) => {
      await page.goto(path);
      if (!(await isDesktop(page))) test.skip();

      const links = page.locator('nav[aria-label$="sections"] a');
      await expect(links).toHaveCount(sections);

      // A ToC entry pointing at an id that does not exist is the failure mode
      // this guards: the rail and the headings are generated from one array, and
      // this proves the two stayed in step in the rendered DOM.
      const hrefs = await links.evaluateAll((els) =>
        els.map((el) => (el as HTMLAnchorElement).getAttribute("href") ?? ""),
      );
      for (const href of hrefs) {
        expect(href.startsWith("#")).toBe(true);
        await expect(page.locator(`h2${href}`)).toHaveCount(1);
      }
    });

    test("the active entry follows the scroll position", async ({ page }) => {
      await page.goto(path);
      if (!(await isDesktop(page))) test.skip();

      const active = page.locator('nav[aria-label$="sections"] a[data-active="true"]');

      // At the top of the document the first section is active, before any
      // heading has reached the reading line.
      await expect(active).toHaveCount(1);
      const first = await active.textContent();

      await page.evaluate(() =>
        window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" as ScrollBehavior }),
      );
      await expect(active).toHaveCount(1);
      await expect(active).not.toHaveText(first ?? "");
    });

    test("the active entry matches the section actually on screen", async ({ page }) => {
      await page.goto(path);
      if (!(await isDesktop(page))) test.skip();

      const active = page.locator('nav[aria-label$="sections"] a[data-active="true"]');

      // Walk each heading to its reading position and check the rail agrees.
      // The weaker "it changed by the bottom of the page" assertion above passed
      // while the rail was in fact stuck on section 1 for the whole document —
      // an IntersectionObserver stops reporting headings far above the viewport,
      // so the original accumulated-state tracking silently never advanced. This
      // is the test that catches that.
      //
      // Deliberately not the last section: the final headings sit within the
      // bottom viewport-height of the document, so the page cannot scroll far
      // enough to bring them to the reading line and an earlier section stays
      // active — correctly. Mid-document sections are what this can assert.
      for (const index of [2, Math.floor(sections / 2)]) {
        const id = await page
          .locator('nav[aria-label$="sections"] a')
          .nth(index)
          .getAttribute("href");
        const selector = `h2${id}`;

        // Skip any heading the document is too short to scroll into position.
        const reachable = await page.locator(selector).evaluate((el) => {
          const target = el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.3;
          const max = document.documentElement.scrollHeight - window.innerHeight;
          if (target > max) return false;
          window.scrollTo({ top: target, behavior: "instant" as ScrollBehavior });
          return true;
        });
        if (!reachable) continue;

        // Wait for the rail to settle on this section rather than reading it
        // immediately: the observer callback lands a frame or two after the
        // scroll, so an instant read catches the previous section and fails for
        // a timing reason rather than a real one.
        await expect(page.locator(`nav[aria-label$="sections"] a[href="${id}"]`)).toHaveAttribute(
          "data-active",
          "true",
        );
        await expect(active).toHaveCount(1);

        // The rail entry renders as "<number><label>" via a CSS counter, and
        // some labels are abbreviated, so compare the rail's label against the
        // heading text with both stripped to letters only.
        const words = (s: string) =>
          s
            .toLowerCase()
            .replace(/[^a-z ]/g, "")
            .trim();
        const railLabel = words((await active.textContent()) ?? "");
        const headingText = words((await page.locator(selector).textContent()) ?? "");

        expect(headingText).toContain(railLabel);
      }
    });

    test("clicking a ToC entry scrolls its heading into view", async ({ page }) => {
      await page.goto(path);
      if (!(await isDesktop(page))) test.skip();

      const link = page.locator('nav[aria-label$="sections"] a').nth(4);
      const href = await link.getAttribute("href");
      await link.click();

      const target = page.locator(`h2${href}`);
      await expect(target).toBeInViewport();

      // scroll-margin-block-start must keep the heading clear of the fixed nav
      // — landing it under the capsule is the bug this catches.
      const top = await target.evaluate((el) => el.getBoundingClientRect().top);
      expect(top).toBeGreaterThan(0);
    });

    test("no em dashes in the visible copy", async ({ page }) => {
      await page.goto(path);
      const text = await page.locator("main").innerText();
      expect(text).not.toContain("—");
    });

    test("the ToC stops at the end of the article", async ({ page }) => {
      await page.goto(path);
      if (!(await isDesktop(page))) test.skip();

      // All the way down, where the footer owns the screen.
      await page.evaluate(() =>
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: "instant" as ScrollBehavior,
        }),
      );
      await page.waitForTimeout(100);

      const overhang = await page.evaluate(() => {
        const toc = document.querySelector('nav[aria-label$="sections"]')!.getBoundingClientRect();
        const article = document.querySelector("article")!.getBoundingClientRect();
        return toc.bottom - article.bottom;
      });

      // The rail must never extend past the article it belongs to. It used to
      // be position:fixed, so it stayed pinned over the footer and was hidden
      // only by paint order — this is the assertion that catches a regression
      // back to that.
      expect(overhang).toBeLessThanOrEqual(1);
    });

    test("the whole ToC stays on screen while reading", async ({ page }) => {
      await page.goto(path);
      if (!(await isDesktop(page))) test.skip();

      // Every entry must be reachable without scrolling the rail off the top or
      // bottom of the viewport. The rail is sized to its content and sticks at
      // the top rather than centring: a full-viewport box that centred itself
      // started below the fold on first paint (the article begins under the
      // header), leaving the last entries unreachable until the reader scrolled.
      const box = await page.evaluate(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo({ top: Math.round(max * 0.5), behavior: "instant" as ScrollBehavior });
        const r = document.querySelector('nav[aria-label$="sections"]')!.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, vh: window.innerHeight };
      });

      expect(box.top).toBeGreaterThanOrEqual(0);
      expect(box.bottom).toBeLessThanOrEqual(box.vh + 1);
    });

    test("the ToC is fully visible without scrolling", async ({ page }) => {
      await page.goto(path);
      if (!(await isDesktop(page))) test.skip();

      // At the top of the page, before any scrolling — this is the regression
      // that hid the last ToC entries behind the fold.
      const box = await page.evaluate(() => {
        const r = document.querySelector('nav[aria-label$="sections"]')!.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, vh: window.innerHeight };
      });

      expect(box.top).toBeGreaterThanOrEqual(0);
      expect(box.bottom).toBeLessThanOrEqual(box.vh + 1);
    });

    // Resizes the viewport, so desktop-only: the mobile profiles run with
    // isMobile set, where setViewportSize does not reliably apply.
    test("the prose column is optically centred on a wide desktop", async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "Desktop Chrome", "desktop layout only");
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(path);

      const offCentre = await page.evaluate(() => {
        const a = document.querySelector("article")!.getBoundingClientRect();
        return a.x + a.width / 2 - window.innerWidth / 2;
      });

      // The rail sits beside the prose rather than pushing it right, so the
      // prose lands on the page's own centre line. Tolerance covers the
      // sub-pixel difference between the measure cap and the column width.
      expect(Math.abs(offCentre)).toBeLessThan(24);
    });

    test("the ToC rail never leaves the screen", async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "Desktop Chrome", "desktop layout only");
      // One load, then resize: the layout is pure CSS, so a reload per width
      // would only add page loads to a suite that already runs three device
      // profiles.
      await page.goto(path);
      for (const width of [1024, 1280, 1440, 1800]) {
        await page.setViewportSize({ width, height: 900 });
        const x = await page.evaluate(() => {
          const el = document.querySelector('nav[aria-label$="sections"]');
          return el ? el.getBoundingClientRect().x : 0;
        });
        expect(x, `rail off-screen at ${width}px`).toBeGreaterThanOrEqual(0);
      }
    });
  });
}
