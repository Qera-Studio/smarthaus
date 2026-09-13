import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Both legal pages share one layout, so they share one suite. The ToC
// assertions run only on desktop — below lg the rail is not rendered at all
// (a fixed rail would eat a phone screen), and the document's own headings are
// the navigation there.

const PAGES = [
  { path: "/privacy", heading: "Privacy Policy", sections: 12 },
  { path: "/terms", heading: "Terms and Conditions", sections: 15 },
] as const;

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

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
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
          window.scrollTo(0, target);
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
  });
}
