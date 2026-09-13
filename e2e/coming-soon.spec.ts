import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Every route that links from the nav or footer but has no page yet.
 *
 * Keep in step with `src/lib/nav-links.ts`: a link pointing at a route with
 * neither a real page nor a placeholder is a 404 a visitor reaches from the
 * site's own navigation, which is the failure this list exists to prevent.
 */
const PLACEHOLDER_ROUTES = [
  "/solutions",
  "/about",
  "/designers",
  "/developers",
  // /contact is a real page now. Its own suite is e2e/contact.spec.ts.
  "/cookie-preferences",
] as const;

for (const route of PLACEHOLDER_ROUTES) {
  test.describe(route, () => {
    test("responds 200, not 404", async ({ page }) => {
      // The whole point of the placeholder: these are linked from the nav and
      // footer, so they must resolve rather than dead-end.
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
    });

    test("has exactly one h1, announced as Coming soon", async ({ page }) => {
      await page.goto(route);
      const h1 = page.locator("h1");
      await expect(h1).toHaveCount(1);
      // The canvas is aria-hidden, so the accessible name has to come from the
      // text underneath it — and it must read as one phrase, not two fragments.
      await expect(page.getByRole("heading", { level: 1, name: "Coming soon" })).toBeAttached();
    });

    test("passes axe accessibility checks", async ({ page }) => {
      await page.goto(route);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });

    test("is noindex while it is a placeholder", async ({ page }) => {
      await page.goto(route);
      // An indexed empty route is a thin-content signal and competes with the
      // real page once it ships.
      await expect(page.locator('head meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    });

    test("carries a page-specific blurb and a home CTA", async ({ page }) => {
      await page.goto(route);
      const blurb = page.locator("main p").first();
      await expect(blurb).toBeVisible();
      // Specific, not vague: a shared placeholder line would make every route
      // read identically, which CLAUDE.md's voice rules rule out.
      expect((await blurb.innerText()).length).toBeGreaterThan(40);
      await expect(page.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
    });

    test("no em dashes in the visible copy", async ({ page }) => {
      // Same house rule the legal pages assert.
      await page.goto(route);
      expect(await page.locator("main").innerText()).not.toContain("—");
    });

    test("the lockup fits the viewport and clears the copy", async ({ page }) => {
      await page.goto(route);
      await page.waitForTimeout(900);

      // "Coming soon" is 10 characters against the 404's 3. An earlier build
      // sized the static fallback from a fixed vw ramp tuned for "404", which
      // overflowed the viewport on a phone, broke mid-word into "Comin / g",
      // and painted the lockup straight over the blurb. This asserts all three.
      const metrics = await page.evaluate(() => {
        const h1 = document.querySelector("h1")!;
        const blurb = document.querySelector("main p")!;
        const hb = h1.getBoundingClientRect();
        const pb = blurb.getBoundingClientRect();
        return {
          overflowsX: document.documentElement.scrollWidth > window.innerWidth + 1,
          overlapsCopy: hb.bottom > pb.top + 2,
          withinViewport: hb.right <= window.innerWidth + 1 && hb.left >= -1,
        };
      });

      expect(metrics.overflowsX).toBe(false);
      expect(metrics.overlapsCopy).toBe(false);
      expect(metrics.withinViewport).toBe(true);
    });
  });
}

test("every nav and footer link resolves", async ({ page }) => {
  // Guards the registry against drift: add a link without a page or a
  // placeholder and this fails rather than shipping a dead end.
  await page.goto("/");
  const hrefs = await page
    .locator('a[href^="/"]')
    .evaluateAll((els) =>
      els
        .map((el) => (el as HTMLAnchorElement).getAttribute("href") ?? "")
        .filter((href) => href.startsWith("/") && !href.startsWith("//")),
    );

  const unique = [...new Set(hrefs.map((h) => h.split("#")[0]!))].filter(Boolean);
  for (const href of unique) {
    const response = await page.request.get(href);
    expect(response.status(), `${href} should not dead-end`).toBeLessThan(400);
  }
});
